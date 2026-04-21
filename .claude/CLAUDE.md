# Prelegal Project

## Overview

This is a Saas product to allow users to draft legal documents based on templates in the templates directory. The user can use AI chat in order to establish what document they want and how to fill the fields. The available documents are covered in the catalog.json file in the project folder, included here :

@catalog.json

The current implementation supports all catalog document types with AI chat-driven field and signature population, and PDF download.

## Development Process

When instructed to build a feature:
    1.Use your Atlassian tools to read the feature instructions in Jira.
    2. Develop the feature - do not skip any step from the feature-dev 7 step process.
    3. Thoroughly test the feature with unit tests and integration tests and fix any issues.
    4. Submit a PR using your github tools.

## AI Design

When writing code to make calls to LLMs, use your Cerebras skill to use LiteLLM via OpenRouter to the `openrouter/openai/gpt-oss-120b` model with Cerebras as the inference provider. Use `response_format={"type": "json_object"}` (NOT Pydantic `response_format`) and parse the response with `json.loads()`. The model does not reliably support Pydantic schema enforcement. Do not pass `reasoning_effort` — it is only valid for o1/o3 models. Set `max_tokens=2048`.

The JSON response must have exactly two keys:
- `"reply"`: the conversational message shown to the user
- `"doc_fields"`: an object with extracted document/signature fields (use `null` for unknown)

There is an OPENROUTER_API_KEY in the .env file in the project root.

## Technical Design

The entire project should be packaged into a Docker container. 
The backend should be in backend/ and be a uv project, using FastAPI. 
The frontend should be in frontend/.
The database should use SQLLite and be created from scratch each time the docker container is brought up allowing for a users table with sign up and sign in.
Consider statically building the frontend and serving it via FastAPI, if that will work. 
There should be scripts in scripts/ for:

    # Mac
    scripts/start-mac.sh  # start
    scripts/stop-mac.sh   # stop

    # Linux
    scripts/start-linux.sh 
    scripts/stop-linux.sh
    
    # Windows
    scripts/start-windows.sh
    scripts/stop-windows.sh

Backend available at http://localhost:8000

## Color Scheme 

- #D6F4ED- background
- #53629E
- #87BAC3
- #473472 - headings
- #A3B087 - submit button

## Implementation Status

### PREL-4: V1 Foundation (complete)
- **Backend**: FastAPI app in `backend/` with `uv` project, SQLite via raw `sqlite3` stdlib, bcrypt for password hashing.
- **Auth**: `/api/auth/signup` and `/api/auth/signin` endpoints. Client-side auth gate via `localStorage.prelegal_user` — no JWT yet.
- **Frontend**: Next.js static export (`output: 'export'`) served by FastAPI `StaticFiles(html=True)`. Login page at `/login/`.
- **Docker**: Two-stage Dockerfile (node:20-alpine build, python:3.12-slim runtime). Start/stop scripts in `scripts/`.
- **Tests**: 6 backend tests (pytest + httpx), 50 frontend tests (jest). All passing.

### PREL-5: AI Chat (complete)
- **Chat endpoint**: `POST /api/chat/` in `backend/routers/chat.py`. Receives conversation history + current fields, calls LLM via LiteLLM (OpenRouter + Cerebras, `openrouter/openai/gpt-oss-120b`), returns structured `{reply, patch}` using Pydantic model as `response_format`.
- **Frontend**: Form panel replaced with `ChatPanel` (chat-panel.tsx) + `SignaturePanel` (signature-panel.tsx). Chat drives NDA field population; signatures remain manual. API wrapper in `chat-api.ts`.
- **Live preview**: `NdaPreview` updates reactively as AI patches arrive — same component, no changes needed.
- **Scripts**: Start scripts updated to pass `--env-file .env` for `OPENROUTER_API_KEY`.
- **Tests**: 11 backend tests, 46 frontend tests. All passing.

### PREL-6: Multi-Document Support (complete)
- **Document registry**: `backend/document_registry.py` — loads `catalog.json` + template markdown, builds per-document system prompts with field descriptions. NDA uses a bespoke prompt; all others use a generic template.
- **Documents endpoint**: `GET /api/documents/` lists all catalog docs; `GET /api/documents/{slug}/template` returns rendered markdown.
- **Signature AI population**: Chat now collects `party1_*` / `party2_*` signature fields (printName, title, company, noticeAddress, signedDate) for all document types. `handlePatch` in `editor/page.tsx` routes these into `party1Signature`/`party2Signature` state.
- **PDF download**: Header "Download PDF" button — NDA uses existing `buildNdaPdfBlob`; all other docs use `buildGenericPdfBlob` (`generic-pdf.tsx`) which renders the filled markdown template via jsPDF + html2canvas.
- **Doc viewer**: Right panel styled as a paper page (white card on grey background, letter dimensions, drop shadow).
- **Tests**: Backend tests in `test_documents.py` (145 lines). Frontend template-renderer tests in `template-renderer.test.ts`.

### PREL-7: Multi-User Document History + UI Polish (complete)
- **Document history**: `documents` table in SQLite (user_email, doc_type, doc_name, fields_json, party1/2_signature_json). New router `backend/routers/history.py` with `POST /api/history/save`, `GET /api/history/`, `GET /api/history/{id}`. Documents auto-save on PDF download. `saved_id` query param in editor URL reloads prior state.
- **Home page**: "Recent documents" table below the doc-type grid. "Continue editing" links open saved documents. Background updated to `#D6F4ED` brand color.
- **Login page**: Brand colors applied (`#473472` heading, `#A3B087` submit button, `#53629E` links, `#D6F4ED` background).
- **Disclaimer**: Amber banner in editor header — AI-generated drafts require attorney review.
- **Chat UX fix**: Input focus restored via `requestAnimationFrame` after AI responds (fixes timing race with disabled textarea).
- **AI follow-up fix**: Both system prompts instruct AI to always ask a follow-up when an answer is ambiguous.
- **DB fix**: `DB_PATH` read dynamically per connection for correct test isolation.
- **Tests**: 27 backend tests, 54 frontend tests. All passing.

### AI Chat Fix (post PREL-7)
- **Root cause**: `response_format=PydanticModel` caused `gpt-oss-120b` to put the full reply inside `doc_fields.reply` and emit "Sure." as the visible reply.
- **Fix**: Switched to `response_format={"type": "json_object"}` + `json.loads()` parsing. Renamed schema key from `fields` to `doc_fields` to prevent model confusion. Removed `reasoning_effort="low"`. Added `max_tokens=2048`.
- **Result**: Complete, well-structured replies (465 tokens vs 90 before).