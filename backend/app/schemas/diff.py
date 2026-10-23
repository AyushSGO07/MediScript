from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, field_validator
from app.services.diff_engine import DiffType, DiffCategory


class WordTokenDiff(BaseModel):
    text: str
    type: str  # equal, insert, delete


class DiffItemBase(BaseModel):
    change_type: str = DiffType.MODIFIED
    category: str = DiffCategory.GENERAL
    significance: str = "Medium"
    baseline_text: Optional[str] = None
    revised_text: Optional[str] = None
    baseline_page: Optional[int] = None
    revised_page: Optional[int] = None
    baseline_block_id: Optional[str] = None
    revised_block_id: Optional[str] = None
    baseline_norm_x0: Optional[float] = None
    baseline_norm_y0: Optional[float] = None
    baseline_norm_x1: Optional[float] = None
    baseline_norm_y1: Optional[float] = None
    revised_norm_x0: Optional[float] = None
    revised_norm_y0: Optional[float] = None
    revised_norm_x1: Optional[float] = None
    revised_norm_y1: Optional[float] = None
    token_diffs: Optional[List[Dict[str, Any]]] = None
    is_promoted: bool = False
    promoted_finding_id: Optional[str] = None

    @field_validator("change_type")
    @classmethod
    def validate_change_type(cls, v: str) -> str:
        upper = v.strip().upper()
        if upper not in DiffType.ALL:
            raise ValueError(f"Invalid change_type '{v}'. Allowed: {sorted(list(DiffType.ALL))}")
        return upper


class DiffItemCreate(DiffItemBase):
    review_id: str


class DiffItemResponse(DiffItemBase):
    id: str
    review_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DiffSummaryResponse(BaseModel):
    review_id: str
    total_changes: int
    added_count: int
    deleted_count: int
    modified_count: int
    promoted_count: int
    diff_items: List[DiffItemResponse] = []


class DiffPromoteRequest(BaseModel):
    severity: Optional[str] = None  # Critical, Major, Minor
    explanation: Optional[str] = None
