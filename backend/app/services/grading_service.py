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
- 95–100%: Near-perfect. The project unmistakably fulfills this specific event's purpose AND demonstrates exceptional mastery across all sections. Reserve this for qualifier-level entries only.
- 80–90%: Solid competitive entry. The project clearly addresses this event's requirements and demonstrates competent execution. Minor gaps only.
- 65–75%: Weak — either the project partially matches this event's requirements, or it is the right event type but executed at a surface level without real depth or analysis.
- 35–45%: The project clearly addresses a fundamentally different type of project than this event requires. Even if well-written, it does not fulfill this event's purpose.

High scores require both: (1) genuine fulfillment of this specific event's purpose, and (2) demonstrated mastery of the required concepts. Attempting to address something is not the same as mastering it.

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
1. Determine whether the content actually serves this specific event's purpose — not just whether the section exists or is well-written
2. Assign a score based on both event alignment and quality of execution; a section that doesn't serve this event's purpose scores in the lower tier regardless of writing quality
3. Provide specific feedback explaining what was and wasn't fulfilled, and why the score was assigned

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
This page may appear as printed text, a scanned image of a physical form, or a photographed document.

Step 1: Determine if the SOA page exists at all (look for the title, checkboxes, and signature lines).
Step 2: If the page exists, look closely at the signature line(s). Is there a handwritten signature, typed name, or digital signature present — or are the signature lines blank/empty?

Set soa_status to exactly one of:
- "signed"           — SOA page found AND a signature is visibly present
- "unsigned"         — SOA page found BUT the signature line is blank or empty
- "not_found"        — No SOA page found anywhere in the provided pages
- "cannot_determine" — A possible SOA page was found but the signature area is unclear or illegible

TASK 2 — APPEARANCE AND WORD USAGE:
Evaluate the visual presentation and writing quality of this report based on these pages.
Max points for this section: {max_points}
Scoring guide:
{scoring_guide}

Assess: professional formatting consistency, layout clarity, quality of any charts/tables/graphs, use of white space, visual hierarchy, neatness, grammar, and word usage.

Return ONLY valid JSON:
{{"soa_status": "signed|unsigned|not_found|cannot_determine", "soa_note": "describe exactly what you found and whether a signature was present", "appearance_score": integer, "appearance_feedback": "specific, critical feedback on appearance and word usage"}}"""

VISION_PROMPT_SOA_ONLY = """You are reviewing selected pages from a DECA business report.

Carefully examine all provided pages for a "Statement of Assurances" or "Academic Integrity" form.
This page may appear as printed text, a scanned image of a physical form, or a photographed document.

Step 1: Determine if the SOA page exists at all (look for the title, checkboxes, and signature lines).
Step 2: If the page exists, look closely at the signature line(s). Is there a handwritten signature, typed name, or digital signature present — or are the signature lines blank/empty?

Set soa_status to exactly one of:
- "signed"           — SOA page found AND a signature is visibly present
- "unsigned"         — SOA page found BUT the signature line is blank or empty
- "not_found"        — No SOA page found anywhere in the provided pages
- "cannot_determine" — A possible SOA page was found but the signature area is unclear or illegible

Return ONLY valid JSON:
{{"soa_status": "signed|unsigned|not_found|cannot_determine", "soa_note": "describe exactly what you found and whether a signature was present", "appearance_score": 0, "appearance_feedback": ""}}"""

VISION_SCHEMA = {
    "type": "object",
    "properties": {
        "soa_status": {
            "type": "string",
            "enum": ["signed", "unsigned", "not_found", "cannot_determine"],
        },
        "soa_note": {"type": "string"},
        "appearance_score": {"type": "integer"},
        "appearance_feedback": {"type": "string"},
    },
    "required": ["soa_status", "soa_note", "appearance_score", "appearance_feedback"],
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
            soa_status = vision_result["soa_status"]
            soa_penalty_map = {
                "signed":           "clear",
                "unsigned":         "flagged",
                "not_found":        "flagged",
                "cannot_determine": "manual_check",
            }
            for penalty in result.get("penalties", []):
                if "statement of assurances" in penalty.get("description", "").lower():
                    penalty["status"] = soa_penalty_map.get(soa_status, "manual_check")
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

            # Append visual feedback to overall_feedback so it surfaces in the summary
            if vision_result.get("appearance_feedback"):
                result["overall_feedback"] = (
                    result["overall_feedback"].rstrip()
                    + "\n\nVisual Assessment: "
                    + vision_result["appearance_feedback"]
                )

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
