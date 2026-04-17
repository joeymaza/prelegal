"""FastAPI app — serves API + static frontend."""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from .db import init_db
from .routers.auth import router as auth_router
from .routers.health import router as health_router

STATIC_DIR = Path(__file__).resolve().parent.parent / "frontend" / "out"


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(lifespan=lifespan)
app.include_router(auth_router, prefix="/api/auth")
app.include_router(health_router, prefix="/api")

if STATIC_DIR.exists():
    app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")
