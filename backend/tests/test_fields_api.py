import io
import pytest
import pymupdf as fitz
from httpx import AsyncClient, ASGITransport
from app.main import app

def create_labeled_pdf() -> bytes:
    doc = fitz.open()
    p1 = doc.new_page(width=600, height=400)
    p1.insert_text((50, 50), "CardioGuard Defibrillator System", fontsize=16)
    p1.insert_text((50, 80), "UDI: (01)00850099999999(17)291231(10)LOT-2026-ALPHA", fontsize=10)
    p1.insert_text((50, 105), "REF: CG-500 | SN: SN-109283", fontsize=10)
    p1.insert_text((50, 130), "CE 2797 STERILE EO", fontsize=10)
    p1.insert_text((50, 160), "Manufactured by CardioGuard Labs, 500 Technology Way, Cambridge, MA", fontsize=10)
    p1.insert_text((50, 190), "Caution: Federal law restricts this device to sale by or on the order of a physician.", fontsize=9)
    p1.insert_text((50, 215), "Storage: Store between 15°C and 25°C. Keep dry.", fontsize=9)
    b = doc.tobytes()
    doc.close()
    return b

@pytest.mark.asyncio
async def test_entity_extraction_and_override_lifecycle():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Upload PDF
        pdf_bytes = create_labeled_pdf()
        files = {
            "file": ("cardioguard_label.pdf", io.BytesIO(pdf_bytes), "application/pdf")
        }
        res = await client.post("/api/documents/upload", files=files, data={"role": "baseline"})
        assert res.status_code == 201
        doc = res.json()
        doc_id = doc["id"]

        # 2. Query extracted fields
        fields_res = await client.get(f"/api/documents/{doc_id}/fields")
        assert fields_res.status_code == 200
        fields = fields_res.json()
        assert len(fields) >= 10

        field_map = {f["field_key"]: f for f in fields}
        
        # Verify UDI DI
        assert field_map["udi_di"]["confidence_state"] == "EXTRACTED"
        assert field_map["udi_di"]["value"] == "00850099999999"
        assert field_map["udi_di"]["norm_x0"] is not None

        # Verify LOT
        assert field_map["lot_batch"]["confidence_state"] == "EXTRACTED"
        assert field_map["lot_batch"]["value"] == "LOT-2026-ALPHA"

        # Verify REF
        assert field_map["model_ref"]["confidence_state"] == "EXTRACTED"
        assert field_map["model_ref"]["value"] == "CG-500"

        # Verify CE and Notified Body
        assert field_map["ce_mark"]["confidence_state"] == "EXTRACTED"
        assert field_map["notified_body_id"]["value"] == "2797"

        # Verify Expiry Date normalized
        assert field_map["expiration_date"]["confidence_state"] == "EXTRACTED"
        assert field_map["expiration_date"]["normalized_value"] == "2029-12-31"

        lot_field = field_map["lot_batch"]
        lot_id = lot_field["id"]

        # 3. Test override validation: missing reason fails 422
        bad_override = await client.patch(
            f"/api/fields/{lot_id}",
            json={"value": "LOT-CORRECTED", "override_reason": "no"},  # < 3 chars
        )
        assert bad_override.status_code == 422

        # 4. Valid manual override
        override_res = await client.patch(
            f"/api/fields/{lot_id}",
            json={"value": "LOT-CORRECTED-999", "override_reason": "Correction per ERP batch release log"},
            headers={"x-actor-role": "Dr. Sarah Lin (Regulatory Reviewer)"},
        )
        assert override_res.status_code == 200
        updated = override_res.json()
        assert updated["value"] == "LOT-CORRECTED-999"
        assert updated["original_value"] == "LOT-2026-ALPHA"
        assert updated["is_overridden"] is True
        assert updated["override_reason"] == "Correction per ERP batch release log"
        assert updated["reviewed_by"] == "Dr. Sarah Lin (Regulatory Reviewer)"

        # 5. Revert override
        revert_res = await client.post(
            f"/api/fields/{lot_id}/revert",
            headers={"x-actor-role": "Dr. Sarah Lin (Regulatory Reviewer)"},
        )
        assert revert_res.status_code == 200
        reverted = revert_res.json()
        assert reverted["value"] == "LOT-2026-ALPHA"
        assert reverted["is_overridden"] is False

@pytest.mark.asyncio
async def test_review_side_by_side_fields():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Create project and review
        p_res = await client.post("/api/projects", json={"name": "Comparison Project"})
        project_id = p_res.json()["id"]

        r_res = await client.post("/api/reviews", json={"project_id": project_id, "name": "Delta Review"})
        review_id = r_res.json()["id"]

        # Upload baseline
        pdf_bytes = create_labeled_pdf()
        f_base = {"file": ("base.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
        base_res = await client.post("/api/documents/upload", files=f_base, data={"role": "baseline", "review_id": review_id})
        assert base_res.status_code == 201

        # Query review fields
        rev_fields_res = await client.get(f"/api/reviews/{review_id}/fields")
        assert rev_fields_res.status_code == 200
        data = rev_fields_res.json()
        assert data["review_id"] == review_id
        assert len(data["baseline_fields"]) > 0
