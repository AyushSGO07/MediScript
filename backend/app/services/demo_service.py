import os
import uuid
import hashlib
from pathlib import Path
from typing import Tuple, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors

from app.core.config import settings
from app.models.workspace import Workspace
from app.models.project import Project
from app.models.review import Review
from app.models.document import Document
from app.models.checklist import Checklist, ChecklistVersion
from app.models.diff_item import DiffItem
from app.models.finding import Finding
from app.services.storage_service import StorageService
from app.services.document_service import DocumentService
from app.services.entity_service import EntityService
from app.services.diff_service import DiffService
from app.services.rule_engine import RuleEngineService
from app.services.checklist_service import ChecklistService


class DemoService:
    """
    Manages synthetic demonstration labels and 1-click review generation (DEMO-01, DEMO-02, DEMO-03).
    """

    @classmethod
    def get_demo_dir(cls) -> Path:
        demo_dir = Path(settings.UPLOAD_DIR) / "synthetic_demo"
        demo_dir.mkdir(parents=True, exist_ok=True)
        return demo_dir

    @classmethod
    def generate_synthetic_labels(cls) -> Tuple[Path, Path]:
        """
        Generates realistic baseline and revised medical device label PDFs if not already generated.
        Baseline: Fully compliant label.
        Revised: Label containing deliberate compliance and clinical defects.
        """
        demo_dir = cls.get_demo_dir()
        base_path = demo_dir / "cardiovasc_baseline.pdf"
        rev_path = demo_dir / "cardiovasc_revised.pdf"

        # Generate Baseline
        if not base_path.exists():
            c = canvas.Canvas(str(base_path), pagesize=letter)
            width, height = letter

            # Header Box
            c.setStrokeColor(colors.HexColor("#0284c7"))
            c.setLineWidth(2)
            c.roundRect(40, height - 160, width - 80, 120, 8, fill=0, stroke=1)

            c.setFillColor(colors.HexColor("#0f172a"))
            c.setFont("Helvetica-Bold", 16)
            c.drawString(60, height - 75, "CardioVasc™ Everolimus-Eluting Coronary Stent System")
            c.setFont("Helvetica", 10)
            c.setFillColor(colors.HexColor("#475569"))
            c.drawString(60, height - 95, "Rapid Exchange (RX) Delivery System | 3.00 mm x 18 mm")
            c.drawString(60, height - 110, "Drug Component: 100 ug/cm2 Everolimus in durable PBMA/PVDF copolymer")

            # Identifiers
            c.setFont("Helvetica-Bold", 11)
            c.setFillColor(colors.HexColor("#0f172a"))
            c.drawString(60, height - 140, "REF: CV-9020-3018")
            c.drawString(240, height - 140, "LOT: 2024A-7701")
            c.drawString(420, height - 140, "SN: 8820019")

            # Main Body Grid
            c.setStrokeColor(colors.HexColor("#cbd5e1"))
            c.setLineWidth(1)
            c.rect(40, height - 380, width - 80, 200, fill=0, stroke=1)

            # Dates & Sterility
            c.setFont("Helvetica-Bold", 11)
            c.drawString(60, height - 190, "STERILE EO")
            c.drawString(200, height - 190, "CE 0123")
            c.drawString(340, height - 190, "Use by: 2028-12-31")

            c.setFont("Helvetica", 10)
            c.setFillColor(colors.HexColor("#334155"))
            c.drawString(60, height - 215, "Storage: Store between 2°C and 8°C. Do not freeze. Keep dry.")
            c.drawString(60, height - 235, "Manufacture Date: 2024-01-15")

            # UDI String & Barcode Simulation
            c.setFont("Helvetica-Bold", 10)
            c.setFillColor(colors.HexColor("#0f172a"))
            c.drawString(60, height - 270, "UDI Carrier (GS1):")
            c.setFont("Courier-Bold", 11)
            c.drawString(60, height - 290, "(01)00840123456789(17)281231(10)2024A-7701")

            # Warnings & Legal Info
            c.setFont("Helvetica-Bold", 9)
            c.setFillColor(colors.HexColor("#b91c1c"))
            c.drawString(60, height - 330, "Rx Only. Single use only. Do not resterilize. Do not use if package is opened or damaged.")
            c.setFont("Helvetica", 9)
            c.setFillColor(colors.HexColor("#475569"))
            c.drawString(60, height - 350, "Contains no natural rubber latex. Non-pyrogenic fluid pathway.")

            # Manufacturer
            c.setFont("Helvetica-Bold", 9)
            c.drawString(60, height - 420, "Legal Manufacturer:")
            c.setFont("Helvetica", 9)
            c.drawString(60, height - 435, "CardioVasc MedTech Inc., 450 Medical Way, Minneapolis, MN 55401 USA")
            c.drawString(60, height - 450, "EC REP: CardioVasc Europe B.V., Keizersgracht 421, 1016 EK Amsterdam, Netherlands")

            c.showPage()
            c.save()

        # Generate Revised (with intentional non-compliances)
        if not rev_path.exists():
            c = canvas.Canvas(str(rev_path), pagesize=letter)
            width, height = letter

            # Header Box
            c.setStrokeColor(colors.HexColor("#0284c7"))
            c.setLineWidth(2)
            c.roundRect(40, height - 160, width - 80, 120, 8, fill=0, stroke=1)

            c.setFillColor(colors.HexColor("#0f172a"))
            c.setFont("Helvetica-Bold", 16)
            c.drawString(60, height - 75, "CardioVasc™ Everolimus-Eluting Coronary Stent System")
            c.setFont("Helvetica", 10)
            c.setFillColor(colors.HexColor("#475569"))
            c.drawString(60, height - 95, "Rapid Exchange (RX) Delivery System | 3.00 mm x 18 mm")
            c.drawString(60, height - 110, "Drug Component: 100 ug/cm2 Everolimus in durable PBMA/PVDF copolymer")

            # Identifiers (Modified Lot)
            c.setFont("Helvetica-Bold", 11)
            c.setFillColor(colors.HexColor("#0f172a"))
            c.drawString(60, height - 140, "REF: CV-9020-3018")
            c.drawString(240, height - 140, "LOT: 2024B-9902")
            c.drawString(420, height - 140, "SN: 8820019")

            # Main Body Grid
            c.setStrokeColor(colors.HexColor("#cbd5e1"))
            c.setLineWidth(1)
            c.rect(40, height - 380, width - 80, 200, fill=0, stroke=1)

            # Dates & Sterility with deliberate format error: 12/31/2028 instead of ISO 8601
            c.setFont("Helvetica-Bold", 11)
            c.drawString(60, height - 190, "STERILE EO")
            c.drawString(200, height - 190, "CE 0123")
            c.drawString(340, height - 190, "Use by: 12/31/2028")

            # Storage with temperature excursion defect: 15°C to 25°C instead of 2°C to 8°C
            c.setFont("Helvetica", 10)
            c.setFillColor(colors.HexColor("#334155"))
            c.drawString(60, height - 215, "Storage: Store between 15°C and 25°C. Do not freeze.")
            c.drawString(60, height - 235, "Manufacture Date: 2024-03-20")

            # UDI String with truncated / invalid check digit
            c.setFont("Helvetica-Bold", 10)
            c.setFillColor(colors.HexColor("#0f172a"))
            c.drawString(60, height - 270, "UDI Carrier (GS1):")
            c.setFont("Courier-Bold", 11)
            c.drawString(60, height - 290, "(01)0084012345678(17)281231(10)2024B-9902")

            # Warnings with omitted latex statement
            c.setFont("Helvetica-Bold", 9)
            c.setFillColor(colors.HexColor("#b91c1c"))
            c.drawString(60, height - 330, "Rx Only. Single use only. Do not resterilize. Do not use if package is opened or damaged.")

            # Manufacturer with altered address
            c.setFont("Helvetica-Bold", 9)
            c.setFillColor(colors.HexColor("#0f172a"))
            c.drawString(60, height - 420, "Legal Manufacturer:")
            c.setFont("Helvetica", 9)
            c.drawString(60, height - 435, "CardioVasc International, Suite 900, Chicago, IL 60601 USA")
            c.drawString(60, height - 450, "EC REP: CardioVasc Europe B.V., Keizersgracht 421, 1016 EK Amsterdam, Netherlands")

            c.showPage()
            c.save()

        return base_path, rev_path

    @classmethod
    async def load_demo_review(cls, db: AsyncSession) -> Dict[str, Any]:
        """
        Executes complete one-click provisioning of the CardioVasc demonstration review (DEMO-03).
        Idempotent: returns existing review if already provisioned.
        """
        # Ensure default workspace exists
        ws_stmt = select(Workspace)
        ws_res = await db.execute(ws_stmt)
        ws = ws_res.scalars().first()
        if not ws:
            ws = Workspace(name="Tata Elxsi Lab", organization="Medical Device Practice")
            db.add(ws)
            await db.commit()
            await db.refresh(ws)

        # Check for existing Demo Project & Review
        p_stmt = select(Project).where(Project.name == "CardioVasc Coronary Stent Demonstration")
        p_res = await db.execute(p_stmt)
        project = p_res.scalar_one_or_none()

        if project:
            r_stmt = select(Review).where(Review.project_id == project.id).order_by(Review.created_at.desc())
            r_res = await db.execute(r_stmt)
            existing_review = r_res.scalars().first()
            if existing_review:
                # Ensure diffs exist
                d_stmt = select(DiffItem).where(DiffItem.review_id == existing_review.id)
                d_res = await db.execute(d_stmt)
                if not d_res.scalars().all():
                    await DiffService.generate_diff_for_review(existing_review.id, db, actor="CardioVasc Showcase")

                # Ensure findings exist
                f_stmt = select(Finding).where(Finding.review_id == existing_review.id)
                f_res = await db.execute(f_stmt)
                if not f_res.scalars().all():
                    from app.api.findings import evaluate_review
                    await evaluate_review(
                        review_id=existing_review.id,
                        checklist_version_id=existing_review.checklist_version_id,
                        x_actor_role="CardioVasc Showcase",
                        db=db,
                    )

                return {
                    "success": True,
                    "review_id": existing_review.id,
                    "project_id": project.id,
                    "message": "Demo review is active and ready for inspection.",
                }

        # 1. Create Demo Project
        if not project:
            project = Project(
                workspace_id=ws.id,
                name="CardioVasc Coronary Stent Demonstration",
                description="Pre-configured demonstration project auditing CardioVasc™ Everolimus-Eluting Stent revision against FDA & EU MDR checklists.",
            )
            db.add(project)
            await db.commit()
            await db.refresh(project)

        # 2. Generate Synthetic Label PDFs
        base_path, rev_path = cls.generate_synthetic_labels()

        # 3. Ingest Baseline Document
        with open(base_path, "rb") as f:
            base_bytes = f.read()
        base_sha = hashlib.sha256(base_bytes).hexdigest()
        base_doc_id = str(uuid.uuid4())
        upload_dir = StorageService.get_upload_dir()
        base_stored_path = upload_dir / f"{base_doc_id}.pdf"
        with open(base_stored_path, "wb") as f:
            f.write(base_bytes)

        base_doc = Document(
            id=base_doc_id,
            project_id=project.id,
            role="baseline",
            filename=f"{base_doc_id}.pdf",
            original_filename="CardioVasc_Baseline_v1.pdf",
            file_size_bytes=len(base_bytes),
            mime_type="application/pdf",
            sha256=base_sha,
            storage_path=str(base_stored_path),
            page_count=1,
            has_text_layer=True,
            upload_status="uploaded",
            extraction_status="pending",
        )
        db.add(base_doc)
        await db.commit()
        await DocumentService.process_extraction(db, base_doc.id, actor="Demo Showcase")

        # 4. Ingest Revised Document
        with open(rev_path, "rb") as f:
            rev_bytes = f.read()
        rev_sha = hashlib.sha256(rev_bytes).hexdigest()
        rev_doc_id = str(uuid.uuid4())
        rev_stored_path = upload_dir / f"{rev_doc_id}.pdf"
        with open(rev_stored_path, "wb") as f:
            f.write(rev_bytes)

        rev_doc = Document(
            id=rev_doc_id,
            project_id=project.id,
            role="revised",
            filename=f"{rev_doc_id}.pdf",
            original_filename="CardioVasc_Revised_v2.pdf",
            file_size_bytes=len(rev_bytes),
            mime_type="application/pdf",
            sha256=rev_sha,
            storage_path=str(rev_stored_path),
            page_count=1,
            has_text_layer=True,
            upload_status="uploaded",
            extraction_status="pending",
        )
        db.add(rev_doc)
        await db.commit()
        await DocumentService.process_extraction(db, rev_doc.id, actor="Demo Showcase")

        # 5. Extract Entities for Both Documents
        await EntityService.extract_and_store_entities(db, base_doc.id)
        await EntityService.extract_and_store_entities(db, rev_doc.id)

        # 6. Ensure Demonstration Checklists are Seeded
        await ChecklistService.seed_demonstration_checklists(db)
        ck_stmt = select(ChecklistVersion).join(Checklist).where(Checklist.name.contains("FDA 21 CFR 801/830")).order_by(ChecklistVersion.created_at.desc())
        ck_res = await db.execute(ck_stmt)
        checklist_version = ck_res.scalars().first()
        checklist_version_id = checklist_version.id if checklist_version else None

        # 7. Create Review Record
        review = Review(
            project_id=project.id,
            name="CardioVasc Stent Compliance Audit",
            status="In Progress",
            baseline_document_id=base_doc.id,
            revised_document_id=rev_doc.id,
            checklist_version_id=checklist_version_id,
        )
        db.add(review)
        await db.commit()
        await db.refresh(review)

        # Update documents with review_id
        base_doc.review_id = review.id
        rev_doc.review_id = review.id
        await db.commit()

        # 8. Generate Revision Diff
        await DiffService.generate_diff_for_review(review.id, db, actor="CardioVasc Showcase")

        # 9. Evaluate Rules & Populate Findings
        from app.api.findings import evaluate_review
        await evaluate_review(
            review_id=review.id,
            checklist_version_id=checklist_version_id,
            x_actor_role="CardioVasc Showcase",
            db=db,
        )

        return {
            "success": True,
            "review_id": review.id,
            "project_id": project.id,
            "message": "CardioVasc demo review created with diffs, findings, and evidence links.",
        }
