@.claude/rules/cds.md

# Cadent: Project Context

Read this whole file before writing any code. It is the source of truth for this project.

## 1. The event

- **Event:** HackwithBay 4.0, AWS Builder Loft, San Francisco, Nov 24, 2026
- **Theme:** "Thoughtful Agents for Productivity"
- **Problem statement:** "AI GTM Engine" (go-to-market engine): a tool that takes a plain-language product description, infers who should buy it, finds real prospects with sources, enriches contacts, drafts outreach behind a human approval step, and tracks leads on a dashboard.
- **Submission deadline:** 3:30 PM. Top 5 teams present at 4:00 PM.
- **Team:** Two product designers who build with AI tools.
  - **Roshni:** product, UX/UI, front end, pitch. Owns intake, ICP, approval queue, board, demo story.
  - **Rashmi:** product designer, strong in Figma and AI tools, vibe codes front end and back end. Owns the data side: SAM.gov caching, Tavily/Hunter enrichment, email demo send, Flexprice.
  - Neither is a traditional engineer: keep code simple, explain steps plainly, prefer working over clever.
  - Work in separate folders/files where possible to avoid merge conflicts; agree on the shape of the lead data (JSON) first.

### Judging (from the official brief)

| Criterion | Weight | What judges want |
|---|---|---|
| ICP & Discovery Quality | 20% | Sensible inferred ICP, real leads with source citations, credible expansion segments |
| Enrichment & Outreach | 20% | Verified contacts, signal-personalized messages, strict human approval gate |
| Dashboard & Lead Management | 15% | Clear stage tracking, agent vs rep attribution, conversion analytics |
| Startup Viability | 15% | Believable business, real pain, clear differentiation |
| Technical Execution & Demo | 10% | Clean architecture, working end-to-end prototype |
| Flexprice integration | +20% bonus | Usage metering and credit-gated execution |
| Band Desktop integration | +20% bonus | Multi-agent collaboration with human approval (NOT planned) |

### Required deliverables

1. Working end-to-end prototype (intake → dashboard)
2. Public GitHub repo with setup docs
3. 2–3 minute demo video
4. Short system design / architecture write-up (can live in README)

## 2. What Cadent is

**One line:** Cadent surfaces government contractors approaching key compliance deadlines, so consultants can reach them at the right moment.

**Plain version:** Cadent is a sales assistant for consultants who serve small government contractors. It finds contractors in public SAM.gov records, spots a dated reason to reach out (like an upcoming registration renewal), drafts a helpful email with the source linked, and lets the consultant approve every message before it goes out.

### Two people, don't mix them up

- **Our user:** Maria, a compliance consultant for small government contractors.
- **Maria's leads:** small businesses registered in SAM.gov.
- We are the startup that sells Cadent to Maria. We are not Maria.

### Maria (persona)

- Runs a small consulting practice (1 to 10 people): solo consultant, small firm, or accounting/compliance shop focused on government contractors.
- Helps small contractors stay eligible for federal work: certifications, paperwork reviews, renewal preparation, accurate records.
- **She does NOT file registrations for clients or take over their accounts.** SAM.gov rules forbid people outside a company from holding its admin role, and agencies warn against paid registration services. She guides and reviews; the client files.
- No sales team. She is the sales team.

**Her problem:** She doesn't know which companies need her right now. Client finding is word of mouth and random cold email. A random email gets ignored; an email tied to a real date gets read.

### Leads (the small contractors)

- Small businesses with an active SAM.gov registration.
- **Demo segment:** NAICS 541512 (Computer Systems Design Services), one of the top federal spending codes, in Virginia. (Virginia chosen as a high-contractor state; confirm with the first API call.)
- Decision maker: owner, CEO, or contracts manager.

### Why it matters (pitch facts, all sourced)

- SAM.gov registration is mandatory for federal contracts and grants and must be renewed every year. A registration stays active 365 days from submission. (sam.gov/content/status-tracker)
- GAO sustained a protest and recommended the Navy terminate an award because the winner's SAM renewal wasn't processed before it lapsed (TLS Joint Venture, B-422275, 2024). (mayerbrown.com, dlapiper.com)
- UC Riverside's SAM registration expired Aug 15, 2026; federal payment requests were paused. (ucr.edu research office notices)
- NIAID: cannot provide grant funds to organizations with an expired SAM registration. (niaid.nih.gov)
- Back pocket for pitch: SAM.gov flagged a system error affecting size-standard data on renewals submitted Mar 24–Jul 22, 2026. (sam.gov/alerts) Do not build features around this; pitch only.
- Signal-based (trigger) outreach gets meaningfully higher reply rates than generic cold email (vendor data, treat as directional).

### Competitors and our difference

- **HigherGov, GovWin, GovSpend, GovTribe:** help contractors sell TO the government. Opposite direction from us.
- **Apify SAM.gov scrapers:** turn SAM data into raw lead lists. No "why now," no drafting, no approval.
- **LeadHaste:** agency that does outbound for vendors selling to government contractors, done by people as a service.
- **Cadent's difference:** each lead comes with a dated, public reason to reach out; every claim links to the source record; a person approves every message; it's software a solo consultant can run.

## 3. The user flow (build this, in this order)

1. **Intake:** Maria types her service in plain words. Example: "I help small government IT contractors keep their certifications and SAM registration accurate."
2. **ICP:** Gemini turns it into a structured profile: NAICS codes, size, state, decision-maker titles, trigger events. Each field has a confidence score 0.00–1.00. Maria can accept or edit.
3. **Discovery:** Pull matching entities from SAM.gov (cached). Each lead shows a source link to its SAM.gov record.
4. **Signals:** Compute "why now" from public dates: registration expiration within N days, recently registered, etc. Score each lead 0–100 and tier A/B/C.
5. **Enrichment:** Use Tavily to find the company website, Hunter.io to find a work email at that domain. Show verification status inline.
6. **Outreach draft:** Gemini writes a short, helpful email that names the real signal and links the source. Tone: offer help and a free review, never "we'll manage your account."
7. **Approval queue (HITL):** Approve / Edit / Reject per message. Show: why this lead, the source, confidence, what the agent is unsure about. Nothing sends without approval.
8. **Board:** Kanban: Matched → Contacted → Replied → Meeting Booked → Closed/Lost. Each card shows whether AI or a person moved it, with timestamps.
9. **Analytics (light):** Counts and conversion per stage.
10. **Flexprice (bonus):** Meter `leads_enriched`, `outreach_drafted`, `outreach_sent`. Enforce a credit balance; when credits run out, enrichment is blocked with a clear message.

## 4. Non-negotiable rules (SAM.gov Terms of Use)

- **Official API or official extract files only.** No scraping, no bots, no using the SAM.gov login to pull data.
- **Only records last updated on or after 2022-04-04.** Older records may contain Dun & Bradstreet data, which cannot be used for marketing. Also skip any record whose data source shows D&B.
- **Never share API keys.** Each person uses their own key. Keys live in `.env`. `.env` is in `.gitignore`. Never commit keys.
- **Public data only.** Never request FOUO or sensitive data.
- **Read only.** Never upload or change anything on SAM.gov.
- **Label the source.** App footer: "Data from SAM.gov public API."
- **No bulk export** of SAM records from the app.
- **Emails offer help, never account access.**

## 5. SAM.gov API: constraints and handling

- Endpoint: `https://api.sam.gov/entity-information/v4/entities?api_key=...`
- Key type: basic personal public key. **Limit: 10 requests per day.**
- Entity search returns **max 10 records per page; each page = 1 request.** So 10 requests ≈ 100 records max per day.
- **Cache everything.** Every response is saved as JSON under `data/sam_cache/`. The app reads from cache by default. A live call only happens when explicitly triggered.
- Keep 2–3 requests unused for a live lookup in front of judges.
- If a live call fails or returns 429, fall back to cache and show a small "showing cached data" note.
- Useful fields: legal business name, UEI, physical address, NAICS codes, registration status, registrationExpirationDate, activationDate, last update date, entity URL if present. Do not assume a contact email exists in SAM data; get emails from Hunter.

## 6. Email sending: demo mode

- **Never email real companies.** Drafts look real and show the real lead, but on Approve, the app sends the email to `DEMO_RECIPIENT` (Roshni's inbox) instead.
- Show a visible label: "Demo mode: emails go to a test inbox."
- During the demo, open the inbox and show the email arriving.
- Sending tool: decide at build time (Gmail SMTP or SendGrid). Test one send early.

## 7. Tech

- Build with Claude Code. Keep it simple and fast.
- Suggested: Next.js + Tailwind (the brief suggests this). A small API layer for SAM.gov, Tavily, Hunter, Gemini, and email.
- Agent model: Gemini API (free tier, a Flash model) for ICP, lead scoring and email drafts. Use Google's official Gen AI SDK (`@google/genai` for Node/Next.js).
- Knowledge graph (Neo4j) is optional. Skip unless the core works early.
- Deploy to Vercel if time allows.
- Environment variables (`.env`):
  - `GEMINI_API_KEY`
  - `SAM_API_KEY`
  - `TAVILY_API_KEY`
  - `HUNTER_API_KEY`
  - `DEMO_RECIPIENT`
  - email sender credentials (Gmail or SendGrid)
  - `FLEXPRICE_API_KEY` (if used)

## 8. UI notes

- Clean, editorial look plus a dense, spreadsheet-style leads table.
- Inline badges for email verification and confidence.
- Collapsible "Agent thinking" panel showing reasoning steps.
- Fit score 0–100 with Tier A/B/C.
- Every lead and every email shows its SAM.gov source link.

## 9. Timeline

- 11:00 Start. Get one SAM.gov call cached first.
- 11:00–12:00 Intake → ICP → discovery from cache.
- 12:00–1:00 Lunch.
- 1:00–2:00 Enrichment + drafts + approval queue.
- 2:00–2:45 Board, demo email send, Flexprice if time.
- 2:45 Feature freeze. Test, record video, write README, push, submit by 3:30.
- Push to GitHub every hour.

## 10. Out of scope

- Real email to real companies
- LinkedIn API
- Apollo, Clearbit
- Band Desktop
- Anything using FOUO/sensitive SAM data
