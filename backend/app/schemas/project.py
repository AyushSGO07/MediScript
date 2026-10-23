from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field, ConfigDict

class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120, description="Project name")
    description: Optional[str] = Field(default="", max_length=2000, description="Project description")

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    description: Optional[str] = Field(default=None, max_length=2000)
    status: Optional[Literal["active", "archived"]] = None

class ProjectResponse(ProjectBase):
    id: str
    workspace_id: str
    status: str
    review_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
