"""Admin-only endpoints for platform monitoring."""

from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..auth import require_admin
from ..database import get_db
from ..models import Job, User
from ..schemas import AdminStats, AdminSubmissionRow, AdminUserRow

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/stats", response_model=AdminStats)
def get_stats(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Platform-wide statistics."""
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_submissions = db.query(func.count(Job.id)).scalar() or 0

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    submissions_today = (
        db.query(func.count(Job.id))
        .filter(Job.created_at >= today_start)
        .scalar()
        or 0
    )

    top_events_rows = (
        db.query(Job.event_code, func.count(Job.id).label("count"))
        .filter(Job.event_code.isnot(None))
        .group_by(Job.event_code)
        .order_by(func.count(Job.id).desc())
        .limit(10)
        .all()
    )
    top_events = [{"event_code": row.event_code, "count": row.count} for row in top_events_rows]

    return AdminStats(
        total_users=total_users,
        total_submissions=total_submissions,
        submissions_today=submissions_today,
        top_events=top_events,
    )


@router.get("/users", response_model=List[AdminUserRow])
def list_users(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """List all registered users with their submission count."""
    rows = (
        db.query(User, func.count(Job.id).label("submission_count"))
        .outerjoin(Job, Job.user_id == User.id)
        .group_by(User.id)
        .order_by(User.created_at.desc())
        .all()
    )
    return [
        AdminUserRow(
            id=user.id,
            email=user.email,
            name=user.name,
            picture=user.picture,
            created_at=user.created_at.isoformat() if user.created_at else "",
            submission_count=count,
        )
        for user, count in rows
    ]


@router.get("/users/{user_id}/submissions", response_model=List[AdminSubmissionRow])
def get_user_submissions(
    user_id: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Get all submissions for a specific user."""
    jobs = (
        db.query(Job)
        .filter(Job.user_id == user_id)
        .order_by(Job.created_at.desc())
        .all()
    )
    return [
        AdminSubmissionRow(
            job_id=job.id,
            event_name=job.event_name,
            event_code=job.event_code,
            total_awarded=job.result.get("total_awarded") if job.result else None,
            total_possible=job.result.get("total_possible") if job.result else None,
            status=job.status,
            created_at=job.created_at.isoformat() if job.created_at else "",
        )
        for job in jobs
    ]
