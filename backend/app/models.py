"""SQLAlchemy models for Job and Rubric tables."""

from datetime import datetime

from sqlalchemy import Column, DateTime, Enum, Integer, JSON, String

from .database import Base


class Job(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True)
    event_name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    status = Column(
        Enum("pending", "processing", "complete", "failed", name="job_status"),
        default="pending",
    )
    result = Column(JSON, nullable=True)
    error = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)


class Rubric(Base):
    __tablename__ = "rubrics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    event_name = Column(String, unique=True, nullable=False)
    rubric_data = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
