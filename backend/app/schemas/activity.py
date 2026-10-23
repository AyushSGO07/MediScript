from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict


class ActivityEventResponse(BaseModel):
    id: str
    workspace_id: Optional[str] = None
    project_id: Optional[str] = None
    review_id: Optional[str] = None
    event_type: str
    actor: str
    details: Dict[str, Any] = {}
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ActivityListResponse(BaseModel):
    total: int
    items: List[ActivityEventResponse]
    limit: int
    offset: int


class ActivityTypeCount(BaseModel):
    event_type: str
    count: int
