import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["engine"] == "ready"

@pytest.mark.asyncio
async def test_create_and_list_projects():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Create project
        create_payload = {
            "name": "Test CardioValve Project",
            "description": "Validation test project"
        }
        res = await client.post("/api/projects", json=create_payload, headers={"x-actor-role": "Reviewer"})
        assert res.status_code == 201
        project = res.json()
        assert project["name"] == "Test CardioValve Project"
        assert project["status"] == "active"
        project_id = project["id"]

        # Get project
        get_res = await client.get(f"/api/projects/{project_id}")
        assert get_res.status_code == 200
        assert get_res.json()["id"] == project_id

        # List projects
        list_res = await client.get("/api/projects")
        assert list_res.status_code == 200
        items = list_res.json()
        assert any(p["id"] == project_id for p in items)

        # Archive project
        archive_res = await client.post(f"/api/projects/{project_id}/archive")
        assert archive_res.status_code == 200
        assert archive_res.json()["status"] == "archived"

        # List without archived -> should not include
        list_active = await client.get("/api/projects")
        assert not any(p["id"] == project_id for p in list_active.json())

        # List with archived -> should include
        list_all = await client.get("/api/projects?include_archived=true")
        assert any(p["id"] == project_id for p in list_all.json())
