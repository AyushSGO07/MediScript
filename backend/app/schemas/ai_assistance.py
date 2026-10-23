from typing import Optional
from pydantic import BaseModel, Field


class CandidateEntitySuggestion(BaseModel):
    """
    Structured candidate entity suggestion with coordinate backing.
    """
    field_key: str = Field(..., description="Canonical entity key (e.g. udi_di, expiration_date)")
    suggested_value: str = Field(..., description="Extracted candidate value")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Confidence score between 0.0 and 1.0")
    page_number: int = Field(..., ge=1, description="1-based page number")
    norm_x0: float = Field(..., ge=0.0, le=1.0)
    norm_y0: float = Field(..., ge=0.0, le=1.0)
    norm_x1: float = Field(..., ge=0.0, le=1.0)
    norm_y1: float = Field(..., ge=0.0, le=1.0)
    reasoning: str = Field(..., description="Clinical/regulatory justification for candidate match")


class ClinicalImpactSummary(BaseModel):
    """
    Structured clinical risk and regulatory implication analysis for a diff item.
    """
    diff_id: str = Field(..., description="ID of the diff item analyzed")
    clinical_risk: str = Field(..., description="Categorized clinical risk level: High, Medium, or Low")
    regulatory_implication: str = Field(..., description="Applicable regulatory clause and compliance impact")
    plain_language_summary: str = Field(..., description="Concise, plain-language summary of what changed")
    suggested_action: str = Field(..., description="Recommended action for the regulatory affairs reviewer")
    confidence_score: float = Field(default=0.95, ge=0.0, le=1.0)
