import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.init_db import init_db
from app.db.session import AsyncSessionLocal
from app.services.activity_service import ActivityService


@pytest.fixture(autouse=True)
def setup_db():
    init_db()


@pytest.mark.asyncio
async def test_activity_service_and_query_api():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Create Project & Review for activity association
        p_res = await client.post("/api/projects", json={"name": "Audit Test Project"})
        assert p_res.status_code == 201
        project_id = p_res.json()["id"]

        r_res = await client.post(
            "/api/reviews",
            json={"project_id": project_id, "name": "Audit Test Review"},
        )
        assert r_res.status_code == 201
        review_id = r_res.json()["id"]

        # Record activity events using ActivityService
        async with AsyncSessionLocal() as session:
            await ActivityService.record_event(
                db=session,
                event_type="DOCUMENT_UPLOADED",
                actor="System Upload Worker",
                details={"filename": "stent_v1.pdf", "role": "baseline"},
                project_id=project_id,
            )
            await ActivityService.record_event(
                db=session,
                event_type="RULE_EVALUATION_COMPLETED",
                actor="Compliance Engine",
                details={"rules_evaluated": 12, "critical_issues": 2, "batch_code": "BATCH-994"},
                project_id=project_id,
                review_id=review_id,
            )
            await ActivityService.record_event(
                db=session,
                event_type="FINDING_DECISION_RECORDED",
                actor="Dr. Sarah Lin (Quality Lead)",
                details={"rule_key": "FDA_EXP_DATE_ISO", "decision": "Accepted", "justification": "Authorized under DEV-44"},
                project_id=project_id,
                review_id=review_id,
            )
            await ActivityService.record_event(
                db=session,
                event_type="DIFF_PROMOTED",
                actor="Marcus Vance",
                details={"diff_id": "diff-882", "change": "Manufacturer address amended"},
                project_id=project_id,
                review_id=review_id,
            )

        # 1. Test query all events for this review
        res_all = await client.get(f"/api/activity?review_id={review_id}")
        assert res_all.status_code == 200
        data_all = res_all.json()
        assert data_all["total"] >= 3
        assert len(data_all["items"]) >= 3

        # 2. Filter by event_type
        res_dec = await client.get(f"/api/activity?review_id={review_id}&event_type=FINDING_DECISION_RECORDED")
        assert res_dec.status_code == 200
        data_dec = res_dec.json()
        assert data_dec["total"] == 1
        assert data_dec["items"][0]["event_type"] == "FINDING_DECISION_RECORDED"
        assert data_dec["items"][0]["actor"] == "Dr. Sarah Lin (Quality Lead)"
        assert "DEV-44" in data_dec["items"][0]["details"]["justification"]

        # 3. Filter by actor substring
        res_act = await client.get(f"/api/activity?actor=Sarah")
        assert res_act.status_code == 200
        data_act = res_act.json()
        assert any(item["actor"] == "Dr. Sarah Lin (Quality Lead)" for item in data_act["items"])

        # 4. Search across JSON details payload (e.g. "BATCH-994")
        res_search = await client.get(f"/api/activity?search=BATCH-994")
        assert res_search.status_code == 200
        data_search = res_search.json()
        assert data_search["total"] >= 1
        assert any(item["details"].get("batch_code") == "BATCH-994" for item in data_search["items"])

        # 5. Test pagination limit and offset
        res_page = await client.get(f"/api/activity?review_id={review_id}&limit=2&offset=0")
        assert res_page.status_code == 200
        data_page = res_page.json()
        assert len(data_page["items"]) == 2
        assert data_page["limit"] == 2
        assert data_page["offset"] == 0

        # 6. Test summary statistics endpoint GET /api/activity/types
        res_types = await client.get("/api/activity/types")
        assert res_types.status_code == 200
        types_list = res_types.json()
        assert len(types_list) > 0
        type_names = [t["event_type"] for t in types_list]
        assert "FINDING_DECISION_RECORDED" in type_names
        assert "RULE_EVALUATION_COMPLETED" in type_names
        for t in types_list:
            assert t["count"] > 0

        # 7. Test single event retrieval GET /api/activity/{id}
        first_event_id = data_dec["items"][0]["id"]
        res_single = await client.get(f"/api/activity/{first_event_id}")
        assert res_single.status_code == 200
        single_data = res_single.json()
        assert single_data["id"] == first_event_id
        assert single_data["event_type"] == "FINDING_DECISION_RECORDED"
        assert single_data["details"]["rule_key"] == "FDA_EXP_DATE_ISO"

        # 8. Test 404 on invalid ID
        res_404 = await client.get("/api/activity/nonexistent-id-000")
        assert res_404.status_code == 404
