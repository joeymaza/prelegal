"""SQLite database setup — users table, fresh each container start."""

import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path


def _db_path() -> Path:
    return Path(os.getenv("DB_PATH", "./data/prelegal.db"))


@contextmanager
def get_db():
    db_path = _db_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                hashed_password TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now'))
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_email TEXT NOT NULL,
                doc_type TEXT NOT NULL,
                doc_name TEXT NOT NULL,
                fields_json TEXT NOT NULL DEFAULT '{}',
                party1_signature_json TEXT NOT NULL DEFAULT '{}',
                party2_signature_json TEXT NOT NULL DEFAULT '{}',
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        """)
