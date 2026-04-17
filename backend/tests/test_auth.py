"""Tests for auth endpoints."""

import os
import tempfile

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


def test_signup_success(client):
    resp = client.post("/api/auth/signup", json={"email": "a@b.com", "password": "password123"})
    assert resp.status_code == 200
    assert resp.json() == {"ok": True, "email": "a@b.com"}


def test_signup_duplicate(client):
    client.post("/api/auth/signup", json={"email": "a@b.com", "password": "password123"})
    resp = client.post("/api/auth/signup", json={"email": "a@b.com", "password": "password123"})
    assert resp.status_code == 409


def test_signin_success(client):
    client.post("/api/auth/signup", json={"email": "a@b.com", "password": "password123"})
    resp = client.post("/api/auth/signin", json={"email": "a@b.com", "password": "password123"})
    assert resp.status_code == 200
    assert resp.json() == {"ok": True, "email": "a@b.com"}


def test_signin_wrong_password(client):
    client.post("/api/auth/signup", json={"email": "a@b.com", "password": "password123"})
    resp = client.post("/api/auth/signin", json={"email": "a@b.com", "password": "wrong"})
    assert resp.status_code == 401


def test_signin_unknown_email(client):
    resp = client.post("/api/auth/signin", json={"email": "nobody@b.com", "password": "password123"})
    assert resp.status_code == 401


def test_health(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}
