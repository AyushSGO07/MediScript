import pytest
from datetime import datetime, timezone
from sqlalchemy import select
from pydantic import ValidationError
from app.db.session import AsyncSessionLocal
from app.models.workspace import Workspace
from app.models.project import Project
from app.models.review import Review
from app.models.checklist import ChecklistRule, SeverityLevel, RuleType
from app.models.finding import Finding, FindingStatus, FindingCategory
from app.schemas.finding import (
    FindingCreate,
    FindingUpdate,
    FindingResponse,
    ReviewEvaluationResponse,
)


@pytest.mark.asyncio
async def test_finding_model_creation_and_cascade():
    async with AsyncSessionLocal() as db:
        # Get Workspace
        ws_res = await db.execute(select(Workspace).limit(1))
        ws = ws_res.scalar_one_or_none()
        if not ws:
            ws = Workspace(name="Test Workspace")
            db.add(ws)
            await db.flush()

        # Create Project & Review
        project = Project(name="Finding Test Project", workspace_id=ws.id)
        db.add(project)
        await db.flush()

        review = Review(
            project_id=project.id,
            name="Finding Test Review",
            checklist_version_id="chk_v1",
        )
        db.add(review)
        await db.flush()

        # Create Finding
        finding = Finding(
            review_id=review.id,
            rule_key="FDA_UDI_DI_REQUIRED",
            checklist_version_id="chk_v1",
            category=FindingCategory.IDENTIFIERS,
            severity=SeverityLevel.CRITICAL,
            status=FindingStatus.OPEN,
            explanation="Device identifier is missing on revised label.",
            expected_value="GS1 (01) 14-digit DI",
            observed_value="NOT_FOUND",
            document_role="revised",
            page_number=1,
            evidence_snippet="LOT: 49921 EXP: 2026-12",
            norm_x0=0.1,
            norm_y0=0.2,
            norm_x1=0.8,
            norm_y1=0.3,
        )
        db.add(finding)
        await db.commit()
        await db.refresh(finding)

        assert finding.id is not None
        assert finding.rule_key == "FDA_UDI_DI_REQUIRED"
        assert finding.severity == SeverityLevel.CRITICAL
        assert finding.status == FindingStatus.OPEN
        assert finding.norm_x0 == 0.1

        # Query finding via review relationship
        rev_q = await db.execute(select(Review).where(Review.id == review.id))
        fetched_rev = rev_q.scalar_one()
        assert len(fetched_rev.findings) == 1
        assert fetched_rev.findings[0].id == finding.id

        # Delete review and verify cascade
        await db.delete(project)  # cascades to review and findings
        await db.commit()

        f_check = await db.execute(select(Finding).where(Finding.id == finding.id))
        assert f_check.scalar_one_or_none() is None


def test_finding_schema_validation():
    # Valid finding create
    f = FindingCreate(
        review_id="rev_123",
        rule_key="EXP_DATE_INVALID",
        checklist_version_id="chk_v1",
        category="Dates",
        severity="critical",
        status="open",
        explanation="Date is not ISO compliant",
        expected_value="YYYY-MM-DD",
        observed_value="12/31/26",
        page_number=1,
        norm_x0=0.15,
        norm_y0=0.25,
        norm_x1=0.75,
        norm_y1=0.35,
    )
    assert f.severity == "Critical"
    assert f.status == "Open"
    assert f.norm_x0 == 0.15

    # Under Investigation special status normalization
    f_under = FindingCreate(
        review_id="rev_123",
        rule_key="LOT_CHECK",
        checklist_version_id="chk_v1",
        explanation="Lot number discrepancy",
        status="under investigation",
    )
    assert f_under.status == "Under Investigation"

    # Invalid status
    with pytest.raises(ValidationError):
        FindingCreate(
            review_id="rev_123",
            rule_key="LOT_CHECK",
            checklist_version_id="chk_v1",
            explanation="Invalid status test",
            status="InvalidState",
        )

    # Invalid severity
    with pytest.raises(ValidationError):
        FindingCreate(
            review_id="rev_123",
            rule_key="LOT_CHECK",
            checklist_version_id="chk_v1",
            explanation="Invalid severity test",
            severity="Blocker",
        )


def test_review_evaluation_response_schema():
    now = datetime.now(timezone.utc)
    resp = ReviewEvaluationResponse(
        review_id="rev_100",
        checklist_version_id="v1.0.0",
        evaluated_at=now,
        total_rules_evaluated=10,
        rules_passed=8,
        rules_failed=2,
        critical_count=1,
        major_count=1,
        minor_count=0,
        findings=[
            FindingResponse(
                id="f_1",
                review_id="rev_100",
                rule_key="UDI_REQ",
                checklist_version_id="v1.0.0",
                category="Identifiers",
                severity="Critical",
                status="Open",
                explanation="UDI missing",
                created_at=now,
                updated_at=now,
            )
        ],
    )
    assert resp.total_rules_evaluated == 10
    assert resp.rules_failed == 2
    assert len(resp.findings) == 1
    assert resp.findings[0].severity == "Critical"
