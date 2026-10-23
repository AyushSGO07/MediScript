from typing import Dict, Any, List
from pathlib import Path
import pymupdf as fitz

class PDFExtractionService:
    @staticmethod
    def extract_document(file_path: str) -> Dict[str, Any]:
        """
        Extracts plain text, structured text blocks, font metadata, and
        normalized bounding-box coordinates from a PDF file using PyMuPDF.

        Returns:
            Dict containing:
                - page_count: int
                - has_text_layer: bool
                - pages: List[Dict] with page_number, dimensions, text, counts
                - text_blocks: List[Dict] with block coordinates and font info
        """
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"PDF file not found at {file_path}")

        try:
            doc = fitz.open(file_path)
        except Exception as e:
            raise ValueError(f"Failed to open PDF document: {str(e)}")

        try:
            if doc.is_encrypted:
                raise ValueError("Password-protected or encrypted PDFs are not supported.")

            page_count = len(doc)
            pages: List[Dict[str, Any]] = []
            text_blocks: List[Dict[str, Any]] = []

            for page_idx in range(page_count):
                page = doc[page_idx]
                page_number = page_idx + 1  # 1-based human-readable page indexing
                
                width = float(page.rect.width)
                height = float(page.rect.height)
                
                # Raw page text
                raw_text = page.get_text("text") or ""
                clean_text = raw_text.strip()
                char_count = len(clean_text)
                word_count = len(clean_text.split()) if clean_text else 0
                has_text = char_count > 0

                page_data = {
                    "page_number": page_number,
                    "width": width,
                    "height": height,
                    "extracted_text": clean_text,
                    "char_count": char_count,
                    "word_count": word_count,
                    "has_text": has_text,
                }
                pages.append(page_data)

                # Detailed structured extraction via page.get_text("dict")
                page_dict = page.get_text("dict")
                raw_blocks = page_dict.get("blocks", [])
                
                block_idx = 0
                for block in raw_blocks:
                    # type 0 is text; type 1 is image
                    if block.get("type") != 0:
                        continue

                    bx0, by0, bx1, by1 = block.get("bbox", (0, 0, 0, 0))
                    
                    # Normalize coordinates to 0.0 - 1.0 clamped
                    norm_x0 = max(0.0, min(1.0, bx0 / width if width > 0 else 0.0))
                    norm_y0 = max(0.0, min(1.0, by0 / height if height > 0 else 0.0))
                    norm_x1 = max(0.0, min(1.0, bx1 / width if width > 0 else 0.0))
                    norm_y1 = max(0.0, min(1.0, by1 / height if height > 0 else 0.0))

                    # Gather lines, text, font metadata
                    lines = block.get("lines", [])
                    block_text_parts = []
                    font_sizes = []
                    font_names = []
                    is_bold = False

                    for line in lines:
                        for span in line.get("spans", []):
                            span_text = span.get("text", "")
                            if span_text:
                                block_text_parts.append(span_text)
                            size = span.get("size")
                            if size is not None:
                                font_sizes.append(float(size))
                            font = span.get("font")
                            if font:
                                font_names.append(font)
                            flags = span.get("flags", 0)
                            if flags & 2:  # bold flag in PyMuPDF
                                is_bold = True

                    block_text = " ".join(block_text_parts).strip()
                    if not block_text:
                        continue

                    max_font_size = max(font_sizes) if font_sizes else 10.0
                    dominant_font = font_names[0] if font_names else None
                    # Heading heuristic: font size >= 13 or bold with size >= 11
                    is_heading = (max_font_size >= 13.0) or (is_bold and max_font_size >= 11.0)

                    block_record = {
                        "page_number": page_number,
                        "block_index": block_idx,
                        "text": block_text,
                        "x0": round(float(bx0), 2),
                        "y0": round(float(by0), 2),
                        "x1": round(float(bx1), 2),
                        "y1": round(float(by1), 2),
                        "norm_x0": round(float(norm_x0), 4),
                        "norm_y0": round(float(norm_y0), 4),
                        "norm_x1": round(float(norm_x1), 4),
                        "norm_y1": round(float(norm_y1), 4),
                        "font_name": dominant_font,
                        "font_size": round(float(max_font_size), 1) if max_font_size else None,
                        "is_heading": is_heading,
                    }
                    text_blocks.append(block_record)
                    block_idx += 1

            total_chars = sum(p["char_count"] for p in pages)
            total_blocks = len(text_blocks)
            # Scanned/raster detection: if total characters < 10 or 0 blocks, flag lack of text layer
            has_text_layer = (total_chars >= 10 and total_blocks > 0)

            return {
                "page_count": page_count,
                "has_text_layer": has_text_layer,
                "pages": pages,
                "text_blocks": text_blocks,
                "total_chars": total_chars,
                "total_blocks": total_blocks,
            }
        finally:
            doc.close()
