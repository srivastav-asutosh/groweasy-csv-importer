# GrowEasy AI CSV Importer

An AI-powered CSV importer that maps **any** CSV export — Facebook Lead Ads, Google Ads, Excel sheets, real-estate CRM exports, sales reports, manually created spreadsheets — into GrowEasy's standardized CRM lead schema, without assuming fixed column names.

Built for the GrowEasy Software Developer (Intern / Full-Time) take-home assignment.

- **Live app:** _add your hosted frontend URL here_
- **Live API:** _add your hosted backend URL here_
- **Repository:** _add your GitHub URL here_

---

## How it works

1. **Upload** — drag & drop or pick any `.csv` file.
2. **Preview** — the file is parsed entirely client-side and shown in a virtualized, sticky-header, horizontally/vertically scrollable table. No AI call happens yet.
3. **Confirm** — only once the user explicitly confirms does the file get uploaded to the backend.
4. **AI Extraction** — the backend batches the raw rows and sends them to an LLM (OpenAI, Gemini, or Claude — pluggable) with a carefully engineered prompt that maps arbitrary columns onto the 15 fixed GrowEasy CRM fields, enforces the allowed `crm_status`/`data_source` enums, consolidates extra emails/phones into notes, and flags rows that have neither an email nor a phone number.
5. **Results** — the backend streams progress back to the browser as NDJSON while it works (live progress bar), then returns the final imported/skipped breakdown in a second results table.

---

## Tech stack

| Layer     | Choice                                                                  |
| --------- | ------------------------------------------------------------------------ |
| Frontend  | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, `next-themes` (dark mode), `react-dropzone`, `papaparse`, `@tanstack/react-virtual` |
| Backend   | Node.js, Express, TypeScript                                            |
| AI        | Pluggable provider: OpenAI, Google Gemini, or Anthropic Claude          |
| Testing   | Vitest (both apps), Supertest, Testing Library                          |
| Container | Docker + docker-compose                                                 |

No database is used — the service is stateless by design (each import is a single request/response cycle), per the assignment's "optional database" note.

---

## Monorepo layout

```
GrowEasy/
├── backend/                     Express + TypeScript API
│   ├── src/
│   │   ├── app.ts, server.ts    Express app wiring & entrypoint
│   │   ├── routes/              /api/import (NDJSON stream), /api/health
│   │   ├── middleware/          multer upload guard, centralized error handler
│   │   ├── services/
│   │   │   ├── csv/             CSV -> row objects
│   │   │   ├── llm/             provider-agnostic prompt + 4 provider implementations
│   │   │   └── extraction/      batching, sanitization/validation, skip-rule enforcement
│   │   ├── utils/                retry-with-backoff, bounded concurrency pool
│   │   └── types/crm.ts          CRM field contract shared across the backend
│   └── tests/                    Vitest + Supertest suite
├── frontend/                     Next.js app
│   └── src/
│       ├── app/                  routes, layout, global styles
│       ├── components/           ImportWizard + each wizard step, DataTable, theme toggle
│       └── lib/                  CSV parsing, streaming API client, shared types
├── docker-compose.yml
└── README.md
```

---

## Getting started (local development)

Requires Node.js 20+.

### 1. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev        # http://localhost:4000
```

By default `.env.example` sets `LLM_PROVIDER=openai`. For local development **without** any API key, set `LLM_PROVIDER=mock` — a deterministic, keyword/regex-based extractor stands in for a real LLM so the entire pipeline (batching, streaming, validation, skip rules) is exercisable offline. Swap in `openai`, `gemini`, or `anthropic` plus the matching `*_API_KEY` to use a real model.

### 2. Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev         # http://localhost:3000
```

Make sure `NEXT_PUBLIC_API_BASE_URL` in `.env.local` points at your backend (defaults to `http://localhost:4000`).

### 3. Docker Compose (both services)

```bash
LLM_PROVIDER=openai OPENAI_API_KEY=sk-... docker compose up --build
```

Frontend: `http://localhost:3000` · Backend: `http://localhost:4000`.

---

## Environment variables

**backend/.env**

| Variable              | Description                                              | Default     |
| ---------------------- | --------------------------------------------------------- | ----------- |
| `PORT`                 | API port                                                   | `4000`      |
| `CORS_ORIGIN`          | Allowed frontend origin                                    | `http://localhost:3000` |
| `LLM_PROVIDER`         | `openai` \| `gemini` \| `anthropic` \| `mock`               | `mock`      |
| `LLM_MODEL`            | Model name for the chosen provider                          | provider default |
| `OPENAI_API_KEY` / `GEMINI_API_KEY` / `ANTHROPIC_API_KEY` | Key for whichever provider is selected | — |
| `BATCH_SIZE`           | Rows sent to the LLM per request                            | `20`        |
| `BATCH_CONCURRENCY`    | Batches processed in parallel                               | `3`         |
| `MAX_RETRIES`          | Retries per failed batch (exponential backoff)              | `3`         |
| `MAX_UPLOAD_SIZE_MB`   | Max accepted CSV size                                       | `15`        |

**frontend/.env.local**

| Variable                     | Description                  | Default                 |
| ----------------------------- | ------------------------------ | ------------------------ |
| `NEXT_PUBLIC_API_BASE_URL`    | Base URL of the backend API    | `http://localhost:4000` |

---

## API

### `GET /api/health`

Returns `{ status: "ok", llmProvider: "..." }`.

### `POST /api/import`

`multipart/form-data` with a single field `file` (the CSV). Do **not** assume column names — any header set is accepted.

The response is streamed as **NDJSON** (`application/x-ndjson`, one JSON object per line) so the client can render live progress instead of waiting on one long request:

```
{"type":"start","totalRows":120,"totalBatches":6}
{"type":"progress","batchesCompleted":1,"totalBatches":6,"rowsProcessed":20,"totalRows":120}
{"type":"progress","batchesCompleted":2,"totalBatches":6,"rowsProcessed":40,"totalRows":120}
...
{"type":"result","result":{"totalRows":120,"imported":113,"skipped":7,"records":[...],"skippedRecords":[...]}}
```

Each `records[]` entry is a `CrmRecord` with the 15 fields from the assignment (`created_at`, `name`, `email`, `country_code`, `mobile_without_country_code`, `company`, `city`, `state`, `country`, `lead_owner`, `crm_status`, `crm_note`, `data_source`, `possession_time`, `description`). Each `skippedRecords[]` entry carries the original raw row plus a human-readable `reason`.

If a batch's LLM call fails after all retries, only that batch's rows are marked skipped (with the failure reason) — one bad batch never fails the whole import.

---

## Prompt engineering approach

The extraction prompt (`backend/src/services/llm/prompt.ts`) mirrors the assignment's "AI Instructions" section directly, so behavior is traceable to spec:

- **Field-by-field extraction guidance** for all 15 CRM fields, including how to infer `country_code` from a bare 10-digit number, or `country` from a recognizable city/state.
- **Hard constraints** spelled out explicitly: `crm_status` and `data_source` may only take one of the assignment's fixed enum values; everything else is dropped by the backend even if the model tries to invent a value.
- **Multi-contact consolidation**: first email/phone wins the structured field, the rest are folded into `crm_note`.
- **Skip rule**: the model is asked to flag rows lacking both email and phone — and the backend *independently re-verifies this against the raw row* regardless of what the model claims, so a hallucinated `skip: false` can never leak a contact-less row into the CRM.
- **CSV-safety**: the model is told to escape embedded newlines; the backend also strips/escapes any that slip through.

**Structured output, per provider** (`backend/src/services/llm/providers/`):

- **OpenAI** — `response_format: { type: "json_object" }` with the schema described in the system prompt.
- **Gemini** — `responseMimeType: "application/json"` via `generationConfig`.
- **Claude** — Claude has no native JSON mode, so extraction is forced through **tool use**: the model must call a `submit_crm_records` tool whose `input_schema` matches the CRM shape exactly, which is the reliable way to get structured output from Claude.
- A shared, fence-tolerant JSON parser (`jsonExtract.ts`) is a defensive fallback for any provider that still wraps its answer in prose or markdown despite instructions.

**Validation is never trusted to the model alone** (`services/extraction/sanitize.ts`): every record is re-validated after the LLM call — invalid `crm_status`/`data_source` values are coerced to `null`/`""` rather than rejecting the whole record, `created_at` is checked against `new Date()` parseability, and the skip rule is re-applied against the raw CSV row.

---

## Reliability & performance

- **Batching** keeps prompts small and cost-efficient (`BATCH_SIZE`, default 20 rows/request).
- **Bounded concurrency** (`utils/concurrencyPool.ts`) processes multiple batches in parallel (default 3) instead of serially awaiting each one.
- **Retry with exponential backoff** (`utils/retry.ts`) re-attempts a failed batch call before giving up on it.
- **Partial failure isolation** — a batch that exhausts its retries is marked skipped with a reason; the rest of the import still completes.
- **Streaming NDJSON response** means the frontend shows real progress instead of a spinner blocking on the entire import.
- **Virtualized tables** (`@tanstack/react-virtual`) keep both the CSV preview and the results table smooth even with thousands of rows, since only the rows in view are ever mounted.

---

## Testing

```bash
cd backend && npm test     # Vitest + Supertest: sanitization rules, batching/skip/retry logic, streamed /api/import route
cd frontend && npm test    # Vitest + Testing Library: CSV parsing, table rendering, utils
```

Backend tests run against `LLM_PROVIDER=mock`, so the whole pipeline — parsing, batching, validation, the skip rule, retry-on-failure — is verified without any network call or API key.

---

## Deployment

- **Frontend** → [Vercel](https://vercel.com/new): import the repo, set the project root to `frontend`, add `NEXT_PUBLIC_API_BASE_URL` pointing at your deployed backend.
- **Backend** → [Render](https://render.com) / [Railway](https://railway.app): set the project root to `backend`, build command `npm run build`, start command `npm start`, and add the `LLM_PROVIDER` + matching API key env vars.
- Or run both anywhere via `docker-compose up --build` (see above).

---

## Bonus features implemented

- Drag & drop upload (`react-dropzone`)
- Live progress indicator during AI processing (streamed NDJSON, not just a spinner)
- Streaming/incremental backend response (no waiting on one giant request)
- Retry mechanism for failed AI batches (exponential backoff, isolated per batch)
- Virtualized tables for both the CSV preview and the results view
- Dark mode (system-aware, toggleable)
- Unit & integration tests on both frontend and backend
- Docker + docker-compose for one-command local deployment
- This README

---

## Submitting

Per the assignment, email **varun@groweasy.ai** with:

- Hosted application URL
- GitHub repository URL
- Position applied for (Intern / Full-Time)
