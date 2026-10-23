from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.projects import router as projects_router
from app.api.reviews import router as reviews_router
from app.api.stats import router as stats_router
from app.api.documents import router as documents_router
from app.api.fields import router as fields_router
from app.api.checklists import router as checklists_router
from app.api.findings import router as findings_router
from app.api.diff import diff_router
from app.db.init_db import init_db
from app.db.session import AsyncSessionLocal
from app.services.checklist_service import ChecklistService

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database schema and seed default workspace
    init_db()
    async with AsyncSessionLocal() as session:
        await ChecklistService.seed_demonstration_checklists(session)
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Evidence-Backed Medical Device Label Verification and Revision Intelligence API",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(projects_router)
app.include_router(reviews_router)
app.include_router(stats_router)
app.include_router(documents_router, prefix="/api/documents")
app.include_router(fields_router, prefix="/api")
app.include_router(checklists_router, prefix="/api")
app.include_router(findings_router, prefix="/api")
app.include_router(diff_router, prefix="/api")

@app.get("/api/health", tags=["System"])
async def health_check():
    return {
        "status": "ok",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "engine": "ready",
    }
