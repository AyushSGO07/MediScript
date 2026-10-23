from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, Float, Boolean, Text, ForeignKey, DateTime
from app.models.base import BaseModel

class ExtractedField(BaseModel):
    __tablename__ = "extracted_fields"

    document_id: Mapped[str] = mapped_column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    review_id: Mapped[str] = mapped_column(String(36), ForeignKey("reviews.id", ondelete="SET NULL"), nullable=True)

    field_key: Mapped[str] = mapped_column(String(64), nullable=False)
    field_label: Mapped[str] = mapped_column(String(120), nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False)

    value: Mapped[str] = mapped_column(Text, nullable=True)
    raw_value: Mapped[str] = mapped_column(Text, nullable=True)
    normalized_value: Mapped[str] = mapped_column(Text, nullable=True)
    confidence_state: Mapped[str] = mapped_column(String(32), default="EXTRACTED")  # EXTRACTED, AMBIGUOUS, NOT_READABLE, NOT_FOUND

    evidence_text: Mapped[str] = mapped_column(Text, nullable=True)
    evidence_page: Mapped[int] = mapped_column(Integer, nullable=True)
    evidence_block_id: Mapped[str] = mapped_column(String(36), nullable=True)

    # Normalized bounding box coordinates for highlight
    norm_x0: Mapped[float] = mapped_column(Float, nullable=True)
    norm_y0: Mapped[float] = mapped_column(Float, nullable=True)
    norm_x1: Mapped[float] = mapped_column(Float, nullable=True)
    norm_y1: Mapped[float] = mapped_column(Float, nullable=True)

    # Date specific metadata
    is_iso_compliant: Mapped[bool] = mapped_column(Boolean, nullable=True)
    is_expired: Mapped[bool] = mapped_column(Boolean, nullable=True)
    days_until_expiration: Mapped[int] = mapped_column(Integer, nullable=True)

    # Human-in-the-loop override & provenance tracking
    is_overridden: Mapped[bool] = mapped_column(Boolean, default=False)
    original_value: Mapped[str] = mapped_column(Text, nullable=True)
    original_confidence_state: Mapped[str] = mapped_column(String(32), nullable=True)
    override_reason: Mapped[str] = mapped_column(Text, nullable=True)
    reviewed_by: Mapped[str] = mapped_column(String(120), nullable=True)
    reviewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

    document = relationship("Document")
    review = relationship("Review")
