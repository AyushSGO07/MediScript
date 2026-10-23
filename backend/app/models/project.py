from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, ForeignKey
from app.models.base import BaseModel

class Project(BaseModel):
    __tablename__ = "projects"

    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(String(2000), nullable=True, default="")
    status: Mapped[str] = mapped_column(String(32), default="active")  # active, archived

    workspace = relationship("Workspace", back_populates="projects")
    reviews = relationship("Review", back_populates="project", cascade="all, delete-orphan")
    activity_events = relationship("ActivityEvent", back_populates="project", cascade="all, delete-orphan")
