"""Signup and signin endpoints — real DB storage, no JWT yet."""

import sqlite3

import bcrypt
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..db import get_db

router = APIRouter()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


class AuthRequest(BaseModel):
    email: str
    password: str


@router.post("/signup")
def signup(body: AuthRequest):
    hashed = hash_password(body.password)
    with get_db() as conn:
        try:
            conn.execute(
                "INSERT INTO users (email, hashed_password) VALUES (?, ?)",
                (body.email.strip().lower(), hashed),
            )
        except sqlite3.IntegrityError:
            raise HTTPException(status_code=409, detail="Email already registered")
    return {"ok": True, "email": body.email.strip().lower()}


@router.post("/signin")
def signin(body: AuthRequest):
    with get_db() as conn:
        row = conn.execute(
            "SELECT hashed_password FROM users WHERE email = ?",
            (body.email.strip().lower(),),
        ).fetchone()
    if not row or not verify_password(body.password, row["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"ok": True, "email": body.email.strip().lower()}
