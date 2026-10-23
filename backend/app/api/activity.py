from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.services.activity_service import ActivityService
from app.schemas.activity import (
    ActivityEventResponse,
    ActivityListResponse,
    ActivityTypeCount,
)

router = APIRouter(prefix="/activity", tags=["Activity Audit Trail"])


@router.get("", response_model=ActivityListResponse)
async def list_activity_events(
    project_id: Optional[str] = Query(None, description="Filter by project ID"),
    review_id: Optional[str] = Query(None, description="Filter by review ID"),
    event_type: Optional[str] = Query(None, description="Filter by exact event type"),
    actor: Optional[str] = Query(None, description="Filter by actor name (substring match)"),
    search: Optional[str] = Query(None, description="Full-text search in event type, actor, or details"),
    limit: int = Query(50, ge=1, le=200, description="Items per page"),
    offset: int = Query(0, ge=0, description="Offset"),
    db: AsyncSession = Depends(get_db),
):
    """
    Query the append-only activity audit trail with multi-attribute filtering, search, and pagination.
    """
    events, total = await ActivityService.query_events(
        db=db,
        project_id=project_id,
        review_id=review_id,
        event_type=event_type,
        actor=actor,
        search=search,
        limit=limit,
        offset=offset,
    )
    return ActivityListResponse(
        total=total,
        items=[ActivityEventResponse.model_validate(e) for e in events],
        limit=limit,
        offset=offset,
    )


@router.get("/types", response_model=List[ActivityTypeCount])
async def get_activity_types_summary(
    db: AsyncSession = Depends(get_db),
):
    """
    Summary breakdown of distinct event types and counts for audit dashboard filters.
    """
    rows = await ActivityService.get_types_summary(db=db)
    return [ActivityTypeCount(event_type=r["event_type"], count=r["count"]) for r in rows]


@router.get("/{event_id}", response_model=ActivityEventResponse)
async def get_activity_event(
    event_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve single activity event record with structured JSON payload.
    """
    event = await ActivityService.get_event_by_id(db=db, event_id=event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Activity event not found")
    return ActivityEventResponse.model_validate(event)
