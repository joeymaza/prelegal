# Stage 1: build Next.js static export
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: backend runtime
FROM python:3.12-slim AS runtime
WORKDIR /app
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
COPY backend/ ./backend/
RUN cd backend && uv sync --frozen
COPY --from=frontend-build /app/frontend/out ./frontend/out/
COPY catalog.json ./
COPY templates/ ./templates/
RUN mkdir -p /app/data
ENV PYTHONPATH=/app
EXPOSE 8000
CMD ["backend/.venv/bin/uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
