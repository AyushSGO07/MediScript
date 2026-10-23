from typing import Optional
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Text, Integer, Float, ForeignKey
from app.models.base import BaseModel
from app.models.checklist import SeverityLevel


class FindingStatus:
    OPEN = "Open"
    ACCEPTED = "Accepted"
    RESOLVED = "Resolved"
    UNDER_INVESTIGATION = "Under Investigation"

    ALL = {OPEN, ACCEPTED, RESOLVED, UNDER_INVESTIGATION}


class FindingCategory:
    IDENTIFIERS = "Identifiers"
    MANUFACTURER = "Manufacturer"
    DATES = "Dates"
    REGULATORY = "Regulatory"
    SAFETY = "Safety"
    GENERAL = "General"

    ALL = {IDENTIFIERS, MANUFACTURER, DATES, REGULATORY, SAFETY, GENERAL}


class Finding(BaseModel):
    __tablename__ = "findings"

    review_id: Mapped[str] = mapped_column(String(36), ForeignKey("reviews.id", ondelete="CASCADE"), nullable=False)
    rule_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("checklist_rules.id", ondelete="SET NULL"), nullable=True)
    diff_item_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("diff_items.id", ondelete="SET NULL"), nullable=True)
    rule_key: Mapped[str] = mapped_column(String(80), nullable=False)
    checklist_version_id: Mapped[str] = mapped_column(String(36), nullable=False)
    category: Mapped[str] = mapped_column(String(40), default=FindingCategory.GENERAL)
    severity: Mapped[str] = mapped_column(String(24), default=SeverityLevel.MAJOR)
    status: Mapped[str] = mapped_column(String(32), default=FindingStatus.OPEN)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    expected_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    observed_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source_document_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    document_role: Mapped[str] = mapped_column(String(20), default="revised")  # revised or baseline
    page_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    evidence_snippet: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    norm_x0: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    norm_y0: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    norm_x1: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    norm_y1: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    review = relationship("Review", back_populates="findings")
    rule = relationship("ChecklistRule", lazy="selectin")
    decisions = relationship(
        "FindingDecision",
        back_populates="finding",
        cascade="all, delete-orphan",
        order_by="desc(FindingDecision.created_at)",
        lazy="selectin",
    )

    @property
    def latest_decision(self):
        return self.decisions[0] if self.decisions else None

    @property
    def decision_count(self) -> int:
        return len(self.decisions) if self.decisions else 0
