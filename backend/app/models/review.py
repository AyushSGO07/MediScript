from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, ForeignKey
from app.models.base import BaseModel

class Review(BaseModel):
    __tablename__ = "reviews"

    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="Draft")  # Draft, In Progress, Completed, Archived
    
    checklist_version_id: Mapped[str] = mapped_column(String(36), nullable=True)
    baseline_document_id: Mapped[str] = mapped_column(String(36), nullable=True)
    revised_document_id: Mapped[str] = mapped_column(String(36), nullable=True)

    project = relationship("Project", back_populates="reviews")
    activity_events = relationship("ActivityEvent", back_populates="review", cascade="all, delete-orphan")
    findings = relationship("Finding", back_populates="review", cascade="all, delete-orphan", lazy="selectin", order_by="Finding.created_at.desc()")
    diff_items = relationship("DiffItem", back_populates="review", cascade="all, delete-orphan", lazy="selectin", order_by="DiffItem.created_at.asc()")
