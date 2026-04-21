"""Document catalog and template endpoints."""

from pathlib import Path

from fastapi import APIRouter, HTTPException

from ..document_registry import REGISTRY, PROJECT_ROOT

router = APIRouter()


@router.get("/")
def list_documents():
    """Return the catalog of available document types."""
    return [
        {
            "doc_type": cfg.doc_type,
            "name": cfg.name,
            "description": cfg.description,
            "party1_label": cfg.party1_label,
            "party2_label": cfg.party2_label,
            "field_names": cfg.field_names,
            "greeting": cfg.greeting,
        }
        for cfg in REGISTRY.values()
    ]


@router.get("/{doc_type}/template")
def get_template(doc_type: str):
    """Return the raw markdown template for a document type."""
    if doc_type not in REGISTRY:
        raise HTTPException(status_code=404, detail=f"Unknown document type: {doc_type}")

    cfg = REGISTRY[doc_type]
    template_path = PROJECT_ROOT / cfg.template_file
    if not template_path.exists():
        raise HTTPException(status_code=404, detail="Template file not found")

    return {"markdown": template_path.read_text(encoding="utf-8")}
