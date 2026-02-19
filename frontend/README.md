# AI Rubric Evaluator — Frontend

Next.js 14+ frontend for the AI Rubric Evaluator. Provides a two-level event selector, PDF upload flow, async polling, and a section-by-section results display.

---

## Pages

| Route | Description |
|---|---|
| `/` | Landing page with project overview and call to action |
| `/upload` | Event selector + PDF upload form |
| `/results/[jobId]` | Polls the backend for job status and displays grading results |

## Components

| Component | Description |
|---|---|
| `UploadForm` | Two-level dropdown (cluster → event) populated from `/api/events`, file input with client-side size validation |
| `ScoreBreakdown` | Renders per-section scores as color-coded progress bars with expandable feedback |
| `LoadingSpinner` | Displayed while polling for a pending or processing job |

## Key Files

```
frontend/
├── app/
│   ├── layout.tsx                    # Root layout, global font + metadata
│   ├── page.tsx                      # Landing page
│   ├── upload/
│   │   └── page.tsx                  # Upload page
│   └── results/
│       └── [jobId]/
│           └── page.tsx              # Dynamic results page with polling
├── components/
│   ├── UploadForm.tsx
│   ├── ScoreBreakdown.tsx
│   └── LoadingSpinner.tsx
├── lib/
│   └── api.ts                        # All backend API calls (upload, status, events)
├── types/
│   └── grading.ts                    # TypeScript types matching backend Pydantic schemas
└── styles/
    └── globals.css
```

---

## Environment Variables

Create a `.env.local` file in this directory:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Development

**Install dependencies**
```
npm install
```

**Start the dev server**
```
npm run dev
```

Runs on [http://localhost:3001](http://localhost:3001) by default.

**Build for production**
```
npm run build
npm start
```

---

## Tech

- **Framework:** Next.js 14+ with App Router
- **Language:** TypeScript (strict mode)
- **Styling:** TailwindCSS
- **API:** Fetch-based client in `lib/api.ts` — all calls go through `NEXT_PUBLIC_API_URL`
- **Polling:** Results page polls `/api/status/{jobId}` every 2 seconds, times out after 60 seconds
