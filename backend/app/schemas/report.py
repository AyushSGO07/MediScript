from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class DocumentHashInfo(BaseModel):
    filename: str
    file_size_bytes: int
    sha256: str
    page_count: int
    role: str


class ReportPreviewResponse(BaseModel):
    review_id: str
    review_name: str
    project_name: str
    status: str
    checklist_name: str
    checklist_version: str
    evaluated_at: Optional[datetime] = None
    total_rules_evaluated: int = 0
    rules_passed: int = 0
    rules_failed: int = 0
    critical_count: int = 0
    major_count: int = 0
    minor_count: int = 0
    triaged_count: int = 0
    baseline_doc: Optional[DocumentHashInfo] = None
    revised_doc: Optional[DocumentHashInfo] = None
    disclaimer: str


class ReviewPackageExportResponse(BaseModel):
    schema_version: str = "1.0.0"
    export_timestamp: str
    system: str = "MediScript Verification Engine"
    disclaimer: str
    project: Dict[str, Any]
    review: Dict[str, Any]
    checklist: Dict[str, Any]
    documents: Dict[str, Optional[Dict[str, Any]]]
    extracted_entities: Dict[str, List[Dict[str, Any]]]
    revision_diff: Dict[str, Any]
    compliance_findings: List[Dict[str, Any]]
    activity_trail: List[Dict[str, Any]]
