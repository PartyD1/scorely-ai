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


class UploadResponse(BaseModel):
    job_id: str


class JobResponse(BaseModel):
    status: str
    result: Optional[GradingResult] = None
    error: Optional[str] = None


class RubricCreate(BaseModel):
    event_name: str
    rubric_data: dict
