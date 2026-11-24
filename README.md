# Cadent

**Surfaces government contractors approaching key compliance deadlines, so consultants can reach out at the right moment.**

Built at HackwithBay 4.0 ("AI GTM Engine" track).

Compliance consultants help small government contractors stay eligible for federal work, but they
don't know *who* needs help *right now*. Every contractor must renew its SAM.gov registration
yearly, and a lapse can stop payments or cost an award. Cadent finds contractors in public SAM.gov
records, spots a dated reason to reach out (e.g. "registration expires in 8 days"), drafts a
helpful email that cites the source, and **sends nothing until the consultant approves it**.

## What it does (screen flow)

1. **Intake** `/intake`: the consultant describes their service in plain words (key words are
   highlighted as they type), adds past clients (Excel/CSV/paste) and pricing.
2. **Segments** `/segments`: Gemini suggests industries (NAICS), states, a 30/60/90-day renewal
   window and contact titles, each with a confidence score and the reason. Everything is editable.
3. **Leads** `/leads`: real contractors from the official SAM.gov API, read from Moss and filtered by
   those choices, with a **Moss search box** on top. Ranked by a 0–100 fit score ("Strong fit · A")
   driven by how soon the registration expires. Every lead cites its SAM.gov UEI.
4. **Prepare outreach:** tick leads (or "Select top 5", max 10) and click **Prepare outreach**. For each
   lead, Tavily finds the website and Hunter finds and verifies a work email, then Gemini drafts a
   short email naming the real date and citing the SAM.gov record. (Also available one lead at a time
   on the lead's page.)
5. **Queue** `/queue`: Approve & send, Edit or Reject each draft, or **Approve & send all** after a
   confirmation. Nothing sends without approval.
6. **Board** `/board` + analytics: Matched → Contacted → Replied → Meeting Booked → Closed → Lost,
   showing whether the agent or a person moved each lead (click a card for its history), with counts
   and conversion per stage. Gear menu → "Reset demo board" starts the demo clean.

Design and data flow: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** ·
Build guide and current state: [docs/FRONTEND_HANDOFF.md](docs/FRONTEND_HANDOFF.md)

## Tech

Next.js (App Router) · Coinbase Design System (`@coinbase/cds-web`) · Gemini (`@google/genai`) · Moss (`@moss-js/moss`) · SAM.gov Entity API ·
Tavily · Hunter · Resend

## Run it locally

Requires Node.js 20.4+.

```bash
git clone https://github.com/rashmivr-umich/Cadent.git
cd Cadent
npm install
cp .env.example .env     # then fill in the values (table below)
npm run dev              # open http://localhost:3100
```

| Variable | Used for | Where to get it |
|---|---|---|
| `GEMINI_API_KEY` | Profile and email drafts | aistudio.google.com |
| `GEMINI_MODEL` | Optional: a Gemini Flash model ID | aistudio.google.com |
| `MOSS_PROJECT_ID`, `MOSS_PROJECT_KEY` | Lead search (`leads` index) | portal.usemoss.dev |
| `TAVILY_API_KEY` | Company website lookup | tavily.com |
| `HUNTER_API_KEY` | Work email lookup and verification | hunter.io |
| `RESEND_API_KEY` | Sending approved demo emails | resend.com |
| `DEMO_RECIPIENT` | The only inbox demo emails can reach | your own email |
| `SAM_API_KEY` | Only for refreshing data with the scripts below | sam.gov |

`npm test` runs the email safety tests.

### Loading SAM.gov data into Moss (one time)

The app reads leads from a Moss index named `leads`. To build it from scratch:

```bash
node --env-file=.env scripts/fetch-sam.mjs --run        # 1 SAM.gov call (free key: 10/day)
node scripts/clean-leads.mjs                            # apply the data rules
node --env-file=.env scripts/moss-build-leads.mjs       # create the "leads" index
node --env-file=.env scripts/moss-list.mjs              # check: leads, 10 docs, Ready
```

Run `fetch-sam.mjs` without `--run` first to see the request it will make.

## Data rules and safety

- **SAM.gov terms:** official API only, read only. Records last updated before 2022-04-04 or
  sourced from Dun & Bradstreet are dropped. Raw and cleaned SAM.gov data stay out of Git
  (`data/` is ignored); the app reads leads from Moss.
- **Demo mode:** approved emails can only go to `DEMO_RECIPIENT`, never to a real company. The
  sender has no recipient input, checks the recipient right before sending, and is covered by
  automated tests. Contact emails found by Hunter are shown, never emailed.
- Every email offers help, never account access, and includes an opt-out line.

## Team

Roshni and Rashmi
