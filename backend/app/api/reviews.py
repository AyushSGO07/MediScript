from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.review import ReviewCreate, ReviewUpdate, ReviewResponse
from app.services.review_service import ReviewService

router = APIRouter(prefix="/api/reviews", tags=["Reviews"])

@router.get("", response_model=List[ReviewResponse])
async def list_reviews(
    project_id: Optional[str] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    return await ReviewService.list_reviews(db, project_id=project_id, status=status)

@router.post("", response_model=ReviewResponse, status_code=201)
async def create_review(
    data: ReviewCreate,
    x_actor_role: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    actor = x_actor_role or "System"
    try:
        return await ReviewService.create_review(db, data, actor=actor)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{review_id}", response_model=ReviewResponse)
async def get_review(
    review_id: str,
    db: AsyncSession = Depends(get_db),
):
    review = await ReviewService.get_review(db, review_id)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    return review

@router.patch("/{review_id}", response_model=ReviewResponse)
async def update_review(
    review_id: str,
    data: ReviewUpdate,
    x_actor_role: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    actor = x_actor_role or "System"
    review = await ReviewService.update_review(db, review_id, data, actor=actor)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    return review
