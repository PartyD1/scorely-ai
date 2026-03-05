"""History and account management endpoints."""

from typing import List

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from ..auth import require_user
from ..database import get_db
from ..models import Job, User
from ..schemas import HistoryItem

router = APIRouter(prefix="/api", tags=["history"])


@router.get("/history", response_model=List[HistoryItem])
def get_history(
    event_code: str = Query(..., description="Event code to filter submissions"),
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
):
    """Return all completed submissions for the authenticated user and event_code."""
    jobs = (
        db.query(Job)
        .filter(
            Job.user_id == user.id,
            Job.event_code == event_code,
            Job.status == "complete",
        )
        .order_by(Job.created_at.desc())
        .all()
    )

    items = []
    for job in jobs:
        result = job.result or {}
        items.append(
            HistoryItem(
                job_id=job.id,
                event_name=job.event_name,
                event_code=job.event_code,
                total_awarded=result.get("total_awarded", 0),
                total_possible=result.get("total_possible", 100),
                created_at=job.created_at.isoformat() if job.created_at else "",
            )
        )
    return items


@router.get("/account/submissions", response_model=List[HistoryItem])
def get_all_submissions(
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
):
    """Return all completed submissions for the authenticated user across all events."""
    jobs = (
        db.query(Job)
        .filter(Job.user_id == user.id, Job.status == "complete")
        .order_by(Job.created_at.desc())
        .all()
    )
    return [
        HistoryItem(
            job_id=job.id,
            event_name=job.event_name,
            event_code=job.event_code,
            total_awarded=(job.result or {}).get("total_awarded", 0),
            total_possible=(job.result or {}).get("total_possible", 100),
            created_at=job.created_at.isoformat() if job.created_at else "",
        )
        for job in jobs
    ]


@router.delete("/account", status_code=204)
def delete_account(
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
):
    """Permanently delete the authenticated user and all their submissions."""
    db.query(Job).filter(Job.user_id == user.id).delete(synchronize_session=False)
    db.delete(user)
    db.commit()
    return Response(status_code=204)
