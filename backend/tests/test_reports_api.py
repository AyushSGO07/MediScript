import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from app.main import app
from app.db.init_db import init_db
from app.db.session import AsyncSessionLocal
from app.models.document import Document
from app.models.review import Review
from app.models.activity import ActivityEvent


@pytest.fixture(autouse=True)
def setup_db():
    init_db()


@pytest.mark.asyncio
async def test_reports_api_endpoints():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Create Project & Review
        p_res = await client.post("/api/projects", json={"name": "API Report Test Project"})
        assert p_res.status_code == 201
        project_id = p_res.json()["id"]

        r_res = await client.post(
            "/api/reviews",
            json={"project_id": project_id, "name": "API Report Review"},
        )
        assert r_res.status_code == 201
        review_id = r_res.json()["id"]

        # Attach a document
        async with AsyncSessionLocal() as session:
            doc = Document(
                project_id=project_id,
                review_id=review_id,
                role="revised",
                filename="label_v2.pdf",
                original_filename="label_v2.pdf",
                storage_path="uploads/label_v2.pdf",
                file_size_bytes=15000,
                mime_type="application/pdf",
                sha256="ffff1111222233334444555566667777888899990000aaaabbbbccccddddeeee",
                page_count=1,
                has_text_layer=True,
            )
            session.add(doc)
            await session.commit()
            await session.refresh(doc)

            rev = await session.get(Review, review_id)
            assert rev is not None
            rev.revised_document_id = doc.id
            await session.commit()

        # 1. Test Report Preview Endpoint
        prev_res = await client.get(f"/api/reviews/{review_id}/reports/preview")
        assert prev_res.status_code == 200
        prev_data = prev_res.json()
        assert prev_data["review_id"] == review_id
        assert prev_data["review_name"] == "API Report Review"
        assert "ASSISTIVE AUDIT PROTOTYPE SUMMARY" in prev_data["disclaimer"]
        assert prev_data["revised_doc"]["sha256"] == "ffff1111222233334444555566667777888899990000aaaabbbbccccddddeeee"

        # 2. Test PDF Download Endpoint
        pdf_res = await client.get(
            f"/api/reviews/{review_id}/reports/pdf?reviewer_name=Dr.+Lin&reviewer_role=Regulatory+Lead",
            headers={"X-Actor-Role": "Dr. Sarah Lin (Regulatory Reviewer)"},
        )
        assert pdf_res.status_code == 200
        assert pdf_res.headers["Content-Type"] == "application/pdf"
        assert 'attachment; filename="MediScript_Audit_Report_API_Report_Review.pdf"' in pdf_res.headers["Content-Disposition"]
        assert pdf_res.content.startswith(b"%PDF-")

        # 3. Test JSON Package Export Endpoint
        json_res = await client.get(
            f"/api/reviews/{review_id}/reports/json",
            headers={"X-Actor-Role": "Dr. Sarah Lin (Regulatory Reviewer)"},
        )
        assert json_res.status_code == 200
        assert json_res.headers["Content-Type"] == "application/json"
        assert 'attachment; filename="MediScript_Review_Package_API_Report_Review.json"' in json_res.headers["Content-Disposition"]
        pkg = json_res.json()
        assert pkg["schema_version"] == "1.0.0"
        assert pkg["review"]["id"] == review_id
        assert pkg["documents"]["revised"]["filename"] == "label_v2.pdf"

        # 4. Verify Activity Logs were recorded for both exports
        async with AsyncSessionLocal() as session:
            act_q = await session.execute(
                select(ActivityEvent).where(
                    ActivityEvent.review_id == review_id,
                    ActivityEvent.event_type.in_(["PDF_REPORT_GENERATED", "JSON_PACKAGE_EXPORTED"]),
                )
            )
            act_events = act_q.scalars().all()
            event_types = {a.event_type for a in act_events}
            assert "PDF_REPORT_GENERATED" in event_types
            assert "JSON_PACKAGE_EXPORTED" in event_types

        # 5. Verify 404 on invalid review ID
        res_404 = await client.get("/api/reviews/non-existent-id/reports/preview")
        assert res_404.status_code == 404
