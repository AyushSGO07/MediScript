import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from app.main import app
from app.db.session import AsyncSessionLocal
from app.models.project import Project
from app.models.review import Review
from app.models.finding import Finding, FindingStatus
from app.models.finding_decision import FindingDecision
from app.models.checklist import SeverityLevel
from app.models.activity import ActivityEvent
from app.db.init_db import init_db


@pytest.fixture(autouse=True)
def setup_db():
    init_db()


@pytest.mark.asyncio
async def test_decision_workflow_and_mandatory_notes():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 0. Create test project & review via API
        p_res = await client.post("/api/projects", json={"name": "Decision Test Project"})
        assert p_res.status_code == 201
        project_id = p_res.json()["id"]

        r_res = await client.post(
            "/api/reviews",
            json={
                "project_id": project_id,
                "name": "Decision Test Review",
            },
        )
        assert r_res.status_code == 201
        review_id = r_res.json()["id"]

        # Insert a Major finding and a Critical finding directly
        async with AsyncSessionLocal() as session:
            major_finding = Finding(
                review_id=review_id,
                rule_key="TEST_MAJOR_RULE",
                checklist_version_id="chk_v1",
                severity=SeverityLevel.MAJOR,
                status=FindingStatus.OPEN,
                explanation="Major finding explanation",
            )
            critical_finding = Finding(
                review_id=review_id,
                rule_key="TEST_CRITICAL_RULE",
                checklist_version_id="chk_v1",
                severity=SeverityLevel.CRITICAL,
                status=FindingStatus.OPEN,
                explanation="Critical finding explanation",
            )
            session.add_all([major_finding, critical_finding])
            await session.commit()
            await session.refresh(major_finding)
            await session.refresh(critical_finding)

            major_id = major_finding.id
            critical_id = critical_finding.id
        # 1. Major finding: Record decision without note (allowed for non-critical)
        res = await client.post(
            f"/api/findings/{major_id}/decisions",
            json={
                "new_status": "Accepted",
                "actor": "Alex Smith",
                "actor_role": "reviewer",
            },
        )
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["finding_id"] == major_id
        assert data["prior_status"] == "Open"
        assert data["new_status"] == "Accepted"
        assert data["actor"] == "Alex Smith"
        assert data["note"] is None

        # Verify finding status updated
        f_res = await client.get(f"/api/findings/{major_id}")
        assert f_res.status_code == 200
        f_data = f_res.json()
        assert f_data["status"] == "Accepted"
        assert f_data["decision_count"] == 1
        assert f_data["latest_decision"]["new_status"] == "Accepted"

        # 2. Critical finding: Attempt decision without note -> 400 Bad Request
        res_no_note = await client.post(
            f"/api/findings/{critical_id}/decisions",
            json={
                "new_status": "Accepted",
                "actor": "Dr. Sarah Lin",
            },
        )
        assert res_no_note.status_code == 400
        assert "strictly mandatory" in res_no_note.json()["detail"]

        # 3. Critical finding: Attempt decision with whitespace or too short note (< 5 chars) -> 400
        res_short = await client.post(
            f"/api/findings/{critical_id}/decisions",
            json={
                "new_status": "Resolved",
                "note": " ok ",
                "actor": "Dr. Sarah Lin",
            },
        )
        assert res_short.status_code == 400
        assert "minimum 5 characters" in res_short.json()["detail"]

        # 4. Critical finding: Record decision with valid justification note (>= 5 chars) -> 200
        valid_note = "Clinical justification: Approved under authorized deviation DEV-2026-09."
        res_valid = await client.post(
            f"/api/findings/{critical_id}/decisions",
            json={
                "new_status": "Under Investigation",
                "note": valid_note,
                "actor": "Dr. Sarah Lin",
                "actor_role": "quality_lead",
            },
        )
        assert res_valid.status_code == 200
        crit_dec = res_valid.json()
        assert crit_dec["finding_id"] == critical_id
        assert crit_dec["prior_status"] == "Open"
        assert crit_dec["new_status"] == "Under Investigation"
        assert crit_dec["note"] == valid_note
        assert crit_dec["actor"] == "Dr. Sarah Lin"

        # Record second decision on Critical finding
        res_second = await client.post(
            f"/api/findings/{critical_id}/decisions",
            json={
                "new_status": "Resolved",
                "note": "Resolved after review of revised artwork batch #4.",
                "actor": "Elena Rostova",
                "actor_role": "regulatory_lead",
            },
        )
        assert res_second.status_code == 200

        # 5. Verify chronological history retrieval (newest first)
        hist_res = await client.get(f"/api/findings/{critical_id}/decisions")
        assert hist_res.status_code == 200
        history = hist_res.json()
        assert len(history) == 2
        assert history[0]["new_status"] == "Resolved"
        assert history[0]["prior_status"] == "Under Investigation"
        assert history[1]["new_status"] == "Under Investigation"
        assert history[1]["prior_status"] == "Open"

        # Verify activity log event recorded
        async with AsyncSessionLocal() as session:
            act_q = await session.execute(
                select(ActivityEvent).where(
                    ActivityEvent.event_type == "FINDING_DECISION_RECORDED",
                    ActivityEvent.review_id == review_id,
                )
            )
            act_events = act_q.scalars().all()
            assert len(act_events) == 3

        # 6. Verify Cascade Deletion: Deleting the finding cascades and deletes its decisions
        async with AsyncSessionLocal() as session:
            f_to_del = await session.get(Finding, critical_id)
            assert f_to_del is not None
            await session.delete(f_to_del)
            await session.commit()

            dec_check = await session.execute(
                select(FindingDecision).where(FindingDecision.finding_id == critical_id)
            )
            assert len(dec_check.scalars().all()) == 0
