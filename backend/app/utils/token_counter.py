"""Token counting and truncation using tiktoken."""

import logging

import tiktoken

logger = logging.getLogger(__name__)

TOKEN_LIMIT = 30000
TRUNCATION_TARGET = 25000


def count_tokens(text: str, model: str = "gpt-4o-mini") -> int:
    """Count the number of tokens in text."""
    enc = tiktoken.encoding_for_model(model)
    return len(enc.encode(text))


def truncate_text(text: str, model: str = "gpt-4o-mini") -> tuple[str, bool]:
    """Truncate text to fit within token limit.

    Returns (text, was_truncated).
    """
    token_count = count_tokens(text, model)
    if token_count <= TOKEN_LIMIT:
        return text, False

    logger.warning(
        "Text has %d tokens, truncating to %d", token_count, TRUNCATION_TARGET
    )
    enc = tiktoken.encoding_for_model(model)
    tokens = enc.encode(text)
    truncated_tokens = tokens[:TRUNCATION_TARGET]
    return enc.decode(truncated_tokens), True
