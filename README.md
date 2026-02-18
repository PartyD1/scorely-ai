# AI Rubric Evaluator

An AI-powered grading engine that evaluates competitive DECA business reports against structured, event-specific rubrics. Upload a PDF, select an event, and receive deterministic, section-level scoring with actionable feedback — in under 20 seconds.

**Current phase: Phase 1 MVP (text-based grading)**

---

## How It Works

```
Upload PDF  →  Extract Text  →  Apply Rubric via LLM  →  Structured Score + Feedback
```

1. **Upload** a DECA report (PDF, up to 25 pages)
2. **Select** the competitive event (e.g., Project Management)
3. **Receive** a section-by-section breakdown with scores, feedback, and an overall grade

All grading is async — upload returns a job ID, and results are available via polling within seconds.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16 (App Router), TypeScript, TailwindCSS |
| **Backend** | FastAPI (Python), async endpoints |
| **Database** | PostgreSQL, SQLAlchemy ORM, Alembic migrations |
| **PDF Processing** | PyMuPDF (fitz) |
| **LLM** | OpenAI API (gpt-4o-mini), temperature 0.2, structured outputs |
| **Token Counting** | tiktoken |
| **Validation** | Pydantic (backend), TypeScript strict mode (frontend) |

---

## Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL 16 (via Homebrew: `brew install postgresql@16`)
- OpenAI API key

---

## Setup

### Backend

**Step 1:** Navigate to backend and create a virtual environment
```
cd backend
python -m venv venv
source venv/bin/activate
```

**Step 2:** Install dependencies
```
pip install -r requirements.txt
```

**Step 3:** Configure environment
```
cp .env.example .env
```
Edit `.env` with your values (see Environment Variables section below).

**Step 4:** Create the database
```
createdb rubric_db
```

**Step 5:** Run migrations
```
alembic upgrade head
```

> The default Project Management rubric auto-seeds on first startup — no manual seeding needed.

---

### Frontend

**Step 1:** Navigate to frontend and install dependencies
```
cd frontend
npm install
```

**Step 2:** Configure environment
```
cp .env.example .env.local
```
Set `NEXT_PUBLIC_API_URL=http://localhost:8000` in `.env.local`.

---

## Running the App

Open two terminals:

**Terminal 1 — Backend:**
```
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
If port 3000 is in use, Next.js automatically uses 3001 — both ports are CORS-whitelisted.

---

## Environment Variables

### Backend `.env`
```
DATABASE_URL=postgresql://yourusername@localhost:5432/rubric_db
OPENAI_API_KEY=sk-...
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=15
MAX_PAGES=25
```

### Frontend `.env.local`
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/upload` | Upload PDF + select event, returns `job_id` |
| `GET` | `/api/status/{job_id}` | Poll grading job status and results |
| `GET` | `/api/events` | List available events for the dropdown |
| `POST` | `/api/rubrics` | Create or update a rubric |
| `GET` | `/api/rubrics/{event}` | Fetch a rubric by event name |

---

## Adding New Rubrics

**Step 1:** Activate the backend virtualenv
```
cd backend
source venv/bin/activate
```

**Step 2:** Run the interactive CLI
```
python scripts/add_rubric.py
```

The script prompts for event name, sections, point values, and scoring guides, then saves to the database.

---

## File Constraints

- **Max size:** 15MB
- **Max pages:** 25
- **Type:** PDF only
- **Cleanup:** Files are automatically deleted after grading completes and results are stored

---

## Known Issues / Troubleshooting

**`proxies` error on upload**
Caused by `openai==1.51.0` with `httpx>=0.28`. Fix:
```
pip install "openai>=1.57.0"
```

**Port 3000 already in use**
Next.js will automatically fall back to port 3001. Both `localhost:3000` and `localhost:3001` are CORS-whitelisted in the backend.

**Lock file / stale build error**
```
rm -rf frontend/.next
```
Then restart the frontend dev server.

---

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

---

## Roadmap

- **Phase 1** ✅ — Text-based grading MVP
- **Phase 2** — Visual evaluation (tables, charts, layout)
- **Phase 3** — Multi-rubric support / bulk grading
- **Phase 4** — Auth + user history
- **Phase 5** — Production deployment

---

## License

This project is private and not licensed for external use.
