from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.diff_item import DiffItem
from app.models.document import Document, TextBlock
from app.schemas.ai_assistance import CandidateEntitySuggestion, ClinicalImpactSummary
from app.services.ai_assistance_service import AIAssistanceService
from pydantic import BaseModel, Field

router = APIRouter(tags=["AI Assistance"])


class DiffImpactRequest(BaseModel):
    change_type: str = "MODIFIED"
    category: str = "General"
    baseline_text: Optional[str] = None
    revised_text: Optional[str] = None
    diff_id: Optional[str] = "ad-hoc"


@router.get(
    "/reviews/{review_id}/diffs/{diff_id}/impact",
    response_model=ClinicalImpactSummary,
    summary="Get clinical/regulatory impact analysis for a specific diff item",
)
async def get_diff_clinical_impact(
    review_id: str,
    diff_id: str,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(DiffItem).where(DiffItem.id == diff_id, DiffItem.review_id == review_id)
    res = await db.execute(stmt)
    diff_item = res.scalar_one_or_none()
    if not diff_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Diff item {diff_id} not found in review {review_id}",
        )

    return AIAssistanceService.analyze_diff_clinical_impact(
        change_type=diff_item.change_type,
        category=diff_item.category,
        baseline_text=diff_item.baseline_text,
        revised_text=diff_item.revised_text,
        diff_id=diff_item.id,
    )


@router.post(
    "/assistance/diff-impact",
    response_model=ClinicalImpactSummary,
    summary="Analyze clinical risk impact for arbitrary text difference",
)
async def analyze_arbitrary_diff_impact(payload: DiffImpactRequest):
    return AIAssistanceService.analyze_diff_clinical_impact(
        change_type=payload.change_type,
        category=payload.category,
        baseline_text=payload.baseline_text,
        revised_text=payload.revised_text,
        diff_id=payload.diff_id or "ad-hoc",
    )


@router.post(
    "/documents/{document_id}/suggest-entities",
    response_model=List[CandidateEntitySuggestion],
    summary="Suggest candidate entities from document text blocks",
)
async def suggest_document_entities(
    document_id: str,
    db: AsyncSession = Depends(get_db),
):
    doc_stmt = select(Document).where(Document.id == document_id)
    doc_res = await db.execute(doc_stmt)
    doc = doc_res.scalar_one_or_none()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document {document_id} not found",
        )

    stmt = select(TextBlock).where(TextBlock.document_id == document_id).order_by(TextBlock.page_number, TextBlock.block_index)
    res = await db.execute(stmt)
    blocks = res.scalars().all()

    return AIAssistanceService.suggest_entities(blocks)
