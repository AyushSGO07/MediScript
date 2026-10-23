from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, desc

from app.db.session import get_db
from app.models.review import Review
from app.models.document import Document
from app.models.checklist import ChecklistVersion, ChecklistRule, VersionStatus, SeverityLevel
from app.models.extracted_field import ExtractedField
from app.models.finding import Finding, FindingStatus, FindingCategory
from app.models.activity import ActivityEvent
from app.models.project import Project
from app.services.rule_engine import RuleEngineService
from app.services.entity_service import EntityService
from app.schemas.finding import (
    FindingResponse,
    FindingUpdate,
    ReviewEvaluationResponse,
)

router = APIRouter(tags=["Findings"])


@router.post("/reviews/{review_id}/evaluate", response_model=ReviewEvaluationResponse)
async def evaluate_review(
    review_id: str,
    checklist_version_id: Optional[str] = Query(None, description="Optional override checklist version"),
    x_actor_role: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Executes deterministic compliance rule evaluation across extracted label entities
    against the active checklist version, generating structured and coordinate-linked findings.
    """
    # 1. Fetch Review
    r_res = await db.execute(select(Review).where(Review.id == review_id))
    review = r_res.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    # 2. Determine Checklist Version
    target_v_id = checklist_version_id or review.checklist_version_id
    if not target_v_id:
        # Fallback to the first available published demonstration version
        v_res = await db.execute(
            select(ChecklistVersion).where(ChecklistVersion.status == VersionStatus.PUBLISHED).limit(1)
        )
        fallback_v = v_res.scalar_one_or_none()
        if fallback_v:
            target_v_id = fallback_v.id
            review.checklist_version_id = fallback_v.id
        else:
            raise HTTPException(
                status_code=400,
                detail="Review does not have a checklist version configured. Please assign a checklist version.",
            )

    v_q = await db.execute(select(ChecklistVersion).where(ChecklistVersion.id == target_v_id))
    version = v_q.scalar_one_or_none()
    if not version:
        raise HTTPException(status_code=404, detail="Checklist version not found")

    # 3. Check Documents
    revised_doc_id = review.revised_document_id
    baseline_doc_id = review.baseline_document_id

    if not revised_doc_id:
        raise HTTPException(
            status_code=400,
            detail="Review does not have a revised label PDF document attached. Please upload a revised label to evaluate.",
        )

    # 4. Ensure entities are extracted for documents
    revised_fields_q = await db.execute(
        select(ExtractedField).where(ExtractedField.document_id == revised_doc_id)
    )
    revised_fields = revised_fields_q.scalars().all()
    if not revised_fields:
        revised_fields = await EntityService.extract_and_store_entities(db, revised_doc_id)

    baseline_fields: List[ExtractedField] = []
    if baseline_doc_id:
        base_q = await db.execute(
            select(ExtractedField).where(ExtractedField.document_id == baseline_doc_id)
        )
        baseline_fields = base_q.scalars().all()
        if not baseline_fields:
            baseline_fields = await EntityService.extract_and_store_entities(db, baseline_doc_id)

    # 5. Execute Deterministic Rule Engine
    eval_findings_data = RuleEngineService.evaluate_checklist(
        review_id=review.id,
        checklist_version=version,
        revised_fields=revised_fields,
        baseline_fields=baseline_fields,
        revised_doc_id=revised_doc_id,
        baseline_doc_id=baseline_doc_id,
    )

    # 6. Idempotently update findings table: clear old findings for review and save new
    await db.execute(delete(Finding).where(Finding.review_id == review.id))

    db_findings: List[Finding] = []
    for fd in eval_findings_data:
        db_f = Finding(
            review_id=review.id,
            rule_id=fd.rule_id,
            rule_key=fd.rule_key,
            checklist_version_id=fd.checklist_version_id,
            category=fd.category,
            severity=fd.severity,
            status=fd.status,
            explanation=fd.explanation,
            expected_value=fd.expected_value,
            observed_value=fd.observed_value,
            source_document_id=fd.source_document_id,
            document_role=fd.document_role,
            page_number=fd.page_number,
            evidence_snippet=fd.evidence_snippet,
            norm_x0=fd.norm_x0,
            norm_y0=fd.norm_y0,
            norm_x1=fd.norm_x1,
            norm_y1=fd.norm_y1,
        )
        db_findings.append(db_f)

    db.add_all(db_findings)

    # Update review status to In Progress if currently Draft
    if review.status == "Draft":
        review.status = "In Progress"

    # 7. Record Activity Event
    rules = [r for r in (version.rules or []) if r.enabled]
    crit_count = sum(1 for f in db_findings if f.severity == SeverityLevel.CRITICAL)
    maj_count = sum(1 for f in db_findings if f.severity == SeverityLevel.MAJOR)
    min_count = sum(1 for f in db_findings if f.severity == SeverityLevel.MINOR)
    failed_rule_keys = {f.rule_key for f in db_findings}
    passed_count = len(rules) - len(failed_rule_keys)

    p_res = await db.execute(select(Project).where(Project.id == review.project_id))
    project = p_res.scalar_one_or_none()

    event = ActivityEvent(
        workspace_id=project.workspace_id if project else None,
        project_id=review.project_id,
        review_id=review.id,
        event_type="RULE_EVALUATION_COMPLETED",
        actor=x_actor_role or "Regulatory Engine",
    )
    event.details = {
        "checklist_version": version.version,
        "total_rules": len(rules),
        "rules_passed": passed_count,
        "rules_failed": len(failed_rule_keys),
        "total_findings": len(db_findings),
        "critical_findings": crit_count,
        "major_findings": maj_count,
        "minor_findings": min_count,
    }
    db.add(event)

    await db.commit()

    # Re-query saved findings with IDs
    saved_q = await db.execute(
        select(Finding).where(Finding.review_id == review.id).order_by(Finding.created_at.asc())
    )
    saved_findings = saved_q.scalars().all()

    now = datetime.now(timezone.utc)
    return ReviewEvaluationResponse(
        review_id=review.id,
        checklist_version_id=version.id,
        evaluated_at=now,
        total_rules_evaluated=len(rules),
        rules_passed=passed_count,
        rules_failed=len(failed_rule_keys),
        critical_count=crit_count,
        major_count=maj_count,
        minor_count=min_count,
        findings=[FindingResponse.model_validate(f) for f in saved_findings],
    )


@router.get("/reviews/{review_id}/findings", response_model=List[FindingResponse])
async def list_review_findings(
    review_id: str,
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    document_role: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    List all findings for a review with optional multi-attribute filtering.
    """
    query = select(Finding).where(Finding.review_id == review_id)

    if status:
        query = query.where(Finding.status == status)
    if severity:
        query = query.where(Finding.severity == severity)
    if category:
        query = query.where(Finding.category == category)
    if document_role:
        query = query.where(Finding.document_role == document_role)

    severity_order = {
        SeverityLevel.CRITICAL: 1,
        SeverityLevel.MAJOR: 2,
        SeverityLevel.MINOR: 3,
    }
    query = query.order_by(Finding.created_at.asc())

    res = await db.execute(query)
    findings = res.scalars().all()
    # Sort deterministically
    sorted_findings = sorted(
        findings,
        key=lambda x: (severity_order.get(x.severity, 4), x.rule_key),
    )
    return [FindingResponse.model_validate(f) for f in sorted_findings]


@router.get("/findings/{finding_id}", response_model=FindingResponse)
async def get_finding(
    finding_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get detailed finding record by its stable ID.
    """
    res = await db.execute(select(Finding).where(Finding.id == finding_id))
    finding = res.scalar_one_or_none()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    return FindingResponse.model_validate(finding)


@router.patch("/findings/{finding_id}", response_model=FindingResponse)
async def update_finding(
    finding_id: str,
    update: FindingUpdate,
    x_actor_role: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Update finding triage status or explanation, logging an audit activity event.
    """
    res = await db.execute(select(Finding).where(Finding.id == finding_id))
    finding = res.scalar_one_or_none()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    old_status = finding.status
    if update.status is not None:
        finding.status = update.status
    if update.explanation is not None:
        finding.explanation = update.explanation

    finding.updated_at = datetime.now(timezone.utc)

    # Activity log
    actor = x_actor_role or "Reviewer"
    event = ActivityEvent(
        review_id=finding.review_id,
        event_type="FINDING_UPDATED",
        actor=actor,
        details={
            "finding_id": finding.id,
            "rule_key": finding.rule_key,
            "old_status": old_status,
            "new_status": finding.status,
        },
    )
    db.add(event)
    await db.commit()
    await db.refresh(finding)
    return FindingResponse.model_validate(finding)
