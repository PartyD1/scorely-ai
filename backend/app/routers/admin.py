"""Admin-only endpoints for platform monitoring."""

from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..auth import require_admin
from ..database import get_db
from ..models import Job, User
from ..schemas import AdminAnalytics, AdminStats, AdminSubmissionRow, AdminUserRow, DailyDataPoint

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
    week_start = today_start - timedelta(days=today_start.weekday())

    submissions_today = (
        db.query(func.count(Job.id))
        .filter(Job.created_at >= today_start)
        .scalar()
        or 0
    )

    submissions_this_week = (
        db.query(func.count(Job.id))
        .filter(Job.created_at >= week_start)
        .scalar()
        or 0
    )

    unique_ips = (
        db.query(func.count(func.distinct(Job.ip_address)))
        .filter(Job.ip_address.isnot(None))
        .scalar()
        or 0
    )

    anonymous_submissions = (
        db.query(func.count(Job.id))
        .filter(Job.user_id.is_(None))
        .scalar()
        or 0
    )

    authenticated_submissions = total_submissions - anonymous_submissions

    completed_jobs = (
        db.query(func.count(Job.id))
        .filter(Job.status == "complete")
        .scalar()
        or 0
    )
    completion_rate = round((completed_jobs / total_submissions * 100) if total_submissions > 0 else 0.0, 1)

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
        submissions_this_week=submissions_this_week,
        unique_ips=unique_ips,
        anonymous_submissions=anonymous_submissions,
        authenticated_submissions=authenticated_submissions,
        completion_rate=completion_rate,
        top_events=top_events,
    )


@router.get("/analytics", response_model=AdminAnalytics)
def get_analytics(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Time-series analytics for the last 30 days."""
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    start = today - timedelta(days=29)

    # Build a complete date list for the last 30 days
    dates = [(start + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(30)]

    from sqlalchemy import cast, Date

    # Signups per day
    signup_rows = (
        db.query(
            cast(User.created_at, Date).label("day"),
            func.count(User.id).label("cnt"),
        )
        .filter(User.created_at >= start)
        .group_by(cast(User.created_at, Date))
        .all()
    )
    signup_map = {row.day.strftime("%Y-%m-%d"): row.cnt for row in signup_rows}

    # Submissions per day (all)
    sub_rows = (
        db.query(
            cast(Job.created_at, Date).label("day"),
            func.count(Job.id).label("cnt"),
        )
        .filter(Job.created_at >= start)
        .group_by(cast(Job.created_at, Date))
        .all()
    )
    sub_map = {row.day.strftime("%Y-%m-%d"): row.cnt for row in sub_rows}

    # Anonymous submissions per day (user_id IS NULL)
    anon_rows = (
        db.query(
            cast(Job.created_at, Date).label("day"),
            func.count(Job.id).label("cnt"),
        )
        .filter(Job.created_at >= start, Job.user_id.is_(None))
        .group_by(cast(Job.created_at, Date))
        .all()
    )
    anon_map = {row.day.strftime("%Y-%m-%d"): row.cnt for row in anon_rows}

    # Auth submissions per day
    auth_rows = (
        db.query(
            cast(Job.created_at, Date).label("day"),
            func.count(Job.id).label("cnt"),
        )
        .filter(Job.created_at >= start, Job.user_id.isnot(None))
        .group_by(cast(Job.created_at, Date))
        .all()
    )
    auth_map = {row.day.strftime("%Y-%m-%d"): row.cnt for row in auth_rows}

    def build_series(mapping: dict) -> List[DailyDataPoint]:
        return [DailyDataPoint(date=d, value=mapping.get(d, 0)) for d in dates]

    return AdminAnalytics(
        signups_30d=build_series(signup_map),
        submissions_30d=build_series(sub_map),
        anon_submissions_30d=build_series(anon_map),
        auth_submissions_30d=build_series(auth_map),
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
