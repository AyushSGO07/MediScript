from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, field_validator
from app.models.checklist import SeverityLevel, RuleType, VersionStatus


class ChecklistRuleBase(BaseModel):
    rule_key: str
    field_key: str
    description: str
    severity: str = SeverityLevel.MAJOR
    rule_type: str = RuleType.REQUIRED_PRESENCE
    expected_value: Optional[str] = None
    config: Optional[str] = None
    enabled: bool = True

    @field_validator("severity")
    @classmethod
    def validate_severity(cls, v: str) -> str:
        norm = v.strip().title()
        if norm not in SeverityLevel.ALL:
            raise ValueError(f"Invalid severity '{v}'. Allowed values: {sorted(list(SeverityLevel.ALL))}")
        return norm

    @field_validator("rule_type")
    @classmethod
    def validate_rule_type(cls, v: str) -> str:
        norm = v.strip().upper()
        if norm not in RuleType.ALL:
            raise ValueError(f"Invalid rule_type '{v}'. Allowed values: {sorted(list(RuleType.ALL))}")
        return norm


class ChecklistRuleCreate(ChecklistRuleBase):
    pass


class ChecklistRuleUpdate(BaseModel):
    description: Optional[str] = None
    severity: Optional[str] = None
    rule_type: Optional[str] = None
    expected_value: Optional[str] = None
    config: Optional[str] = None
    enabled: Optional[bool] = None

    @field_validator("severity")
    @classmethod
    def validate_severity(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        norm = v.strip().title()
        if norm not in SeverityLevel.ALL:
            raise ValueError(f"Invalid severity '{v}'. Allowed values: {sorted(list(SeverityLevel.ALL))}")
        return norm

    @field_validator("rule_type")
    @classmethod
    def validate_rule_type(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        norm = v.strip().upper()
        if norm not in RuleType.ALL:
            raise ValueError(f"Invalid rule_type '{v}'. Allowed values: {sorted(list(RuleType.ALL))}")
        return norm


class ChecklistRuleResponse(ChecklistRuleBase):
    id: str
    checklist_version_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ChecklistVersionBase(BaseModel):
    version: str
    status: str = VersionStatus.DRAFT
    effective_date: Optional[str] = None
    changelog_summary: Optional[str] = None
    created_by: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        norm = v.strip().lower()
        if norm not in VersionStatus.ALL:
            raise ValueError(f"Invalid version status '{v}'. Allowed values: {sorted(list(VersionStatus.ALL))}")
        return norm


class ChecklistVersionCreate(ChecklistVersionBase):
    clone_from_version_id: Optional[str] = None
    rules: Optional[List[ChecklistRuleCreate]] = None


class ChecklistVersionResponse(ChecklistVersionBase):
    id: str
    checklist_id: str
    rule_count: Optional[int] = 0
    is_locked: Optional[bool] = False
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ChecklistVersionDetailResponse(ChecklistVersionResponse):
    rules: List[ChecklistRuleResponse] = []


class ChecklistBase(BaseModel):
    name: str
    description: Optional[str] = None
    jurisdiction: str
    source_reference: Optional[str] = None
    is_demonstration: bool = False


class ChecklistCreate(ChecklistBase):
    initial_version: Optional[str] = "v1.0.0"
    rules: Optional[List[ChecklistRuleCreate]] = None


class ChecklistUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    jurisdiction: Optional[str] = None
    source_reference: Optional[str] = None


class ChecklistResponse(ChecklistBase):
    id: str
    version_count: Optional[int] = 0
    latest_version: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ChecklistDetailResponse(ChecklistResponse):
    versions: List[ChecklistVersionResponse] = []


class CloneVersionRequest(BaseModel):
    target_version: str
    effective_date: Optional[str] = None
    changelog_summary: Optional[str] = None
    copy_rules: bool = True
