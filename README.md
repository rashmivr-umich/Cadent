# Cadent

**Surfaces government contractors approaching key compliance deadlines, so consultants can reach out at the right moment.**

Built at HackwithBay 4.0 ("AI GTM Engine" track).

Compliance consultants help small government contractors stay eligible for federal work, but they
don't know *who* needs help *right now*. Every contractor must renew its SAM.gov registration
yearly, and a lapse can stop payments or cost an award. Cadent finds contractors in public SAM.gov
records, spots a dated reason to reach out (e.g. "registration expires in 8 days"), drafts a
helpful email that cites the source, and **sends nothing until the consultant approves it**.

## What it does

1. **Intake:** the consultant describes their service in plain words.
2. **Ideal customer profile:** Gemini turns it into industries (NAICS), states, decision-maker
   titles and trigger events, each with a confidence score. Everything is editable.
3. **Leads:** real contractors from the official SAM.gov API, searched with Moss, ranked by a
   0–100 fit score (tier A/B/C) driven by how soon the registration expires.
4. **Contact lookup:** Tavily finds the company website, then Hunter finds and verifies a work email.
5. **Draft:** Gemini writes a short email naming the real date and citing the SAM.gov record (UEI).
6. **Approval queue:** Approve, Edit or Reject. Nothing sends without approval.
7. **Board + analytics:** Matched → Contacted → Replied → Meeting Booked → Closed/Lost, showing
   whether the agent or a person moved each lead.

Design and data flow: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**

## Tech

Next.js (App Router) · Gemini (`@google/genai`) · Moss (`@moss-js/moss`) · SAM.gov Entity API ·
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
