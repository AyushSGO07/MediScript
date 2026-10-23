from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field, ConfigDict

ConfidenceStateType = Literal["EXTRACTED", "AMBIGUOUS", "NOT_READABLE", "NOT_FOUND"]

class ExtractedFieldBase(BaseModel):
    field_key: str
    field_label: str
    category: str
    value: Optional[str] = None
    raw_value: Optional[str] = None
    normalized_value: Optional[str] = None
    confidence_state: ConfidenceStateType
    evidence_text: Optional[str] = None
    evidence_page: Optional[int] = None
    evidence_block_id: Optional[str] = None
    norm_x0: Optional[float] = None
    norm_y0: Optional[float] = None
    norm_x1: Optional[float] = None
    norm_y1: Optional[float] = None
    is_iso_compliant: Optional[bool] = None
    is_expired: Optional[bool] = None
    days_until_expiration: Optional[int] = None
    is_overridden: bool = False
    original_value: Optional[str] = None
    original_confidence_state: Optional[str] = None
    override_reason: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None

class ExtractedFieldResponse(ExtractedFieldBase):
    id: str
    document_id: str
    review_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ExtractedFieldUpdateRequest(BaseModel):
    value: str = Field(..., min_length=1, description="Corrected entity value")
    override_reason: str = Field(..., min_length=3, description="Regulatory rationale for manual override")

class ReviewFieldsResponse(BaseModel):
    review_id: str
    baseline_fields: List[ExtractedFieldResponse] = []
    revised_fields: List[ExtractedFieldResponse] = []
