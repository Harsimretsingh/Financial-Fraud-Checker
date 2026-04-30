# Fraud Agent — Financial Intelligence Fraud Triage Dashboard

A real-time fraud triage system powered by configurable LLMs (OpenAI-compatible API) and Specter enrichment, featuring a live SSE stream, confidence-gated routing, and contextual user interrogation.

Use any provider that exposes OpenAI-style `/v1/chat/completions` — OpenAI, OpenRouter, Azure OpenAI, or a local server (for example LM Studio). Cursor IDE agents orchestrate work in the editor; this app calls LLMs over HTTP from the Node backend, so you wire it with API keys and base URLs like any other integration.

## Setup

1. **Install dependencies**
   ```bash
   cd fraud-agent
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` and add your keys:
   - `LLM_API_KEY` — your OpenAI-compatible API key (or `OPENAI_API_KEY`; both work)
   - Optional: `LLM_BASE_URL` if not using the default OpenAI endpoint (for example OpenRouter: `https://openrouter.ai/api/v1`)
   - Optional: `LLM_MODEL_FAST` (classification, questions, parsing) and `LLM_MODEL_REASONING` (fraud assessment, final verdict); defaults are `gpt-4o-mini` and `gpt-4o`
   - `SPECTER_API_KEY` — from [app.tryspecter.com](https://app.tryspecter.com)
   - Optional **Full API** (escalated track): `SPECTER_API_BASE_URL` (default `https://api.tryspecter.com`) and `SPECTER_COMPANY_SEARCH_ID` — a [company saved search](https://api.tryspecter.com/api-ref/company-searches/get-company-saved-search-results) ID shared with the API for cohort matching
   - Optional rescoring thresholds: `ESCALATED_APPROVE_MAX_RISK`, `ESCALATED_BLOCK_MIN_RISK`, `ESCALATED_BASE_RISK` (see `.env.example`)

3. **Run the dev servers**
   ```bash
   npm run dev
   ```
   - Backend: http://localhost:3001
   - Frontend: http://localhost:5173

**Sample data on the dashboard:** the UI loads **`GET /sample-payments`** and shows the bundled `backend/data/sample.csv` in a table. Use **Run screening on samples** ( **`POST /demo/sample`** ) to push those rows through the same pipeline as **Upload CSV**.

## How to Demo

1. Open http://localhost:5173 in your browser
2. Use **Run screening on samples** on the dashboard, or click **Import CSV** and select `backend/data/sample.csv`
3. Watch the **Live Stream** panel — transactions process in real time with a 600ms delay
4. Legitimate transactions (AWS, Slack, GitHub…) auto-clear immediately (green)
5. Ambiguous transactions land in the **Review Queue** with an agent-generated question
6. Click a queued item → the **Detail** panel shows the question
7. Type a context reply (e.g. "team lunch" or "contractor payment") and press Enter
8. Watch the verdict appear — routed to auto-approve, auto-block, or human review

## Escalated track — high-risk payment screener agent

When first-pass classifier confidence is **below 50%**, the **escalated-track agent** runs (no cardholder question first):

1. **Counterparty routing** — `person` vs `business` from `counterparty_type`, payer email fields (`payer_email`, `customer_email`, `email`, …), `specter_person_id`, or merchant heuristics (`counterpartyKind.js`).
2. **Specter deep enrichment**
   - **Person:** `POST /people/by-email` then `GET /people/{personId}` for full profile when email resolves; or `GET /people/{personId}` only when `specter_person_id` is set on the transaction.
   - **Business:** `GET /searches/companies/{searchId}/results` when `SPECTER_COMPANY_SEARCH_ID` is configured, plus `GET /companies/search?query=` and legacy entity **text-search** (`specter.js`) for footprint.
3. **Deterministic rescore** — combines first-pass confidence, match quality, and Specter signals into a **risk_score** 0–100 (higher = riskier).
4. **Routing** — `risk_score ≤ ESCALATED_APPROVE_MAX_RISK` → **auto_approve**; `≥ ESCALATED_BLOCK_MIN_RISK` → **auto_block**; **only the mid band** → **human_review** (human-in-the-loop).

CSV columns you can add for testing: `payer_email`, `specter_person_id`, `counterparty_type` (`person` | `business`).

## The 3-Tier Confidence Gate

| Confidence | Action |
|---|---|
| ≥ 85 | **Auto-cleared** — merchant is well-understood, low risk |
| < 85 | **Ask context** — agent generates a friendly question for the transaction owner |
| Post-context | **Final verdict** — Specter enrichment + user reply cross-referenced by the reasoning model (`LLM_MODEL_REASONING`) |

### Final verdict routes:
- **auto_approve** — user explanation matches Specter data; benign
- **auto_block** — high fraud signals; no plausible explanation
- **human_review** — ambiguous; needs analyst eyes

## Architecture

```
CSV Upload → POST /process
                ↓
         pipeline.js (processBatch)
                ↓
    ┌─── classify.js (fast model) ─────────────────┐
    │         confidence ≥ 85 → cleared             │
    │         confidence < 85 → askContext (fast)   │
    └───────────────────────────────────────────────┘
                ↓ (SSE push to frontend)
         User types reply → POST /context
                ↓
    ┌─── parseContext (fast) ──┐
    │    enrichMerchant        │  ← parallel
    └─── specter.js ───────────┘
                ↓
    verdictWithContext.js (reasoning model)
                ↓
         SSE push → frontend verdict panel
```

## Stripe Webhook Collection

Use Stripe as a real-time transaction source (no sandbox simulator UI):

1. Add to `.env`:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
2. Start webhook forwarding:
   - `stripe listen --forward-to localhost:3001/stripe/webhook`
3. Create test payments in Stripe; on `payment_intent.succeeded`, the backend ingests and scores them through the same pipeline.
