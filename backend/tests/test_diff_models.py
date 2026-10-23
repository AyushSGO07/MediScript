import pytest
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.workspace import Workspace
from app.models.project import Project
from app.models.review import Review
from app.models.finding import Finding, FindingStatus, FindingCategory
from app.models.checklist import SeverityLevel
from app.models.diff_item import DiffItem
from app.services.diff_engine import DiffType, DiffCategory
from app.schemas.diff import DiffItemCreate, DiffItemResponse, DiffSummaryResponse


@pytest.mark.asyncio
async def test_diff_item_creation_and_cascade():
    async with AsyncSessionLocal() as session:
        # Get workspace
        ws_res = await session.execute(select(Workspace).limit(1))
        ws = ws_res.scalar_one_or_none()
        if not ws:
            ws = Workspace(name="Test WS", description="Testing")
            session.add(ws)
            await session.commit()
            await session.refresh(ws)

        # Create project and review
        project = Project(workspace_id=ws.id, name="Diff Model Test Project")
        session.add(project)
        await session.commit()
        await session.refresh(project)

        review = Review(project_id=project.id, name="Diff Model Test Review")
        session.add(review)
        await session.commit()
        await session.refresh(review)

        # Create DiffItem
        token_data = [
            {"text": "Store between", "type": "equal"},
            {"text": "2-8 C", "type": "delete"},
            {"text": "15-25 C", "type": "insert"},
        ]
        diff_item = DiffItem(
            review_id=review.id,
            change_type=DiffType.MODIFIED,
            category=DiffCategory.SAFETY,
            significance="High",
            baseline_text="Store between 2-8 C",
            revised_text="Store between 15-25 C",
            baseline_page=1,
            revised_page=1,
            baseline_norm_x0=0.1,
            baseline_norm_y0=0.2,
            baseline_norm_x1=0.5,
            baseline_norm_y1=0.25,
            revised_norm_x0=0.1,
            revised_norm_y0=0.2,
            revised_norm_x1=0.5,
            revised_norm_y1=0.25,
            token_diffs=token_data,
        )
        session.add(diff_item)
        await session.commit()
        await session.refresh(diff_item)

        diff_id = diff_item.id
        assert diff_id is not None
        assert diff_item.change_type == DiffType.MODIFIED
        assert diff_item.token_diffs == token_data
        assert diff_item.is_promoted is False

        # Link finding to diff item
        finding = Finding(
            review_id=review.id,
            diff_item_id=diff_id,
            rule_key="REV_DIFF_MODIFIED",
            checklist_version_id="DEMO_V1",
            category=FindingCategory.SAFETY,
            severity=SeverityLevel.CRITICAL,
            status=FindingStatus.OPEN,
            explanation="Storage condition altered from 2-8 C to 15-25 C",
            expected_value="2-8 C",
            observed_value="15-25 C",
            document_role="revised",
            page_number=1,
            norm_x0=0.1,
            norm_y0=0.2,
            norm_x1=0.5,
            norm_y1=0.25,
        )
        session.add(finding)
        await session.flush()
        diff_item.is_promoted = True
        diff_item.promoted_finding_id = finding.id
        await session.commit()
        review_id = review.id
        finding_id = finding.id

    # Verify retrieval with relationships in fresh session
    async with AsyncSessionLocal() as session:
        rev_res = await session.execute(
            select(Review).where(Review.id == review_id)
        )
        rev_loaded = rev_res.scalar_one_or_none()
        assert rev_loaded is not None
        assert len(rev_loaded.diff_items) == 1
        assert rev_loaded.diff_items[0].is_promoted is True
        assert rev_loaded.diff_items[0].promoted_finding_id == finding_id

        # Test Cascade Delete
        await session.delete(rev_loaded)
        await session.commit()

        diff_query = await session.execute(select(DiffItem).where(DiffItem.id == diff_id))
        assert diff_query.scalar_one_or_none() is None

        finding_query = await session.execute(select(Finding).where(Finding.id == finding_id))
        assert finding_query.scalar_one_or_none() is None


def test_diff_schema_validation():
    create_payload = {
        "review_id": "rev-123",
        "change_type": "added",  # should normalize to ADDED
        "category": "Dates",
        "significance": "High",
        "revised_text": "EXP: 2029-01-01",
        "revised_page": 1,
        "token_diffs": [{"text": "EXP: 2029-01-01", "type": "insert"}],
    }

    schema = DiffItemCreate(**create_payload)
    assert schema.change_type == "ADDED"
    assert schema.category == "Dates"

    # Invalid change_type should raise ValueError
    with pytest.raises(ValueError):
        DiffItemCreate(review_id="rev-123", change_type="UNKNOWN_TYPE")


def test_diff_summary_response_schema():
    summary_data = {
        "review_id": "rev-123",
        "total_changes": 3,
        "added_count": 1,
        "deleted_count": 1,
        "modified_count": 1,
        "promoted_count": 0,
        "diff_items": [],
    }
    summary = DiffSummaryResponse(**summary_data)
    assert summary.total_changes == 3
    assert summary.added_count == 1
