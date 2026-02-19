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
You are evaluating competitive high school DECA entries — compare this report against the standard of a strong, competitive high school submission, not a professional business document. Students who demonstrate clear understanding and competent execution of the required elements should earn scores in the upper tiers. Reserve lower tiers for reports with genuine gaps or missing elements.

RUBRIC:
{rubric_json}

SCORING CALIBRATION:
Use these benchmarks to anchor your scores:
- 90–100%: Exceptional entry. All elements present, clearly executed, and well above peer level.
- 80–89%: Strong competitive entry. All major elements present with minor gaps. Typical of a state/international qualifier.
- 70–79%: Solid entry with noticeable gaps in one or two areas.
- Below 70%: Significant missing elements or weak execution across multiple sections.

Give credit generously for elements that are present and functional, even if not perfectly articulated.

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

2. Written entry follows the required outline (5-point penalty)
   Based on your evaluation above using the required outline, does the document follow the prescribed structure?

REPORT TEXT:
{extracted_text}

Grade each section independently. For each section:
1. Identify what the report accomplishes well and give full credit for it
2. Assign a score based on the scoring guide — when evidence is present, score toward the upper end of the matching tier
3. Note specific areas for improvement as actionable feedback (not as reasons to dock points retroactively)

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


def _compute_page_count_penalty(page_count: int) -> dict:
    """Compute page count penalty in Python — not delegated to the LLM.

    DECA always excludes 3 pages from the count:
      title page + table of contents + statement of assurances = 3
    Max allowed total: 23 pages (20 content + 3 excluded).
    24+ pages are always flagged.
    """
    excluded_count = 3  # title page, TOC, statement of assurances
    content_pages = page_count - excluded_count

    if content_pages > 20:
        over = content_pages - 20
        return {
            "description": "Page count within 20 pages (5-pt penalty per extra page)",
            "penalty_points": 5 * over,
            "status": "flagged",
            "note": (
                f"Total pages: {page_count}. Excluded: title page, table of contents, "
                f"statement of assurances (3 pages). "
                f"Content pages: {page_count} − 3 = {content_pages}, "
                f"which is {over} page(s) over the 20-page limit."
            ),
        }

    return {
        "description": "Page count within 20 pages (5-pt penalty per extra page)",
        "penalty_points": 5,
        "status": "clear",
        "note": (
            f"Total pages: {page_count}. Excluded: title page, table of contents, "
            f"statement of assurances (3 pages). "
            f"Content pages: {page_count} − 3 = {content_pages}, within the 20-page limit."
        ),
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

        # Get page count before extraction (file deleted in finally)
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

        # Call LLM (page count penalty is computed in Python, not by the LLM)
        result = call_llm(cluster_name, specific_name, event_code, event_description, rubric.rubric_data, text, required_outline)

        # Override event_name in LLM output with the specific event display string
        result["event_name"] = f"{specific_name} ({event_code})" if job.event_code else specific_name

        # Inject Python-computed page count penalty at index 1 (after SOA check)
        page_penalty = _compute_page_count_penalty(page_count)
        penalties = result.get("penalties", [])
        penalties.insert(1, page_penalty)
        result["penalties"] = penalties

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
        extracted_text=extracted_text,
    )

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.3,
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
