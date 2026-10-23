import io
import pytest
import pymupdf as fitz
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.pdf_extraction import PDFExtractionService

def create_synthetic_pdf() -> bytes:
    doc = fitz.open()
    
    # Page 1
    p1 = doc.new_page(width=612, height=792)
    # Heading
    p1.insert_text((72, 100), "MediCardia Implantable Monitor", fontsize=18)
    # Subtitle / UDI
    p1.insert_text((72, 140), "UDI: (01)00850012345678(17)281231", fontsize=10)
    p1.insert_text((72, 160), "LOT: LOT-2026-X99 | REF: MC-9002", fontsize=10)
    p1.insert_text((72, 200), "Caution: Federal law restricts this device to sale by or on the order of a physician.", fontsize=9)

    # Page 2
    p2 = doc.new_page(width=612, height=792)
    p2.insert_text((72, 100), "Manufacturer Information", fontsize=14)
    p2.insert_text((72, 130), "Manufactured by MediCardia Inc., 100 Bioscience Way, Boston, MA 02110", fontsize=10)
    p2.insert_text((72, 160), "Storage: Store between 15°C and 25°C. Keep dry.", fontsize=10)

    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes

def test_pdf_extraction_service_unit(tmp_path):
    pdf_bytes = create_synthetic_pdf()
    pdf_file = tmp_path / "synthetic_label.pdf"
    pdf_file.write_bytes(pdf_bytes)

    result = PDFExtractionService.extract_document(str(pdf_file))
    assert result["page_count"] == 2
    assert result["has_text_layer"] is True
    assert len(result["pages"]) == 2
    assert len(result["text_blocks"]) >= 3

    # Check page 1
    p1 = result["pages"][0]
    assert p1["page_number"] == 1
    assert "MediCardia Implantable Monitor" in p1["extracted_text"]
    assert p1["char_count"] > 20
    assert p1["has_text"] is True

    # Check normalized coordinates
    for block in result["text_blocks"]:
        assert 0.0 <= block["norm_x0"] <= 1.0
        assert 0.0 <= block["norm_y0"] <= 1.0
        assert 0.0 <= block["norm_x1"] <= 1.0
        assert 0.0 <= block["norm_y1"] <= 1.0
        assert block["norm_x0"] <= block["norm_x1"]
        assert block["norm_y0"] <= block["norm_y1"]

    # Check heading detection
    heading_blocks = [b for b in result["text_blocks"] if "MediCardia" in b["text"]]
    assert len(heading_blocks) > 0
    assert heading_blocks[0]["is_heading"] is True

@pytest.mark.asyncio
async def test_document_extraction_api_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        pdf_bytes = create_synthetic_pdf()
        files = {
            "file": ("cardiac_label_v1.pdf", io.BytesIO(pdf_bytes), "application/pdf")
        }
        res = await client.post("/api/documents/upload", files=files, data={"role": "baseline"})
        assert res.status_code == 201
        doc = res.json()
        doc_id = doc["id"]

        assert doc["page_count"] == 2
        assert doc["has_text_layer"] is True
        assert doc["extraction_status"] == "completed"

        # List pages
        pages_res = await client.get(f"/api/documents/{doc_id}/pages")
        assert pages_res.status_code == 200
        pages = pages_res.json()
        assert len(pages) == 2
        assert pages[0]["page_number"] == 1
        assert pages[1]["page_number"] == 2

        # Page details
        page1_res = await client.get(f"/api/documents/{doc_id}/pages/1")
        assert page1_res.status_code == 200
        page1_data = page1_res.json()
        assert "MediCardia" in page1_data["page"]["extracted_text"]
        assert len(page1_data["blocks"]) > 0

        # Detail endpoint
        detail_res = await client.get(f"/api/documents/{doc_id}/detail")
        assert detail_res.status_code == 200
        detail = detail_res.json()
        assert len(detail["pages"]) == 2
        assert len(detail["text_blocks"]) > 0
