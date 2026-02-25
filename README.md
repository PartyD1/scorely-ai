<!-- Back to top link -->
<a id="readme-top"></a>

<!-- PROJECT SHIELDS -->
[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]

<br />
<div align="center">

<h1 align="center">ScorelyAI</h1>

  <p align="center">
    AI-powered rubric grading for competitive DECA written reports.
    <br />
    <br />
    <a href="https://scorely-ai.vercel.app/">View Live Demo</a>
    &middot;
    <a href="https://github.com/PartyD1/scorely-ai/issues/new?labels=bug&template=bug-report---.md">Report Bug</a>
    &middot;
    <a href="https://github.com/PartyD1/scorely-ai/issues/new?labels=enhancement&template=feature-request---.md">Request Feature</a>
  </p>
</div>

---

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li><a href="#about-the-project">About the Project</a></li>
    <li><a href="#features">Features</a></li>
    <li><a href="#supported-events">Supported Events</a></li>
    <li><a href="#tech-stack">Tech Stack</a></li>
    <li><a href="#how-it-works">How It Works</a></li>
    <li><a href="#api-reference">API Reference</a></li>
    <li><a href="#project-structure">Project Structure</a></li>
    <li>
      <a href="#installation--setup">Installation & Setup</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#backend">Backend</a></li>
        <li><a href="#frontend">Frontend</a></li>
        <li><a href="#running-locally">Running Locally</a></li>
      </ul>
    </li>
    <li><a href="#adding-new-rubrics">Adding New Rubrics</a></li>
    <li><a href="#troubleshooting">Troubleshooting</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>

---

<!-- ABOUT THE PROJECT -->
## About the Project

ScorelyAI is a web application that grades competitive DECA written reports using AI. Upload your PDF, select your event, and receive a detailed, section-by-section score breakdown with specific, actionable feedback — all graded against the official DECA rubric for your event.

The system supports **16 events across 3 clusters**, uses **GPT-4o-mini** for structured rubric-based text grading, and runs a **vision check** on rendered PDF pages to detect Statement of Assurances signatures and evaluate visual presentation — catching things that pure text extraction misses.

Grading is fully async. Uploading a report returns a job ID immediately; the frontend polls for results and displays them as soon as they're ready.

**Live demo:** [https://scorely-ai.vercel.app/](https://scorely-ai.vercel.app/)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

<!-- FEATURES -->
## Features

- **Event-aware grading** — two-level hierarchy (cluster → specific event) with tailored prompts per event
- **Vision check** — key PDF pages are rendered and sent to GPT-4o-mini vision to detect Statement of Assurances signatures and assess visual presentation
- **Required outline enforcement** — official DECA document structure injected into the prompt so the LLM penalizes missing sections
- **Structured output** — JSON schema-validated grading results via OpenAI structured outputs
- **Section-level feedback** — scores and actionable comments for every rubric section, with color-coded progress bars (green ≥80%, yellow 60–80%, red <60%)
- **Penalty flagging** — explicit flags for Statement of Assurances compliance and required outline adherence
- **Token safety** — documents truncated to 25,000 tokens if needed, with a user-visible warning
- **Auto file cleanup** — uploaded PDFs deleted immediately after grading completes
- **Rubric management CLI** — add or update event rubrics without touching code
- **Cold-start resilience** — polling timeout accounts for free-tier server wake-up delays

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

<!-- SUPPORTED EVENTS -->
## Supported Events

### Business Operations Research
BOR · FOR · HTOR · BMOR · SEOR

### Entrepreneurship
EBG · EFB · EIB · IBP

### Project Management
PMBS · PMCD · PMCA · PMCG · PMFL · PMSP

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

<!-- TECH STACK -->
## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js (App Router), TypeScript, TailwindCSS |
| **Backend** | FastAPI (Python), async background tasks |
| **Database** | PostgreSQL, SQLAlchemy ORM, Alembic migrations |
| **PDF Processing** | PyMuPDF (fitz) — text extraction + page rendering |
| **LLM** | OpenAI API — gpt-4o-mini, temperature 0.2, structured outputs + vision |
| **Token Counting** | tiktoken |
| **Validation** | Pydantic (backend), TypeScript strict mode (frontend) |
| **Deployment** | Vercel (frontend) + Render (backend) |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

<!-- HOW IT WORKS -->
## How It Works

```
Upload PDF  →  Extract Text  →  Resolve Rubric + Outline  →  LLM Text Grading  →  Vision Check  →  Score + Feedback
```

1. User uploads a PDF and selects the event from a two-level dropdown
2. Backend validates the file (≤ 25 pages, ≤ 15MB, PDF only) and queues a grading job
3. Text is extracted via PyMuPDF and truncated to 25,000 tokens if needed
4. The event rubric and official required outline are loaded and injected into the prompt
5. OpenAI returns a schema-validated JSON response with per-section scores and feedback
6. Key PDF pages are rendered as images and sent to GPT-4o-mini vision for SOA signature detection and visual appearance scoring
7. Results are merged, stored in the database, and the uploaded file is deleted
8. Frontend displays a section-by-section score breakdown with color-coded progress bars and penalty flags

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

<!-- API REFERENCE -->
## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/upload` | Upload PDF + select event; returns `job_id` |
| `GET` | `/api/status/{job_id}` | Poll job status and retrieve results |
| `GET` | `/api/events` | List available events for the dropdown |
| `POST` | `/api/rubrics` | Create or update a rubric |
| `GET` | `/api/rubrics/{event}` | Fetch a rubric by event name |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

<!-- PROJECT STRUCTURE -->
## Project Structure

```
scorely-ai/
├── frontend/
│   ├── app/
│   │   ├── page.tsx                  # Landing page
│   │   ├── upload/page.tsx           # Upload form + event selector
│   │   └── results/[jobId]/page.tsx  # Polling + results display
│   ├── components/
│   │   ├── UploadForm.tsx            # Two-level event dropdown + file upload
│   │   ├── ScoreBreakdown.tsx        # Section scores with progress bars
│   │   ├── AuditProgress.tsx         # Loading state during polling
│   │   └── ScorelyLogo.tsx           # Branding component
│   ├── lib/api.ts                    # Centralized API client
│   └── types/grading.ts              # TypeScript types matching backend schemas
│
├── backend/
│   ├── app/
│   │   ├── main.py                   # FastAPI app, routes, CORS
│   │   ├── events_data.py            # Static event/cluster hierarchy (16 events)
│   │   ├── models.py                 # SQLAlchemy models (Job, Rubric)
│   │   ├── schemas.py                # Pydantic request/response schemas
│   │   ├── database.py               # DB connection + session management
│   │   └── services/
│   │       ├── grading_service.py    # LLM prompt construction, text grading + vision check
│   │       ├── rubric_service.py     # Rubric CRUD
│   │       └── pdf_service.py        # PDF extraction + validation
│   ├── rubrics/                      # 6 seeded JSON rubric files
│   └── scripts/
│       └── add_rubric.py             # CLI to seed or create rubrics
│
└── render.yaml                       # Render IaC deployment config
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

<!-- INSTALLATION -->
## Installation & Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL 16 (`brew install postgresql@16` on macOS) or a [Neon](https://neon.tech) cloud database
- OpenAI API key — [platform.openai.com](https://platform.openai.com)

### Backend

**1. Create and activate a virtual environment**
```
cd backend
```
```
python -m venv venv
```
```
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
MAX_PAGES=23
```

**4. Create the database and run migrations**
```
createdb rubric_db
```
```
alembic upgrade head
```

Rubrics auto-seed on first startup — no manual seeding required.

### Frontend

**1. Install dependencies**
```
cd frontend
```
```
npm install
```

**2. Configure environment**
```
cp .env.example .env.local
```
Set `NEXT_PUBLIC_API_URL=http://localhost:8000` in `.env.local`.

### Running Locally

Open two terminals:

**Terminal 1 — Backend**
```
cd backend
```
```
source venv/bin/activate
```
```
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — Frontend**
```
cd frontend
```
```
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

<!-- ADDING NEW RUBRICS -->
## Adding New Rubrics

```
cd backend
```
```
source venv/bin/activate
```
```
python scripts/add_rubric.py
```

The CLI prompts for event name, sections, point values, scoring guides, and an optional required outline. To seed directly from a JSON file:

```
python scripts/add_rubric.py --seed rubrics/your_event.json
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

<!-- TROUBLESHOOTING -->
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

**Port already in use**
Edit the `dev` script in `frontend/package.json` and update the CORS origins in `backend/app/main.py` to match.

**Stale build errors**
```
rm -rf frontend/.next
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

<!-- LICENSE -->
## License

Private repository — not licensed for external use.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

<!-- CONTACT -->
## Contact

**Parth Doshi**

[![LinkedIn][linkedin-shield]][linkedin-url]
[![GitHub][github-shield]][github-url]

Project: [https://github.com/PartyD1/scorely-ai](https://github.com/PartyD1/scorely-ai)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

<!-- ACKNOWLEDGMENTS -->
## Acknowledgments

Special thanks to the following people who generously shared their DECA written reports for use as training and testing data:

- Devansh Daxini
- Kaviya Muthukumaravel
- Maskeen Singh Saini
- Pranav Sathianathan
- Rishi Ranga
 
Special thanks to my former advisor for preparing me with the knowledge to tackle a project of this scale: Mr. Wu

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

<!-- MARKDOWN LINKS -->
[contributors-shield]: https://img.shields.io/github/contributors/PartyD1/scorely-ai.svg?style=for-the-badge
[contributors-url]: https://github.com/PartyD1/scorely-ai/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/PartyD1/scorely-ai.svg?style=for-the-badge
[forks-url]: https://github.com/PartyD1/scorely-ai/network/members
[stars-shield]: https://img.shields.io/github/stars/PartyD1/scorely-ai.svg?style=for-the-badge
[stars-url]: https://github.com/PartyD1/scorely-ai/stargazers
[issues-shield]: https://img.shields.io/github/issues/PartyD1/scorely-ai.svg?style=for-the-badge
[issues-url]: https://github.com/PartyD1/scorely-ai/issues

[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555
[linkedin-url]: https://www.linkedin.com/in/parthmdoshi/
[github-shield]: https://img.shields.io/badge/-GitHub-black.svg?style=for-the-badge&logo=github&colorB=555
[github-url]: https://github.com/PartyD1
