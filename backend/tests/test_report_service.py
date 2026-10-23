import io
import pytest
from httpx import AsyncClient, ASGITransport
import pymupdf as fitz
from app.main import app
from app.db.init_db import init_db
from app.db.session import AsyncSessionLocal
from app.services.report_service import ReportService
from app.models.review import Review
from app.models.document import Document
from app.models.finding import Finding, FindingStatus
from app.models.finding_decision import FindingDecision
from app.models.checklist import SeverityLevel


@pytest.fixture(autouse=True)
def setup_db():
    init_db()


@pytest.mark.asyncio
async def test_report_service_pdf_generation():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Create Project & Review
        p_res = await client.post("/api/projects", json={"name": "Report Test Project"})
        assert p_res.status_code == 201
        project_id = p_res.json()["id"]

        r_res = await client.post(
            "/api/reviews",
            json={"project_id": project_id, "name": "Report Audit Review"},
        )
        assert r_res.status_code == 201
        review_id = r_res.json()["id"]

        # Populate review with documents, findings, and decisions
        async with AsyncSessionLocal() as session:
            # Create synthetic revised document
            rev_doc = Document(
                project_id=project_id,
                review_id=review_id,
                role="revised",
                filename="cardio_stent_revised.pdf",
                original_filename="cardio_stent_revised.pdf",
                storage_path="uploads/cardio_stent_revised.pdf",
                file_size_bytes=20480,
                mime_type="application/pdf",
                sha256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                page_count=2,
                has_text_layer=True,
            )
            base_doc = Document(
                project_id=project_id,
                review_id=review_id,
                role="baseline",
                filename="cardio_stent_baseline.pdf",
                original_filename="cardio_stent_baseline.pdf",
                storage_path="uploads/cardio_stent_baseline.pdf",
                file_size_bytes=18432,
                mime_type="application/pdf",
                sha256="a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0",
                page_count=2,
                has_text_layer=True,
            )
            session.add_all([rev_doc, base_doc])
            await session.commit()
            await session.refresh(rev_doc)
            await session.refresh(base_doc)

            rev_model = await session.get(Review, review_id)
            assert rev_model is not None
            rev_model.revised_document_id = rev_doc.id
            rev_model.baseline_document_id = base_doc.id
            await session.commit()

            # Create findings
            f1 = Finding(
                review_id=review_id,
                rule_key="FDA_EXP_DATE_ISO",
                checklist_version_id="chk_v1",
                category="Dates",
                severity=SeverityLevel.CRITICAL,
                status=FindingStatus.ACCEPTED,
                explanation="Expiration date format non-compliant with ISO 8601 YYYY-MM-DD",
                expected_value="YYYY-MM-DD",
                observed_value="12/31/2026",
                page_number=1,
                document_role="revised",
                norm_x0=0.1,
                norm_y0=0.2,
                norm_x1=0.4,
                norm_y1=0.25,
            )
            session.add(f1)
            await session.commit()
            await session.refresh(f1)

            # Create decision with mandatory note
            dec = FindingDecision(
                finding_id=f1.id,
                review_id=review_id,
                prior_status=FindingStatus.OPEN,
                new_status=FindingStatus.ACCEPTED,
                actor="Dr. Sarah Lin",
                actor_role="quality_lead",
                note="Clinical justification: Approved deviation DEV-2026-99 for legacy packaging run.",
            )
            session.add(dec)
            await session.commit()

        # 1. Generate PDF Report via ReportService
        async with AsyncSessionLocal() as session:
            pdf_bytes = await ReportService.generate_pdf_report(
                db=session,
                review_id=review_id,
                reviewer_name="Dr. Sarah Lin (Regulatory Reviewer)",
                reviewer_role="Senior Regulatory Specialist",
            )

        # 2. Assertions on generated PDF
        assert pdf_bytes is not None
        assert len(pdf_bytes) > 2000
        assert pdf_bytes.startswith(b"%PDF-")

        # 3. Read back PDF text with PyMuPDF to verify content integrity
        pdf_doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        assert pdf_doc.page_count >= 1

        all_text = ""
        for page in pdf_doc:
            all_text += page.get_text()

        pdf_doc.close()

        # REPT-05: Regulatory Disclaimer
        assert "REGULATORY NOTICE" in all_text
        assert "ASSISTIVE AUDIT PROTOTYPE SUMMARY" in all_text

        # REPT-02: Metadata & SHA-256 hashes
        normalized_text = all_text.replace("\n", "")
        assert "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b" in normalized_text
        assert "cardio_stent_revised.pdf" in all_text
        assert "FDA_EXP_DATE_ISO" in all_text

        # Decision & justification note
        assert "Clinical justification" in all_text
        assert "DEV-2026-99" in all_text

        # REPT-03: Sign-Off blocks
        assert "PRIMARY REGULATORY REVIEWER" in all_text
        assert "QUALITY ASSURANCE LEAD" in all_text
        assert "Dr. Sarah Lin (Regulatory Reviewer)" in all_text


@pytest.mark.asyncio
async def test_report_service_clean_zero_findings():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        p_res = await client.post("/api/projects", json={"name": "Clean Project"})
        assert p_res.status_code == 201
        project_id = p_res.json()["id"]

        r_res = await client.post(
            "/api/reviews",
            json={"project_id": project_id, "name": "Clean Zero-Finding Review"},
        )
        assert r_res.status_code == 201
        review_id = r_res.json()["id"]

        async with AsyncSessionLocal() as session:
            pdf_bytes = await ReportService.generate_pdf_report(
                db=session,
                review_id=review_id,
            )
            assert len(pdf_bytes) > 1000

            pdf_doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            text = pdf_doc[0].get_text()
            pdf_doc.close()
            assert "Zero non-compliant findings" in text
