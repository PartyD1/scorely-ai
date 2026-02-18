"""FastAPI app with all route definitions."""

import json
import logging
import os
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import BackgroundTasks, Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import SessionLocal, get_db
from .events_data import CLUSTERS, get_cluster_for_code
from .models import Job
from .schemas import ClusterEvents, EventInfo, JobResponse, RubricCreate, UploadResponse
from .services import grading_service, pdf_service, rubric_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _seed_rubrics() -> None:
    """Seed any rubric JSON files that are not yet in the database."""
    db = SessionLocal()
    try:
        rubrics_dir = Path(__file__).resolve().parent.parent / "rubrics"
        if not rubrics_dir.exists():
            return
        for json_file in rubrics_dir.glob("*.json"):
            with open(json_file) as f:
                data = json.load(f)
            event_name = data.get("event")
            if event_name and not rubric_service.get_rubric_by_event(db, event_name):
                rubric_service.create_rubric(db, event_name, data)
                logger.info("Auto-seeded rubric: %s", event_name)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    _seed_rubrics()
    yield


app = FastAPI(title="AI Rubric Evaluator", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
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
    event_code: str = Form(...),
    db: Session = Depends(get_db),
):
    """Upload a PDF for grading. Returns a job_id to poll for results."""
    # Validate file type
    error = pdf_service.validate_upload(file)
    if error:
        raise HTTPException(status_code=400, detail=error)

    # Resolve event code to cluster
    cluster = get_cluster_for_code(event_code)
    if not cluster:
        raise HTTPException(status_code=400, detail=f"Unknown event code: {event_code}")

    # Check rubric exists for the cluster
    rubric = rubric_service.get_rubric_by_event(db, cluster["cluster_name"])
    if not rubric:
        raise HTTPException(
            status_code=400,
            detail=f"No rubric configured for: {cluster['cluster_name']}",
        )

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
    job = Job(
        id=job_id,
        event_name=cluster["cluster_name"],
        event_code=event_code,
        file_path=file_path,
        status="pending",
    )
    db.add(job)
    db.commit()

    # Start background grading
    background_tasks.add_task(run_grading, job_id)
    logger.info("Job %s created for event %s (%s)", job_id, cluster["cluster_name"], event_code)

    return UploadResponse(job_id=job_id)


@app.get("/api/status/{job_id}", response_model=JobResponse)
def get_job_status(job_id: str, db: Session = Depends(get_db)):
    """Poll job status and get results when complete."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return JobResponse(status=job.status, result=job.result, error=job.error)


@app.get("/api/events", response_model=list[ClusterEvents])
def list_events(db: Session = Depends(get_db)):
    """Get available event clusters and their specific events."""
    available = set(rubric_service.list_events(db))
    result = []
    for cluster in CLUSTERS:
        if cluster["cluster_name"] in available:
            result.append(
                ClusterEvents(
                    cluster_name=cluster["cluster_name"],
                    display_label=cluster["display_label"],
                    events=[
                        EventInfo(
                            code=e["code"],
                            name=e["name"],
                            description=e["description"],
                        )
                        for e in cluster["events"]
                    ],
                )
            )
    return result


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
