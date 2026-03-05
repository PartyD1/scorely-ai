"""Pydantic request/response schemas."""

from typing import List, Optional

from pydantic import BaseModel


class EventInfo(BaseModel):
    code: str
    name: str
    description: str


class ClusterEvents(BaseModel):
    cluster_name: str
    display_label: str
    events: List[EventInfo]


class SectionScore(BaseModel):
    name: str
    max_points: int
    awarded_points: int
    feedback: str
    improvement: Optional[str] = None


class PenaltyCheck(BaseModel):
    description: str
    penalty_points: int
    status: str  # "flagged" | "clear" | "manual_check"
    note: str


class GradingResult(BaseModel):
    event_name: str
    total_possible: int
    total_awarded: int
    sections: List[SectionScore]
    overall_feedback: str
    penalties: List[PenaltyCheck] = []
    was_truncated: bool = False
    truncated_at_tokens: Optional[int] = None
    graded_by: str = "openai"


class UploadResponse(BaseModel):
    job_id: str


class JobResponse(BaseModel):
    status: str
    result: Optional[GradingResult] = None
    error: Optional[str] = None
    event_code: Optional[str] = None


class RubricCreate(BaseModel):
    event_name: str
    rubric_data: dict


class UserPublic(BaseModel):
    id: str
    email: str
    name: str
    picture: Optional[str] = None


class HistoryItem(BaseModel):
    job_id: str
    event_name: str
    event_code: Optional[str] = None
    total_awarded: int
    total_possible: int
    created_at: str  # ISO 8601


class AdminUserRow(BaseModel):
    id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: str
    submission_count: int


class AdminSubmissionRow(BaseModel):
    job_id: str
    event_name: str
    event_code: Optional[str] = None
    total_awarded: Optional[int] = None
    total_possible: Optional[int] = None
    status: str
    created_at: str


class AdminStats(BaseModel):
    total_users: int
    total_submissions: int
    submissions_today: int
    top_events: List[dict]  # [{"event_code": str, "count": int}]
