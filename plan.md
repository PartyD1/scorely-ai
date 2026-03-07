
# Scorely AI — Issue Assessment & Action Plan

---

## Verdict Summary

| Issue | Needed? | Priority | Effort |
|---|---|---|---|
| Proxy routes crash on non-JSON upstream errors | Yes — real bug | High | XS |
| "Deterministic" copy is false | Yes — misleading | High | XS |
| Penalty shows 5 pts on "clear" status | Yes — confusing data | High | XS |
| Type drift: frontend JobStatus has job_id, backend doesn't return it | Yes — latent bug | Medium | S |
| Stuck job recovery on startup | Yes — real reliability gap | Medium | S |
| /api/status/{job_id} ownership check | No — UUIDs make brute-force impossible | Skip | — |
| Rate limiting X-Forwarded-For | No — already done correctly | Skip | — |
| Full job queue (Celery/Redis) | No — over-engineering for current scale | Defer | XL |
| Feedback mailto pipeline | No — fine until you have volume | Defer | M |
| Test suite | Yes long-term, not urgent | Defer | XL |
| Admin improvements | No — fine for single operator | Defer | M |
| Signed share tokens | No — overkill for UUID job IDs | Skip | — |

---

## Do Now — Quick Wins (Real Bugs)

### 1. Fix proxy routes crashing on non-JSON upstream errors
**Files:** `frontend/app/api/proxy/upload/route.ts`, `frontend/app/api/proxy/history/route.ts`

Both do `await res.json()` unconditionally. If the backend returns a 502, timeout, or HTML error page, this throws a JSON parse error that surfaces as a cryptic 500 to the user.

**Fix:** Check `res.ok` and `Content-Type` before parsing. Fall back to a plain text error if non-JSON.

```ts
// upload/route.ts
const contentType = res.headers.get("content-type") ?? "";
const data = contentType.includes("application/json")
  ? await res.json()
  : { detail: await res.text() };
return NextResponse.json(data, { status: res.status });
```

Apply the same pattern to `history/route.ts`.

---

### 2. Fix "deterministic" copy on homepage
**File:** `frontend/app/page.tsx` line 25

The landing page says "deterministic scoring" but the model runs at temperature 0.2 (text) and 0.1 (vision). Outputs vary run-to-run. This is a false product claim.

**Fix:** Change copy to something accurate — e.g., "structured, rubric-anchored scoring" or "consistent section-by-section scoring."

---

### 3. Fix penalty_points=5 on "clear" page count penalty
**File:** `backend/app/services/grading_service.py` lines 273-281

When a report is within the page limit, the backend still returns `penalty_points: 5` with `status: "clear"`. The UI tooltip says "5-pt penalty per extra page" even on passing reports, which confuses users.

**Fix:** Return `penalty_points: 0` when status is `"clear"`.

```python
return {
    "description": "Page count within 20 pages (5-pt penalty per extra page)",
    "penalty_points": 0,   # was 5 — no penalty applies
    "status": "clear",
    ...
}
```

---

## Do Soon — Moderate Effort

### 4. Fix type contract drift: job_id in JobStatus
**Files:** `frontend/types/grading.ts` line 40, `backend/app/schemas.py` line 51

The frontend `JobStatus` interface declares `job_id: string` but `JobResponse` from the backend never returns it. Any code that reads `jobStatus.job_id` gets `undefined` silently.

**Fix (Option A — preferred):** Add `job_id` to the backend `JobResponse` schema so the contract is consistent and the frontend can reference it without having to thread it separately.

```python
class JobResponse(BaseModel):
    job_id: str          # add this
    status: str
    result: Optional[GradingResult] = None
    error: Optional[str] = None
    event_code: Optional[str] = None
```

Then populate it in `get_job_status()`:
```python
return JobResponse(job_id=job.id, status=job.status, result=job.result, ...)
```

**Fix (Option B):** Remove `job_id` from the frontend interface if it's always threaded client-side and the field is never actually read from the response. Audit usage first.

---

### 5. Stuck job recovery on startup
**File:** `backend/app/main.py` lifespan function

If the server restarts while a grading job is in-flight, the job stays `"pending"` or `"processing"` forever with no recovery. BackgroundTasks has no retry or persistence.

This doesn't need Celery. A simple startup sweep is enough:

**Fix:** In the `lifespan` function, after `_seed_rubrics()`, query for any jobs stuck in `"pending"` or `"processing"` and re-enqueue them via `asyncio.create_task` (or mark them `"failed"` with a meaningful error so users see a clear state instead of infinite spinner).

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    _seed_rubrics()
    _recover_stuck_jobs()   # add this
    yield

def _recover_stuck_jobs() -> None:
    """Mark jobs stuck in pending/processing as failed on startup."""
    db = SessionLocal()
    try:
        stuck = db.query(Job).filter(Job.status.in_(["pending", "processing"])).all()
        for job in stuck:
            job.status = "failed"
            job.error = "Server restarted while job was in progress. Please re-submit."
        if stuck:
            db.commit()
            logger.warning("Recovered %d stuck jobs on startup", len(stuck))
    finally:
        db.close()
```

Recovery (re-running the grade) is also viable but riskier — failing fast is safer and users can just re-upload.

---

## Defer — High Investment, Lower Immediate ROI

### Full job queue (Celery + Redis / RQ)
BackgroundTasks is good enough at current scale. Migrate only when:
- You have concurrent grading load that causes timeouts, OR
- You need distributed workers across multiple dynos

### Test suite
The highest long-term leverage item but also the most expensive to bootstrap correctly. When you build this, focus on:
1. Golden-file tests: known PDFs with expected score ranges
2. Schema/contract tests: backend response shapes
3. Prompt regression tests: detect when model output drifts after rubric edits

### Feedback pipeline
The mailto approach is fine until you have real feedback volume. When you do, store submissions in a `feedback` table and build a lightweight admin view.

---

## Won't Do

- **Ownership check on `/api/status/{job_id}`** — UUIDs are 128-bit random. Guessing one is computationally infeasible. Signed tokens add complexity with near-zero security gain here.
- **X-Forwarded-For hardening** — already handled correctly with `.split(",")[0].strip()`.
- **Admin multi-user model** — single-operator admin is fine until you have a team.
