import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.init_db import init_db
from app.db.session import AsyncSessionLocal
from app.services.report_service import ReportService
from app.schemas.report import ReviewPackageExportResponse
from app.models.review import Review
from app.models.document import Document
from app.models.finding import Finding, FindingStatus
from app.models.finding_decision import FindingDecision
from app.models.checklist import SeverityLevel


@pytest.fixture(autouse=True)
def setup_db():
    init_db()


@pytest.mark.asyncio
async def test_report_service_json_package():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Create Project & Review
        p_res = await client.post("/api/projects", json={"name": "JSON Package Project"})
        assert p_res.status_code == 201
        project_id = p_res.json()["id"]

        r_res = await client.post(
            "/api/reviews",
            json={"project_id": project_id, "name": "JSON Package Review"},
        )
        assert r_res.status_code == 201
        review_id = r_res.json()["id"]

        # Populate review with documents, findings, and decisions
        async with AsyncSessionLocal() as session:
            rev_doc = Document(
                project_id=project_id,
                review_id=review_id,
                role="revised",
                filename="cardio_stent_revised.pdf",
                original_filename="cardio_stent_revised.pdf",
                storage_path="uploads/cardio_stent_revised.pdf",
                file_size_bytes=24500,
                mime_type="application/pdf",
                sha256="77f88a99b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8",
                page_count=3,
                has_text_layer=True,
            )
            base_doc = Document(
                project_id=project_id,
                review_id=review_id,
                role="baseline",
                filename="cardio_stent_baseline.pdf",
                original_filename="cardio_stent_baseline.pdf",
                storage_path="uploads/cardio_stent_baseline.pdf",
                file_size_bytes=22300,
                mime_type="application/pdf",
                sha256="11a22b33c44d55e66f77a88b99c00d11e22f33a44b55c66d77e88f99a00b11c2",
                page_count=3,
                has_text_layer=True,
            )
            session.add_all([rev_doc, base_doc])
            await session.commit()

            rev_model = await session.get(Review, review_id)
            assert rev_model is not None
            rev_model.revised_document_id = rev_doc.id
            rev_model.baseline_document_id = base_doc.id
            await session.commit()

            # Create finding
            f1 = Finding(
                review_id=review_id,
                rule_key="UDI_DI_FORMAT",
                checklist_version_id="chk_v1",
                category="Identifiers",
                severity=SeverityLevel.CRITICAL,
                status=FindingStatus.UNDER_INVESTIGATION,
                explanation="UDI Device Identifier syntax does not conform to GS1 AI (01) specifications.",
                page_number=1,
                document_role="revised",
                norm_x0=0.05,
                norm_y0=0.15,
                norm_x1=0.45,
                norm_y1=0.22,
            )
            session.add(f1)
            await session.commit()
            await session.refresh(f1)

            # Decision
            dec = FindingDecision(
                finding_id=f1.id,
                review_id=review_id,
                prior_status=FindingStatus.OPEN,
                new_status=FindingStatus.UNDER_INVESTIGATION,
                actor="Elena Rostova (Regulatory Affairs)",
                actor_role="reviewer",
                note="Escalated to Packaging Engineering for verification of GS1 check digit algorithm.",
            )
            session.add(dec)
            await session.commit()

        # 1. Generate JSON Package via ReportService
        async with AsyncSessionLocal() as session:
            pkg = await ReportService.generate_json_package(db=session, review_id=review_id)

        # 2. Schema validation
        validated = ReviewPackageExportResponse.model_validate(pkg)
        assert validated.schema_version == "1.0.0"
        assert validated.system == "MediScript Verification Engine"

        # 3. Disclaimers & metadata (REPT-04, REPT-05)
        assert "ASSISTIVE AUDIT PROTOTYPE SUMMARY" in validated.disclaimer
        assert validated.project["name"] == "JSON Package Project"
        assert validated.review["name"] == "JSON Package Review"

        # 4. Cryptographic Provenance (REPT-02)
        assert validated.documents["revised"]["sha256"] == "77f88a99b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8"
        assert validated.documents["baseline"]["sha256"] == "11a22b33c44d55e66f77a88b99c00d11e22f33a44b55c66d77e88f99a00b11c2"

        # 5. Findings & Decisions
        assert len(validated.compliance_findings) == 1
        finding_data = validated.compliance_findings[0]
        assert finding_data["rule_key"] == "UDI_DI_FORMAT"
        assert finding_data["coordinates"]["norm_x0"] == 0.05
        assert len(finding_data["decisions"]) == 1
        assert "Packaging Engineering" in finding_data["decisions"][0]["note"]
