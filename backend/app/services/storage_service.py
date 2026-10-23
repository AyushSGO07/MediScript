import os
import uuid
import hashlib
from pathlib import Path
from typing import Tuple
from fastapi import UploadFile, HTTPException, status
from app.core.config import settings

class StorageService:
    @staticmethod
    def get_upload_dir() -> Path:
        base_dir = Path(settings.UPLOAD_DIR)
        doc_dir = base_dir / "documents"
        doc_dir.mkdir(parents=True, exist_ok=True)
        return doc_dir

    @staticmethod
    def get_preview_dir(document_id: str) -> Path:
        base_dir = Path(settings.UPLOAD_DIR)
        preview_dir = base_dir / "previews" / document_id
        preview_dir.mkdir(parents=True, exist_ok=True)
        return preview_dir

    @classmethod
    async def save_upload(cls, file: UploadFile) -> Tuple[str, str, int, str]:
        """
        Validates file extension, MIME type, and PDF magic bytes.
        Streams file content to disk while calculating SHA-256 fingerprint.
        Enforces maximum upload size.
        Returns: (document_id, storage_path, file_size_bytes, sha256_hex)
        """
        filename = file.filename or "unnamed.pdf"
        
        # 1. Validate extension
        if not filename.lower().endswith(".pdf"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file extension. Only .pdf files are accepted (got '{filename}')."
            )

        # 2. Validate MIME type
        content_type = file.content_type or ""
        if not (content_type.startswith("application/pdf") or content_type.startswith("application/x-pdf") or content_type == "application/octet-stream"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid content type '{content_type}'. Must be application/pdf."
            )

        max_size_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        doc_id = str(uuid.uuid4())
        doc_dir = cls.get_upload_dir()
        target_path = doc_dir / f"{doc_id}.pdf"

        hasher = hashlib.sha256()
        total_size = 0
        first_chunk = True

        try:
            with open(target_path, "wb") as out_file:
                while True:
                    chunk = await file.read(65536)  # 64 KB chunks
                    if not chunk:
                        break

                    # 3. Validate PDF magic bytes on first chunk
                    if first_chunk:
                        first_chunk = False
                        if not chunk.startswith(b"%PDF-"):
                            raise HTTPException(
                                status_code=status.HTTP_400_BAD_REQUEST,
                                detail="File content does not have a valid PDF header signature (%PDF-)."
                            )

                    total_size += len(chunk)
                    if total_size > max_size_bytes:
                        raise HTTPException(
                            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            detail=f"File exceeds maximum size limit of {settings.MAX_UPLOAD_SIZE_MB}MB."
                        )

                    hasher.update(chunk)
                    out_file.write(chunk)

            if total_size == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Uploaded file is empty (0 bytes)."
                )

        except Exception as e:
            # Clean up partial file on failure
            if target_path.exists():
                try:
                    os.remove(target_path)
                except OSError:
                    pass
            raise e

        sha256_hex = hasher.hexdigest().lower()
        return doc_id, str(target_path), total_size, sha256_hex
