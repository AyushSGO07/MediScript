from typing import Optional, List, Tuple, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, desc
from app.models.activity import ActivityEvent
from app.models.project import Project
from app.models.review import Review


class ActivityService:
    @staticmethod
    async def record_event(
        db: AsyncSession,
        event_type: str,
        actor: str = "System",
        details: Optional[Dict[str, Any]] = None,
        workspace_id: Optional[str] = None,
        project_id: Optional[str] = None,
        review_id: Optional[str] = None,
        commit: bool = True,
    ) -> ActivityEvent:
        """
        Persists an immutable activity event into the append-only audit trail.
        """
        # Automatically resolve project_id / workspace_id if missing
        if review_id and not project_id:
            r_res = await db.execute(select(Review).where(Review.id == review_id))
            review = r_res.scalar_one_or_none()
            if review:
                project_id = review.project_id

        if project_id and not workspace_id:
            p_res = await db.execute(select(Project).where(Project.id == project_id))
            proj = p_res.scalar_one_or_none()
            if proj:
                workspace_id = proj.workspace_id

        event = ActivityEvent(
            workspace_id=workspace_id,
            project_id=project_id,
            review_id=review_id,
            event_type=event_type,
            actor=actor or "System",
        )
        event.details = details or {}

        db.add(event)
        if commit:
            await db.commit()
            await db.refresh(event)

        return event

    @staticmethod
    async def query_events(
        db: AsyncSession,
        project_id: Optional[str] = None,
        review_id: Optional[str] = None,
        event_type: Optional[str] = None,
        actor: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[ActivityEvent], int]:
        """
        Multi-attribute search and pagination over the immutable activity audit log.
        """
        query = select(ActivityEvent)
        count_query = select(func.count(ActivityEvent.id))

        conditions = []

        if project_id:
            conditions.append(ActivityEvent.project_id == project_id)
        if review_id:
            conditions.append(ActivityEvent.review_id == review_id)
        if event_type:
            conditions.append(ActivityEvent.event_type == event_type)
        if actor:
            conditions.append(ActivityEvent.actor.ilike(f"%{actor.strip()}%"))
        if search:
            term = f"%{search.strip()}%"
            conditions.append(
                or_(
                    ActivityEvent.event_type.ilike(term),
                    ActivityEvent.actor.ilike(term),
                    ActivityEvent._details.ilike(term),
                )
            )

        if conditions:
            for cond in conditions:
                query = query.where(cond)
                count_query = count_query.where(cond)

        # Get total count
        count_res = await db.execute(count_query)
        total = count_res.scalar_one() or 0

        # Deterministic ordering by created_at desc
        query = query.order_by(desc(ActivityEvent.created_at)).limit(limit).offset(offset)
        res = await db.execute(query)
        events = res.scalars().all()

        return list(events), total

    @staticmethod
    async def get_types_summary(db: AsyncSession) -> List[Dict[str, Any]]:
        """
        Returns breakdown of event types with counts.
        """
        q = (
            select(ActivityEvent.event_type, func.count(ActivityEvent.id).label("count"))
            .group_by(ActivityEvent.event_type)
            .order_by(desc("count"))
        )
        res = await db.execute(q)
        rows = res.all()
        return [{"event_type": row[0], "count": row[1]} for row in rows]

    @staticmethod
    async def get_event_by_id(db: AsyncSession, event_id: str) -> Optional[ActivityEvent]:
        """
        Retrieve single event by primary key.
        """
        res = await db.execute(select(ActivityEvent).where(ActivityEvent.id == event_id))
        return res.scalar_one_or_none()
