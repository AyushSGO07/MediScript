import io
import hashlib
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.config import settings

MINIMAL_PDF_BYTES = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF"

@pytest.mark.asyncio
async def test_upload_valid_pdf():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        expected_hash = hashlib.sha256(MINIMAL_PDF_BYTES).hexdigest().lower()
        
        files = {
            "file": ("baseline_label.pdf", io.BytesIO(MINIMAL_PDF_BYTES), "application/pdf")
        }
        data = {
            "role": "baseline",
            "actor": "Dr. Sarah Lin",
        }
        
        response = await client.post("/api/documents/upload", files=files, data=data)
        assert response.status_code == 201
        doc = response.json()
        assert doc["original_filename"] == "baseline_label.pdf"
        assert doc["role"] == "baseline"
        assert doc["sha256"] == expected_hash
        assert doc["file_size_bytes"] == len(MINIMAL_PDF_BYTES)
        assert doc["upload_status"] == "uploaded"
        
        doc_id = doc["id"]
        
        # Test retrieving document
        get_res = await client.get(f"/api/documents/{doc_id}")
        assert get_res.status_code == 200
        assert get_res.json()["sha256"] == expected_hash

@pytest.mark.asyncio
async def test_upload_invalid_extension():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        files = {
            "file": ("notes.txt", io.BytesIO(b"Hello world"), "text/plain")
        }
        response = await client.post("/api/documents/upload", files=files, data={"role": "baseline"})
        assert response.status_code == 400
        assert "Invalid file extension" in response.json()["detail"]

@pytest.mark.asyncio
async def test_upload_invalid_magic_bytes():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        files = {
            "file": ("fake.pdf", io.BytesIO(b"Not a real PDF stream"), "application/pdf")
        }
        response = await client.post("/api/documents/upload", files=files, data={"role": "baseline"})
        assert response.status_code == 400
        assert "PDF header signature" in response.json()["detail"]

@pytest.mark.asyncio
async def test_upload_and_attach_to_review():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Create project
        proj_res = await client.post("/api/projects", json={"name": "Attach Test Project"})
        assert proj_res.status_code == 201
        project_id = proj_res.json()["id"]

        # 2. Create review
        rev_res = await client.post("/api/reviews", json={"project_id": project_id, "name": "Review for Attachment"})
        assert rev_res.status_code == 201
        review_id = rev_res.json()["id"]

        # 3. Upload document directly associated with review
        files = {
            "file": ("revised_v2.pdf", io.BytesIO(MINIMAL_PDF_BYTES), "application/pdf")
        }
        data = {
            "role": "revised",
            "review_id": review_id,
            "project_id": project_id,
        }
        upload_res = await client.post("/api/documents/upload", files=files, data=data)
        assert upload_res.status_code == 201
        doc = upload_res.json()
        assert doc["review_id"] == review_id
        doc_id = doc["id"]

        # Verify review now reflects revised_document_id
        check_rev = await client.get(f"/api/reviews/{review_id}")
        assert check_rev.status_code == 200
        assert check_rev.json()["revised_document_id"] == doc_id

        # 4. Upload another document unassociated, then attach via /attach endpoint
        files2 = {
            "file": ("baseline_v1.pdf", io.BytesIO(MINIMAL_PDF_BYTES), "application/pdf")
        }
        upload2_res = await client.post("/api/documents/upload", files=files2, data={"role": "baseline"})
        assert upload2_res.status_code == 201
        doc2_id = upload2_res.json()["id"]

        attach_res = await client.post(
            f"/api/documents/{doc2_id}/attach",
            json={"review_id": review_id, "role": "baseline"},
        )
        assert attach_res.status_code == 200

        # Verify review now has baseline_document_id
        check_rev2 = await client.get(f"/api/reviews/{review_id}")
        assert check_rev2.status_code == 200
        assert check_rev2.json()["baseline_document_id"] == doc2_id

        # Verify listing review documents
        list_docs = await client.get(f"/api/documents/review/{review_id}")
        assert list_docs.status_code == 200
        doc_ids = [d["id"] for d in list_docs.json()]
        assert doc_id in doc_ids
        assert doc2_id in doc_ids
