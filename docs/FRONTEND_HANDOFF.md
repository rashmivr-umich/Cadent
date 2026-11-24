# Cadent: build guide for Rashmi

You build the whole app: screens **and** the `/api/...` endpoints behind them.
You don't hand-code anything. Paste Part 1 into Claude Code, and it uses this file to do the work.
Roshni already built: the SAM.gov data, the Moss `leads` index (10 real Virginia leads), and a
tested demo-email sender.

**This file is the source of truth.** Re-read it before each new step. When a decision changes
something here, update this file in the same commit.

---

## Current state (Nov 24, 2026)

Already built on branch `rashmi` (merged into `main`). **Don't re-create or rebuild any of it.**

| Built | Where | What it does |
|---|---|---|
| Next.js app (App Router, TypeScript) | repo root: `app/`, `components/`, `lib/` | Runs with `npm run dev` on **http://localhost:3100** |
| Design system | Coinbase Design System (`@coinbase/cds-web`) | All screens use CDS components and tokens. **No Tailwind.** |
| Shared layout | `components/layout/AppShell.tsx` | Header (wordmark, workspace, teammates) + footer "Data from SAM.gov public API" |
| Intake (4 steps) | `app/intake`, `components/intake/` | About you → Your service (live keyword highlighting) → Past clients (xlsx/csv/paste) → Pricing |
| Segments (profile step) | `app/segments`, `components/segments/` | AI suggests industry codes + targeting; Maria adjusts; saves choices |
| AI helper | `lib/ai.ts` | One function per AI task, Google Gen AI SDK, `GEMINI_MODEL` from `.env` |
| `POST /api/segments` | `app/api/segments/route.ts` | Intake → `SegmentPlan` (AI, or a labeled fallback plan if the AI fails) |
| `GET /api/sam-counts` | `app/api/sam-counts/route.ts` | Counts from local `data/sam_cache/` if present (read only) |
| `GET /api/sample-leads` | `app/api/sample-leads/route.ts` | Sample fallback from `lead.example.json` only (never invented) |
| Front-end API client | `lib/api.ts` | `getSegmentPlan`, `getLeads`, `enrichLead` — screens only call these |
| Shared types | `lib/types.ts` | `IntakeData`, `SegmentPlan`, `TargetingChoices`, `Lead`, … |
| Allowed industry codes | `lib/naics.ts` | The 6 NAICS codes the AI may suggest |
| Shared state | `lib/IntakeContext.tsx` | Intake answers + Segments choices (React context + sessionStorage) |
| `GET /api/leads` | `app/api/leads/route.ts` | Real leads from Moss, filtered by `naics` / `states` / `whyNowDays`, scored + sorted |
| Moss reader | `lib/moss.ts` | Read-only: `getAllLeads()`, `getLeadById(id)` (via `getDocs`, cached 1 min) |
| Fit score | `lib/leadScore.ts` | Days to expiry, fit score, tier, score reasons, signal text (no AI) |
| Leads table | `app/leads`, `components/leads/` | CDS table: company, location, industry, why now, fit + tier, email badge, source + copy |

**Next to build:** lead detail, enrich, draft, approval queue, board, analytics (in that order).

---

## Facts (read first, these answer the usual questions)

**What already exists (Roshni's work, merged from `roshni/backend`):**
| Thing | Where | What it is |
|---|---|---|
| Moss index | Roshni's Moss project, name **`leads`** | 10 real Virginia leads, model `moss-minilm`, status Ready |
| Email sender | `lib/demo-email.mjs` | `sendDemoEmail({ subject, body, leadName })`, the only allowed way to send. Tested. |
| Email safety tests | `lib/demo-email.test.mjs` | Run with `npm test`. Must show `pass 7`, `fail 0`. |
| Moss check script | `scripts/moss-list.mjs` | Lists the Moss indexes (read only) |
| Data scripts | `scripts/fetch-sam.mjs`, `clean-leads.mjs`, `moss-build-leads.mjs` | Roshni's. **Don't run them.** They already built the index. |
| `package.json` | repo root | Has both sides: Next.js + CDS + `@google/genai` (ours) and `"type": "module"`, `@moss-js/moss`, `"test"` (Roshni's) |

**Roshni's files (never edit):** `lib/demo-email.mjs`, `lib/demo-email.test.mjs`, everything in
`scripts/`, everything in `data/`. Our own files in `lib/` (`ai.ts`, `api.ts`, `types.ts`, …) are fine to edit.

**What does NOT exist yet (you build it):**
- `GET /api/leads/[id]`, and the `/enrich`, `/draft`, `/approve` routes (Part 3).
  (`GET /api/leads` is built. It's `/api/leads`, not `/api/search`.)

**Moss facts:**
- Index name: **`leads`**. Use the same `MOSS_PROJECT_ID` / `MOSS_PROJECT_KEY` Roshni sent you.
  They're from the project the index lives in.
- **Check it before building:** run `node --env-file=.env scripts/moss-list.mjs`.
  It must print `- leads: 10 docs, status Ready, model moss-minilm`. If it shows no `leads`
  index, the ID/key are from a different project, so ask Roshni to resend them. Don't create an index.
- Each document: `id` = the company's UEI. `text` = searchable description (name, city,
  industries, business types). `metadata.state` = `"VA"`. `metadata.expiresAt` = expiry date
  as Unix seconds **in a string**. `metadata.lead` = **the full lead as a JSON string**, so
  `JSON.parse(doc.metadata.lead)` gives the `Lead` shape in Part 3.
- You must call `loadIndex("leads")` once before `query(...)`. Filters only work after loading.

**Which leads to expect:** 10 active Virginia companies (NAICS 541512). 6 expire within 30 days,
and the soonest expires Nov 25, 2026. None have an email yet (Hunter adds those).
Half have a website from SAM.gov.

**Gemini model name:** set `GEMINI_MODEL` in `.env`. If it's missing, `lib/ai.ts` uses
**`gemini-3.5-flash-lite`** (tested Nov 24: answers in 1–5 s; `gemini-2.5-flash` is retired for new
keys, and `gemini-3.7-flash` / `3.8-flash` took 2+ minutes). All AI calls go through `lib/ai.ts`.

**Things that are decided (don't ask, just do):**
- One Next.js App Router project at the repo root, TypeScript + **Coinbase Design System (CDS)**.
  It already exists. **Never re-create it or run a generator that overwrites `package.json`. Don't add Tailwind.**
- `"allowJs": true` in `tsconfig.json` (already set) so routes can import `lib/demo-email.mjs`.
- Board stage, approve/reject status and history are saved in the browser's `localStorage`.
  **No database, and no API for those.** Analytics is counted in the browser from the same data.
- Source citation: show `Source: SAM.gov · UEI {uei}` with a copy button (no link for now).
- Emails are sent **only** by `sendDemoEmail`, which always goes to `DEMO_RECIPIENT` (Roshni's
  demo Gmail). The real contact email from Hunter is **shown only, never sent to**.
- **No "Demo mode" label in the UI.** (The safety still holds: `sendDemoEmail` only ever sends to `DEMO_RECIPIENT`.)
- If a key is missing, the endpoint returns `{ error: "<NAME> is not set in .env" }` and the
  screen shows that message. Never crash.

**Who to ask:** if something here is missing or doesn't match, stop and ask Roshni. Don't guess,
and don't change Roshni's files (listed above).

---

## Part 1: Paste this into Claude Code

```
Read CLAUDE.md and docs/FRONTEND_HANDOFF.md fully before writing any code.
Explain every step to me in plain words. I'm a designer, not an engineer.

Keep building the existing Cadent app (Next.js App Router + Coinbase Design System) in this repo:
the screens AND the /api/... endpoints described in docs/FRONTEND_HANDOFF.md Part 3.
Don't re-create the project, don't add Tailwind, and don't rebuild intake or segments.

Non-negotiable rules:
1. API keys are only read on the server (inside app/api/...). Screens never call Moss,
   Gemini, SAM.gov, Tavily, Hunter or Resend directly. They only call our /api/... endpoints,
   through lib/api.ts.
2. Emails are ONLY sent with sendDemoEmail() from lib/demo-email.mjs. Never write any other
   email-sending code, and never pass a recipient. Do not edit lib/demo-email.mjs or
   lib/demo-email.test.mjs. Run `npm test` after any change near email; all tests must pass.
3. Never delete or recreate the Moss "leads" index. Only read from it.
4. Do not change scripts/ or anything in data/. Never commit .env or data/.
5. Show the footer "Data from SAM.gov public API." on every page. No "Demo mode" label.
6. Every screen handles empty fields with the placeholders in Part 4.

Order: leads endpoint + leads table (real data from Moss, filtered by the Segments choices),
then lead detail, enrich, draft, approval queue, board, analytics.
Test each endpoint and show me it works before moving to the next.
```

---

## Part 2: Setup (once)

1. In Terminal, in the Cadent folder (work on your current branch, `rashmi`; don't make a new branch):
   - `git fetch origin` then `git merge origin/roshni/backend` (brings in Roshni's Moss scripts and the email sender)
   - `npm install`
   - Check: `npm test` shows `pass 7`, and `node --env-file=.env scripts/moss-list.mjs` shows
     the `leads` index (do this after step 2, once `.env` is filled in).
2. **`.env`** (main Cadent folder, next to `package.json`): copy `.env.example` to `.env` and fill
   in your values, one per line, `NAME=value`, no quotes or spaces. `.env` is already ignored by git.

| Name | What it's for |
|---|---|
| `GEMINI_API_KEY` | AI: segments, scoring text, email drafts |
| `GEMINI_MODEL` | Optional. Defaults to `gemini-3.5-flash-lite` |
| `MOSS_PROJECT_ID`, `MOSS_PROJECT_KEY` | Roshni's Moss project (has the `leads` index) |
| `TAVILY_API_KEY` | Finds company websites |
| `HUNTER_API_KEY` | Finds and verifies work emails |
| `RESEND_API_KEY` | Sends demo emails |
| `DEMO_RECIPIENT` | The ONLY inbox demo emails can go to (Roshni's demo Gmail) |
| `SAM_API_KEY` | Not needed by the app (leads come from Moss). Only for Roshni's fetch script. |

3. Run it: `npm run dev`, open http://localhost:3100.
4. Deploying: in Vercel, add the same names and values under **Settings → Environment Variables**.
   Moss uses a native module that differs by computer. If Vercel says `Cannot find native binding`,
   delete `node_modules` and `package-lock.json`, run `npm install` again, commit the new lockfile, and redeploy.

---

## Part 3: Endpoints (all server-side, in `app/api/...`)

Errors always return `{ error: "plain-language message" }` with a 4xx/5xx status.
Screens call these only through `lib/api.ts`.

| Endpoint | Status | What it does | Uses | Sends | Returns |
|---|---|---|---|---|---|
| `POST /api/segments` | **Built** | Intake → segment plan (profile step) | Gemini via `lib/ai.ts` | `IntakeData` | `{ plan: SegmentPlan, source, fallbackReason? }` |
| `GET /api/leads` | **Built** | List leads for the Segments choices | Moss | query: `naics`, `states`, `whyNowDays` | `{ leads: Lead[], totalInIndex, matchedSegments, hiddenByDays }` |
| `GET /api/leads/[id]` | To build | One lead | Moss | – | `Lead` |
| `POST /api/leads/[id]/enrich` | To build | Website + email | Tavily, Hunter | – | `{ website, email, emailStatus, emailConfidence }` |
| `POST /api/leads/[id]/draft` | To build | Write outreach email | Gemini via `lib/ai.ts` | – | `{ draftSubject, draftBody, agentUnsure[], agentSteps[] }` |
| `POST /api/leads/[id]/approve` | To build | Send to demo inbox | `sendDemoEmail` | `{ subject, body }` | `{ sentTo, sentAt }` |

There is **no `/api/icp`**: the profile step is `/api/segments` + the `SegmentPlan` shape in `lib/types.ts`.
Reject, board moves and analytics happen in the browser (`localStorage`), with no endpoint.
Build `GET /api/leads` first and check it returns 10 leads before anything else.

**`/api/leads` filters** come from the Segments screen choices (`TargetingChoices` in `lib/types.ts`):
`naics` = selected industry codes (comma-separated; a lead matches if its primary code or any of
its other codes is picked), `states` = selected state codes (comma-separated),
`whyNowDays` = 30, 60 or 90 (registration expires within that many days, not already expired).
Leads come back best fit first. `hiddenByDays` = leads that match but renew later than the window.

### How each tool is used

**Moss (leads).** Package `@moss-js/moss` (already installed). Each document's
`metadata.lead` holds the full lead as a JSON string; `metadata.state` and `metadata.expiresAt`
(Unix seconds, as text) are filters.
```js
import { MossClient } from "@moss-js/moss";
const moss = new MossClient(process.env.MOSS_PROJECT_ID, process.env.MOSS_PROJECT_KEY);
await moss.loadIndex("leads");                       // once per server start
// search:
const res = await moss.query("leads", q || "IT contractor", { topK: 10,
  filter: { field: "state", condition: { $eq: "VA" } } });
const leads = res.docs.map(d => ({ ...JSON.parse(d.metadata.lead), matchScore: d.score }));
// list all / one: await moss.getDocs("leads")  /  await moss.getDocs("leads", { docIds: [id] })
```
- Recalculate `daysToExpiry` from `registrationExpirationDate` on every request (it changes daily).
- Moss uses a native module: in `next.config`, set `serverExternalPackages: ["@moss-js/moss"]`
  and use the Node.js runtime (not Edge) for these routes.
- How we read it: `lib/moss.ts` uses `getDocs("leads")` (all 10 docs, no `loadIndex` needed) and
  filters in code. Switch to `query()` only if we add free-text search later.
- Fit score / tier (`lib/leadScore.ts`, no AI): expiry ≤30 days 40–50 pts (sooner = more),
  ≤60 days 35, ≤90 days 20, later 5, expired 0; primary NAICS picked 30 pts (another listed
  code picked 15); small business for that code 20. Tier A ≥ 75, B ≥ 50, else C.
  `next.config.ts` already sets `serverExternalPackages: ["@moss-js/moss"]`; the route uses the Node.js runtime.

**Gemini (segments + draft).** All calls go through `lib/ai.ts` (one function per AI task), which
uses Google's official SDK `@google/genai` (already installed) and `process.env.GEMINI_MODEL`
(default `gemini-3.5-flash-lite`). It asks for JSON, checks the answer against our rules, has a
30 s time limit and one retry on "high demand" errors.
- Segments prompt: already built (`suggestSegments`). Returns `SegmentPlan` with a 0–1 confidence per item.
- Draft prompt rules: short and helpful; name the real signal (the expiry date); include
  "Source: SAM.gov, UEI {uei}"; offer help and a free review; **never** offer to manage or log
  into their SAM.gov account; never mention `businessTypes` (e.g. minority-owned).
  Return `agentUnsure` (e.g. "no website", "email not verified").

**Tavily (website, only if the lead has none).** `POST https://api.tavily.com/search` with header
`Authorization: Bearer ${TAVILY_API_KEY}` and body `{ "query": "<company name> <city> VA official website" }`.
Take the most likely company domain from the results, and say in `agentUnsure` that it's a guess.

**Hunter (email).** With the website's domain and the contact's name:
- Find: `GET https://api.hunter.io/v2/email-finder?domain=<domain>&first_name=<first>&last_name=<last>&api_key=${HUNTER_API_KEY}`
- Verify: `GET https://api.hunter.io/v2/email-verifier?email=<email>&api_key=${HUNTER_API_KEY}`
- Map to `emailStatus`: `valid` → `verified`, `accept_all`/`unknown` → `unknown`, other → `risky`.
- This email is **only shown on screen**. It is never sent to.
- Free plans are small. Don't call enrich in loops; only when someone clicks "Enrich".

**Email (approve).** Needs `RESEND_API_KEY` and `DEMO_RECIPIENT` in `.env`. Errors from
`sendDemoEmail` (e.g. "DEMO_RECIPIENT is not set. Nothing was sent.") go straight to the screen.
```js
import { sendDemoEmail } from "../../../../../lib/demo-email.mjs"; // relative path from app/api/leads/[id]/approve/route.ts
const r = await sendDemoEmail({ subject, body, leadName: lead.legalName }); // no recipient, ever
```

**Board stage, approvals, history:** keep them in the browser's `localStorage` for the demo
(simple, no database). Every move adds `{ stage, movedBy: "person" | "ai", at }` to `stageHistory`.

### `Lead` shape (example values are made up)
```json
{
  "id": "EXAMPLEUEI12", "legalName": "EXAMPLE SYSTEMS LLC", "dbaName": null,
  "city": "Reston", "state": "VA",
  "primaryNaics": "541512", "primaryNaicsName": "Computer Systems Design Services",
  "naicsList": [{ "code": "541512", "name": "Computer Systems Design Services", "small": "Y" }],
  "productsAndServices": [], "businessTypes": ["Woman Owned Business"],
  "registrationExpirationDate": "2026-12-05", "daysToExpiry": 11,
  "registrationDate": "2025-12-01", "registrationStatus": "Active", "lastUpdateDate": "2025-12-08",
  "signals": ["SAM.gov registration expires Dec 5, 2026 (in 11 days)"],
  "samSource": { "api": "SAM.gov Entity API v4", "uei": "EXAMPLEUEI12", "fetchedOn": "2026-11-24" },
  "samSourceUrl": null, "website": "https://example.com",
  "contactName": "Jane Example", "contactTitle": "CEO",
  "fitScore": 88, "tier": "A", "scoreReasons": ["Expires in 11 days", "Primary NAICS matches"],
  "email": null, "emailStatus": null, "draftSubject": null, "draftBody": null, "agentUnsure": [],
  "stage": "Matched", "stageHistory": [{ "stage": "Matched", "movedBy": "ai", "at": "2026-11-24T20:15:00Z" }]
}
```
`stage`: `Matched`, `Contacted`, `Replied`, `Meeting Booked`, `Closed`, `Lost`.
The TypeScript version is `Lead` in `lib/types.ts`.

### Profile shape
We use `SegmentPlan` (in `lib/types.ts`), not an `Icp` shape: industry segments (primary +
suggested, each with confidence, "inferred from" and a reason) and targeting (states, why-now
days, contact titles, size), plus `agentSteps`. Maria's final picks are saved as `TargetingChoices`.

---

## Part 4: Screens, fields, and what to show when empty

(Full field list: `docs/ui_fields_for_moss.csv`.)

| Screen | Fields | If empty, show |
|---|---|---|
| Intake | Built | – |
| Segments | Built | Count line: "Not searched yet" |
| Leads table | legalName, dbaName (grey line), "City, ST", primaryNaicsName (code in tooltip), "Expires in N days", fitScore + tier badge, emailStatus badge, source | dbaName hidden; email badge "Not checked" |
| Lead detail | above + naicsList, productsAndServices, businessTypes (tags), dates, "Data freshness", website, contact + title, collapsible "Agent thinking" (scoreReasons, agentSteps) | website "No website found"; productsAndServices hidden |
| Approval queue | contact, email + badge, signals, editable subject + body, agentUnsure, source, Approve / Edit / Reject | "Drafting…", "Finding email…" then "No email found" |
| Board | cards: legalName, tier, stage, last move ("Moved by AI · 2:15 PM") | – |
| Analytics | count + conversion per stage | 0 |

**Source citation:** show `Source: SAM.gov · UEI {samSource.uei}` with a copy button.
(`samSourceUrl` is null; SAM.gov's public record link format isn't confirmed.)

---

## Part 5: The big picture

```
Moss "leads" index (10 real VA leads) ─┐
                                       ▼
Screens ──> lib/api.ts ──> /api/... (server, has keys) ──> Gemini via lib/ai.ts (segments, draft)
                                       ├─> Tavily + Hunter (website, email: shown only)
                                       └─> sendDemoEmail → ONLY the demo Gmail inbox
```
Real lead data is never in GitHub; the app reads it from Moss.
