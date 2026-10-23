from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, Float, Boolean, Text, ForeignKey
from app.models.base import BaseModel

class Document(BaseModel):
    __tablename__ = "documents"

    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), nullable=True)
    review_id: Mapped[str] = mapped_column(String(36), ForeignKey("reviews.id"), nullable=True)
    role: Mapped[str] = mapped_column(String(32), default="baseline")  # baseline, revised, supporting
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), default="application/pdf")
    sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(500), nullable=False)
    page_count: Mapped[int] = mapped_column(Integer, default=0)
    has_text_layer: Mapped[bool] = mapped_column(Boolean, default=True)
    upload_status: Mapped[str] = mapped_column(String(32), default="uploaded")  # uploaded, failed
    extraction_status: Mapped[str] = mapped_column(String(32), default="pending")  # pending, processing, completed, failed, text_layer_missing

    pages = relationship("PageText", back_populates="document", cascade="all, delete-orphan", order_by="PageText.page_number")
    text_blocks = relationship("TextBlock", back_populates="document", cascade="all, delete-orphan", order_by="TextBlock.block_index")


class PageText(BaseModel):
    __tablename__ = "page_texts"

    document_id: Mapped[str] = mapped_column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    page_number: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-based human indexing
    width: Mapped[float] = mapped_column(Float, default=0.0)
    height: Mapped[float] = mapped_column(Float, default=0.0)
    extracted_text: Mapped[str] = mapped_column(Text, default="")
    char_count: Mapped[int] = mapped_column(Integer, default=0)
    word_count: Mapped[int] = mapped_column(Integer, default=0)
    has_text: Mapped[bool] = mapped_column(Boolean, default=True)

    document = relationship("Document", back_populates="pages")


class TextBlock(BaseModel):
    __tablename__ = "text_blocks"

    document_id: Mapped[str] = mapped_column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    page_number: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-based human indexing
    block_index: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Absolute PDF coordinates (points, 72 DPI)
    x0: Mapped[float] = mapped_column(Float, nullable=False)
    y0: Mapped[float] = mapped_column(Float, nullable=False)
    x1: Mapped[float] = mapped_column(Float, nullable=False)
    y1: Mapped[float] = mapped_column(Float, nullable=False)
    
    # Normalized coordinates (0.0 - 1.0) for responsive overlay
    norm_x0: Mapped[float] = mapped_column(Float, nullable=False)
    norm_y0: Mapped[float] = mapped_column(Float, nullable=False)
    norm_x1: Mapped[float] = mapped_column(Float, nullable=False)
    norm_y1: Mapped[float] = mapped_column(Float, nullable=False)
    
    font_name: Mapped[str] = mapped_column(String(120), nullable=True)
    font_size: Mapped[float] = mapped_column(Float, nullable=True)
    is_heading: Mapped[bool] = mapped_column(Boolean, default=False)

    document = relationship("Document", back_populates="text_blocks")
