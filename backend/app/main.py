"""
FastAPI Application Entry Point
================================
Wires together all routers, middleware, startup/shutdown events,
and global error handling.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import engine, Base
from app.inference import load_model
from app.routers import auth, inspections, dashboard

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


# ─── Lifespan (startup / shutdown) ───────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup: create DB tables + load the PyTorch model.
    Shutdown: nothing extra needed — model lives in-process.
    """
    logger.info("─── Startup: creating database tables ───")
    Base.metadata.create_all(bind=engine)

    logger.info("─── Startup: loading AI model ───")
    load_model()

    logger.info("─── Backend ready ───")
    yield
    logger.info("─── Shutdown ───")


# ─── App factory ─────────────────────────────────────────────────────────────

app = FastAPI(
    title="Steel Surface Defect Detection API",
    description=(
        "AI-powered steel defect inspection — EfficientNet-B0 classifier "
        "with Grad-CAM explainability, JWT auth, and inspection history."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── CORS ────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Static file serving (uploaded images) ───────────────────────────────────
# Accessible at /uploads/<filename>
import os
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# ─── Routers ─────────────────────────────────────────────────────────────────

app.include_router(auth.router)
app.include_router(inspections.router)
app.include_router(dashboard.router)


# ─── Health check ────────────────────────────────────────────────────────────

@app.get("/health", tags=["health"])
def health():
    return {"status": "ok", "version": "1.0.0"}

# Trigger reload
