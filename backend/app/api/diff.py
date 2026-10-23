from typing import List, Optional
from fastapi import APIRouter, Depends, Header, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.services.diff_service import DiffService
from app.schemas.diff import DiffSummaryResponse, DiffItemResponse, DiffPromoteRequest
from app.schemas.finding import FindingResponse

diff_router = APIRouter(tags=["Revision Diff"])


@diff_router.post(
    "/reviews/{review_id}/diff/generate",
    response_model=DiffSummaryResponse,
    summary="Generate deterministic revision diff for a review",
)
async def generate_review_diff(
    review_id: str,
    db: AsyncSession = Depends(get_db),
    x_actor_role: str = Header(default="Dr. Sarah Lin (Regulatory Reviewer)"),
):
    return await DiffService.generate_diff_for_review(review_id, db, actor=x_actor_role)


@diff_router.get(
    "/reviews/{review_id}/diff",
    response_model=List[DiffItemResponse],
    summary="List revision diff items for a review with filtering",
)
async def list_review_diff_items(
    review_id: str,
    change_type: Optional[str] = Query(None, description="Filter by change type (ADDED, DELETED, MODIFIED)"),
    category: Optional[str] = Query(None, description="Filter by label category"),
    page_number: Optional[int] = Query(None, description="Filter by page number"),
    is_promoted: Optional[bool] = Query(None, description="Filter by whether diff has been promoted to a finding"),
    db: AsyncSession = Depends(get_db),
):
    items = await DiffService.get_diff_items(
        review_id=review_id,
        db=db,
        change_type=change_type,
        category=category,
        page_number=page_number,
        is_promoted=is_promoted,
    )
    return [DiffItemResponse.model_validate(item) for item in items]


@diff_router.post(
    "/reviews/{review_id}/diff/{diff_id}/promote",
    summary="Promote a revision diff item into a formal compliance finding",
)
async def promote_diff_item(
    review_id: str,
    diff_id: str,
    req: DiffPromoteRequest,
    db: AsyncSession = Depends(get_db),
    x_actor_role: str = Header(default="Dr. Sarah Lin (Regulatory Reviewer)"),
):
    finding, diff_item = await DiffService.promote_diff_to_finding(
        review_id=review_id,
        diff_id=diff_id,
        req=req,
        actor=x_actor_role,
        db=db,
    )
    return {
        "finding": FindingResponse.model_validate(finding),
        "diff_item": DiffItemResponse.model_validate(diff_item),
    }
