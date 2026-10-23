from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, desc
from fastapi import HTTPException

from app.models.review import Review
from app.models.document import Document, TextBlock
from app.models.diff_item import DiffItem
from app.models.finding import Finding, FindingStatus, FindingCategory
from app.models.checklist import SeverityLevel
from app.models.activity import ActivityEvent
from app.services.diff_engine import DiffEngineService, DiffType
from app.services.pdf_extraction import PDFExtractionService
from app.schemas.diff import DiffSummaryResponse, DiffItemResponse, DiffPromoteRequest


class DiffService:
    @staticmethod
    async def generate_diff_for_review(
        review_id: str,
        db: AsyncSession,
        actor: str = "System",
    ) -> DiffSummaryResponse:
        # 1. Fetch Review
        review_res = await db.execute(select(Review).where(Review.id == review_id))
        review = review_res.scalar_one_or_none()
        if not review:
            raise HTTPException(status_code=404, detail=f"Review '{review_id}' not found.")

        if not review.baseline_document_id or not review.revised_document_id:
            raise HTTPException(
                status_code=400,
                detail="Review must have both a baseline and a revised document attached to generate a revision diff.",
            )

        # 2. Fetch baseline blocks
        base_res = await db.execute(
            select(TextBlock)
            .where(TextBlock.document_id == review.baseline_document_id)
            .order_by(TextBlock.page_number, TextBlock.block_index)
        )
        base_blocks = base_res.scalars().all()

        if not base_blocks:
            # Extract on-the-fly if needed
            base_doc_res = await db.execute(
                select(Document).where(Document.id == review.baseline_document_id)
            )
            base_doc = base_doc_res.scalar_one_or_none()
            if base_doc and base_doc.storage_path:
                ext_data = PDFExtractionService.extract_document(base_doc.storage_path)
                for b_dict in ext_data.get("text_blocks", []):
                    block_obj = TextBlock(
                        document_id=base_doc.id,
                        page_number=b_dict["page_number"],
                        block_index=b_dict["block_index"],
                        text=b_dict["text"],
                        x0=b_dict["x0"],
                        y0=b_dict["y0"],
                        x1=b_dict["x1"],
                        y1=b_dict["y1"],
                        norm_x0=b_dict["norm_x0"],
                        norm_y0=b_dict["norm_y0"],
                        norm_x1=b_dict["norm_x1"],
                        norm_y1=b_dict["norm_y1"],
                        max_font_size=b_dict.get("max_font_size", 10.0),
                        dominant_font=b_dict.get("dominant_font"),
                        is_heading=b_dict.get("is_heading", False),
                    )
                    db.add(block_obj)
                await db.flush()
                base_res = await db.execute(
                    select(TextBlock)
                    .where(TextBlock.document_id == review.baseline_document_id)
                    .order_by(TextBlock.page_number, TextBlock.block_index)
                )
                base_blocks = base_res.scalars().all()

        # 3. Fetch revised blocks
        rev_res = await db.execute(
            select(TextBlock)
            .where(TextBlock.document_id == review.revised_document_id)
            .order_by(TextBlock.page_number, TextBlock.block_index)
        )
        rev_blocks = rev_res.scalars().all()

        if not rev_blocks:
            rev_doc_res = await db.execute(
                select(Document).where(Document.id == review.revised_document_id)
            )
            rev_doc = rev_doc_res.scalar_one_or_none()
            if rev_doc and rev_doc.storage_path:
                ext_data = PDFExtractionService.extract_document(rev_doc.storage_path)
                for b_dict in ext_data.get("text_blocks", []):
                    block_obj = TextBlock(
                        document_id=rev_doc.id,
                        page_number=b_dict["page_number"],
                        block_index=b_dict["block_index"],
                        text=b_dict["text"],
                        x0=b_dict["x0"],
                        y0=b_dict["y0"],
                        x1=b_dict["x1"],
                        y1=b_dict["y1"],
                        norm_x0=b_dict["norm_x0"],
                        norm_y0=b_dict["norm_y0"],
                        norm_x1=b_dict["norm_x1"],
                        norm_y1=b_dict["norm_y1"],
                        max_font_size=b_dict.get("max_font_size", 10.0),
                        dominant_font=b_dict.get("dominant_font"),
                        is_heading=b_dict.get("is_heading", False),
                    )
                    db.add(block_obj)
                await db.flush()
                rev_res = await db.execute(
                    select(TextBlock)
                    .where(TextBlock.document_id == review.revised_document_id)
                    .order_by(TextBlock.page_number, TextBlock.block_index)
                )
                rev_blocks = rev_res.scalars().all()

        # 4. Run deterministic sequence diff
        raw_diffs = DiffEngineService.diff_documents(base_blocks, rev_blocks, include_unchanged=False)

        # 5. Handle idempotency while preserving promoted states
        existing_res = await db.execute(
            select(DiffItem).where(DiffItem.review_id == review_id)
        )
        existing_items = existing_res.scalars().all()
        promoted_map: Dict[Tuple[str, Optional[str], Optional[str]], Tuple[bool, Optional[str]]] = {
            (d.change_type, d.baseline_text, d.revised_text): (d.is_promoted, d.promoted_finding_id)
            for d in existing_items
            if d.is_promoted
        }

        # Clear existing unpromoted / previous diffs
        await db.execute(delete(DiffItem).where(DiffItem.review_id == review_id))

        new_diff_objs: List[DiffItem] = []
        for d in raw_diffs:
            key = (d["change_type"], d["baseline_text"], d["revised_text"])
            is_promoted, promoted_finding_id = promoted_map.get(key, (False, None))

            diff_obj = DiffItem(
                review_id=review_id,
                change_type=d["change_type"],
                category=d["category"],
                significance=d["significance"],
                baseline_text=d["baseline_text"],
                revised_text=d["revised_text"],
                baseline_page=d["baseline_page"],
                revised_page=d["revised_page"],
                baseline_block_id=d["baseline_block_id"],
                revised_block_id=d["revised_block_id"],
                baseline_norm_x0=d["baseline_norm_x0"],
                baseline_norm_y0=d["baseline_norm_y0"],
                baseline_norm_x1=d["baseline_norm_x1"],
                baseline_norm_y1=d["baseline_norm_y1"],
                revised_norm_x0=d["revised_norm_x0"],
                revised_norm_y0=d["revised_norm_y0"],
                revised_norm_x1=d["revised_norm_x1"],
                revised_norm_y1=d["revised_norm_y1"],
                token_diffs=d["token_diffs"],
                is_promoted=is_promoted,
                promoted_finding_id=promoted_finding_id,
            )
            db.add(diff_obj)
            new_diff_objs.append(diff_obj)

        await db.flush()

        # 6. Record ActivityEvent
        act_event = ActivityEvent(
            review_id=review_id,
            project_id=review.project_id,
            event_type="DIFF_GENERATION_COMPLETED",
            actor=actor,
        )
        added_count = sum(1 for d in new_diff_objs if d.change_type == DiffType.ADDED)
        deleted_count = sum(1 for d in new_diff_objs if d.change_type == DiffType.DELETED)
        modified_count = sum(1 for d in new_diff_objs if d.change_type == DiffType.MODIFIED)
        promoted_count = sum(1 for d in new_diff_objs if d.is_promoted)

        act_event.details = {
            "review_name": review.name,
            "total_changes": len(new_diff_objs),
            "added_count": added_count,
            "deleted_count": deleted_count,
            "modified_count": modified_count,
            "promoted_count": promoted_count,
        }
        db.add(act_event)
        await db.commit()

        # 7. Build and return summary response
        return DiffSummaryResponse(
            review_id=review_id,
            total_changes=len(new_diff_objs),
            added_count=added_count,
            deleted_count=deleted_count,
            modified_count=modified_count,
            promoted_count=promoted_count,
            diff_items=[DiffItemResponse.model_validate(d) for d in new_diff_objs],
        )

    @staticmethod
    async def get_diff_items(
        review_id: str,
        db: AsyncSession,
        change_type: Optional[str] = None,
        category: Optional[str] = None,
        page_number: Optional[int] = None,
        is_promoted: Optional[bool] = None,
    ) -> List[DiffItem]:
        query = select(DiffItem).where(DiffItem.review_id == review_id)

        if change_type:
            query = query.where(DiffItem.change_type == change_type.upper())
        if category:
            query = query.where(DiffItem.category == category)
        if page_number is not None:
            query = query.where(
                (DiffItem.revised_page == page_number) | (DiffItem.baseline_page == page_number)
            )
        if is_promoted is not None:
            query = query.where(DiffItem.is_promoted == is_promoted)

        query = query.order_by(
            DiffItem.revised_page.asc().nullslast(),
            DiffItem.baseline_page.asc().nullslast(),
            DiffItem.created_at.asc(),
        )

        res = await db.execute(query)
        return res.scalars().all()

    @staticmethod
    async def promote_diff_to_finding(
        review_id: str,
        diff_id: str,
        req: DiffPromoteRequest,
        actor: str,
        db: AsyncSession,
    ) -> Tuple[Finding, DiffItem]:
        diff_res = await db.execute(
            select(DiffItem).where(DiffItem.id == diff_id, DiffItem.review_id == review_id)
        )
        diff_item = diff_res.scalar_one_or_none()
        if not diff_item:
            raise HTTPException(status_code=404, detail=f"DiffItem '{diff_id}' not found in review '{review_id}'.")

        # If already promoted, retrieve existing finding
        if diff_item.is_promoted and diff_item.promoted_finding_id:
            find_res = await db.execute(select(Finding).where(Finding.id == diff_item.promoted_finding_id))
            existing_finding = find_res.scalar_one_or_none()
            if existing_finding:
                return existing_finding, diff_item

        # Fetch review metadata
        review_res = await db.execute(select(Review).where(Review.id == review_id))
        review = review_res.scalar_one_or_none()
        if not review:
            raise HTTPException(status_code=404, detail=f"Review '{review_id}' not found.")

        # Determine severity and explanation
        severity = req.severity.strip().title() if req.severity else (
            SeverityLevel.CRITICAL if diff_item.significance == "High" else SeverityLevel.MAJOR
        )
        if severity not in SeverityLevel.ALL:
            severity = SeverityLevel.MAJOR

        explanation = req.explanation.strip() if req.explanation else (
            f"Promoted revision diff [{diff_item.change_type}]: "
            f"{diff_item.baseline_text or '(none)'} -> {diff_item.revised_text or '(none)'}"
        )

        # Coordinate selection (prefer revised, fallback to baseline)
        page_num = diff_item.revised_page if diff_item.revised_page is not None else diff_item.baseline_page
        snippet = diff_item.revised_text if diff_item.revised_text else diff_item.baseline_text
        doc_role = "revised" if diff_item.revised_text else "baseline"
        doc_id = review.revised_document_id if doc_role == "revised" else review.baseline_document_id

        norm_x0 = diff_item.revised_norm_x0 if diff_item.revised_norm_x0 is not None else diff_item.baseline_norm_x0
        norm_y0 = diff_item.revised_norm_y0 if diff_item.revised_norm_y0 is not None else diff_item.baseline_norm_y0
        norm_x1 = diff_item.revised_norm_x1 if diff_item.revised_norm_x1 is not None else diff_item.baseline_norm_x1
        norm_y1 = diff_item.revised_norm_y1 if diff_item.revised_norm_y1 is not None else diff_item.baseline_norm_y1

        # Create finding
        finding = Finding(
            review_id=review_id,
            diff_item_id=diff_item.id,
            rule_key=f"REV_DIFF_{diff_item.change_type}",
            checklist_version_id=review.checklist_version_id or "DIFF_PROMOTION",
            category=diff_item.category if diff_item.category in FindingCategory.ALL else FindingCategory.GENERAL,
            severity=severity,
            status=FindingStatus.OPEN,
            explanation=explanation,
            expected_value=diff_item.baseline_text,
            observed_value=diff_item.revised_text,
            source_document_id=doc_id,
            document_role=doc_role,
            page_number=page_num,
            evidence_snippet=snippet,
            norm_x0=norm_x0,
            norm_y0=norm_y0,
            norm_x1=norm_x1,
            norm_y1=norm_y1,
        )
        db.add(finding)
        await db.flush()

        # Update diff_item
        diff_item.is_promoted = True
        diff_item.promoted_finding_id = finding.id

        # Log ActivityEvent
        act_event = ActivityEvent(
            review_id=review_id,
            project_id=review.project_id,
            event_type="DIFF_ITEM_PROMOTED",
            actor=actor,
        )
        act_event.details = {
            "finding_id": finding.id,
            "diff_item_id": diff_item.id,
            "change_type": diff_item.change_type,
            "severity": finding.severity,
            "explanation": finding.explanation,
        }
        db.add(act_event)
        await db.commit()
        await db.refresh(finding)
        await db.refresh(diff_item)

        return finding, diff_item
