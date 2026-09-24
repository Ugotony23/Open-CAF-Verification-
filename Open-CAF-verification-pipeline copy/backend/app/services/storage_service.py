"""Storage Service for Evidence Artifacts with SHA-256 Integrity Verification."""
import os
import re
import hashlib
from pathlib import Path
from typing import Tuple, Set
from uuid import UUID
from fastapi import UploadFile, HTTPException, status
from app.core.config import get_settings

ALLOWED_EXTENSIONS: Set[str] = {
    ".pdf",
    ".docx",
    ".xlsx",
    ".csv",
    ".json",
    ".txt",
    ".png",
    ".jpg",
    ".jpeg",
}

ALLOWED_MIME_TYPES: Set[str] = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "text/csv",
    "application/json",
    "text/plain",
    "image/png",
    "image/jpeg",
    "application/octet-stream",  # often sent by generic clients
}

MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB
CHUNK_SIZE = 64 * 1024  # 64 KB

class StorageService:
    def __init__(self, base_dir: str | None = None):
        settings = get_settings()
        raw_dir = base_dir or settings.STORAGE_DIR
        # Fallback to local ./storage_data if /app is not writable
        try:
            p = Path(raw_dir)
            p.mkdir(parents=True, exist_ok=True)
            self.base_dir = p
        except (PermissionError, OSError):
            fallback = Path("./storage_data")
            fallback.mkdir(parents=True, exist_ok=True)
            self.base_dir = fallback

    def _sanitize_filename(self, filename: str) -> str:
        # Strip path traversal and keep safe alphanumeric characters and dots
        clean = os.path.basename(filename)
        clean = re.sub(r'[^a-zA-Z0-9_.-]', '_', clean)
        return clean or "artifact.bin"

    async def save_file(
        self,
        file: UploadFile,
        tenant_id: UUID,
    ) -> Tuple[str, str, int, str]:
        """
        Streams uploaded file to disk, calculating SHA-256 checksum and enforcing size & type constraints.
        Returns: (file_path, sha256_hash, file_size_bytes, mime_type)
        """
        original_name = file.filename or "uploaded_file"
        ext = Path(original_name).suffix.lower()

        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file extension '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
            )

        content_type = file.content_type or "application/octet-stream"
        if content_type not in ALLOWED_MIME_TYPES:
            # If MIME type is unexpected, but extension is valid, allow or flag
            pass

        safe_name = self._sanitize_filename(original_name)
        tenant_dir = self.base_dir / str(tenant_id)
        tenant_dir.mkdir(parents=True, exist_ok=True)

        unique_prefix = hashlib.md5(os.urandom(16)).hexdigest()[:12]
        dest_filename = f"{unique_prefix}_{safe_name}"
        destination_path = tenant_dir / dest_filename

        hasher = hashlib.sha256()
        total_bytes = 0

        try:
            with open(destination_path, "wb") as f_out:
                while True:
                    chunk = await file.read(CHUNK_SIZE)
                    if not chunk:
                        break
                    total_bytes += len(chunk)
                    if total_bytes > MAX_FILE_SIZE_BYTES:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"File exceeds maximum allowed size limit of 25MB ({MAX_FILE_SIZE_BYTES} bytes)",
                        )
                    hasher.update(chunk)
                    f_out.write(chunk)
        except Exception:
            # Clean up partial file on failure
            if destination_path.exists():
                destination_path.unlink()
            raise

        sha256_hash = hasher.hexdigest()
        return str(destination_path), sha256_hash, total_bytes, content_type

    def get_file_path(self, file_path_str: str) -> Path:
        p = Path(file_path_str)
        if not p.is_file():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Stored evidence file not found on filesystem",
            )
        return p

    def delete_file(self, file_path_str: str) -> bool:
        try:
            p = Path(file_path_str)
            if p.is_file():
                p.unlink()
                return True
            return False
        except OSError:
            return False

    def verify_checksum(self, file_path_str: str, expected_hash: str) -> bool:
        p = self.get_file_path(file_path_str)
        hasher = hashlib.sha256()
        with open(p, "rb") as f:
            while chunk := f.read(CHUNK_SIZE):
                hasher.update(chunk)
        return hasher.hexdigest().lower() == expected_hash.lower()

storage_service = StorageService()
