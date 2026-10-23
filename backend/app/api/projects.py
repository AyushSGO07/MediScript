from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse
from app.services.project_service import ProjectService

router = APIRouter(prefix="/api/projects", tags=["Projects"])

@router.get("", response_model=List[ProjectResponse])
async def list_projects(
    include_archived: bool = False,
    db: AsyncSession = Depends(get_db),
):
    return await ProjectService.list_projects(db, include_archived=include_archived)

@router.post("", response_model=ProjectResponse, status_code=201)
async def create_project(
    data: ProjectCreate,
    x_actor_role: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    actor = x_actor_role or "System"
    return await ProjectService.create_project(db, data, actor=actor)

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
):
    project = await ProjectService.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    data: ProjectUpdate,
    x_actor_role: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    actor = x_actor_role or "System"
    project = await ProjectService.update_project(db, project_id, data, actor=actor)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.post("/{project_id}/archive", response_model=ProjectResponse)
async def archive_project(
    project_id: str,
    x_actor_role: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    actor = x_actor_role or "System"
    project = await ProjectService.archive_project(db, project_id, actor=actor)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project
