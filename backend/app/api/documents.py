from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.services.document_service import DocumentService
from app.services.page_rendering import PageRenderingService
from app.schemas.document import (
    DocumentResponse,
    DocumentDetailResponse,
    DocumentAttachRequest,
    PageTextResponse,
    TextBlockResponse,
)

router = APIRouter(tags=["Documents"])

@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    role: str = Form("baseline"),
    project_id: Optional[str] = Form(None),
    review_id: Optional[str] = Form(None),
    actor: str = Form("System"),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a medical label PDF file (baseline or revised).
    Computes SHA-256 fingerprint, validates %PDF- magic bytes, extracts text/blocks via PyMuPDF,
    and pre-renders page previews.
    """
    doc = await DocumentService.create_document(
        db=db,
        file=file,
        role=role,
        project_id=project_id,
        review_id=review_id,
        actor=actor,
    )
    return DocumentResponse.model_validate(doc)

@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
):
    doc = await DocumentService.get_document(db, document_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Document {document_id} not found.")
    return DocumentResponse.model_validate(doc)

@router.get("/{document_id}/detail", response_model=DocumentDetailResponse)
async def get_document_detail(
    document_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get full document metadata including all page texts and text blocks."""
    doc = await DocumentService.get_document_with_pages(db, document_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Document {document_id} not found.")
    return DocumentDetailResponse.model_validate(doc)

@router.post("/{document_id}/extract", response_model=DocumentResponse)
async def trigger_extraction(
    document_id: str,
    actor: str = "System",
    db: AsyncSession = Depends(get_db),
):
    """Explicitly trigger or re-run PyMuPDF extraction for an uploaded document."""
    doc = await DocumentService.process_extraction(db, document_id, actor=actor)
    return DocumentResponse.model_validate(doc)

@router.get("/{document_id}/pages", response_model=List[PageTextResponse])
async def list_document_pages(
    document_id: str,
    db: AsyncSession = Depends(get_db),
):
    """List all pages extracted for a document with dimensional and character metrics."""
    pages = await DocumentService.list_pages(db, document_id)
    return [PageTextResponse.model_validate(p) for p in pages]

@router.get("/{document_id}/pages/{page_number}")
async def get_page_details(
    document_id: str,
    page_number: int,
    db: AsyncSession = Depends(get_db),
):
    """Get detailed page text and all structured text blocks with normalized coordinates."""
    page, blocks = await DocumentService.get_page_details(db, document_id, page_number)
    if not page:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Page {page_number} not found for document {document_id}."
        )
    return {
        "page": PageTextResponse.model_validate(page),
        "blocks": [TextBlockResponse.model_validate(b) for b in blocks],
    }

@router.get("/{document_id}/pages/{page_number}/preview")
async def get_page_preview(
    document_id: str,
    page_number: int,
    dpi: int = Query(150, ge=72, le=300),
    db: AsyncSession = Depends(get_db),
):
    """
    Stream high-resolution PNG preview image of a specific 1-based page.
    Utilizes disk caching for instantaneous repeated access.
    """
    doc = await DocumentService.get_document(db, document_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Document {document_id} not found.")

    try:
        png_bytes = PageRenderingService.render_page_preview(
            file_path=doc.storage_path,
            page_number=page_number,
            document_id=doc.id,
            dpi=dpi,
        )
        return Response(
            content=png_bytes,
            media_type="image/png",
            headers={
                "Cache-Control": "public, max-age=86400",
                "Content-Disposition": f'inline; filename="preview_{document_id}_p{page_number}.png"',
            },
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.post("/{document_id}/attach", response_model=DocumentResponse)
async def attach_document(
    document_id: str,
    data: DocumentAttachRequest,
    actor: str = "System",
    db: AsyncSession = Depends(get_db),
):
    """Attach an existing document to a review as baseline or revised label."""
    doc = await DocumentService.attach_document_to_review(
        db=db,
        document_id=document_id,
        review_id=data.review_id,
        role=data.role,
        actor=actor,
    )
    return DocumentResponse.model_validate(doc)

@router.get("/review/{review_id}", response_model=List[DocumentResponse])
async def list_review_documents(
    review_id: str,
    db: AsyncSession = Depends(get_db),
):
    """List all documents attached to a review."""
    docs = await DocumentService.list_documents_for_review(db, review_id)
    return [DocumentResponse.model_validate(d) for d in docs]
