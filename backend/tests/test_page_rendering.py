import io
import pytest
import pymupdf as fitz
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.page_rendering import PageRenderingService

def create_text_pdf() -> bytes:
    doc = fitz.open()
    page = doc.new_page(width=400, height=300)
    page.insert_text((50, 50), "Preview Rendering Unit Test", fontsize=14)
    b = doc.tobytes()
    doc.close()
    return b

def create_raster_scanned_pdf() -> bytes:
    """Creates a PDF with zero extractable text (simulating scanned/raster document)."""
    doc = fitz.open()
    page = doc.new_page(width=400, height=300)
    # Draw a colored rectangle instead of inserting text
    rect = fitz.Rect(50, 50, 350, 250)
    page.draw_rect(rect, color=(0.2, 0.4, 0.8), fill=(0.9, 0.9, 0.9))
    b = doc.tobytes()
    doc.close()
    return b

def test_page_rendering_service_unit(tmp_path):
    pdf_bytes = create_text_pdf()
    pdf_file = tmp_path / "preview_test.pdf"
    pdf_file.write_bytes(pdf_bytes)

    png_bytes = PageRenderingService.render_page_preview(
        file_path=str(pdf_file),
        page_number=1,
        document_id="unit-test-doc-1",
        dpi=150,
    )

    # Standard PNG magic bytes signature
    assert png_bytes.startswith(b"\x89PNG\r\n\x1a\n")
    assert len(png_bytes) > 1000

    # Assert cache file was created
    cache_path = PageRenderingService.get_cached_preview_path("unit-test-doc-1", 1)
    assert cache_path.exists()

    # Out of range page number
    with pytest.raises(ValueError, match="out of range"):
        PageRenderingService.render_page_preview(
            file_path=str(pdf_file),
            page_number=99,
            document_id="unit-test-doc-1",
        )

@pytest.mark.asyncio
async def test_preview_endpoint_and_scanned_pdf_detection():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Test normal text PDF preview endpoint
        text_pdf_bytes = create_text_pdf()
        files = {
            "file": ("normal_label.pdf", io.BytesIO(text_pdf_bytes), "application/pdf")
        }
        upload_res = await client.post("/api/documents/upload", files=files, data={"role": "baseline"})
        assert upload_res.status_code == 201
        doc = upload_res.json()
        doc_id = doc["id"]
        assert doc["has_text_layer"] is True
        assert doc["extraction_status"] == "completed"

        # Request page 1 preview
        preview_res = await client.get(f"/api/documents/{doc_id}/pages/1/preview")
        assert preview_res.status_code == 200
        assert preview_res.headers["content-type"] == "image/png"
        assert preview_res.content.startswith(b"\x89PNG\r\n\x1a\n")

        # Request invalid page preview -> 400
        bad_preview = await client.get(f"/api/documents/{doc_id}/pages/99/preview")
        assert bad_preview.status_code == 400

        # 2. Test scanned / raster-only PDF detection
        raster_pdf_bytes = create_raster_scanned_pdf()
        files_raster = {
            "file": ("scanned_label_raster.pdf", io.BytesIO(raster_pdf_bytes), "application/pdf")
        }
        raster_res = await client.post("/api/documents/upload", files=files_raster, data={"role": "revised"})
        assert raster_res.status_code == 201
        raster_doc = raster_res.json()
        raster_id = raster_doc["id"]

        # EXTR-05: Actionable text layer missing state
        assert raster_doc["has_text_layer"] is False
        assert raster_doc["extraction_status"] == "text_layer_missing"
        assert raster_doc["page_count"] == 1

        # Previews are still viewable for scanned PDFs!
        raster_preview = await client.get(f"/api/documents/{raster_id}/pages/1/preview")
        assert raster_preview.status_code == 200
        assert raster_preview.headers["content-type"] == "image/png"
