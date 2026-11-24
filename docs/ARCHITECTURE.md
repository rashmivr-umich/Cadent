# Cadent: system design

Cadent is a sales assistant for compliance consultants who serve small government contractors.
It finds contractors in public SAM.gov records, spots a dated reason to reach out (for example,
a registration that expires in 8 days), drafts a helpful email that cites the source, and
sends nothing until the consultant approves it.

## Architecture

```
            OFFLINE (run once, within SAM.gov's 10 calls/day limit)
 ┌─────────────────────────────────────────────────────────────────────┐
 │ SAM.gov Entity API ──▶ raw JSON cache ──▶ clean + rules ──▶ Moss     │
 │  (1 call, 10 records)   data/sam_cache/   (SAM.gov terms)   "leads"  │
 └─────────────────────────────────────────────────────────────────────┘
                                                                   │
            ONLINE (Next.js on Vercel)                             ▼
 ┌──────────────┐   /api/...   ┌──────────────────────────────────────────┐
 │  Browser UI  │ ───────────▶ │ Next.js API routes                       │
 │ intake,      │              │  /api/icp           ─▶ Gemini Flash       │
 │ profile,     │ ◀─────────── │  /api/leads         ─▶ Moss search + score│
 │ leads, queue,│    JSON      │  /api/leads/:id/enrich ─▶ Tavily, Hunter  │
 │ board        │              │  /api/leads/:id/draft  ─▶ Gemini Flash    │
 └──────┬───────┘              │  /api/leads/:id/approve ─▶ sendDemoEmail  │
        │ localStorage         └───────────────────────────┬──────────────┘
        ▼ (board, approvals)                               ▼
                                          Resend ─▶ demo inbox only
```

## Components

| Component | Role | Why this choice |
|---|---|---|
| **SAM.gov Entity API** | The government's registry of federal contractors: registration and expiry dates, industry codes, location, contact name and title | Official, public, and allowed by SAM.gov's terms |
| **Raw cache** (`data/sam_cache/`) | Every API response saved unchanged | The free key allows 10 calls/day, so we replay from the cache |
| **Cleaner** (`scripts/clean-leads.mjs`) | Applies the data rules, keeps only the fields the UI needs, adds "why now" signals | One place where the compliance rules live |
| **Moss** (`leads` index) | Searches leads by meaning, not just keywords, and filters by state and expiry date | The consultant can search in plain words ("IT firms in Northern Virginia"). It also stores the leads for the deployed app, so real data never sits in Git |
| **Gemini Flash** | Turns the consultant's plain-language description of their service into an ideal customer profile, explains scores, drafts emails | Fast, has a free tier, returns structured data |
| **Tavily + Hunter** | Tavily finds the company website when SAM.gov has none. Hunter finds a work email and checks that it's real | SAM.gov doesn't include email addresses |
| **Demo sender** (`lib/demo-email.mjs`) + **Resend** | Sends approved emails | Built so it can't reach a real company (see Safety) |
| **Board state** | Pipeline stage, who moved each card (AI or person), and when | Kept in the browser for the demo |

## How one lead flows through Cadent

1. **Describe → profile:** the consultant describes their service in a sentence. Gemini turns it
   into an ideal customer profile: target industries (as government industry codes, called NAICS),
   company size, state, decision-maker titles and trigger events. Each part gets
   a confidence score from 0 to 1, and the consultant can edit any of them.
2. **Find:** Moss searches the leads that match the profile, filtered by state and by how soon the
   registration expires.
3. **Why now + score:** days until expiry is recalculated on every request. Each lead gets a fit
   score from 0 to 100 and a tier (A/B/C), based on urgency, industry match and whether it's a
   small business.
4. **Find a contact** (only on click, to save credits): Tavily finds the website if needed, then
   Hunter finds and checks a work email. That email is shown on screen, never sent to.
5. **Draft:** Gemini writes a short email that names the real date and cites the SAM.gov record
   (by its company ID, called a UEI). It offers help, never account access, and lists anything
   it's unsure about.
6. **Approve:** the consultant clicks Approve, Edit or Reject. Nothing sends without Approve.
7. **Send + track:** the approved email goes to the demo inbox, and the lead moves to "Contacted",
   recording who moved it and when.

## Compliance and safety

- **SAM.gov terms:** official API only, no scraping. We drop records last updated before
  2022-04-04 and any sourced from Dun & Bradstreet, whose data can't be used for marketing.
  We only use records marked public and not excluded from federal work.
- **No bulk export, no personal data in Git:** raw and cleaned SAM.gov data are kept out of Git.
  The deployed app reads leads from Moss.
- **Emails can't reach a real company.** Five independent locks:
  1. The send function has no recipient input, and trying to add one is refused.
  2. The recipient is always the demo inbox set in the app's settings.
  3. If that setting is missing or invalid, nothing sends.
  4. Right before sending, the code checks that the only recipient is the demo inbox.
  5. Resend's free mode can only deliver to the account owner's own inbox.

  7 automated tests (`npm test`) cover these, including six attempts to email a company address.

## Limits and next steps

- 10 SAM.gov calls/day means about 100 new records/day. Production would use SAM.gov's bulk data files.
- SAM.gov's public website has no stable link per company, so citations show the company ID instead.
- Board state is per browser. Production would add a database and user accounts.
- A second "why now" signal is already captured but not used yet: when a small-business
  certification from the SBA (Small Business Administration) ends.
