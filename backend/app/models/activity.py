import json
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, ForeignKey, Text
from app.models.base import BaseModel

class ActivityEvent(BaseModel):
    __tablename__ = "activity_events"

    workspace_id: Mapped[str] = mapped_column(String(36), nullable=True)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), nullable=True)
    review_id: Mapped[str] = mapped_column(String(36), ForeignKey("reviews.id"), nullable=True)
    
    event_type: Mapped[str] = mapped_column(String(64), nullable=False)  # PROJECT_CREATED, REVIEW_CREATED, etc.
    actor: Mapped[str] = mapped_column(String(120), nullable=False, default="System")
    _details: Mapped[str] = mapped_column("details", Text, default="{}")

    project = relationship("Project", back_populates="activity_events")
    review = relationship("Review", back_populates="activity_events")

    @property
    def details(self) -> dict:
        try:
            return json.loads(self._details)
        except Exception:
            return {}

    @details.setter
    def details(self, val: dict):
        self._details = json.dumps(val or {})
