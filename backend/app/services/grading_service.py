"""LLM interaction and grading logic."""

import base64
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
from .pdf_service import extract_text, get_page_count, render_pages_as_images
from ..events_data import get_cluster_for_code, get_event_by_code
from .rubric_service import get_rubric_by_event, get_rubric_by_event_code

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Text grading prompt — GPT-4o-mini reads extracted text
# ---------------------------------------------------------------------------

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
- "flagged"       if you can detect the issue from the extracted text
- "clear"         if the text confirms the requirement is met
- "manual_check"  if it cannot be determined from extracted text alone

Penalty checks to evaluate:
1. Statement of Assurances and Academic Integrity (15-point penalty if missing)
   Check if the document text includes a Statement of Assurances or Academic Integrity page.
   Note: image-only SOA pages cannot be detected from text — this will be verified visually after your analysis.

2. Written entry follows the required outline (5-point penalty)
   Based on your evaluation above using the required outline, does the document follow the prescribed structure?

REPORT TEXT:
{extracted_text}

Grade each section independently. For each section:
1. Determine whether the content actually serves this specific event's purpose — not just whether the section exists or sounds professional
2. Score based on substance, not effort. A section that is present but thin, vague, or unsupported should score in the bottom half of its range. Credit is for demonstrated understanding, not for attempting.
3. Write feedback that is specific and critical. Name exactly what is missing, what is too vague, and what would need to change to earn a higher score. Do not soften negative feedback.

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
        "event_name", "total_possible", "total_awarded",
        "sections", "overall_feedback", "penalties",
    ],
    "additionalProperties": False,
}

# ---------------------------------------------------------------------------
# Vision check prompt — GPT-4o-mini looks at rendered page images
# ---------------------------------------------------------------------------

VISION_PROMPT_WITH_APPEARANCE = """You are reviewing selected pages from a DECA business report. Complete two tasks precisely.

TASK 1 — STATEMENT OF ASSURANCES:
Carefully examine all provided pages for a "Statement of Assurances" or "Academic Integrity" form.
This page may be printed text, a scanned image of a physical form, or a photographed document.
Look for: the title "Statement of Assurances", signature lines, assurance checkboxes, or any official DECA integrity agreement.
Always note that physical/digital signatures must be manually verified regardless of what you find.

TASK 2 — APPEARANCE AND WORD USAGE:
Evaluate the visual presentation and writing quality of this report based on these pages.
Max points for this section: {max_points}
Scoring guide:
{scoring_guide}

Assess: professional formatting consistency, layout clarity, quality of any charts/tables/graphs, use of white space, visual hierarchy, neatness, grammar, and word usage.

Return ONLY valid JSON:
{{"soa_found": true or false, "soa_note": "what you found or did not find — note signature verification is required", "appearance_score": integer, "appearance_feedback": "specific, critical feedback on appearance and word usage"}}"""

VISION_PROMPT_SOA_ONLY = """You are reviewing selected pages from a DECA business report.

Carefully examine all provided pages for a "Statement of Assurances" or "Academic Integrity" form.
This page may be printed text, a scanned image of a physical form, or a photographed document.
Look for: the title "Statement of Assurances", signature lines, assurance checkboxes, or any official DECA integrity agreement.
Always note that physical/digital signatures must be manually verified regardless of what you find.

Return ONLY valid JSON:
{{"soa_found": true or false, "soa_note": "what you found or did not find — note signature verification is required", "appearance_score": 0, "appearance_feedback": ""}}"""

VISION_SCHEMA = {
    "type": "object",
    "properties": {
        "soa_found": {"type": "boolean"},
        "soa_note": {"type": "string"},
        "appearance_score": {"type": "integer"},
        "appearance_feedback": {"type": "string"},
    },
    "required": ["soa_found", "soa_note", "appearance_score", "appearance_feedback"],
    "additionalProperties": False,
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _compute_page_count_penalty(page_count: int) -> dict:
    """Compute page count penalty in Python — not delegated to the LLM.

    DECA always excludes 3 pages from the count:
      title page + table of contents + statement of assurances = 3
    Max allowed total: 23 pages (20 content + 3 excluded).
    """
    excluded_count = 3
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


def _get_visual_check_pages(page_count: int) -> list[int]:
    """Select page indices to render for the vision check.

    - Last 4 pages: SOA is almost always near the end
    - First page + 3 evenly spaced middle pages: appearance assessment
    Capped at 8 total pages.
    """
    pages = set()
    pages.add(0)  # cover page for appearance
    for i in range(max(0, page_count - 4), page_count):  # last 4 for SOA
        pages.add(i)
    if page_count > 2:
        for step in [0.25, 0.5, 0.75]:
            pages.add(int(page_count * step))
    sorted_pages = sorted(pages)
    if len(sorted_pages) > 8:
        # Keep first 4 (appearance) + last 4 (SOA)
        sorted_pages = sorted(set(sorted_pages[:4] + sorted_pages[-4:]))
    return sorted_pages


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def grade_report(db: Session, job_id: str) -> None:
    """Run the full grading pipeline for a job."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        logger.error("Job %s not found", job_id)
        return

    try:
        job.status = "processing"
        db.commit()

        # Get page count before text extraction (file deleted in finally)
        page_count = get_page_count(job.file_path)

        # Extract and truncate text
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

        # Call 1: text-based rubric grading
        result = call_llm(
            cluster_name, specific_name, event_code, event_description,
            rubric.rubric_data, text, required_outline,
        )

        # Override event_name in LLM output with the specific event display string
        result["event_name"] = f"{specific_name} ({event_code})" if job.event_code else specific_name

        # Find the appearance section in the rubric for the vision check
        appearance_section = next(
            (s for s in rubric.rubric_data.get("sections", [])
             if s.get("name", "").lower() == "appearance and word usage"),
            None,
        )

        # Call 2: visual check — SOA image detection + appearance grading
        # Runs against rendered page images; overrides text-based results for both.
        try:
            vision_result = call_vision_check(job.file_path, page_count, appearance_section)

            # Override SOA penalty status (vision sees image-only pages that text extraction misses)
            for penalty in result.get("penalties", []):
                if "statement of assurances" in penalty.get("description", "").lower():
                    penalty["status"] = "clear" if vision_result["soa_found"] else "flagged"
                    penalty["note"] = vision_result["soa_note"]
                    break

            # Override appearance section score with visually-informed result
            if appearance_section:
                for section in result.get("sections", []):
                    if section.get("name", "").lower() == "appearance and word usage":
                        section["awarded_points"] = min(
                            vision_result["appearance_score"],
                            section["max_points"],
                        )
                        section["feedback"] = vision_result["appearance_feedback"]
                        break

        except Exception as vision_err:
            logger.warning(
                "Job %s: vision check failed (%s) — using text-based SOA and appearance results",
                job_id, vision_err,
            )

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
                    job_id, section["name"], section["awarded_points"], section["max_points"],
                )
                section["awarded_points"] = section["max_points"]
        result["total_awarded"] = sum(s["awarded_points"] for s in result.get("sections", []))

        result["was_truncated"] = was_truncated
        result["truncated_at_tokens"] = 25000 if was_truncated else None
        result["graded_by"] = "openai"

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


# ---------------------------------------------------------------------------
# LLM calls
# ---------------------------------------------------------------------------

def call_llm(
    cluster_name: str,
    specific_event_name: str,
    event_code: str,
    event_description: str,
    rubric_data: dict,
    extracted_text: str,
    required_outline: dict | None = None,
) -> dict:
    """Call GPT-4o-mini with structured output for text-based rubric grading."""
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
        "Text grading completed. Tokens: prompt=%d, completion=%d",
        response.usage.prompt_tokens,
        response.usage.completion_tokens,
    )
    return json.loads(content)


def call_vision_check(
    file_path: str,
    page_count: int,
    appearance_section: dict | None = None,
) -> dict:
    """Render key PDF pages and check them visually with GPT-4o-mini vision.

    Detects SOA pages that exist only as scanned images (invisible to text extraction).
    Also grades the Appearance and Word Usage section from actual visual layout.

    Uses 'low' detail mode: 85 tokens per image regardless of size — fast and cheap.
    Returns: {soa_found, soa_note, appearance_score, appearance_feedback}
    """
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    page_indices = _get_visual_check_pages(page_count)
    images = render_pages_as_images(file_path, page_indices)

    if appearance_section:
        prompt = VISION_PROMPT_WITH_APPEARANCE.format(
            max_points=appearance_section["max_points"],
            scoring_guide=json.dumps(appearance_section.get("scoring_guide", {}), indent=2),
        )
    else:
        prompt = VISION_PROMPT_SOA_ONLY

    # Build multimodal message: text prompt + page images
    content: list[dict] = [{"type": "text", "text": prompt}]
    for img_bytes in images:
        b64 = base64.b64encode(img_bytes).decode("utf-8")
        content.append({
            "type": "image_url",
            "image_url": {"url": f"data:image/png;base64,{b64}", "detail": "low"},
        })

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.1,
        messages=[{"role": "user", "content": content}],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "vision_check_result",
                "strict": True,
                "schema": VISION_SCHEMA,
            },
        },
    )

    logger.info(
        "Vision check completed. Tokens: prompt=%d, completion=%d",
        response.usage.prompt_tokens,
        response.usage.completion_tokens,
    )
    return json.loads(response.choices[0].message.content)
