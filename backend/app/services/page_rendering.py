from pathlib import Path
from typing import Optional
import pymupdf as fitz
from app.services.storage_service import StorageService

class PageRenderingService:
    @staticmethod
    def get_cached_preview_path(document_id: str, page_number: int) -> Path:
        preview_dir = StorageService.get_preview_dir(document_id)
        return preview_dir / f"page_{page_number}.png"

    @classmethod
    def render_page_preview(
        cls,
        file_path: str,
        page_number: int,
        document_id: str,
        dpi: int = 150,
    ) -> bytes:
        """
        Renders a given 1-based page of a PDF as high-resolution PNG image bytes.
        Caches rendered PNG in uploads/previews/{document_id}/page_{page_number}.png.
        """
        cache_path = cls.get_cached_preview_path(document_id, page_number)
        if cache_path.exists():
            with open(cache_path, "rb") as f:
                return f.read()

        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"PDF file not found at {file_path}")

        doc = fitz.open(file_path)
        try:
            total_pages = len(doc)
            if page_number < 1 or page_number > total_pages:
                raise ValueError(f"Page number {page_number} is out of range (1..{total_pages}).")

            page = doc[page_number - 1]
            zoom = dpi / 72.0
            matrix = fitz.Matrix(zoom, zoom)
            pix = page.get_pixmap(matrix=matrix, alpha=False)
            png_bytes = pix.tobytes("png")

            # Write cache
            cache_path.parent.mkdir(parents=True, exist_ok=True)
            with open(cache_path, "wb") as f:
                f.write(png_bytes)

            return png_bytes
        finally:
            doc.close()

    @classmethod
    def render_all_pages(
        cls,
        file_path: str,
        document_id: str,
        dpi: int = 150,
    ) -> int:
        """
        Pre-renders and caches preview PNG images for all pages in the PDF.
        Returns the number of pages successfully rendered.
        """
        path = Path(file_path)
        if not path.exists():
            return 0

        doc = fitz.open(file_path)
        count = 0
        try:
            total_pages = len(doc)
            for page_idx in range(total_pages):
                page_number = page_idx + 1
                cls.render_page_preview(file_path, page_number, document_id, dpi=dpi)
                count += 1
            return count
        except Exception:
            return count
        finally:
            doc.close()
