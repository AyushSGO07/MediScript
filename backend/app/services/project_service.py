from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.models.project import Project
from app.models.review import Review
from app.models.activity import ActivityEvent
from app.models.workspace import Workspace
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse

class ProjectService:
    @staticmethod
    async def get_default_workspace_id(db: AsyncSession) -> str:
        result = await db.execute(select(Workspace).limit(1))
        workspace = result.scalar_one_or_none()
        if not workspace:
            workspace = Workspace(name="Tata Elxsi Lab", description="Default regulatory verification workspace")
            db.add(workspace)
            await db.flush()
        return workspace.id

    @staticmethod
    async def list_projects(db: AsyncSession, include_archived: bool = False) -> List[ProjectResponse]:
        query = select(
            Project,
            func.count(Review.id).label("review_count")
        ).outerjoin(Review, Review.project_id == Project.id).group_by(Project.id).order_by(desc(Project.created_at))

        if not include_archived:
            query = query.where(Project.status != "archived")

        result = await db.execute(query)
        rows = result.all()

        responses = []
        for project, review_count in rows:
            res = ProjectResponse.model_validate(project)
            res.review_count = review_count or 0
            responses.append(res)
        return responses

    @staticmethod
    async def get_project(db: AsyncSession, project_id: str) -> Optional[ProjectResponse]:
        query = select(
            Project,
            func.count(Review.id).label("review_count")
        ).outerjoin(Review, Review.project_id == Project.id).where(Project.id == project_id).group_by(Project.id)
        
        result = await db.execute(query)
        row = result.first()
        if not row:
            return None
        project, review_count = row
        res = ProjectResponse.model_validate(project)
        res.review_count = review_count or 0
        return res

    @staticmethod
    async def create_project(db: AsyncSession, data: ProjectCreate, actor: str = "System") -> ProjectResponse:
        workspace_id = await ProjectService.get_default_workspace_id(db)
        project = Project(
            workspace_id=workspace_id,
            name=data.name.strip(),
            description=data.description or "",
            status="active"
        )
        db.add(project)
        await db.flush()

        # Emit Activity Event
        event = ActivityEvent(
            workspace_id=workspace_id,
            project_id=project.id,
            event_type="PROJECT_CREATED",
            actor=actor,
        )
        event.details = {"project_name": project.name, "description": project.description}
        db.add(event)
        await db.commit()
        await db.refresh(project)

        res = ProjectResponse.model_validate(project)
        res.review_count = 0
        return res

    @staticmethod
    async def update_project(db: AsyncSession, project_id: str, data: ProjectUpdate, actor: str = "System") -> Optional[ProjectResponse]:
        result = await db.execute(select(Project).where(Project.id == project_id))
        project = result.scalar_one_or_none()
        if not project:
            return None

        updated_fields = {}
        if data.name is not None:
            project.name = data.name.strip()
            updated_fields["name"] = project.name
        if data.description is not None:
            project.description = data.description
            updated_fields["description"] = project.description
        if data.status is not None:
            project.status = data.status
            updated_fields["status"] = project.status

        event = ActivityEvent(
            workspace_id=project.workspace_id,
            project_id=project.id,
            event_type="PROJECT_UPDATED",
            actor=actor,
        )
        event.details = updated_fields
        db.add(event)
        await db.commit()
        await db.refresh(project)

        return await ProjectService.get_project(db, project.id)

    @staticmethod
    async def archive_project(db: AsyncSession, project_id: str, actor: str = "System") -> Optional[ProjectResponse]:
        update_data = ProjectUpdate(status="archived")
        return await ProjectService.update_project(db, project_id, update_data, actor=actor)
