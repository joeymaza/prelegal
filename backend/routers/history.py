"""Document history endpoints — save and retrieve user documents."""

import json

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..db import get_db

router = APIRouter()


class SaveDocumentRequest(BaseModel):
    user_email: str
    doc_type: str
    doc_name: str
    fields: dict = {}
    party1_signature: dict = {}
    party2_signature: dict = {}
    doc_id: int | None = None  # if set, update existing record


class SaveDocumentResponse(BaseModel):
    id: int
    doc_type: str
    doc_name: str
    updated_at: str


@router.post("/save", response_model=SaveDocumentResponse)
def save_document(body: SaveDocumentRequest):
    fields_json = json.dumps(body.fields)
    p1_json = json.dumps(body.party1_signature)
    p2_json = json.dumps(body.party2_signature)
    email = body.user_email.strip().lower()

    with get_db() as conn:
        if body.doc_id is not None:
            row = conn.execute(
                "SELECT id FROM documents WHERE id = ? AND user_email = ?",
                (body.doc_id, email),
            ).fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Document not found")
            conn.execute(
                """UPDATE documents
                   SET fields_json = ?, party1_signature_json = ?, party2_signature_json = ?,
                       updated_at = datetime('now')
                   WHERE id = ?""",
                (fields_json, p1_json, p2_json, body.doc_id),
            )
            saved = conn.execute(
                "SELECT id, doc_type, doc_name, updated_at FROM documents WHERE id = ?",
                (body.doc_id,),
            ).fetchone()
        else:
            cur = conn.execute(
                """INSERT INTO documents
                   (user_email, doc_type, doc_name, fields_json, party1_signature_json, party2_signature_json)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (email, body.doc_type, body.doc_name, fields_json, p1_json, p2_json),
            )
            saved = conn.execute(
                "SELECT id, doc_type, doc_name, updated_at FROM documents WHERE id = ?",
                (cur.lastrowid,),
            ).fetchone()

    return {
        "id": saved["id"],
        "doc_type": saved["doc_type"],
        "doc_name": saved["doc_name"],
        "updated_at": saved["updated_at"],
    }


@router.get("/")
def list_documents(user_email: str):
    """List all saved documents for a user, most recent first."""
    email = user_email.strip().lower()
    with get_db() as conn:
        rows = conn.execute(
            """SELECT id, doc_type, doc_name, updated_at
               FROM documents WHERE user_email = ?
               ORDER BY updated_at DESC, id DESC""",
            (email,),
        ).fetchall()
    return [dict(r) for r in rows]


@router.get("/{doc_id}")
def get_document(doc_id: int, user_email: str):
    """Return full state of a saved document."""
    email = user_email.strip().lower()
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM documents WHERE id = ? AND user_email = ?",
            (doc_id, email),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Document not found")
    return {
        "id": row["id"],
        "doc_type": row["doc_type"],
        "doc_name": row["doc_name"],
        "fields": json.loads(row["fields_json"]),
        "party1_signature": json.loads(row["party1_signature_json"]),
        "party2_signature": json.loads(row["party2_signature_json"]),
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }
