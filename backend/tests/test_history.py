"""Tests for document history endpoints."""

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


def test_save_new_document(client):
    payload = {
        "user_email": "user@test.com",
        "doc_type": "nda",
        "doc_name": "Mutual NDA",
        "fields": {"party1Name": "Acme Corp"},
        "party1_signature": {"printName": "Jane Doe"},
        "party2_signature": {},
    }
    resp = client.post("/api/history/save", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] > 0
    assert data["doc_type"] == "nda"
    assert data["doc_name"] == "Mutual NDA"


def test_list_documents_empty(client):
    resp = client.get("/api/history/", params={"user_email": "nobody@test.com"})
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_documents_returns_saved(client):
    payload = {"user_email": "user@test.com", "doc_type": "nda", "doc_name": "Mutual NDA"}
    client.post("/api/history/save", json=payload)
    client.post("/api/history/save", json={**payload, "doc_type": "csa", "doc_name": "Cloud SA"})
    resp = client.get("/api/history/", params={"user_email": "user@test.com"})
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) == 2
    # CSA was inserted after NDA, so should appear first (higher id)
    doc_types = [i["doc_type"] for i in items]
    assert "nda" in doc_types and "csa" in doc_types
    assert items[0]["doc_type"] == "csa"  # higher id = inserted last = first in results


def test_get_document_full_state(client):
    payload = {
        "user_email": "user@test.com",
        "doc_type": "nda",
        "doc_name": "Mutual NDA",
        "fields": {"party1Name": "Acme"},
        "party1_signature": {"printName": "Alice"},
        "party2_signature": {"printName": "Bob"},
    }
    save_resp = client.post("/api/history/save", json=payload)
    doc_id = save_resp.json()["id"]
    resp = client.get(f"/api/history/{doc_id}", params={"user_email": "user@test.com"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["fields"] == {"party1Name": "Acme"}
    assert data["party1_signature"]["printName"] == "Alice"
    assert data["party2_signature"]["printName"] == "Bob"


def test_get_document_wrong_user(client):
    payload = {"user_email": "owner@test.com", "doc_type": "nda", "doc_name": "NDA"}
    save_resp = client.post("/api/history/save", json=payload)
    doc_id = save_resp.json()["id"]
    resp = client.get(f"/api/history/{doc_id}", params={"user_email": "other@test.com"})
    assert resp.status_code == 404


def test_update_existing_document(client):
    payload = {
        "user_email": "user@test.com",
        "doc_type": "nda",
        "doc_name": "Mutual NDA",
        "fields": {"party1Name": "Acme"},
    }
    doc_id = client.post("/api/history/save", json=payload).json()["id"]
    updated = {**payload, "doc_id": doc_id, "fields": {"party1Name": "New Corp"}}
    client.post("/api/history/save", json=updated)
    resp = client.get(f"/api/history/{doc_id}", params={"user_email": "user@test.com"})
    assert resp.json()["fields"]["party1Name"] == "New Corp"


def test_list_only_returns_own_documents(client):
    client.post("/api/history/save", json={"user_email": "a@test.com", "doc_type": "nda", "doc_name": "NDA"})
    client.post("/api/history/save", json={"user_email": "b@test.com", "doc_type": "csa", "doc_name": "CSA"})
    resp = client.get("/api/history/", params={"user_email": "a@test.com"})
    assert len(resp.json()) == 1
    assert resp.json()[0]["doc_type"] == "nda"
