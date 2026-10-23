import json
import re
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Header, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.review import Review
from app.services.report_service import ReportService
from app.services.activity_service import ActivityService
from app.schemas.report import ReportPreviewResponse

router = APIRouter(tags=["Reports & Audit Export"])


def sanitize_filename(name: str) -> str:
    cleaned = re.sub(r"[^\w\s-]", "", name).strip()
    return re.sub(r"[-\s]+", "_", cleaned)


@router.get("/reviews/{review_id}/reports/preview", response_model=ReportPreviewResponse)
async def get_report_preview(
    review_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get review compliance metrics, document hashes, and preview data for report generation.
    """
    try:
        return await ReportService.get_report_preview(db=db, review_id=review_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/reviews/{review_id}/reports/pdf")
async def download_pdf_report(
    review_id: str,
    reviewer_name: Optional[str] = Query(None, description="Reviewer name for formal sign-off"),
    reviewer_role: Optional[str] = Query(None, description="Reviewer role for sign-off"),
    x_actor_role: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate and stream a publication-grade ReportLab PDF audit report with cryptographic document hashes.
    """
    r_res = await db.execute(select(Review).where(Review.id == review_id))
    review = r_res.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    actor = reviewer_name or x_actor_role or "Reviewer"

    try:
        pdf_bytes = await ReportService.generate_pdf_report(
            db=db,
            review_id=review_id,
            reviewer_name=reviewer_name or x_actor_role,
            reviewer_role=reviewer_role,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF report: {str(e)}")

    # Log export event in append-only audit trail
    await ActivityService.record_event(
        db=db,
        event_type="PDF_REPORT_GENERATED",
        actor=actor,
        details={
            "review_id": review.id,
            "review_name": review.name,
            "reviewer_name": reviewer_name,
            "reviewer_role": reviewer_role,
            "file_size_bytes": len(pdf_bytes),
        },
        project_id=review.project_id,
        review_id=review.id,
    )

    clean_name = sanitize_filename(review.name)
    filename = f"MediScript_Audit_Report_{clean_name}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )


@router.get("/reviews/{review_id}/reports/json")
async def download_json_package(
    review_id: str,
    x_actor_role: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Export a structured, machine-readable JSON review package conforming to MediScript schema v1.0.
    """
    r_res = await db.execute(select(Review).where(Review.id == review_id))
    review = r_res.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    actor = x_actor_role or "Reviewer"

    try:
        package_dict = await ReportService.generate_json_package(db=db, review_id=review_id)
        json_str = json.dumps(package_dict, indent=2)
        json_bytes = json_str.encode("utf-8")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate JSON package: {str(e)}")

    # Log export event in append-only audit trail
    await ActivityService.record_event(
        db=db,
        event_type="JSON_PACKAGE_EXPORTED",
        actor=actor,
        details={
            "review_id": review.id,
            "review_name": review.name,
            "file_size_bytes": len(json_bytes),
            "schema_version": package_dict.get("schema_version"),
        },
        project_id=review.project_id,
        review_id=review.id,
    )

    clean_name = sanitize_filename(review.name)
    filename = f"MediScript_Review_Package_{clean_name}.json"

    return Response(
        content=json_bytes,
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )
