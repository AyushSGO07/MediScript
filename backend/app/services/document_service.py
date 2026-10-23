from typing import List, Optional, Tuple, Dict, Any
from fastapi import UploadFile, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, delete
from sqlalchemy.orm import selectinload

from app.models.document import Document, PageText, TextBlock
from app.models.review import Review
from app.models.activity import ActivityEvent
from app.services.storage_service import StorageService
from app.services.pdf_extraction import PDFExtractionService
from app.services.page_rendering import PageRenderingService

class DocumentService:
    @staticmethod
    async def create_document(
        db: AsyncSession,
        file: UploadFile,
        role: str = "baseline",
        project_id: Optional[str] = None,
        review_id: Optional[str] = None,
        actor: str = "System",
    ) -> Document:
        """
        Saves uploaded PDF via StorageService, creates Document model,
        links to Review if review_id is provided, automatically runs PyMuPDF extraction,
        pre-renders page previews, and records ActivityEvent.
        """
        doc_id, storage_path, file_size, sha256_hex = await StorageService.save_upload(file)

        # If review_id is provided, infer project_id if not explicitly passed
        if review_id and not project_id:
            rev_res = await db.execute(select(Review).where(Review.id == review_id))
            review = rev_res.scalar_one_or_none()
            if review:
                project_id = review.project_id

        doc = Document(
            id=doc_id,
            project_id=project_id,
            review_id=review_id,
            role=role,
            filename=f"{doc_id}.pdf",
            original_filename=file.filename or "unnamed.pdf",
            file_size_bytes=file_size,
            mime_type=file.content_type or "application/pdf",
            sha256=sha256_hex,
            storage_path=storage_path,
            page_count=0,
            has_text_layer=True,
            upload_status="uploaded",
            extraction_status="pending",
        )
        db.add(doc)

        # If review_id is present, attach document to review
        if review_id:
            rev_res = await db.execute(select(Review).where(Review.id == review_id))
            review = rev_res.scalar_one_or_none()
            if review:
                if role == "baseline":
                    review.baseline_document_id = doc.id
                elif role == "revised":
                    review.revised_document_id = doc.id

        # Log upload activity
        event = ActivityEvent(
            project_id=project_id,
            review_id=review_id,
            event_type="DOCUMENT_UPLOADED",
            actor=actor,
        )
        event.details = {
            "document_id": doc.id,
            "filename": doc.original_filename,
            "role": doc.role,
            "sha256": doc.sha256,
            "size_bytes": doc.file_size_bytes,
        }
        db.add(event)

        await db.commit()
        await db.refresh(doc)

        # Automatically process extraction and generate previews
        await DocumentService.process_extraction(db, doc.id, actor=actor)
        await db.refresh(doc)
        return doc

    @staticmethod
    async def process_extraction(
        db: AsyncSession,
        document_id: str,
        actor: str = "System",
    ) -> Document:
        """
        Runs PyMuPDF extraction, populates PageText and TextBlock tables,
        checks for text layer presence (scanned PDF detection), pre-renders previews,
        and updates document extraction status.
        """
        doc = await DocumentService.get_document(db, document_id)
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Document {document_id} not found.")

        doc.extraction_status = "processing"
        await db.commit()

        try:
            extraction = PDFExtractionService.extract_document(doc.storage_path)

            # Clear existing pages and blocks for idempotency
            await db.execute(delete(TextBlock).where(TextBlock.document_id == doc.id))
            await db.execute(delete(PageText).where(PageText.document_id == doc.id))

            # Insert pages
            for p in extraction["pages"]:
                page_text = PageText(
                    document_id=doc.id,
                    page_number=p["page_number"],
                    width=p["width"],
                    height=p["height"],
                    extracted_text=p["extracted_text"],
                    char_count=p["char_count"],
                    word_count=p["word_count"],
                    has_text=p["has_text"],
                )
                db.add(page_text)

            # Insert text blocks
            for b in extraction["text_blocks"]:
                block = TextBlock(
                    document_id=doc.id,
                    page_number=b["page_number"],
                    block_index=b["block_index"],
                    text=b["text"],
                    x0=b["x0"],
                    y0=b["y0"],
                    x1=b["x1"],
                    y1=b["y1"],
                    norm_x0=b["norm_x0"],
                    norm_y0=b["norm_y0"],
                    norm_x1=b["norm_x1"],
                    norm_y1=b["norm_y1"],
                    font_name=b.get("font_name"),
                    font_size=b.get("font_size"),
                    is_heading=b.get("is_heading", False),
                )
                db.add(block)

            doc.page_count = extraction["page_count"]
            doc.has_text_layer = extraction["has_text_layer"]
            if not doc.has_text_layer:
                doc.extraction_status = "text_layer_missing"
                event_type = "TEXT_LAYER_MISSING"
                event_details = {
                    "document_id": doc.id,
                    "filename": doc.original_filename,
                    "warning": "No digital text layer found in PDF. Scanned image or OCR required.",
                    "total_chars": extraction["total_chars"],
                }
            else:
                doc.extraction_status = "completed"
                event_type = "EXTRACTION_COMPLETED"
                event_details = {
                    "document_id": doc.id,
                    "filename": doc.original_filename,
                    "page_count": doc.page_count,
                    "total_chars": extraction["total_chars"],
                    "total_blocks": extraction["total_blocks"],
                }

            # Pre-render page previews
            PageRenderingService.render_all_pages(doc.storage_path, doc.id)

            # Record event
            event = ActivityEvent(
                project_id=doc.project_id,
                review_id=doc.review_id,
                event_type=event_type,
                actor=actor,
            )
            event.details = event_details
            db.add(event)

            await db.commit()
            await db.refresh(doc)

            # Automatically extract structured medical device entities
            from app.services.entity_service import EntityService
            await EntityService.extract_and_store_entities(db, doc.id)

            return doc

        except Exception as e:
            doc.extraction_status = "failed"
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"PDF extraction failed: {str(e)}",
            )

    @staticmethod
    async def get_document(db: AsyncSession, document_id: str) -> Optional[Document]:
        result = await db.execute(select(Document).where(Document.id == document_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_document_with_pages(db: AsyncSession, document_id: str) -> Optional[Document]:
        result = await db.execute(
            select(Document)
            .options(selectinload(Document.pages), selectinload(Document.text_blocks))
            .where(Document.id == document_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def list_pages(db: AsyncSession, document_id: str) -> List[PageText]:
        result = await db.execute(
            select(PageText)
            .where(PageText.document_id == document_id)
            .order_by(PageText.page_number)
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_page_details(
        db: AsyncSession,
        document_id: str,
        page_number: int,
    ) -> Tuple[Optional[PageText], List[TextBlock]]:
        page_res = await db.execute(
            select(PageText)
            .where(PageText.document_id == document_id, PageText.page_number == page_number)
        )
        page = page_res.scalar_one_or_none()

        blocks_res = await db.execute(
            select(TextBlock)
            .where(TextBlock.document_id == document_id, TextBlock.page_number == page_number)
            .order_by(TextBlock.block_index)
        )
        blocks = list(blocks_res.scalars().all())
        return page, blocks

    @staticmethod
    async def list_documents_for_review(db: AsyncSession, review_id: str) -> List[Document]:
        result = await db.execute(
            select(Document)
            .where(Document.review_id == review_id)
            .order_by(desc(Document.created_at))
        )
        return list(result.scalars().all())

    @staticmethod
    async def list_documents_for_project(db: AsyncSession, project_id: str) -> List[Document]:
        result = await db.execute(
            select(Document)
            .where(Document.project_id == project_id)
            .order_by(desc(Document.created_at))
        )
        return list(result.scalars().all())

    @staticmethod
    async def attach_document_to_review(
        db: AsyncSession,
        document_id: str,
        review_id: str,
        role: str,
        actor: str = "System",
    ) -> Document:
        doc = await DocumentService.get_document(db, document_id)
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Document {document_id} not found.")

        rev_res = await db.execute(select(Review).where(Review.id == review_id))
        review = rev_res.scalar_one_or_none()
        if not review:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Review {review_id} not found.")

        doc.review_id = review.id
        doc.role = role
        if not doc.project_id:
            doc.project_id = review.project_id

        if role == "baseline":
            review.baseline_document_id = doc.id
        elif role == "revised":
            review.revised_document_id = doc.id

        event = ActivityEvent(
            project_id=review.project_id,
            review_id=review.id,
            event_type="DOCUMENT_ATTACHED",
            actor=actor,
        )
        event.details = {
            "document_id": doc.id,
            "role": role,
            "review_id": review.id,
            "filename": doc.original_filename,
        }
        db.add(event)

        await db.commit()
        await db.refresh(doc)
        return doc
