"""Tests for documents catalog and template endpoints."""

import os
import pytest
from fastapi.testclient import TestClient


@pytest.fixture(autouse=True)
def _tmp_db(tmp_path):
    os.environ["DB_PATH"] = str(tmp_path / "test.db")
    from backend.db import init_db
    init_db()
    yield
    os.environ.pop("DB_PATH", None)


@pytest.fixture()
def client():
    from backend.main import app
    return TestClient(app)


def test_list_documents_returns_all_types(client):
    resp = client.get("/api/documents/")
    assert resp.status_code == 200
    data = resp.json()
    # All 11 supported doc types (nda-coverpage is skipped)
    slugs = {d["doc_type"] for d in data}
    assert "nda" in slugs
    assert "csa" in slugs
    assert "design-partner" in slugs
    assert "sla" in slugs
    assert "psa" in slugs
    assert "dpa" in slugs
    assert "partnership" in slugs
    assert "software-license" in slugs
    assert "pilot" in slugs
    assert "baa" in slugs
    assert "ai-addendum" in slugs
    assert "nda-coverpage" not in slugs


def test_list_documents_has_required_fields(client):
    resp = client.get("/api/documents/")
    data = resp.json()
    for doc in data:
        assert "doc_type" in doc
        assert "name" in doc
        assert "description" in doc
        assert "party1_label" in doc
        assert "party2_label" in doc
        assert "field_names" in doc
        assert isinstance(doc["field_names"], list)
        assert "greeting" in doc


def test_list_documents_nda_has_expected_fields(client):
    resp = client.get("/api/documents/")
    data = resp.json()
    nda = next(d for d in data if d["doc_type"] == "nda")
    assert "party1Name" in nda["field_names"]
    assert "party2Name" in nda["field_names"]
    assert "effectiveDate" in nda["field_names"]
    assert nda["party1_label"] == "Party 1"
    assert nda["party2_label"] == "Party 2"


def test_list_documents_csa_has_party_labels(client):
    resp = client.get("/api/documents/")
    data = resp.json()
    csa = next(d for d in data if d["doc_type"] == "csa")
    assert csa["party1_label"] == "Provider"
    assert csa["party2_label"] == "Customer"
    assert len(csa["field_names"]) > 0


def test_get_template_returns_markdown(client):
    resp = client.get("/api/documents/nda/template")
    assert resp.status_code == 200
    data = resp.json()
    assert "markdown" in data
    assert len(data["markdown"]) > 100


def test_get_template_csa(client):
    resp = client.get("/api/documents/csa/template")
    assert resp.status_code == 200
    data = resp.json()
    assert "Cloud Service Agreement" in data["markdown"]


def test_get_template_unknown_type_returns_404(client):
    resp = client.get("/api/documents/nonexistent/template")
    assert resp.status_code == 404


def test_chat_with_csa_doc_type(client):
    """Non-NDA document type should work in chat endpoint."""
    import json
    from unittest.mock import MagicMock, patch

    os.environ["OPENROUTER_API_KEY"] = "test-key"

    mock_resp = MagicMock()
    mock_resp.choices = [MagicMock()]
    mock_resp.choices[0].message.content = json.dumps({
        "reply": "Let's start the CSA. Who is the Provider?",
        "fields": {"Provider": None, "Customer": None},
    })

    with patch("backend.routers.chat.completion", return_value=mock_resp):
        resp = client.post("/api/chat/", json={
            "document_type": "csa",
            "messages": [{"role": "user", "content": "I need a CSA"}],
        })
    assert resp.status_code == 200
    data = resp.json()
    assert "reply" in data
    assert "patch" in data


def test_chat_with_all_supported_doc_types(client):
    """Each supported doc type should return 200 from the chat endpoint."""
    import json
    from unittest.mock import MagicMock, patch

    os.environ["OPENROUTER_API_KEY"] = "test-key"

    mock_resp = MagicMock()
    mock_resp.choices = [MagicMock()]
    mock_resp.choices[0].message.content = json.dumps({
        "reply": "Hello!",
        "fields": {},
    })

    slugs = ["nda", "csa", "design-partner", "sla", "psa", "dpa",
             "partnership", "software-license", "pilot", "baa", "ai-addendum"]

    with patch("backend.routers.chat.completion", return_value=mock_resp):
        for slug in slugs:
            resp = client.post("/api/chat/", json={
                "document_type": slug,
                "messages": [{"role": "user", "content": "hello"}],
            })
            assert resp.status_code == 200, f"Failed for doc type: {slug}"
