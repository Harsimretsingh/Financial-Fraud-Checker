# Fraud Agent — Financial Intelligence Fraud Triage Dashboard

A real-time fraud triage system powered by Claude AI and Specter enrichment, featuring a live SSE stream, confidence-gated routing, and contextual user interrogation.

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
   - `ANTHROPIC_API_KEY` — from [console.anthropic.com](https://console.anthropic.com)
   - `SPECTER_API_KEY` — from [app.tryspecter.com](https://app.tryspecter.com)

3. **Run the dev servers**
   ```bash
   npm run dev
   ```
   - Backend: http://localhost:3001
   - Frontend: http://localhost:5173

## How to Demo

1. Open http://localhost:5173 in your browser
2. Click **Upload CSV** and select `backend/data/sample.csv`
3. Watch the **Live Stream** panel — transactions process in real time with a 600ms delay
4. Legitimate transactions (AWS, Slack, GitHub…) auto-clear immediately (green)
5. Ambiguous transactions land in the **Review Queue** with an agent-generated question
6. Click a queued item → the **Detail** panel shows the question
7. Type a context reply (e.g. "team lunch" or "contractor payment") and press Enter
8. Watch the verdict appear — routed to auto-approve, auto-block, or human review

## The 3-Tier Confidence Gate

| Confidence | Action |
|---|---|
| ≥ 85 | **Auto-cleared** — merchant is well-understood, low risk |
| < 85 | **Ask context** — agent generates a friendly question for the transaction owner |
| Post-context | **Final verdict** — Specter enrichment + user reply cross-referenced by Claude Sonnet |

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
    ┌─── classify.js (Haiku) ──────────────────────┐
    │         confidence ≥ 85 → cleared             │
    │         confidence < 85 → askContext (Haiku)  │
    └───────────────────────────────────────────────┘
                ↓ (SSE push to frontend)
         User types reply → POST /context
                ↓
    ┌─── parseContext (Haiku) ─┐
    │    enrichMerchant        │  ← parallel
    └─── specter.js ───────────┘
                ↓
    verdictWithContext.js (Sonnet)
                ↓
         SSE push → frontend verdict panel
```
