# AI Rubric Evaluator

An AI-powered grading engine that evaluates competitive DECA business reports against structured, event-specific rubrics. Upload a PDF, select an event, and receive deterministic, section-level scoring with actionable feedback — in under 20 seconds.

---

## How It Works

```
Upload PDF  →  Extract Text  →  Apply Rubric via LLM  →  Structured Score + Feedback
```

1. **Upload** a DECA report (PDF, up to 25 pages)
2. **Select** the competitive event (e.g., Project Management)
3. **Receive** a section-by-section breakdown with scores, feedback, and an overall grade

All grading is async — upload returns a job ID, and results are available via polling within seconds.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14+ (App Router), TypeScript, TailwindCSS |
| **Backend** | FastAPI (Python), async endpoints |
| **Database** | PostgreSQL, SQLAlchemy ORM, Alembic migrations |
| **PDF Processing** | PyMuPDF (fitz) |
| **LLM** | OpenAI API (gpt-4o-mini) with structured outputs |
| **Validation** | Pydantic (backend), TypeScript strict mode (frontend) |

## Project Structure

```
ai-rubric-evaluator/
├── frontend/          # Next.js application
│   ├── app/           # App Router pages (landing, upload, results)
│   ├── components/    # Reusable UI components
│   ├── lib/           # API client
│   └── types/         # Shared TypeScript types
├── backend/           # FastAPI application
│   ├── app/           # Core application (routes, models, services)
│   ├── rubrics/       # Event rubric JSON definitions
│   ├── scripts/       # CLI utilities (e.g., add_rubric.py)
│   └── uploads/       # Temporary PDF storage (auto-cleaned)
```

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL 16
- OpenAI API key

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL and OPENAI_API_KEY

# Run migrations
alembic upgrade head

# Seed the default rubric
python scripts/add_rubric.py

# Start the server
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your API URL

# Start the dev server
npm run dev
```

The frontend runs at `http://localhost:3000` and the backend API at `http://localhost:8000`.

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/upload` | Upload PDF + select event, returns `job_id` |
| `GET` | `/api/status/{job_id}` | Poll grading job status and results |
| `GET` | `/api/events` | List available events for the dropdown |
| `POST` | `/api/rubrics` | Create a new event rubric |
| `GET` | `/api/rubrics/{event}` | Retrieve a specific rubric |

## Rubric System

Rubrics are event-specific JSON structures stored in the database. Each rubric defines scored sections with point ranges and descriptive scoring guides. New rubrics can be added via the `add_rubric.py` CLI utility.

**Example section:**
```json
{
  "name": "Executive Summary",
  "max_points": 10,
  "scoring_guide": {
    "9-10": "Exceptional summary with all key elements clearly articulated",
    "7-8": "Strong summary with most key elements present",
    "5-6": "Adequate summary but missing some important details",
    "3-4": "Weak summary with significant gaps",
    "0-2": "Poor or missing executive summary"
  }
}
```

## Roadmap

- **Phase 1** — Text-based grading MVP (current)
- **Phase 2** — PDF export of results, enhanced feedback
- **Phase 3** — Visual/layout evaluation
- **Phase 4** — Multi-user support and authentication
- **Phase 5** — Production deployment

## License

This project is private and not licensed for external use.
