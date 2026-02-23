# ScorelyAI

An AI-powered audit engine for competitive DECA business reports. Upload a PDF, select an event, and receive deterministic section-level scoring with actionable feedback — in under 20 seconds.

---

## Overview

DECA competitors submit written reports that judges evaluate against official event rubrics. This tool automates that process: it extracts text from a PDF, loads the event-specific rubric and required document outline, and sends everything to an LLM that scores each section independently and returns structured JSON feedback.

Grading is fully async. Uploading a report returns a job ID immediately; the frontend polls for results and displays them as soon as they're ready.

---

## Features

- **Event-aware grading** — two-level hierarchy (cluster → specific event) with tailored prompts per event
- **Required outline enforcement** — official DECA document structure injected into the prompt so the LLM penalizes missing sections
- **Structured output** — JSON schema-validated grading results via OpenAI structured outputs
- **Section-level feedback** — scores and actionable comments for every rubric section
- **Token safety** — documents truncated to 25,000 tokens if needed, with a user-visible warning
- **Auto file cleanup** — uploaded PDFs deleted immediately after grading completes
- **Rubric management CLI** — add or update event rubrics without touching code

---

## Supported Events

### Project Management
PMBS · PMCD · PMCA · PMCG · PMFL · PMSP

### Business Operations Research
BOR · FOR · HTOR · BMOR · SEOR

---

## How It Works

```
Upload PDF  →  Extract Text  →  Resolve Rubric + Outline  →  LLM Grading  →  Structured Score + Feedback
```

1. User uploads a PDF and selects the event from a two-level dropdown
2. Backend validates the file (≤ 25 pages, ≤ 15MB, PDF only) and queues a grading job
3. Text is extracted via PyMuPDF and truncated if needed
4. The event rubric and official required outline are loaded and injected into the prompt
5. OpenAI returns a schema-validated JSON response with per-section scores and feedback
6. Results are stored in the database and the uploaded file is deleted
7. Frontend displays a section-by-section score breakdown with color-coded progress bars

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14+ (App Router), TypeScript, TailwindCSS |
| **Backend** | FastAPI (Python), async background tasks |
| **Database** | PostgreSQL, SQLAlchemy ORM, Alembic migrations |
| **PDF Processing** | PyMuPDF (fitz) |
| **LLM** | OpenAI API — gpt-4o-mini, temperature 0.2, structured outputs |
| **Token Counting** | tiktoken |
| **Validation** | Pydantic (backend), TypeScript strict mode (frontend) |

---

## Project Structure

```
ai-rubric-evaluator/
├── frontend/
│   ├── app/
│   │   ├── page.tsx                  # Landing page
│   │   ├── upload/page.tsx           # Upload form + event selector
│   │   └── results/[jobId]/page.tsx  # Polling + results display
│   ├── components/
│   │   ├── UploadForm.tsx            # Two-level event dropdown + file upload
│   │   ├── ScoreBreakdown.tsx        # Section scores with progress bars
│   │   └── LoadingSpinner.tsx        # Polling state UI
│   ├── lib/api.ts                    # Centralized API client
│   └── types/grading.ts              # TypeScript types matching backend schemas
│
├── backend/
│   ├── app/
│   │   ├── main.py                   # FastAPI app, routes, CORS
│   │   ├── events_data.py            # Static event/cluster hierarchy
│   │   ├── models.py                 # SQLAlchemy models (Job, Rubric)
│   │   ├── schemas.py                # Pydantic request/response schemas
│   │   ├── database.py               # DB connection + session management
│   │   └── services/
│   │       ├── grading_service.py    # LLM prompt construction + grading pipeline
│   │       ├── rubric_service.py     # Rubric CRUD
│   │       └── pdf_service.py        # PDF extraction + validation
│   ├── rubrics/
│   │   ├── project_management.json          # PM rubric + required outline
│   │   └── business_operations_research.json # BOR rubric + required outline
│   └── scripts/
│       └── add_rubric.py             # CLI to seed or create rubrics
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/upload` | Upload PDF + select event; returns `job_id` |
| `GET` | `/api/status/{job_id}` | Poll job status and retrieve results |
| `GET` | `/api/events` | List available events for the dropdown |
| `POST` | `/api/rubrics` | Create or update a rubric |
| `GET` | `/api/rubrics/{event}` | Fetch a rubric by event name |

---

## Roadmap

| Phase | Status | Description |
|---|---|---|
| Phase 1 | ✅ Complete | Text-based grading MVP |
| Phase 2 | Planned | Visual evaluation (tables, charts, layout analysis) |
| Phase 3 | Planned | Bulk grading + multi-report comparison |
| Phase 4 | Planned | Auth + grading history per user |
| Phase 5 | Planned | Production deployment |

---

## Installation & Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL 16 (`brew install postgresql@16` on macOS)
- OpenAI API key

### Backend

**1. Create and activate a virtual environment**
```
cd backend
python -m venv venv
source venv/bin/activate
```

**2. Install dependencies**
```
pip install -r requirements.txt
```

**3. Configure environment**
```
cp .env.example .env
```
Edit `.env` with your values:
```
DATABASE_URL=postgresql://yourusername@localhost:5432/rubric_db
OPENAI_API_KEY=sk-...
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=15
MAX_PAGES=25
```

**4. Create the database and run migrations**
```
createdb rubric_db
alembic upgrade head
```

Rubrics auto-seed on first startup — no manual seeding required.

### Frontend

**1. Install dependencies**
```
cd frontend
npm install
```

**2. Configure environment**
```
cp .env.example .env.local
```
Set `NEXT_PUBLIC_API_URL=http://localhost:8000` in `.env.local`.

---

## Running Locally

Open two terminals:

**Terminal 1 — Backend**
```
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — Frontend**
```
cd frontend
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see ScorelyAI.

---

## Adding New Rubrics

```
cd backend
source venv/bin/activate
python scripts/add_rubric.py
```

The CLI prompts for event name, sections, point values, scoring guides, and an optional required outline. To seed directly from a JSON file:

```
python scripts/add_rubric.py --seed rubrics/your_event.json
```

---

## Troubleshooting

**`proxies` error on upload**
Caused by `openai==1.51.0` with `httpx>=0.28`:
```
pip install "openai>=1.57.0"
```

**psycopg architecture mismatch on Apple Silicon**
```
pip install --force-reinstall --no-cache-dir "psycopg[binary]"
```

**Port 3001 already in use**
Edit the `dev` script in `frontend/package.json` and update the CORS origins in `backend/app/main.py` to match.

**Stale build errors**
```
rm -rf frontend/.next
```

---

## License

Private repository — not licensed for external use.
