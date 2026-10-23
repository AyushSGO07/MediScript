from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.models.project import Project
from app.models.review import Review
from app.models.activity import ActivityEvent
from app.schemas.review import ReviewCreate, ReviewUpdate, ReviewResponse
from app.schemas.stats import StatsResponse, ActivitySummary

class ReviewService:
    @staticmethod
    def _to_response(review: Review) -> ReviewResponse:
        resp = ReviewResponse.model_validate(review)
        findings = getattr(review, "findings", []) or []
        resp.findings_count = len(findings)
        resp.critical_findings_count = sum(
            1 for f in findings if getattr(f, "severity", "") == "Critical"
        )
        diff_items = getattr(review, "diff_items", []) or []
        resp.diff_count = len(diff_items)
        return resp

    @staticmethod
    async def list_reviews(
        db: AsyncSession,
        project_id: Optional[str] = None,
        status: Optional[str] = None,
    ) -> List[ReviewResponse]:
        query = select(Review).order_by(desc(Review.created_at))
        if project_id:
            query = query.where(Review.project_id == project_id)
        if status:
            query = query.where(Review.status == status)

        result = await db.execute(query)
        reviews = result.scalars().all()
        return [ReviewService._to_response(r) for r in reviews]

    @staticmethod
    async def get_review(db: AsyncSession, review_id: str) -> Optional[ReviewResponse]:
        result = await db.execute(select(Review).where(Review.id == review_id))
        review = result.scalar_one_or_none()
        if not review:
            return None
        return ReviewService._to_response(review)

    @staticmethod
    async def create_review(db: AsyncSession, data: ReviewCreate, actor: str = "System") -> ReviewResponse:
        # Verify project exists
        proj_res = await db.execute(select(Project).where(Project.id == data.project_id))
        project = proj_res.scalar_one_or_none()
        if not project:
            raise ValueError(f"Project with ID '{data.project_id}' not found.")

        review = Review(
            project_id=data.project_id,
            name=data.name.strip(),
            status="Draft",
            checklist_version_id=data.checklist_version_id,
            baseline_document_id=data.baseline_document_id,
            revised_document_id=data.revised_document_id,
        )
        db.add(review)
        await db.flush()

        # Emit activity event
        event = ActivityEvent(
            workspace_id=project.workspace_id,
            project_id=project.id,
            review_id=review.id,
            event_type="REVIEW_CREATED",
            actor=actor,
        )
        event.details = {
            "review_name": review.name,
            "project_name": project.name,
            "status": review.status,
        }
        db.add(event)
        await db.commit()
        await db.refresh(review)

        return ReviewService._to_response(review)

    @staticmethod
    async def update_review(db: AsyncSession, review_id: str, data: ReviewUpdate, actor: str = "System") -> Optional[ReviewResponse]:
        result = await db.execute(select(Review).where(Review.id == review_id))
        review = result.scalar_one_or_none()
        if not review:
            return None

        updated_fields = {}
        if data.name is not None:
            review.name = data.name.strip()
            updated_fields["name"] = review.name
        if data.status is not None:
            old_status = review.status
            review.status = data.status
            updated_fields["status"] = {"from": old_status, "to": review.status}
        if data.checklist_version_id is not None:
            review.checklist_version_id = data.checklist_version_id
            updated_fields["checklist_version_id"] = data.checklist_version_id
        if data.baseline_document_id is not None:
            review.baseline_document_id = data.baseline_document_id
            updated_fields["baseline_document_id"] = data.baseline_document_id
        if data.revised_document_id is not None:
            review.revised_document_id = data.revised_document_id
            updated_fields["revised_document_id"] = data.revised_document_id

        event = ActivityEvent(
            project_id=review.project_id,
            review_id=review.id,
            event_type="REVIEW_UPDATED",
            actor=actor,
        )
        event.details = updated_fields
        db.add(event)
        await db.commit()
        await db.refresh(review)

        return ReviewService._to_response(review)

    @staticmethod
    async def get_stats(db: AsyncSession) -> StatsResponse:
        total_projects = await db.scalar(select(func.count(Project.id)).where(Project.status != "archived")) or 0
        total_reviews = await db.scalar(select(func.count(Review.id))) or 0
        draft_reviews = await db.scalar(select(func.count(Review.id)).where(Review.status == "Draft")) or 0
        in_progress_reviews = await db.scalar(select(func.count(Review.id)).where(Review.status == "In Progress")) or 0
        completed_reviews = await db.scalar(select(func.count(Review.id)).where(Review.status == "Completed")) or 0
        archived_reviews = await db.scalar(select(func.count(Review.id)).where(Review.status == "Archived")) or 0

        # Recent activities
        act_query = select(ActivityEvent).order_by(desc(ActivityEvent.created_at)).limit(10)
        act_res = await db.execute(act_query)
        events = act_res.scalars().all()
        recent_activity = [
            ActivitySummary(
                id=e.id,
                event_type=e.event_type,
                actor=e.actor,
                timestamp=e.created_at.isoformat(),
                details=e.details
            )
            for e in events
        ]

        return StatsResponse(
            total_projects=total_projects,
            total_reviews=total_reviews,
            draft_reviews=draft_reviews,
            in_progress_reviews=in_progress_reviews,
            completed_reviews=completed_reviews,
            archived_reviews=archived_reviews,
            open_findings_count=0, # Populated as findings are created in Phase 5
            recent_activity=recent_activity,
        )
