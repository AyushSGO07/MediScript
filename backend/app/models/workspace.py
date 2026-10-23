from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String
from app.models.base import BaseModel

class Workspace(BaseModel):
    __tablename__ = "workspaces"

    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=True, default="")
    
    projects = relationship("Project", back_populates="workspace", cascade="all, delete-orphan")
