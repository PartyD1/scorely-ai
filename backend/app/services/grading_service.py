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
from .pdf_service import extract_text, get_page_count
from ..events_data import get_cluster_for_code, get_event_by_code
from .rubric_service import get_rubric_by_event, get_rubric_by_event_code

logger = logging.getLogger(__name__)

SYSTEM_PROMPT_TEMPLATE = """You are an expert DECA judge evaluating a {cluster_name} report.

The student submitted for the specific event: {specific_event_name} ({event_code})

EVENT DESCRIPTION — what this project must address:
{event_description}

A critical part of your evaluation is assessing how clearly and completely the report addresses the specific requirements of this event. Students must demonstrate that their project directly fulfills the event description above, not just a generic project management plan.
{required_outline_section}
You must also grade this report using the official rubric provided below. Be strict but fair. Students should earn points through demonstrated competence, not through participation.

RUBRIC:
{rubric_json}

PENALTY CHECKLIST:
After grading all rubric sections, evaluate each official DECA written entry requirement below.
For each penalty check, set status to:
- "flagged"       if you can detect the issue from the extracted text
- "clear"         if the text confirms the requirement is met
- "manual_check"  if it cannot be determined from extracted text alone

Penalty checks to evaluate:
1. Statement of Assurances and Academic Integrity (15-point penalty if missing)
   Check if the document text includes a Statement of Assurances or Academic Integrity page.
   Always include a note that the physical/digital signature must be manually verified regardless of status.

2. Page count within 20 pages (5-point penalty per extra page, not counting title page and table of contents)
   The uploaded PDF has {page_count} total pages. Assuming 1 title page and 1 table of contents page,
   the graded body is approximately {page_count} - 2 pages. If over 20, flag it and note how many pages over.

3. All pages numbered sequentially (5-point penalty)
   Based on the text content and structure, does the document appear to follow consistent sequential page numbering
   from the executive summary through to the end of the appendix?

4. Written entry follows the required outline (5-point penalty)
   Based on your evaluation above using the required outline, does the document follow the prescribed structure?

5. Typed on 8\u00bd x 11 inch pages with no handwritten content (5-point penalty)
   Cannot be verified from extracted text. Always set status = "manual_check".

REPORT TEXT:
{extracted_text}

Grade each section independently. For each section:
1. Identify what the report does well
2. Identify what's missing or weak, especially relative to the event description above
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
        "penalties": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "description": {"type": "string"},
                    "penalty_points": {"type": "integer"},
                    "status": {"type": "string", "enum": ["flagged", "clear", "manual_check"]},
                    "note": {"type": "string"},
                },
                "required": ["description", "penalty_points", "status", "note"],
                "additionalProperties": False,
            },
        },
    },
    "required": [
        "event_name",
        "total_possible",
        "total_awarded",
        "sections",
        "overall_feedback",
        "penalties",
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

        # Get page count before extraction (file is deleted in finally)
        page_count = get_page_count(job.file_path)

        # Extract text
        text = extract_text(job.file_path)
        text, was_truncated = truncate_text(text)
        if was_truncated:
            logger.warning("Job %s: text was truncated", job_id)

        # Resolve event context
        if job.event_code:
            event_info = get_event_by_code(job.event_code)
            cluster_info = get_cluster_for_code(job.event_code)
            rubric = get_rubric_by_event_code(db, job.event_code)
            cluster_name = cluster_info["cluster_name"] if cluster_info else job.event_name
            specific_name = event_info["name"] if event_info else job.event_name
            event_code = job.event_code
            event_description = event_info["description"] if event_info else ""
        else:
            # Backward compat: old jobs stored cluster name in event_name, no event_code
            rubric = get_rubric_by_event(db, job.event_name)
            cluster_name = job.event_name
            specific_name = job.event_name
            event_code = job.event_name
            event_description = ""
            event_info = None

        if not rubric:
            raise ValueError(f"No rubric found for event: {job.event_code or job.event_name}")

        # Resolve required outline: event-level first, then cluster/rubric level
        required_outline = None
        if event_info:
            required_outline = event_info.get("required_outline")
        if not required_outline:
            required_outline = rubric.rubric_data.get("required_outline")

        # Call LLM
        result = call_llm(cluster_name, specific_name, event_code, event_description, rubric.rubric_data, text, required_outline, page_count)

        # Override event_name in LLM output with the specific event display string
        result["event_name"] = f"{specific_name} ({event_code})" if job.event_code else specific_name

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


def call_llm(
    cluster_name: str,
    specific_event_name: str,
    event_code: str,
    event_description: str,
    rubric_data: dict,
    extracted_text: str,
    required_outline: dict | None = None,
    page_count: int = 0,
) -> dict:
    """Call OpenAI API with structured output."""
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    if required_outline:
        required_outline_section = (
            "\nREQUIRED REPORT OUTLINE:\n"
            "Students must follow this official DECA written report structure. "
            "Check whether each required element is present when grading the corresponding rubric section. "
            "Penalize missing or incomplete required elements appropriately.\n\n"
            + json.dumps(required_outline, indent=2)
            + "\n"
        )
    else:
        required_outline_section = ""

    prompt = SYSTEM_PROMPT_TEMPLATE.format(
        cluster_name=cluster_name,
        specific_event_name=specific_event_name,
        event_code=event_code,
        event_description=event_description,
        required_outline_section=required_outline_section,
        rubric_json=json.dumps(rubric_data, indent=2),
        page_count=page_count,
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
