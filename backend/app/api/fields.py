from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.review import Review
from app.models.extracted_field import ExtractedField
from app.services.entity_service import EntityService
from app.schemas.extracted_field import (
    ExtractedFieldResponse,
    ExtractedFieldUpdateRequest,
    ReviewFieldsResponse,
)

router = APIRouter(tags=["Extracted Fields"])

@router.get("/documents/{document_id}/fields", response_model=List[ExtractedFieldResponse])
async def list_document_fields(
    document_id: str,
    db: AsyncSession = Depends(get_db),
):
    """List all extracted structured medical entities for a document."""
    fields = await EntityService.get_fields_for_document(db, document_id)
    return [ExtractedFieldResponse.model_validate(f) for f in fields]

@router.post("/documents/{document_id}/extract-fields", response_model=List[ExtractedFieldResponse])
async def trigger_document_field_extraction(
    document_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Trigger or re-run entity extraction across document text blocks."""
    fields = await EntityService.extract_and_store_entities(db, document_id)
    return [ExtractedFieldResponse.model_validate(f) for f in fields]

@router.patch("/fields/{field_id}", response_model=ExtractedFieldResponse)
async def update_field_override(
    field_id: str,
    data: ExtractedFieldUpdateRequest,
    x_actor_role: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Manually override or correct an extracted entity value with mandatory rationale.
    Preserves original extraction baseline and logs audit trail.
    """
    actor = x_actor_role or "Regulatory Reviewer"
    field = await EntityService.update_field_override(
        db=db,
        field_id=field_id,
        new_value=data.value,
        reason=data.override_reason,
        actor=actor,
    )
    return ExtractedFieldResponse.model_validate(field)

@router.post("/fields/{field_id}/revert", response_model=ExtractedFieldResponse)
async def revert_field_override(
    field_id: str,
    x_actor_role: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """Revert a manual field override back to the original extracted value."""
    actor = x_actor_role or "Regulatory Reviewer"
    field = await EntityService.revert_field_override(db=db, field_id=field_id, actor=actor)
    return ExtractedFieldResponse.model_validate(field)

@router.get("/reviews/{review_id}/fields", response_model=ReviewFieldsResponse)
async def get_review_fields(
    review_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Returns side-by-side structured entities for both baseline and revised labels
    associated with a review for comparative inspection.
    """
    rev_res = await db.execute(select(Review).where(Review.id == review_id))
    review = rev_res.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Review {review_id} not found.")

    baseline_fields: List[ExtractedField] = []
    revised_fields: List[ExtractedField] = []

    if review.baseline_document_id:
        baseline_fields = await EntityService.get_fields_for_document(db, review.baseline_document_id)

    if review.revised_document_id:
        revised_fields = await EntityService.get_fields_for_document(db, review.revised_document_id)

    return ReviewFieldsResponse(
        review_id=review.id,
        baseline_fields=[ExtractedFieldResponse.model_validate(f) for f in baseline_fields],
        revised_fields=[ExtractedFieldResponse.model_validate(f) for f in revised_fields],
    )
