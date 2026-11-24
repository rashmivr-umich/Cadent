# Cadent: system design

Cadent is a sales assistant for compliance consultants who serve small government contractors.
It finds contractors in public SAM.gov records, spots a dated reason to reach out (for example,
a registration that expires in 8 days), drafts a helpful email that cites the source, and
sends nothing until the consultant approves it.

## Architecture

```
            OFFLINE (run once, within SAM.gov's 10 calls/day limit)
 ┌─────────────────────────────────────────────────────────────────────┐
 │ SAM.gov Entity API v4 ──▶ raw JSON cache ──▶ clean + rules ──▶ Moss  │
 │  (1 call, 10 records)     data/sam_cache/    (ToS filters)   "leads" │
 └─────────────────────────────────────────────────────────────────────┘
                                                                   │
            ONLINE (Next.js on Vercel; all keys server-side)       ▼
 ┌──────────────┐   /api/...   ┌──────────────────────────────────────────┐
 │  Browser UI  │ ───────────▶ │ Next.js API routes                       │
 │ intake, ICP, │              │  /api/icp           ─▶ Gemini Flash       │
 │ leads, queue,│ ◀─────────── │  /api/leads         ─▶ Moss search + score│
 │ board        │    JSON      │  /api/leads/:id/enrich ─▶ Tavily, Hunter  │
 └──────┬───────┘              │  /api/leads/:id/draft  ─▶ Gemini Flash    │
        │ localStorage         │  /api/leads/:id/approve ─▶ sendDemoEmail  │
        ▼ (board, approvals)   └───────────────────────────┬──────────────┘
                                                           ▼
                                          Resend ─▶ DEMO_RECIPIENT only
```

## Components

| Component | Role | Why this choice |
|---|---|---|
| **SAM.gov Entity API v4** | Source of truth for contractors: registration and expiry dates, NAICS codes, location, contact name/title | Official, public, and allowed by SAM.gov's terms |
| **Raw cache** (`data/sam_cache/`) | Every API response saved unchanged | The free key allows 10 calls/day; we replay from cache |
| **Cleaner** (`scripts/clean-leads.mjs`) | Applies the data rules, keeps only the fields the UI needs, adds "why now" signals | One place where the compliance rules live |
| **Moss** (`leads` index) | Semantic search over leads, with metadata filters (state, expiry date) | Natural-language search ("IT firms in Northern Virginia"), and it's the data store for the deployed app, so real data never sits in Git |
| **Gemini Flash** (`@google/genai`) | Turns a plain-language service description into a structured ICP with a confidence per field, explains scores, drafts outreach | Fast, free tier, JSON output |
| **Tavily + Hunter** | Company website (when SAM.gov has none), then a work email and its verification status | Contact data SAM.gov doesn't provide |
| **Demo sender** (`lib/demo-email.mjs`) + **Resend** | Sends approved emails | Built so it physically can't reach a real company (see Safety) |
| **Board state** | Stages, who moved each card (AI or person), timestamps | Kept in the browser for the demo; no database needed |

## Request flow (one lead, start to finish)

1. **Intake → ICP:** the consultant describes their service. Gemini returns NAICS codes, size,
   state, decision-maker titles and trigger events, each with a 0–1 confidence. The consultant
   can edit any of them.
2. **Discovery:** `/api/leads` queries Moss with the ICP, filtered by state and expiry window.
3. **Signals + score:** days to expiry is recalculated on every request. The fit score (0–100,
   tier A/B/C) weighs urgency, NAICS match and small-business status.
4. **Enrichment** (on click only, to save credits): Tavily finds the website if needed, then
   Hunter finds and verifies an email. The email is displayed, never sent to.
5. **Draft:** Gemini writes a short email that names the real date and cites
   "SAM.gov, UEI …". It offers help, never account access, and lists what it's unsure about.
6. **Human approval:** Approve, Edit or Reject. Nothing sends without Approve.
7. **Send + track:** the approved email goes to the demo inbox, and the card moves to "Contacted",
   with who moved it and when.

## Compliance and safety

- **SAM.gov terms:** official API only, no scraping. Records last updated before 2022-04-04 are
  dropped, as are any sourced from Dun & Bradstreet (`evsSource`). Records must be public and not
  excluded from federal work. Read only. Footer: "Data from SAM.gov public API."
- **No bulk export, no personal data in Git:** raw and cleaned SAM.gov data are git-ignored.
  The deployed app reads leads from Moss.
- **Keys:** only in `.env` locally or Vercel environment variables, only read by server routes.
- **Email can't reach a real company.** There are five independent locks:
  1. `sendDemoEmail()` has no recipient parameter, and passing to/cc/bcc throws.
  2. The recipient comes only from `DEMO_RECIPIENT`.
  3. A missing or malformed `DEMO_RECIPIENT` means nothing sends.
  4. The final payload is asserted to equal exactly `[DEMO_RECIPIENT]`.
  5. Resend's unverified-sender mode only delivers to the account owner's inbox.

  7 automated tests (`npm test`) cover these, including six attempts to email a company address.

## Limits and next steps

- 10 SAM.gov calls/day → ~100 new records/day. Production would use SAM.gov's bulk extract files.
- SAM.gov's public website doesn't expose a stable per-entity link, so citations show the UEI.
- Board state is per browser; production would add a database and multi-user auth.
- Second trigger already captured but not used yet: SBA certification end dates.
