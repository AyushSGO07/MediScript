import io
import pytest
import pymupdf as fitz
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from app.main import app
from app.db.session import AsyncSessionLocal
from app.models.activity import ActivityEvent


def make_pdf(lines: list[str]) -> bytes:
    doc = fitz.open()
    page = doc.new_page(width=612, height=792)
    y = 60
    for line in lines:
        page.insert_text((50, y), line, fontsize=12)
        y += 40
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


@pytest.mark.asyncio
async def test_revision_diff_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Create project
        p_res = await client.post("/api/projects", json={"name": "Diff Test Project"})
        assert p_res.status_code == 201
        project_id = p_res.json()["id"]

        # 2. Upload baseline document
        base_pdf = make_pdf([
            "CardioFix Drug-Eluting Stent",
            "REF: CF-7700",
            "LOT: 99482",
            "Store between 2-8 C in a dry place.",
            "Manufactured by: CardioFix Health Inc.",
        ])
        base_doc_res = await client.post(
            "/api/documents/upload",
            files={"file": ("baseline_label.pdf", io.BytesIO(base_pdf), "application/pdf")},
            data={"role": "baseline", "project_id": project_id},
        )
        assert base_doc_res.status_code == 201
        baseline_doc_id = base_doc_res.json()["id"]

        # 3. Upload revised document with modifications and additions
        rev_pdf = make_pdf([
            "CardioFix Drug-Eluting Stent",
            "REF: CF-7700",
            "LOT: 99482",
            "Store between 15-25 C in a dry place.",
            "Warning: Do not freeze or expose to moisture.",
            "Manufactured by: CardioFix Health Inc.",
        ])
        rev_doc_res = await client.post(
            "/api/documents/upload",
            files={"file": ("revised_label.pdf", io.BytesIO(rev_pdf), "application/pdf")},
            data={"role": "revised", "project_id": project_id},
        )
        assert rev_doc_res.status_code == 201
        revised_doc_id = rev_doc_res.json()["id"]

        # 4. Create Review
        r_res = await client.post(
            "/api/reviews",
            json={
                "project_id": project_id,
                "name": "Stent Revision Diff Review",
                "baseline_document_id": baseline_doc_id,
                "revised_document_id": revised_doc_id,
            },
        )
        assert r_res.status_code == 201
        review_id = r_res.json()["id"]

        # 5. Generate revision diff
        diff_res = await client.post(f"/api/reviews/{review_id}/diff/generate")
        assert diff_res.status_code == 200
        diff_data = diff_res.json()

        assert diff_data["review_id"] == review_id
        assert diff_data["total_changes"] >= 2
        assert diff_data["modified_count"] >= 1

        # Check items
        items = diff_data["diff_items"]
        assert len(items) >= 2

        # Find the modified item: storage condition
        mod_item = next(
            (item for item in items if item["change_type"] == "MODIFIED" and "Store" in (item["baseline_text"] or "")),
            None,
        )
        assert mod_item is not None
        assert "2-8" in mod_item["baseline_text"]
        assert "15-25" in mod_item["revised_text"]
        assert mod_item["category"] == "Safety"
        assert mod_item["significance"] == "High"
        assert mod_item["baseline_page"] == 1
        assert mod_item["revised_page"] == 1
        assert mod_item["is_promoted"] is False

        # 6. Filter diff items
        filter_res = await client.get(f"/api/reviews/{review_id}/diff?change_type=MODIFIED")
        assert filter_res.status_code == 200
        filtered_items = filter_res.json()
        assert len(filtered_items) >= 1
        assert all(i["change_type"] == "MODIFIED" for i in filtered_items)

        # 7. Promote diff to formal compliance finding
        promote_res = await client.post(
            f"/api/reviews/{review_id}/diff/{mod_item['id']}/promote",
            json={
                "severity": "Critical",
                "explanation": "Storage condition changed without regulatory amendment approval.",
            },
        )
        assert promote_res.status_code == 200
        promote_data = promote_res.json()
        promoted_finding = promote_data["finding"]
        updated_diff = promote_data["diff_item"]

        assert updated_diff["is_promoted"] is True
        assert updated_diff["promoted_finding_id"] == promoted_finding["id"]
        assert promoted_finding["severity"] == "Critical"
        assert promoted_finding["diff_item_id"] == mod_item["id"]
        assert promoted_finding["category"] == "Safety"
        assert promoted_finding["expected_value"] == mod_item["baseline_text"]
        assert promoted_finding["observed_value"] == mod_item["revised_text"]

        # 8. Re-running diff generation preserves promoted state
        re_diff_res = await client.post(f"/api/reviews/{review_id}/diff/generate")
        assert re_diff_res.status_code == 200
        re_items = re_diff_res.json()["diff_items"]
        re_mod = next(
            i for i in re_items if i["change_type"] == "MODIFIED" and "Store" in (i["baseline_text"] or "")
        )
        assert re_mod["is_promoted"] is True
        assert re_mod["promoted_finding_id"] == promoted_finding["id"]

        # 9. Verify Review diff_count was populated
        rev_get = await client.get(f"/api/reviews/{review_id}")
        assert rev_get.status_code == 200
        assert rev_get.json()["diff_count"] >= 2
        assert rev_get.json()["findings_count"] >= 1

        # 10. Verify activity events logged
        async with AsyncSessionLocal() as db:
            act_diff = await db.execute(
                select(ActivityEvent).where(
                    ActivityEvent.review_id == review_id,
                    ActivityEvent.event_type == "DIFF_GENERATION_COMPLETED",
                )
            )
            assert len(act_diff.scalars().all()) == 2  # generated twice

            act_promoted = await db.execute(
                select(ActivityEvent).where(
                    ActivityEvent.review_id == review_id,
                    ActivityEvent.event_type == "DIFF_ITEM_PROMOTED",
                )
            )
            assert act_promoted.scalar_one_or_none() is not None
