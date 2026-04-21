"""AI chat endpoint for document field extraction."""

import json
import os
from datetime import date
from typing import Literal

from fastapi import APIRouter, HTTPException
from litellm import completion
from litellm.exceptions import APIError
from pydantic import ValidationError as PydanticValidationError
from pydantic import BaseModel

from ..document_registry import get_doc_config

router = APIRouter()

MODEL = "openrouter/openai/gpt-oss-120b"
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}


class ChatResponseSchema(BaseModel):
    """Schema enforced on the LLM response."""

    reply: str
    fields: dict[str, str | None] = {}


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    document_type: str = "nda"
    messages: list[ChatMessage]
    current_fields: dict = {}


class ChatResponse(BaseModel):
    reply: str
    patch: dict


@router.post("/")
def chat(body: ChatRequest):
    try:
        doc_config = get_doc_config(body.document_type)
    except KeyError:
        raise HTTPException(status_code=400, detail=f"Unsupported document type: {body.document_type}")

    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENROUTER_API_KEY not configured")

    today = date.today().isoformat()
    system_msg = doc_config.system_prompt.format(today=today)

    # Include current field state so the LLM knows what's already filled
    if body.current_fields:
        filled = {k: v for k, v in body.current_fields.items() if v}
        if filled:
            system_msg += f"\n\nFields already captured:\n{json.dumps(filled, indent=2)}"

    # Build messages list: system + conversation history (last 20 messages)
    messages = [{"role": "system", "content": system_msg}]
    for msg in body.messages[-20:]:
        messages.append({"role": msg.role, "content": msg.content})

    try:
        response = completion(
            model=MODEL,
            messages=messages,
            response_format=ChatResponseSchema,
            reasoning_effort="low",
            extra_body=EXTRA_BODY,
            api_key=api_key,
        )
        raw = response.choices[0].message.content
        parsed = ChatResponseSchema.model_validate_json(raw)
    except PydanticValidationError:
        raise HTTPException(status_code=502, detail="LLM returned malformed response")
    except APIError as e:
        raise HTTPException(status_code=502, detail=f"LLM provider error: {e.message}")

    # Filter out None values from the patch
    patch = {k: v for k, v in parsed.fields.items() if v is not None}

    return ChatResponse(reply=parsed.reply, patch=patch)
