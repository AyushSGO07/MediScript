from datetime import datetime, timezone
from typing import List, Optional, Tuple, Dict, Any
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.models.document import Document, TextBlock
from app.models.extracted_field import ExtractedField
from app.models.activity import ActivityEvent
from app.services.entity_patterns import CANONICAL_FIELD_SPECS
from app.services.entity_extraction import EntityExtractionService
from app.services.uncertainty_resolver import UncertaintyResolver

class EntityService:
    @staticmethod
    async def extract_and_store_entities(
        db: AsyncSession,
        document_id: str,
    ) -> List[ExtractedField]:
        """
        Executes deterministic entity extraction over all document text blocks,
        classifies 4-state uncertainty, validates ISO dates, preserves any existing
        manual reviewer overrides, and persists ExtractedField records.
        """
        doc_res = await db.execute(select(Document).where(Document.id == document_id))
        doc = doc_res.scalar_one_or_none()
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Document {document_id} not found.")

        # Fetch all text blocks
        blocks_res = await db.execute(
            select(TextBlock)
            .where(TextBlock.document_id == document_id)
            .order_by(TextBlock.page_number, TextBlock.block_index)
        )
        blocks = blocks_res.scalars().all()

        blocks_data = [
            {
                "id": b.id,
                "page_number": b.page_number,
                "block_index": b.block_index,
                "text": b.text,
                "x0": b.x0, "y0": b.y0, "x1": b.x1, "y1": b.y1,
                "norm_x0": b.norm_x0, "norm_y0": b.norm_y0, "norm_x1": b.norm_x1, "norm_y1": b.norm_y1,
                "font_name": b.font_name, "font_size": b.font_size,
            }
            for b in blocks
        ]

        # Extract candidates
        candidates = EntityExtractionService.extract_candidates_from_blocks(blocks_data)

        # Fetch any existing overridden fields to preserve reviewer work
        existing_res = await db.execute(
            select(ExtractedField).where(ExtractedField.document_id == document_id)
        )
        existing_fields = {f.field_key: f for f in existing_res.scalars().all()}

        saved_fields: List[ExtractedField] = []

        for spec in CANONICAL_FIELD_SPECS:
            key = spec["key"]
            resolved = UncertaintyResolver.resolve_field(spec, candidates.get(key, []), doc.has_text_layer)

            existing = existing_fields.get(key)
            if existing and existing.is_overridden:
                # Preserve reviewer override while updating underlying extraction candidate metadata
                existing.raw_value = resolved["raw_value"]
                existing.normalized_value = resolved["normalized_value"]
                existing.evidence_text = resolved["evidence_text"]
                existing.evidence_page = resolved["evidence_page"]
                existing.evidence_block_id = resolved["evidence_block_id"]
                existing.norm_x0 = resolved["norm_x0"]
                existing.norm_y0 = resolved["norm_y0"]
                existing.norm_x1 = resolved["norm_x1"]
                existing.norm_y1 = resolved["norm_y1"]
                existing.is_iso_compliant = resolved["is_iso_compliant"]
                existing.is_expired = resolved["is_expired"]
                existing.days_until_expiration = resolved["days_until_expiration"]
                saved_fields.append(existing)
            elif existing:
                # Update existing record
                existing.value = resolved["value"]
                existing.raw_value = resolved["raw_value"]
                existing.normalized_value = resolved["normalized_value"]
                existing.confidence_state = resolved["confidence_state"]
                existing.evidence_text = resolved["evidence_text"]
                existing.evidence_page = resolved["evidence_page"]
                existing.evidence_block_id = resolved["evidence_block_id"]
                existing.norm_x0 = resolved["norm_x0"]
                existing.norm_y0 = resolved["norm_y0"]
                existing.norm_x1 = resolved["norm_x1"]
                existing.norm_y1 = resolved["norm_y1"]
                existing.is_iso_compliant = resolved["is_iso_compliant"]
                existing.is_expired = resolved["is_expired"]
                existing.days_until_expiration = resolved["days_until_expiration"]
                existing.review_id = doc.review_id
                saved_fields.append(existing)
            else:
                # Create new field record
                field = ExtractedField(
                    document_id=doc.id,
                    review_id=doc.review_id,
                    field_key=resolved["field_key"],
                    field_label=resolved["field_label"],
                    category=resolved["category"],
                    value=resolved["value"],
                    raw_value=resolved["raw_value"],
                    normalized_value=resolved["normalized_value"],
                    confidence_state=resolved["confidence_state"],
                    evidence_text=resolved["evidence_text"],
                    evidence_page=resolved["evidence_page"],
                    evidence_block_id=resolved["evidence_block_id"],
                    norm_x0=resolved["norm_x0"],
                    norm_y0=resolved["norm_y0"],
                    norm_x1=resolved["norm_x1"],
                    norm_y1=resolved["norm_y1"],
                    is_iso_compliant=resolved["is_iso_compliant"],
                    is_expired=resolved["is_expired"],
                    days_until_expiration=resolved["days_until_expiration"],
                    is_overridden=False,
                )
                db.add(field)
                saved_fields.append(field)

        await db.commit()
        return saved_fields

    @staticmethod
    async def get_fields_for_document(db: AsyncSession, document_id: str) -> List[ExtractedField]:
        res = await db.execute(
            select(ExtractedField)
            .where(ExtractedField.document_id == document_id)
            .order_by(ExtractedField.category, ExtractedField.field_key)
        )
        return list(res.scalars().all())

    @staticmethod
    async def update_field_override(
        db: AsyncSession,
        field_id: str,
        new_value: str,
        reason: str,
        actor: str = "System",
    ) -> ExtractedField:
        res = await db.execute(select(ExtractedField).where(ExtractedField.id == field_id))
        field = res.scalar_one_or_none()
        if not field:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"ExtractedField {field_id} not found.")

        if not field.is_overridden:
            field.original_value = field.value
            field.original_confidence_state = field.confidence_state

        field.value = new_value.strip()
        field.is_overridden = True
        field.override_reason = reason.strip()
        field.reviewed_by = actor
        field.reviewed_at = datetime.now(timezone.utc)

        # Log override activity
        event = ActivityEvent(
            review_id=field.review_id,
            event_type="ENTITY_OVERRIDDEN",
            actor=actor,
        )
        event.details = {
            "field_id": field.id,
            "field_key": field.field_key,
            "original_value": field.original_value,
            "new_value": field.value,
            "reason": field.override_reason,
            "document_id": field.document_id,
        }
        db.add(event)

        await db.commit()
        await db.refresh(field)
        return field

    @staticmethod
    async def revert_field_override(
        db: AsyncSession,
        field_id: str,
        actor: str = "System",
    ) -> ExtractedField:
        res = await db.execute(select(ExtractedField).where(ExtractedField.id == field_id))
        field = res.scalar_one_or_none()
        if not field:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"ExtractedField {field_id} not found.")

        if not field.is_overridden:
            return field

        prior_value = field.value
        field.value = field.original_value
        field.confidence_state = field.original_confidence_state or "EXTRACTED"
        field.is_overridden = False
        field.override_reason = None
        field.reviewed_by = actor
        field.reviewed_at = datetime.now(timezone.utc)

        event = ActivityEvent(
            review_id=field.review_id,
            event_type="ENTITY_OVERRIDE_REVERTED",
            actor=actor,
        )
        event.details = {
            "field_id": field.id,
            "field_key": field.field_key,
            "reverted_value": field.value,
            "prior_value": prior_value,
            "document_id": field.document_id,
        }
        db.add(event)

        await db.commit()
        await db.refresh(field)
        return field
