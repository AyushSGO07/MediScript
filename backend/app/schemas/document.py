from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field, ConfigDict

class DocumentBase(BaseModel):
    filename: str
    role: str = "baseline"
    file_size_bytes: int
    mime_type: str = "application/pdf"
    sha256: str
    page_count: int = 0
    has_text_layer: bool = True
    upload_status: str = "uploaded"
    extraction_status: str = "pending"

class DocumentResponse(DocumentBase):
    id: str
    project_id: Optional[str] = None
    review_id: Optional[str] = None
    original_filename: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DocumentAttachRequest(BaseModel):
    review_id: str
    role: Literal["baseline", "revised"]

class PageTextResponse(BaseModel):
    id: str
    document_id: str
    page_number: int
    width: float
    height: float
    extracted_text: str
    char_count: int
    word_count: int
    has_text: bool

    model_config = ConfigDict(from_attributes=True)

class TextBlockResponse(BaseModel):
    id: str
    page_number: int
    block_index: int
    text: str
    x0: float
    y0: float
    x1: float
    y1: float
    norm_x0: float
    norm_y0: float
    norm_x1: float
    norm_y1: float
    font_name: Optional[str] = None
    font_size: Optional[float] = None
    is_heading: bool = False

    model_config = ConfigDict(from_attributes=True)

class DocumentDetailResponse(DocumentResponse):
    pages: List[PageTextResponse] = []
    text_blocks: List[TextBlockResponse] = []

    model_config = ConfigDict(from_attributes=True)
