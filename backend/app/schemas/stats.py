from typing import List, Dict, Any
from pydantic import BaseModel

class ActivitySummary(BaseModel):
    id: str
    event_type: str
    actor: str
    timestamp: str
    details: Dict[str, Any]

class StatsResponse(BaseModel):
    total_projects: int = 0
    total_reviews: int = 0
    draft_reviews: int = 0
    in_progress_reviews: int = 0
    completed_reviews: int = 0
    archived_reviews: int = 0
    open_findings_count: int = 0
    recent_activity: List[ActivitySummary] = []
