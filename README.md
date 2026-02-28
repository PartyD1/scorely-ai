<!-- Back to top link -->
<a id="readme-top"></a>

<!-- PROJECT SHIELDS -->
[![Contributors][contributors-shield]][contributors-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]

<br />
<div align="center">

<h1 align="center">ScorelyAI</h1>

  <p align="center">
    Upload your DECA written report. Get judge-level feedback in seconds.
    <br />
    <br />
    <a href="https://scorelyai.app/">View Live Demo</a>
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
    <li><a href="#built-with">Built With</a></li>
    <li><a href="#how-it-works">How It Works</a></li>
    <li><a href="#api-reference">API Reference</a></li>
    <li><a href="#project-structure">Project Structure</a></li>
    <li><a href="#running-locally">Running Locally</a></li>
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

ScorelyAI grades competitive DECA written reports using AI. Upload a PDF, pick your event, and get a section-by-section score breakdown with feedback based on the official rubric for that event.

It covers **16 events across 3 clusters**, uses **GPT-4o-mini** for text grading, and runs a **vision check** on key PDF pages to catch things plain text extraction misses (Statement of Assurances signatures, visual presentation).

Grading is async. Upload returns a job ID right away; the frontend polls for results and shows them when they're ready.

**Live:** [https://scorelyai.app](https://scorelyai.app)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

<!-- FEATURES -->
## Features

- **Event-aware grading:** two-level cluster/event hierarchy with tailored prompts per event
- **Vision check:** key PDF pages are rendered and sent to GPT-4o-mini vision for SOA signature detection and visual presentation scoring
- **Required outline enforcement:** official DECA document structure is injected into the prompt so missing sections get penalized
- **Structured output:** schema-validated JSON grading results via OpenAI structured outputs
- **Section-level feedback:** scores and comments for every rubric section, with color-coded progress bars (green >=80%, yellow 60-80%, red <60%)
- **Penalty flagging:** explicit flags for SOA compliance and required outline adherence
- **Token safety:** documents over 25,000 tokens get truncated with a visible warning to the user
- **Auto file cleanup:** uploaded PDFs are deleted as soon as grading finishes
- **Rubric management CLI:** add or update event rubrics without touching any code

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

<!-- SUPPORTED EVENTS -->
## Supported Events

### Business Operations Research
Business Services · Buying & Merchandising · Finance · Hospitality & Tourism · Sports & Entertainment

### Entrepreneurship
Business Growth · Franchise Business · Independent Business · International Business

### Project Management
Business Solutions · Career Development · Community Awareness · Community Giving · Financial Literacy · Sales

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

<!-- TECH STACK -->
## Built With

[![Next.js][Next.js-badge]][Next-url]
[![TypeScript][TypeScript-badge]][TypeScript-url]
[![TailwindCSS][Tailwind-badge]][Tailwind-url]
[![FastAPI][FastAPI-badge]][FastAPI-url]
[![Python][Python-badge]][Python-url]
[![PostgreSQL][PostgreSQL-badge]][PostgreSQL-url]
[![OpenAI][OpenAI-badge]][OpenAI-url]
[![Vercel][Vercel-badge]][Vercel-url]
[![Heroku][Heroku-badge]][Heroku-url]

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

<!-- HOW IT WORKS -->
## How It Works

```
Upload PDF  ->  Extract Text  ->  Resolve Rubric + Outline  ->  LLM Text Grading  ->  Vision Check  ->  Score + Feedback
```

1. User uploads a PDF and selects the event from a two-level dropdown
2. Backend validates the file (<= 25 pages, <= 15MB, PDF only) and queues a grading job
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
└── Procfile                          # Heroku process configuration
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

<!-- INSTALLATION -->
## Running Locally

**Prerequisites:** Python 3.10+, Node.js 18+, PostgreSQL 16, OpenAI API key

```
git clone https://github.com/PartyD1/scorely-ai.git
cd scorely-ai
```

**Backend**
```
cd backend && python -m venv venv && source venv/bin/activate
```
```
pip install -r requirements.txt
```
```
cp .env.example .env   # fill in DATABASE_URL and OPENAI_API_KEY
```
```
createdb rubric_db && alembic upgrade head
```
```
uvicorn app.main:app --reload --port 8000
```

**Frontend** (separate terminal)
```
cd frontend && npm install
```
```
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL=http://localhost:8000
```
```
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Rubrics auto-seed on first startup.

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

Private repository, not licensed for external use.

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

Special thanks to the following people who shared their DECA written reports for testing:

- Devansh Daxini
- Kaviya Muthukumaravel
- Maskeen Singh Saini
- Pranav Sathianathan
- Rishi Ranga

And to Mr. Wu, my former advisor, for the foundation that made this project possible.

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

[Next.js-badge]: https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white
[Next-url]: https://nextjs.org/
[TypeScript-badge]: https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white
[TypeScript-url]: https://www.typescriptlang.org/
[Tailwind-badge]: https://img.shields.io/badge/TailwindCSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white
[Tailwind-url]: https://tailwindcss.com/
[FastAPI-badge]: https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white
[FastAPI-url]: https://fastapi.tiangolo.com/
[Python-badge]: https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white
[Python-url]: https://www.python.org/
[PostgreSQL-badge]: https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white
[PostgreSQL-url]: https://www.postgresql.org/
[OpenAI-badge]: https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white
[OpenAI-url]: https://platform.openai.com/
[Vercel-badge]: https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white
[Vercel-url]: https://vercel.com/
[Heroku-badge]: https://img.shields.io/badge/Heroku-430098?style=for-the-badge&logo=heroku&logoColor=white
[Heroku-url]: https://www.heroku.com/
