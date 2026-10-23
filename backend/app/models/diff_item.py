from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Text, Integer, Float, Boolean, ForeignKey, JSON
from app.models.base import BaseModel
from app.services.diff_engine import DiffType, DiffCategory


class DiffItem(BaseModel):
    __tablename__ = "diff_items"

    review_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("reviews.id", ondelete="CASCADE"), nullable=False
    )
    change_type: Mapped[str] = mapped_column(String(20), default=DiffType.MODIFIED)
    category: Mapped[str] = mapped_column(String(40), default=DiffCategory.GENERAL)
    significance: Mapped[str] = mapped_column(String(20), default="Medium")  # High, Medium, Low

    baseline_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    revised_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    baseline_page: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    revised_page: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    baseline_block_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    revised_block_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)

    baseline_norm_x0: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    baseline_norm_y0: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    baseline_norm_x1: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    baseline_norm_y1: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    revised_norm_x0: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    revised_norm_y0: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    revised_norm_x1: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    revised_norm_y1: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Word-level token diffs: List[{"text": str, "type": "equal"|"insert"|"delete"}]
    token_diffs: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, nullable=True)

    is_promoted: Mapped[bool] = mapped_column(Boolean, default=False)
    promoted_finding_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)

    # Relationships
    review = relationship("Review", back_populates="diff_items")
