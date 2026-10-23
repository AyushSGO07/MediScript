from typing import List, Optional
from pydantic import BaseModel, Field


class ChatMessageRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Question regarding medical device label parameters")
    document_role: Optional[str] = Field("revised", description="Document target: 'revised' or 'baseline'")


class CitationReference(BaseModel):
    page_number: int = Field(..., ge=1, description="1-based page number")
    block_index: int = Field(..., ge=0, description="0-based text block index on the page")
    document_role: str = Field(..., description="Document role (revised or baseline)")
    norm_x0: float = Field(..., ge=0.0, le=1.0)
    norm_y0: float = Field(..., ge=0.0, le=1.0)
    norm_x1: float = Field(..., ge=0.0, le=1.0)
    norm_y1: float = Field(..., ge=0.0, le=1.0)
    snippet: str = Field(..., description="Exact textual evidence extract")


class ChatMessageResponse(BaseModel):
    answer: str = Field(..., description="Synthesized grounded answer with bracketed citations [p. X, block Y]")
    citations: List[CitationReference] = Field(default_factory=list, description="Visual coordinate citations")
    is_abstained: bool = Field(False, description="True if question is outside document evidence bounds")
    engine: str = Field("deterministic", description="Engine used: deterministic or gemini")
