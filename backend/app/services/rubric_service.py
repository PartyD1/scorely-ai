"""Rubric CRUD operations."""

import logging
from typing import List, Optional

from sqlalchemy.orm import Session

from ..models import Rubric

logger = logging.getLogger(__name__)


def get_rubric_by_event(db: Session, event_name: str) -> Optional[Rubric]:
    """Get a rubric by event name."""
    return db.query(Rubric).filter(Rubric.event_name == event_name).first()


def list_events(db: Session) -> List[str]:
    """Get list of all available event names."""
    rubrics = db.query(Rubric.event_name).all()
    return [r.event_name for r in rubrics]


def create_rubric(db: Session, event_name: str, rubric_data: dict) -> Rubric:
    """Create or update a rubric."""
    existing = get_rubric_by_event(db, event_name)
    if existing:
        existing.rubric_data = rubric_data
        db.commit()
        db.refresh(existing)
        logger.info("Updated rubric for event: %s", event_name)
        return existing

    rubric = Rubric(event_name=event_name, rubric_data=rubric_data)
    db.add(rubric)
    db.commit()
    db.refresh(rubric)
    logger.info("Created rubric for event: %s", event_name)
    return rubric
