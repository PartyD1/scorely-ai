"""LLM interaction and grading logic."""

import json
import logging
import os
from datetime import datetime

from openai import OpenAI
from sqlalchemy.orm import Session

from ..models import Job
from ..schemas import GradingResult
from ..utils.file_cleanup import delete_file
from ..utils.token_counter import truncate_text
from .pdf_service import extract_text
from .rubric_service import get_rubric_by_event

logger = logging.getLogger(__name__)

SYSTEM_PROMPT_TEMPLATE = """You are an expert DECA judge evaluating a {event_name} report.

You must grade this report using the official rubric provided below. Be strict but fair. Students should earn points through demonstrated competence, not through participation.

RUBRIC:
{rubric_json}

REPORT TEXT:
{extracted_text}

Grade each section independently. For each section:
1. Identify what the report does well
2. Identify what's missing or weak
3. Assign a score based on the scoring guide
4. Provide specific, actionable feedback

Return ONLY valid JSON matching the required schema. Do not add commentary outside the JSON structure."""

GRADING_SCHEMA = {
    "type": "object",
    "properties": {
        "event_name": {"type": "string"},
        "total_possible": {"type": "integer"},
        "total_awarded": {"type": "integer"},
        "sections": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "max_points": {"type": "integer"},
                    "awarded_points": {"type": "integer"},
                    "feedback": {"type": "string"},
                },
                "required": ["name", "max_points", "awarded_points", "feedback"],
                "additionalProperties": False,
            },
        },
        "overall_feedback": {"type": "string"},
    },
    "required": [
        "event_name",
        "total_possible",
        "total_awarded",
        "sections",
        "overall_feedback",
    ],
    "additionalProperties": False,
}


def grade_report(db: Session, job_id: str) -> None:
    """Run the full grading pipeline for a job."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        logger.error("Job %s not found", job_id)
        return

    try:
        job.status = "processing"
        db.commit()

        # Extract text
        text = extract_text(job.file_path)
        text, was_truncated = truncate_text(text)
        if was_truncated:
            logger.warning("Job %s: text was truncated", job_id)

        # Load rubric
        rubric = get_rubric_by_event(db, job.event_name)
        if not rubric:
            raise ValueError(f"No rubric found for event: {job.event_name}")

        # Call LLM
        result = call_llm(job.event_name, rubric.rubric_data, text)

        # Validate with Pydantic
        grading_result = GradingResult(**result)

        job.result = grading_result.model_dump()
        job.status = "complete"
        job.completed_at = datetime.utcnow()
        db.commit()
        logger.info("Job %s completed successfully", job_id)

    except Exception as e:
        logger.error("Job %s failed: %s", job_id, e)
        job.status = "failed"
        job.error = str(e)
        db.commit()

    finally:
        delete_file(job.file_path)


def call_llm(event_name: str, rubric_data: dict, extracted_text: str) -> dict:
    """Call OpenAI API with structured output."""
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    prompt = SYSTEM_PROMPT_TEMPLATE.format(
        event_name=event_name,
        rubric_json=json.dumps(rubric_data, indent=2),
        extracted_text=extracted_text,
    )

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.2,
        messages=[{"role": "user", "content": prompt}],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "grading_result",
                "strict": True,
                "schema": GRADING_SCHEMA,
            },
        },
    )

    content = response.choices[0].message.content
    logger.info(
        "LLM call completed. Tokens: prompt=%d, completion=%d",
        response.usage.prompt_tokens,
        response.usage.completion_tokens,
    )
    return json.loads(content)
