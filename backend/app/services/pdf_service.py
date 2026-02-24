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


def get_page_count(file_path: str) -> int:
    """Return the number of pages in a PDF."""
    doc = fitz.open(file_path)
    count = len(doc)
    doc.close()
    return count


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


def detect_document_structure(file_path: str) -> dict:
    """Detect presence of title page, TOC, and Statement of Assurances from page text."""
    doc = fitz.open(file_path)
    has_title_page = False
    has_toc = False
    has_soa = False

    for i, page in enumerate(doc):
        text = page.get_text().strip()
        text_lower = text.lower()

        # Title page: first page with sparse text (cover/title pages are brief)
        if i == 0 and len(text.split()) < 80:
            has_title_page = True

        # TOC: any page containing "table of contents" or starting with "contents"
        if "table of contents" in text_lower:
            has_toc = True
        elif text_lower.startswith("contents"):
            has_toc = True

        # SOA: any page with statement of assurances keywords
        if "statement of assurances" in text_lower or "academic integrity" in text_lower:
            has_soa = True

    doc.close()
    return {"has_title_page": has_title_page, "has_toc": has_toc, "has_soa": has_soa}


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


def render_pages_as_images(file_path: str, page_indices: list[int]) -> list[bytes]:
    """Render specific PDF pages as PNG images at 150 DPI.

    Returns a list of PNG bytes, one per requested page index.
    Skips indices that are out of range.
    """
    doc = fitz.open(file_path)
    images = []
    for i in page_indices:
        if 0 <= i < len(doc):
            pixmap = doc[i].get_pixmap(dpi=150)
            images.append(pixmap.tobytes("png"))
    doc.close()
    return images

