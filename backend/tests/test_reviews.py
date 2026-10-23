import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_create_and_manage_reviews():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Create a parent project
        p_res = await client.post("/api/projects", json={"name": "Review Parent Project"})
        assert p_res.status_code == 201
        project_id = p_res.json()["id"]

        # Create review
        review_payload = {
            "project_id": project_id,
            "name": "Catheter Label Review 2026",
            "checklist_version_id": "demo-v1.0"
        }
        r_res = await client.post("/api/reviews", json=review_payload)
        assert r_res.status_code == 201
        review = r_res.json()
        assert review["name"] == "Catheter Label Review 2026"
        assert review["status"] == "Draft"
        review_id = review["id"]

        # Update review status
        patch_res = await client.patch(f"/api/reviews/{review_id}", json={"status": "In Progress"})
        assert patch_res.status_code == 200
        assert patch_res.json()["status"] == "In Progress"

        # List reviews filtered by project
        list_res = await client.get(f"/api/reviews?project_id={project_id}")
        assert list_res.status_code == 200
        items = list_res.json()
        assert len(items) >= 1
        assert any(r["id"] == review_id for r in items)

        # Check stats endpoint
        stats_res = await client.get("/api/stats")
        assert stats_res.status_code == 200
        stats = stats_res.json()
        assert stats["total_reviews"] >= 1
        assert stats["in_progress_reviews"] >= 1
