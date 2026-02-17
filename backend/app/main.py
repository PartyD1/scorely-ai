"""FastAPI app with all route definitions."""

import logging
import os
import uuid

from fastapi import BackgroundTasks, Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import SessionLocal, get_db
from .models import Job
from .schemas import JobResponse, RubricCreate, UploadResponse
from .services import grading_service, pdf_service, rubric_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI Rubric Evaluator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def run_grading(job_id: str) -> None:
    """Background task wrapper that creates its own DB session."""
    db = SessionLocal()
    try:
        grading_service.grade_report(db, job_id)
    finally:
        db.close()


@app.post("/api/upload", response_model=UploadResponse)
async def upload_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    event_name: str = Form(...),
    db: Session = Depends(get_db),
):
    """Upload a PDF for grading. Returns a job_id to poll for results."""
    # Validate file type
    error = pdf_service.validate_upload(file)
    if error:
        raise HTTPException(status_code=400, detail=error)

    # Check event exists
    rubric = rubric_service.get_rubric_by_event(db, event_name)
    if not rubric:
        raise HTTPException(status_code=400, detail=f"Unknown event: {event_name}")

    # Save file
    job_id = str(uuid.uuid4())
    try:
        file_path = await pdf_service.save_file(file, job_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Validate page count
    page_error = pdf_service.validate_page_count(file_path)
    if page_error:
        os.remove(file_path)
        raise HTTPException(status_code=400, detail=page_error)

    # Create job record
    job = Job(id=job_id, event_name=event_name, file_path=file_path, status="pending")
    db.add(job)
    db.commit()

    # Start background grading
    background_tasks.add_task(run_grading, job_id)
    logger.info("Job %s created for event %s", job_id, event_name)

    return UploadResponse(job_id=job_id)


@app.get("/api/status/{job_id}", response_model=JobResponse)
def get_job_status(job_id: str, db: Session = Depends(get_db)):
    """Poll job status and get results when complete."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return JobResponse(status=job.status, result=job.result, error=job.error)


@app.get("/api/events")
def list_events(db: Session = Depends(get_db)):
    """Get list of available event names for dropdown."""
    return rubric_service.list_events(db)


@app.post("/api/rubrics")
def create_rubric(rubric: RubricCreate, db: Session = Depends(get_db)):
    """Create or update a rubric."""
    result = rubric_service.create_rubric(db, rubric.event_name, rubric.rubric_data)
    return {"id": result.id, "event_name": result.event_name}


@app.get("/api/rubrics/{event}")
def get_rubric(event: str, db: Session = Depends(get_db)):
    """Get a specific rubric by event name."""
    rubric = rubric_service.get_rubric_by_event(db, event)
    if not rubric:
        raise HTTPException(status_code=404, detail="Rubric not found")
    return {"event_name": rubric.event_name, "rubric_data": rubric.rubric_data}
