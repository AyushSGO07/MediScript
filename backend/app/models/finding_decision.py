from typing import Optional
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Text, ForeignKey
from app.models.base import BaseModel


class FindingDecision(BaseModel):
    __tablename__ = "finding_decisions"

    finding_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("findings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    review_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("reviews.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    prior_status: Mapped[str] = mapped_column(String(32), nullable=False)
    new_status: Mapped[str] = mapped_column(String(32), nullable=False)
    actor: Mapped[str] = mapped_column(String(120), default="Reviewer", nullable=False)
    actor_role: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    finding = relationship("Finding", back_populates="decisions")
    review = relationship("Review")
