"""PDF upload, validation, and text extraction."""

import logging
import os
from typing import Optional

import fitz  # PyMuPDF
from fastapi import UploadFile

logger = logging.getLogger(__name__)

MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", "15"))
MAX_PAGES = int(os.getenv("MAX_PAGES", "25"))
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")


def validate_upload(file: UploadFile) -> Optional[str]:
    """Validate uploaded file. Returns error message or None if valid."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        return "Only PDF files are accepted"
    if file.content_type and file.content_type != "application/pdf":
        return "Only PDF files are accepted"
    return None


async def save_file(file: UploadFile, job_id: str) -> str:
    """Save uploaded file to disk. Returns the file path."""
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(UPLOAD_DIR, f"{job_id}.pdf")
    content = await file.read()

    if len(content) > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise ValueError(f"File exceeds {MAX_FILE_SIZE_MB}MB limit")

    with open(file_path, "wb") as f:
        f.write(content)

    return file_path


def validate_page_count(file_path: str) -> Optional[str]:
    """Check page count after saving. Returns error message or None."""
    try:
        doc = fitz.open(file_path)
        page_count = len(doc)
        doc.close()
        if page_count > MAX_PAGES:
            return f"PDF exceeds {MAX_PAGES} page limit"
        return None
    except Exception:
        return "Unable to extract text from PDF. Ensure it's a typed document."


def extract_text(file_path: str) -> str:
    """Extract text from all pages of a PDF."""
    try:
        doc = fitz.open(file_path)
        text_parts = []
        for page in doc:
            text_parts.append(page.get_text())
        doc.close()
        full_text = "\n".join(text_parts)
        if not full_text.strip():
            raise ValueError(
                "Unable to extract text from PDF. Ensure it's a typed document."
            )
        return full_text
    except ValueError:
        raise
    except Exception as e:
        logger.error("PDF extraction failed: %s", e)
        raise ValueError(
            "Unable to extract text from PDF. Ensure it's a typed document."
        ) from e
