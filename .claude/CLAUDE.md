# Prelegal Project

## Overview

This is a Saas product to allow users to draft legal documents based on templates in the templates directory. The user can use AI chat in order to establish what document they want and how to fill the fields. The available documents are covered in the catalog.json file in the project folder, included here :

@catalog.json

Before we start: the initial implementation is a frontend-only prototype that only supports the Mutual NDA document with no AI chat.

## Development Process

When instructed to build a feature:
    1.Use your Atlassian tools to read the feature instructions in Jira.
    2. Develop the feature - do not skip any step from the feature-dev 7 step process.
    3. Thoroughly test the feature with unit tests and integration tests and fix any issues.
    4. Submit a PR using your github tools.

## AI Design

When writing code to make calls to LLMs, use your Cerebras skill to use LiteLLM via OpenRouter to the `openrouter/openai/gpt-oss-120b` model with Cerebras as the inference provider. You should use the Structured Outputs so that you can interpret the results and populate fields in the legal document. 

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