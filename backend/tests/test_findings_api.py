import io
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from app.main import app
from app.db.session import AsyncSessionLocal
from app.services.checklist_service import ChecklistService
from app.models.checklist import Checklist, ChecklistVersion
from app.models.activity import ActivityEvent


@pytest_asyncio.fixture(autouse=True)
async def seed_data():
    async with AsyncSessionLocal() as session:
        await ChecklistService.seed_demonstration_checklists(session)


# Minimal synthetic PDF with medical label text
SYNTHETIC_LABEL_PDF = (
    b"%PDF-1.4\n"
    b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
    b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
    b"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<\n"
    b"/Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj\n"
    b"4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n"
    b"5 0 obj<</Length 180>>stream\n"
    b"BT\n"
    b"/F1 12 Tf\n"
    b"50 720 Td\n"
    b"(CardioStent Pro Model-X) Tj\n"
    b"0 -20 Td\n"
    b"(REF: 99482) Tj\n"
    b"0 -20 Td\n"
    b"(LOT: 48821B) Tj\n"
    b"0 -20 Td\n"
    b"(EXP: 2020-01-01) Tj\n"
    b"0 -20 Td\n"
    b"(CE 0123) Tj\n"
    b"ET\n"
    b"endstream\n"
    b"endobj\n"
    b"xref\n"
    b"0 6\n"
    b"0000000000 65535 f\n"
    b"0000000009 00000 n\n"
    b"0000000058 00000 n\n"
    b"0000000115 00000 n\n"
    b"0000000219 00000 n\n"
    b"0000000288 00000 n\n"
    b"trailer<</Size 6/Root 1 0 R>>\n"
    b"startxref\n"
    b"520\n"
    b"%%EOF\n"
)


@pytest.mark.asyncio
async def test_review_evaluation_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Create project
        p_res = await client.post("/api/projects", json={"name": "Findings Test Project"})
        assert p_res.status_code == 201
        project_id = p_res.json()["id"]

        # 2. Upload synthetic revised label PDF
        files = {
            "file": ("revised_stent_label.pdf", io.BytesIO(SYNTHETIC_LABEL_PDF), "application/pdf")
        }
        doc_res = await client.post(
            "/api/documents/upload",
            files=files,
            data={"role": "revised", "project_id": project_id},
        )
        assert doc_res.status_code == 201
        revised_doc_id = doc_res.json()["id"]

        # 3. Get demonstration FDA checklist version
        chk_res = await client.get("/api/checklists")
        fda_chk = next(c for c in chk_res.json() if "FDA 21 CFR 801/830" in c["name"])
        fda_det = (await client.get(f"/api/checklists/{fda_chk['id']}")).json()
        version_id = fda_det["versions"][0]["id"]

        # 4. Create Review
        r_res = await client.post(
            "/api/reviews",
            json={
                "project_id": project_id,
                "name": "Stent Compliance Evaluation Review",
                "checklist_version_id": version_id,
                "revised_document_id": revised_doc_id,
            },
        )
        assert r_res.status_code == 201
        review_id = r_res.json()["id"]

        # 5. Execute Evaluation
        eval_res = await client.post(f"/api/reviews/{review_id}/evaluate")
        assert eval_res.status_code == 200
        data = eval_res.json()

        assert data["review_id"] == review_id
        assert data["checklist_version_id"] == version_id
        assert data["total_rules_evaluated"] >= 8
        assert data["rules_failed"] > 0
        assert len(data["findings"]) > 0

        # Notice EXP was set to 2020-01-01 in the synthetic PDF -> expired finding must exist
        rule_keys = [f["rule_key"] for f in data["findings"]]
        assert "FDA_EXP_DATE_ISO" in rule_keys or any("EXP" in k for k in rule_keys)

        # UDI was omitted in the synthetic PDF -> missing UDI finding must exist
        assert any("UDI" in k for k in rule_keys)

        # 6. Test Idempotent Re-evaluation
        eval_res_2 = await client.post(f"/api/reviews/{review_id}/evaluate")
        assert eval_res_2.status_code == 200
        data_2 = eval_res_2.json()
        assert len(data_2["findings"]) == len(data["findings"])

        # 7. List findings with filter
        list_res = await client.get(f"/api/reviews/{review_id}/findings?severity=Critical")
        assert list_res.status_code == 200
        critical_findings = list_res.json()
        assert len(critical_findings) > 0
        assert all(f["severity"] == "Critical" for f in critical_findings)

        # 8. Get individual finding
        first_f_id = critical_findings[0]["id"]
        f_get = await client.get(f"/api/findings/{first_f_id}")
        assert f_get.status_code == 200
        assert f_get.json()["id"] == first_f_id
        assert f_get.json()["document_role"] == "revised"

        # 8b. Update finding status (Plan 07-04 triage update)
        patch_res = await client.patch(
            f"/api/findings/{first_f_id}",
            json={"status": "Accepted", "explanation": "Reviewed and accepted as minor risk."},
            headers={"X-Actor-Role": "Quality Lead"},
        )
        assert patch_res.status_code == 200
        assert patch_res.json()["status"] == "Accepted"
        assert patch_res.json()["explanation"] == "Reviewed and accepted as minor risk."

        # 9. Verify Review status was updated to In Progress and findings count populated
        rev_get = await client.get(f"/api/reviews/{review_id}")
        assert rev_get.status_code == 200
        assert rev_get.json()["status"] == "In Progress"
        assert rev_get.json()["findings_count"] == len(data["findings"])
        assert rev_get.json()["critical_findings_count"] == data["critical_count"]

        # 10. Verify Activity event was recorded
        async with AsyncSessionLocal() as db:
            act_res = await db.execute(
                select(ActivityEvent).where(
                    ActivityEvent.review_id == review_id,
                    ActivityEvent.event_type == "RULE_EVALUATION_COMPLETED",
                )
            )
            act_events = act_res.scalars().all()
            assert len(act_events) == 2
            assert act_events[-1].details["total_findings"] == len(data["findings"])
