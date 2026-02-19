from __future__ import annotations
"""FastAPI main application."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.api.chat import router as chat_router
from app.api.projects import router as projects_router
from app.api.uploads import router as uploads_router
from app.api.billing import router as billing_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    print(f"🚀 Starting {settings.app_name}")
    yield
    # Shutdown
    print(f"👋 Shutting down {settings.app_name}")


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(chat_router, prefix=f"{settings.api_prefix}/chat", tags=["Chat"])
app.include_router(projects_router, prefix=f"{settings.api_prefix}/projects", tags=["Projects"])
app.include_router(uploads_router, prefix=f"{settings.api_prefix}/uploads", tags=["Uploads"])
app.include_router(billing_router, prefix=f"{settings.api_prefix}/billing", tags=["Billing"])


@app.get("/health")
async def health_check():
    return {"status": "healthy", "app": settings.app_name}
