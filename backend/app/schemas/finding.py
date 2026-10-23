from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, field_validator
from app.models.finding import FindingStatus, FindingCategory
from app.models.checklist import SeverityLevel


class FindingBase(BaseModel):
    rule_key: str
    checklist_version_id: str
    category: str = FindingCategory.GENERAL
    severity: str = SeverityLevel.MAJOR
    status: str = FindingStatus.OPEN
    explanation: str
    expected_value: Optional[str] = None
    observed_value: Optional[str] = None
    source_document_id: Optional[str] = None
    document_role: str = "revised"
    page_number: Optional[int] = None
    evidence_snippet: Optional[str] = None
    norm_x0: Optional[float] = None
    norm_y0: Optional[float] = None
    norm_x1: Optional[float] = None
    norm_y1: Optional[float] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        norm = v.strip().title()
        if norm not in FindingStatus.ALL:
            # Handle special case 'Under Investigation'
            if v.strip().lower() == "under investigation":
                return FindingStatus.UNDER_INVESTIGATION
            raise ValueError(f"Invalid finding status '{v}'. Allowed values: {sorted(list(FindingStatus.ALL))}")
        return norm

    @field_validator("severity")
    @classmethod
    def validate_severity(cls, v: str) -> str:
        norm = v.strip().title()
        if norm not in SeverityLevel.ALL:
            raise ValueError(f"Invalid severity '{v}'. Allowed values: {sorted(list(SeverityLevel.ALL))}")
        return norm


class FindingCreate(FindingBase):
    review_id: str
    rule_id: Optional[str] = None
    diff_item_id: Optional[str] = None


class FindingUpdate(BaseModel):
    status: Optional[str] = None
    explanation: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        norm = v.strip().title()
        if norm not in FindingStatus.ALL:
            if v.strip().lower() == "under investigation":
                return FindingStatus.UNDER_INVESTIGATION
            raise ValueError(f"Invalid finding status '{v}'. Allowed values: {sorted(list(FindingStatus.ALL))}")
        return norm


class FindingDecisionCreate(BaseModel):
    new_status: str
    note: Optional[str] = None
    actor: Optional[str] = None
    actor_role: Optional[str] = None

    @field_validator("new_status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        norm = v.strip().title()
        if norm not in FindingStatus.ALL:
            if v.strip().lower() == "under investigation":
                return FindingStatus.UNDER_INVESTIGATION
            raise ValueError(f"Invalid finding status '{v}'. Allowed values: {sorted(list(FindingStatus.ALL))}")
        return norm


class FindingDecisionResponse(BaseModel):
    id: str
    finding_id: str
    review_id: str
    prior_status: str
    new_status: str
    actor: str
    actor_role: Optional[str] = None
    note: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FindingResponse(FindingBase):
    id: str
    review_id: str
    rule_id: Optional[str] = None
    diff_item_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    latest_decision: Optional[FindingDecisionResponse] = None
    decision_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class ReviewEvaluationResponse(BaseModel):
    review_id: str
    checklist_version_id: str
    evaluated_at: datetime
    total_rules_evaluated: int
    rules_passed: int
    rules_failed: int
    critical_count: int
    major_count: int
    minor_count: int
    findings: List[FindingResponse] = []
