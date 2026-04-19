"""AI chat endpoint for NDA field extraction."""

import json
import os
from datetime import date
from typing import Literal

from fastapi import APIRouter, HTTPException
from litellm import completion
from litellm.exceptions import APIError
from pydantic import ValidationError as PydanticValidationError
from pydantic import BaseModel, field_validator

router = APIRouter()

MODEL = "openrouter/openai/gpt-oss-120b"
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}

SYSTEM_PROMPT = """\
You are a legal assistant helping a user draft a Mutual Non-Disclosure Agreement (NDA).

Your job:
1. Greet the user and ask who the two parties are.
2. Then progressively ask about remaining fields: purpose, effective date, MNDA term, \
confidentiality term, governing law state, jurisdiction, and any modifications.
3. Ask one or two questions at a time. Be conversational but concise.
4. When the user provides information, extract it into the structured fields.
5. Only populate fields you have clear information for. Leave others as null.
6. Once all required fields are filled, summarize what you have and ask if anything needs changes.

Required fields: party1Name, party2Name, effectiveDate, governingLawState, jurisdiction.
Optional fields: purpose, mndaTermMode, mndaTermYears, confTermMode, confTermYears, modifications.

Default values (use if user doesn't specify):
- purpose: "Evaluating whether to enter into a business relationship with the other party."
- mndaTermMode: "expires", mndaTermYears: 1
- confTermMode: "expires", confTermYears: 1
- modifications: "None."

Field formats:
- effectiveDate: YYYY-MM-DD format
- mndaTermMode/confTermMode: exactly "expires" or "perpetual"
- mndaTermYears/confTermYears: integer >= 1, only relevant when mode is "expires"
- governingLawState: US state name (e.g. "Delaware")
- jurisdiction: city/county and state (e.g. "New Castle County, DE")

Today's date is {today}. If the user says "today" for effective date, use {today}.

IMPORTANT: Your response must be valid JSON with two fields:
- "reply": your conversational message to the user (string)
- "fields": an object with any NDA fields you can extract from this turn (use null for unknown fields)
"""


class NdaFieldsPatch(BaseModel):
    """Partial patch of NDA fields extracted from conversation."""

    party1Name: str | None = None
    party2Name: str | None = None
    purpose: str | None = None
    effectiveDate: str | None = None
    mndaTermMode: Literal["expires", "perpetual"] | None = None
    mndaTermYears: int | None = None
    confTermMode: Literal["expires", "perpetual"] | None = None
    confTermYears: int | None = None
    governingLawState: str | None = None
    jurisdiction: str | None = None
    modifications: str | None = None

    @field_validator("mndaTermYears", "confTermYears", mode="before")
    @classmethod
    def coerce_years(cls, v: object) -> int | None:
        if v is None:
            return None
        return max(1, int(v))


class ChatResponseSchema(BaseModel):
    """Schema enforced on the LLM response."""

    reply: str
    fields: NdaFieldsPatch


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
    if body.document_type != "nda":
        raise HTTPException(status_code=400, detail="Unsupported document type")

    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENROUTER_API_KEY not configured")

    today = date.today().isoformat()
    system_msg = SYSTEM_PROMPT.format(today=today)

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
    patch = {k: v for k, v in parsed.fields.model_dump().items() if v is not None}

    return ChatResponse(reply=parsed.reply, patch=patch)
