"""Tests for chat endpoint."""

import json
import os
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(autouse=True)
def _tmp_db(tmp_path):
    os.environ["DB_PATH"] = str(tmp_path / "test.db")
    os.environ["OPENROUTER_API_KEY"] = "test-key"
    from backend.db import init_db
    init_db()
    yield
    os.environ.pop("DB_PATH", None)
    os.environ.pop("OPENROUTER_API_KEY", None)


@pytest.fixture()
def client():
    from backend.main import app
    return TestClient(app)


def _mock_llm_response(reply: str, fields: dict):
    """Build a mock LiteLLM response."""
    mock_resp = MagicMock()
    mock_resp.choices = [MagicMock()]
    mock_resp.choices[0].message.content = json.dumps({
        "reply": reply,
        "doc_fields": fields,
    })
    return mock_resp


@patch("backend.routers.chat.completion")
def test_chat_returns_reply_and_patch(mock_completion, client):
    mock_completion.return_value = _mock_llm_response(
        "Great! So Acme Inc and Widgets LLC are the two parties.",
        {"party1Name": "Acme Inc", "party2Name": "Widgets LLC"},
    )
    resp = client.post("/api/chat/", json={
        "messages": [{"role": "user", "content": "Acme Inc and Widgets LLC"}],
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["reply"] == "Great! So Acme Inc and Widgets LLC are the two parties."
    assert data["patch"]["party1Name"] == "Acme Inc"
    assert data["patch"]["party2Name"] == "Widgets LLC"


@patch("backend.routers.chat.completion")
def test_chat_empty_fields_returns_empty_patch(mock_completion, client):
    mock_completion.return_value = _mock_llm_response(
        "Hi! Who are the two parties?",
        {"party1Name": None, "party2Name": None},
    )
    resp = client.post("/api/chat/", json={
        "messages": [{"role": "user", "content": "hello"}],
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["patch"] == {}


@patch("backend.routers.chat.completion")
def test_chat_passes_current_fields(mock_completion, client):
    mock_completion.return_value = _mock_llm_response("Got it.", {})
    resp = client.post("/api/chat/", json={
        "messages": [{"role": "user", "content": "change party 1 to BigCo"}],
        "current_fields": {"party1Name": "Acme Inc"},
    })
    assert resp.status_code == 200
    # Verify the system prompt includes current fields
    call_args = mock_completion.call_args
    system_msg = call_args.kwargs["messages"][0]["content"]
    assert "Acme Inc" in system_msg


def test_chat_unsupported_doc_type(client):
    resp = client.post("/api/chat/", json={
        "document_type": "unknown-garbage",
        "messages": [{"role": "user", "content": "hello"}],
    })
    assert resp.status_code == 400


def test_chat_missing_api_key(client):
    os.environ.pop("OPENROUTER_API_KEY", None)
    resp = client.post("/api/chat/", json={
        "messages": [{"role": "user", "content": "hello"}],
    })
    assert resp.status_code == 500
