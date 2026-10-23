from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field, ConfigDict

ReviewStatusType = Literal["Draft", "In Progress", "Completed", "Archived"]

class ReviewBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120, description="Review name")
    checklist_version_id: Optional[str] = None
    baseline_document_id: Optional[str] = None
    revised_document_id: Optional[str] = None

class ReviewCreate(BaseModel):
    project_id: str = Field(..., description="Project UUID")
    name: str = Field(..., min_length=1, max_length=120)
    checklist_version_id: Optional[str] = None
    baseline_document_id: Optional[str] = None
    revised_document_id: Optional[str] = None

class ReviewUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    status: Optional[ReviewStatusType] = None
    checklist_version_id: Optional[str] = None
    baseline_document_id: Optional[str] = None
    revised_document_id: Optional[str] = None

class ReviewResponse(ReviewBase):
    id: str
    project_id: str
    status: str
    findings_count: Optional[int] = 0
    critical_findings_count: Optional[int] = 0
    diff_count: Optional[int] = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
