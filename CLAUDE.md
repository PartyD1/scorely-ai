# AI Rubric Evaluator

## Project Overview

An AI-powered web application that evaluates competitive DECA business reports using structured rubric-based grading. The system accepts PDF uploads, applies event-specific rubrics, and returns deterministic, schema-validated scoring with section-level feedback.

**Full specification document:** `AI_Rubric_Evaluator.pdf` (uploaded)

## Current Phase

**Phase 1: Text-Based Grading MVP**

Build a fully functional system that grades based only on extracted text. No visual evaluation.

### Phase 1 Requirements

- Async job-based grading (upload returns job_id, poll for results)
- PDF upload with validation (max 25 pages, 15MB)
- Event selection via dropdown
- Clean text extraction
- Dynamic rubric loading based on selected event
- LLM grading call with structured output
- JSON schema validation
- Database storage for jobs and temporary files
- Auto-cleanup of files after grading returned
- Basic frontend with upload and results pages
- Rubric creation utility for adding new events manually

### Definition of Done
- A 25-page PDF can be graded successfully
- Response time: extraction + grading completes in <20 seconds
- Output always matches the schema
- System handles malformed PDFs without crashing
- Files automatically deleted after results retrieved
- Admin can add new event rubrics via utility function

## Technology Stack

### Backend
- **Framework:** FastAPI (Python) with async endpoints
- **Database:** PostgreSQL with SQLAlchemy ORM
- **Schema Validation:** Pydantic
- **PDF Processing:** PyMuPDF (fitz)
- **LLM:** OpenAI API with structured outputs
- **Temperature:** 0.2 for deterministic grading
- **CORS:** Enabled for `localhost:3000`

### Frontend
- **Framework:** Next.js 14+ with App Router and TypeScript
- **Styling:** TailwindCSS
- **Architecture:** Server-side rendering, component-based

## Folder Structure
```
ai-rubric-evaluator/
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Homepage/landing
│   │   ├── upload/
│   │   │   └── page.tsx          # Upload form with event selector
│   │   └── results/
│   │       └── [jobId]/
│   │           └── page.tsx      # Dynamic results page
│   ├── components/
│   │   ├── UploadForm.tsx        # Upload UI with event dropdown
│   │   ├── ScoreBreakdown.tsx    # Section-by-section display
│   │   └── LoadingSpinner.tsx    # For polling state
│   ├── lib/
│   │   └── api.ts                # All API calls centralized
│   ├── types/
│   │   └── grading.ts            # TypeScript types matching backend
│   └── styles/
│       └── globals.css
│
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI app, routes, CORS
│   │   ├── database.py           # DB connection, session management
│   │   ├── models.py             # SQLAlchemy models (Job, Rubric)
│   │   ├── schemas.py            # Pydantic request/response schemas
│   │   ├── services/
│   │   │   ├── pdf_service.py    # PDF upload, extraction, validation
│   │   │   ├── rubric_service.py # Rubric CRUD operations
│   │   │   └── grading_service.py # LLM interaction, grading logic
│   │   └── utils/
│   │       ├── file_cleanup.py   # Auto-delete uploaded files
│   │       └── token_counter.py  # Token estimation for LLM calls
│   ├── rubrics/
│   │   └── project_management.json  # Starting rubric
│   ├── scripts/
│   │   └── add_rubric.py         # Utility to create new rubrics
│   ├── uploads/                  # Temporary file storage
│   ├── requirements.txt
│   ├── .env                      # API keys, DB connection string
│   └── alembic/                  # DB migrations (generated)
│
├── .gitignore
└── README.md
```

## Architecture: Async Job Pattern

### Flow
1. **User uploads PDF** → `POST /api/upload`
   - Validates file (size, page count, type)
   - Saves to `uploads/` directory
   - Creates Job record in DB (status: `pending`)
   - Returns `{"job_id": "uuid"}`

2. **Backend processes asynchronously** → Background task or polling-based
   - Extract text from PDF
   - Load selected rubric from DB
   - Call LLM with structured output
   - Validate response
   - Update Job record (status: `complete`, results: JSON)
   - Delete uploaded file

3. **Frontend polls** → `GET /api/status/{job_id}`
   - Returns: `{"status": "pending|processing|complete|failed", "result": {...}}`
   - Frontend polls every 2 seconds
   - Redirects to results page on completion

4. **Results displayed** → `/results/{job_id}`
   - Fetches final grading data
   - Shows section breakdown with feedback

### API Endpoints
```
POST   /api/upload              # Upload PDF, select event, returns job_id
GET    /api/status/{job_id}     # Poll job status
GET    /api/events              # Get list of available events for dropdown
POST   /api/rubrics             # Admin: create new rubric (via script/utility)
GET    /api/rubrics/{event}     # Get specific rubric (for debugging)
```

## Database Schema

### Job Table
```python
class Job(Base):
    __tablename__ = "jobs"
    
    id = Column(String, primary_key=True)  # UUID
    event_name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)  # uploads/{uuid}.pdf
    status = Column(Enum('pending', 'processing', 'complete', 'failed'))
    result = Column(JSON, nullable=True)  # Grading output
    error = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
```

### Rubric Table
```python
class Rubric(Base):
    __tablename__ = "rubrics"
    
    id = Column(Integer, primary_key=True)
    event_name = Column(String, unique=True, nullable=False)
    rubric_data = Column(JSON, nullable=False)  # Full rubric JSON
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
```

## Critical Schemas

### Rubric Schema (JSON stored in DB)
```json
{
  "event": "Project Management",
  "total_points": 100,
  "sections": [
    {
      "name": "Executive Summary",
      "max_points": 10,
      "description": "Clear overview of the project including objectives, scope, and outcomes",
      "scoring_guide": {
        "9-10": "Exceptional summary with all key elements clearly articulated",
        "7-8": "Strong summary with most key elements present",
        "5-6": "Adequate summary but missing some important details",
        "3-4": "Weak summary with significant gaps",
        "0-2": "Poor or missing executive summary"
      }
    },
    {
      "name": "Project Scope & Objectives",
      "max_points": 15,
      "description": "Well-defined project boundaries, deliverables, and SMART objectives",
      "scoring_guide": {
        "13-15": "Comprehensive scope definition with clear, measurable objectives",
        "10-12": "Good scope and objectives with minor gaps",
        "7-9": "Basic scope definition, objectives need refinement",
        "4-6": "Vague scope or poorly defined objectives",
        "0-3": "Unclear or missing scope and objectives"
      }
    }
    // Add remaining sections for Project Management rubric
  ]
}
```

### Grading Output Schema (Pydantic)
```python
class SectionScore(BaseModel):
    name: str
    max_points: int
    awarded_points: int
    feedback: str

class GradingResult(BaseModel):
    event_name: str
    total_possible: int
    total_awarded: int
    sections: List[SectionScore]
    overall_feedback: str
```

## File Upload Constraints

- **Max file size:** 15MB
- **Max pages:** 25
- **Allowed types:** `.pdf` only
- **Storage location:** `backend/uploads/{job_id}.pdf`
- **Cleanup:** File deleted immediately after grading completes and result stored in DB
- **Validation:** Check file size before saving, extract page count after saving

### Error Messages
- File too large: "File exceeds 15MB limit"
- Too many pages: "PDF exceeds 25 page limit"
- Invalid type: "Only PDF files are accepted"
- Extraction failed: "Unable to extract text from PDF. Ensure it's a typed document."

## Token Management

- **Token limit:** 30,000 tokens for extracted text
- **Strategy:** If text exceeds limit, truncate to first 25,000 tokens
- **Warning:** Display message to user: "Document was truncated due to length. Grading based on first X pages."
- **Estimation:** Use `tiktoken` library to count tokens before LLM call

## LLM Integration

### Configuration
- **Model:** `gpt-4o` or `gpt-4o-mini` (cost/quality tradeoff)
- **Temperature:** 0.2
- **Structured Output:** Use `response_format: { type: "json_schema" }`
- **Schema enforcement:** Pass GradingResult schema to OpenAI API

### System Prompt Template
```
You are an expert DECA judge evaluating a {event_name} report.

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

Return ONLY valid JSON matching the required schema. Do not add commentary outside the JSON structure.
```

## Rubric Management

### Creating New Rubrics

**Script:** `backend/scripts/add_rubric.py`

This utility allows you to manually create and add new event rubrics to the database.
```python
"""
Usage: python add_rubric.py

Interactive CLI that prompts for:
- Event name
- Total points
- Number of sections
- For each section:
  - Name
  - Max points
  - Description
  - Scoring guide (by tier)

Validates structure and saves to database.
"""
```

**Features:**
- Interactive prompts for each field
- Validation: ensures sections sum to total_points
- Automatically formats scoring guides
- Option to preview JSON before saving
- Idempotent: can update existing rubrics

**Example Interaction:**
```
$ python add_rubric.py

Event name: Business Growth Plan
Total points (default 100): 100
Number of sections: 5

Section 1:
  Name: Executive Summary
  Max points: 15
  Description: Overview of growth strategy
  Scoring guide (9-10 points): Exceptional clarity and comprehensiveness
  Scoring guide (7-8 points): Strong overview with minor gaps
  ...

Preview rubric JSON? [y/n]: y
{...}

Save to database? [y/n]: y
✓ Rubric saved successfully
```

### Starting Rubric

**Event:** Project Management

**Sections (suggested structure):**
1. Executive Summary (10 pts)
2. Project Scope & Objectives (15 pts)
3. Timeline & Milestones (15 pts)
4. Resource Allocation (15 pts)
5. Risk Management (15 pts)
6. Budget & Cost Analysis (15 pts)
7. Stakeholder Communication Plan (10 pts)
8. Quality Metrics (5 pts)

You'll define the exact scoring guides when running the `add_rubric.py` script.

## CORS Configuration

FastAPI must enable CORS for local development:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Frontend Implementation Notes

### Event Selector
- Dropdown populated by calling `GET /api/events`
- Returns list of available event names from Rubric table
- Default selected: "Project Management"

### Upload Flow
1. User selects event from dropdown
2. User uploads PDF
3. Validation happens client-side (file size) and server-side (pages, type)
4. On success, redirect to `/results/{job_id}` with polling

### Polling Logic
- Start polling immediately on results page load
- Poll every 2 seconds
- Show loading spinner with status message
- On `complete`: display results
- On `failed`: show error message
- Timeout after 60 seconds with error

### Results Display
- Section-by-section breakdown with progress bars
- Color coding: green (>80%), yellow (60-80%), red (<60%)
- Expandable feedback per section
- Overall score prominently displayed
- Option to download results as PDF (Phase 2)

## Code Quality Standards

- **Type safety:** Full type hints in Python, strict TypeScript
- **Error handling:** Try/catch blocks, meaningful error messages
- **Logging:** Log all LLM calls, token usage, failures
- **Environment variables:** Never commit `.env`, use `.env.example`
- **Docstrings:** All functions documented
- **Validation:** Pydantic for backend, Zod for frontend if needed
- **RESTful design:** Consistent endpoint naming

## Development Workflow

1. **Database setup:**
   - Create PostgreSQL database
   - Run migrations (Alembic)
   - Seed with Project Management rubric using `add_rubric.py`

2. **Backend first:**
   - Get `/api/upload` endpoint working (saves file, creates job)
   - Get PDF text extraction working
   - Get LLM call working with structured output
   - Get `/api/status/{job_id}` returning correct states
   - Test file cleanup after job completion

3. **Frontend:**
   - Build upload form with event dropdown
   - Wire up polling on results page
   - Display score breakdown

4. **Testing:**
   - Test with real DECA report PDFs if available
   - Test file size/page limits
   - Test malformed PDFs
   - Test multiple concurrent uploads

## Environment Variables

### Backend `.env`
```
DATABASE_URL=postgresql://user:password@localhost:5432/rubric_db
OPENAI_API_KEY=sk-...
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=15
MAX_PAGES=25
```

### Frontend `.env.local`
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Important Notes

- Focus on getting Project Management rubric working perfectly first
- Database required from day one (not optional in Phase 1)
- Files stored temporarily, deleted immediately after grading
- No authentication in Phase 1 (anyone can upload)
- Admin adds rubrics manually via CLI script
- Production deployment considerations deferred to Phase 5


*When telling me to run commands,  split them up so I know which commands are the same line and which are not*