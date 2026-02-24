"""LLM interaction and grading logic."""

import json
import logging
import os
import time
from datetime import datetime

import google.generativeai as genai
from sqlalchemy.orm import Session

from ..models import Job
from ..schemas import GradingResult
from ..utils.file_cleanup import delete_file
from .pdf_service import get_page_count
from ..events_data import get_cluster_for_code, get_event_by_code
from .rubric_service import get_rubric_by_event, get_rubric_by_event_code

logger = logging.getLogger(__name__)

SYSTEM_PROMPT_TEMPLATE = """You are an expert DECA judge evaluating a {cluster_name} report.

The student submitted for the specific event: {specific_event_name} ({event_code})

EVENT DESCRIPTION — what this project must address:
{event_description}

Before scoring, determine how well this report aligns with the specific event description above. Event alignment must factor into every individual section score — not just the overall feedback. A polished, well-structured report that addresses the wrong type of project must still score low, because it has not fulfilled what this event requires.

If the report is clearly written for a different DECA event than {specific_event_name}, state this explicitly at the start of overall_feedback.
{required_outline_section}
You are evaluating competitive high school DECA entries — compare this report against the standard of a strong, competitive high school submission, not a professional business document.

RUBRIC:
{rubric_json}

SCORING CALIBRATION (expressed as % of total possible points):
- 90–100%: Exceptional. Every section demonstrates genuine depth, real data, and mastery of the event's requirements. State-qualifier level only.
- 75–89%: Competitive. Strong execution with only minor gaps. The student clearly understands what this event demands.
- 55–74%: Developing. Correct event type and intent, but the work is surface-level — vague claims, thin analysis, missing data, or incomplete sections. This is where most average high school entries belong.
- 35–54%: Weak. Major deficiencies: large sections are underdeveloped, critical required elements are missing, or the analysis lacks substance throughout.
- 0–34%: Failing. Wrong event type, near-empty, or the report fails to meaningfully address what this event requires.

GRADING PHILOSOPHY — read this before scoring:
The purpose of this evaluation is to give students honest, actionable feedback so they can improve before competition — not to validate their effort. A report that exists but is vague, thin, or unsupported should score low.

Apply these standards strictly:
- Mentioning a concept is not the same as analyzing it. Vague statements without evidence, data, or real reasoning earn no credit.
- Every claim needs support. Assertions without research, market data, financials, or logical justification score in the bottom of their tier.
- Shallow sections drag the whole report down. A section that covers all headings at a surface level earns "Below Expectations" — not "Meets Expectations."
- When evidence is mixed or thin, score in the lower tier. The burden of proof is on the report, not the judge.
- A report that is well-written but lacks substance should score 45–60%. Good writing does not compensate for missing analysis.

PENALTY CHECKLIST:
After grading all rubric sections, evaluate each official DECA written entry requirement below.
For each penalty check, set status to:
- "flagged"       if you can detect the issue from the document
- "clear"         if the document confirms the requirement is met
- "manual_check"  if it cannot be determined from the document alone

Penalty checks to evaluate:
1. Statement of Assurances and Academic Integrity (15-point penalty if missing)
   Check if the document includes a Statement of Assurances or Academic Integrity page.
   Always include a note that the physical/digital signature must be manually verified regardless of status.

2. Written entry follows the required outline (5-point penalty)
   Based on your evaluation above using the required outline, does the document follow the prescribed structure?

Please read the attached PDF document carefully, including all text, tables, charts, and visual elements.

VISUAL EVALUATION NOTE:
If this rubric includes an "Appearance and Word Usage" section, use your ability to see the actual document to assess it accurately. Evaluate: professional formatting and consistent styling, quality and clarity of any charts or tables, effective use of white space, visual hierarchy, and overall neatness and presentation. Do not guess based on text alone — assess what you can actually see in the PDF.

Grade each section independently. For each section:
1. Determine whether the content actually serves this specific event's purpose — not just whether the section exists or sounds professional
2. Score based on substance, not effort. A section that is present but thin, vague, or unsupported should score in the bottom half of its range. Credit is for demonstrated understanding, not for attempting.
3. Write feedback that is specific and critical. Name exactly what is missing, what is too vague, and what would need to change to earn a higher score. Do not soften negative feedback.

Return ONLY valid JSON matching the required schema. Do not add commentary outside the JSON structure."""

# Gemini uses UPPERCASE type names in response schemas
GEMINI_RESPONSE_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "event_name": {"type": "STRING"},
        "total_possible": {"type": "INTEGER"},
        "total_awarded": {"type": "INTEGER"},
        "sections": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "name": {"type": "STRING"},
                    "max_points": {"type": "INTEGER"},
                    "awarded_points": {"type": "INTEGER"},
                    "feedback": {"type": "STRING"},
                },
                "required": ["name", "max_points", "awarded_points", "feedback"],
            },
        },
        "overall_feedback": {"type": "STRING"},
        "penalties": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "description": {"type": "STRING"},
                    "penalty_points": {"type": "INTEGER"},
                    "status": {
                        "type": "STRING",
                        "enum": ["flagged", "clear", "manual_check"],
                    },
                    "note": {"type": "STRING"},
                },
                "required": ["description", "penalty_points", "status", "note"],
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

        # Get page count before grading (file deleted in finally)
        page_count = get_page_count(job.file_path)

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

        # Call LLM — Gemini reads the raw PDF natively (text + visual)
        result = call_llm(
            cluster_name,
            specific_name,
            event_code,
            event_description,
            rubric.rubric_data,
            job.file_path,
            required_outline,
        )

        # Override event_name in LLM output with the specific event display string
        result["event_name"] = f"{specific_name} ({event_code})" if job.event_code else specific_name

        # Inject Python-computed page count penalty at index 1 (after SOA check)
        page_penalty = _compute_page_count_penalty(page_count)
        penalties = result.get("penalties", [])
        penalties.insert(1, page_penalty)
        result["penalties"] = penalties

        # Clamp each section so awarded_points never exceeds max_points
        for section in result.get("sections", []):
            if section["awarded_points"] > section["max_points"]:
                logger.warning(
                    "Job %s: section '%s' awarded %d > max %d — clamping",
                    job_id,
                    section["name"],
                    section["awarded_points"],
                    section["max_points"],
                )
                section["awarded_points"] = section["max_points"]
        result["total_awarded"] = sum(s["awarded_points"] for s in result.get("sections", []))

        # Gemini reads the full document natively — no truncation ever occurs
        result["was_truncated"] = False
        result["truncated_at_tokens"] = None
        result["graded_by"] = "gemini"

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
    file_path: str,
    required_outline: dict | None = None,
) -> dict:
    """Upload PDF to Gemini and grade it natively (text + visual)."""
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

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
    )

    # Upload PDF to Gemini File API
    uploaded = genai.upload_file(path=file_path, mime_type="application/pdf")
    logger.info("Uploaded PDF to Gemini File API: %s", uploaded.name)

    # Wait for file to be ready (usually instant for PDFs but guard against PROCESSING state)
    max_wait = 30  # seconds
    waited = 0
    while uploaded.state.name == "PROCESSING" and waited < max_wait:
        time.sleep(2)
        waited += 2
        uploaded = genai.get_file(uploaded.name)

    if uploaded.state.name != "ACTIVE":
        raise ValueError(f"Gemini file not ready after upload: state={uploaded.state.name}")

    try:
        model = genai.GenerativeModel(
            model_name,
            generation_config=genai.GenerationConfig(
                temperature=0.2,
                response_mime_type="application/json",
                response_schema=GEMINI_RESPONSE_SCHEMA,
            ),
        )
        response = model.generate_content([prompt, uploaded])
    finally:
        # Always clean up the file from Gemini's servers
        try:
            genai.delete_file(uploaded.name)
            logger.info("Deleted Gemini file: %s", uploaded.name)
        except Exception as cleanup_err:
            logger.warning("Failed to delete Gemini file %s: %s", uploaded.name, cleanup_err)

    logger.info("Gemini grading call completed for event %s", event_code)
    return json.loads(response.text)
