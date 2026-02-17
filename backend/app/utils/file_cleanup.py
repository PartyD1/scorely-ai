"""Auto-delete uploaded files after grading."""

import logging
import os

logger = logging.getLogger(__name__)


def delete_file(file_path: str) -> None:
    """Delete a file if it exists."""
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            logger.info("Deleted file: %s", file_path)
    except OSError as e:
        logger.error("Failed to delete file %s: %s", file_path, e)
