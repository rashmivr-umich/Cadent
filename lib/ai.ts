// All AI calls live in this one file: one function per AI task.
// To switch to Claude later, change only this file and .env (AI_PROVIDER, GEMINI_MODEL, key).
// Runs on the server only (inside API routes), so API keys never reach the browser.

import 'server-only';
import { GoogleGenAI } from '@google/genai';
import { ALLOWED_NAICS } from './naics';
import { cleanSegmentPlan } from './segmentPlan';
import type { DraftResponse, EnrichResponse, IntakeData, Lead, SegmentPlan, Sender } from './types';

const AI_PROVIDER = process.env.AI_PROVIDER || 'gemini';
// Default is a fast model (~1 s). Tested Nov 24: gemini-3.8-flash and 3.7-flash took 2+ minutes,
// gemini-2.5-flash is retired for new keys. Override with GEMINI_MODEL in .env.
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
// Give up after this long and use the fallback plan, so the demo never hangs.
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS) || 30_000;

/** Sends a prompt to the configured model and returns its JSON answer (not yet checked). */
async function askForJson(system: string, prompt: string, jsonSchema: object): Promise<unknown> {
  if (AI_PROVIDER !== 'gemini') {
    throw new Error(`AI_PROVIDER "${AI_PROVIDER}" isn't set up yet in lib/ai.ts`);
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is missing from .env');

  const ai = new GoogleGenAI({ apiKey });
  const call = () =>
    ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction: system,
        responseMimeType: 'application/json',
        responseJsonSchema: jsonSchema,
        temperature: 0.2,
        abortSignal: AbortSignal.timeout(AI_TIMEOUT_MS),
      },
    });

  let response;
  try {
    response = await call();
  } catch (error) {
    // "High demand" / rate-limit errors are usually brief: wait a moment and try once more.
    const message = error instanceof Error ? error.message : '';
    if (!/503|429|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand/i.test(message)) throw error;
    await new Promise((resolve) => setTimeout(resolve, 1500));
    response = await call();
  }
  const text = response.text;
  if (!text) throw new Error('The AI returned an empty answer');
  return JSON.parse(text);
}

// ---------- Task 1: suggest industry segments + targeting from the intake ----------

const SEGMENT_SYSTEM = `You help a compliance consultant ("Maria") find small government contractors who may need her help.
You turn her intake answers into a targeting plan. Follow these rules exactly:
- Segment codes must come ONLY from this list (code: title):
${ALLOWED_NAICS.map((n) => `  ${n.code}: ${n.title}`).join('\n')}
- Return exactly 1 "primary" segment (selected: true) and 1 or 2 "suggested" segments (selected: false).
- States must be two-letter US state codes (e.g. "VA").
- Contact titles are roles like Owner, CEO, President, Contracts Manager.
- whyNowDays is 30, 60 or 90 (how soon a SAM.gov registration renews).
- Size is always "Small business": SAM.gov only gives a small-business yes/no per industry code. Never output headcount or revenue.
- Never invent companies, counts or statistics.
- confidence is a number from 0 to 1. inferredFrom is one of: "your description", "your past clients", "SAM.gov data", "workspace settings".
- Every reasoning is one short, plain sentence, addressed to Maria as "you" (never "Maria").
- summary is a short, direct instruction that starts with "Target" (max 18 words, no names, no "should").
  Example: "Target small government IT contractors in Virginia whose SAM registrations are expiring soon"
- agentSteps: 3 to 6 short plain sentences describing what you looked at and decided, in order.`;

const SOURCE_ENUM = ['your description', 'your past clients', 'SAM.gov data', 'workspace settings'];
const field = (extra: object) => ({
  type: 'object',
  properties: {
    ...extra,
    confidence: { type: 'number' },
    inferredFrom: { type: 'string', enum: SOURCE_ENUM },
    reasoning: { type: 'string' },
  },
  required: [...Object.keys(extra), 'confidence', 'inferredFrom', 'reasoning'],
});

const SEGMENT_PLAN_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    segments: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          naicsCode: { type: 'string', enum: ALLOWED_NAICS.map((n) => n.code) },
          naicsTitle: { type: 'string' },
          kind: { type: 'string', enum: ['primary', 'suggested'] },
          selected: { type: 'boolean' },
          confidence: { type: 'number' },
          inferredFrom: { type: 'string', enum: SOURCE_ENUM },
          reasoning: { type: 'string' },
        },
        required: ['naicsCode', 'naicsTitle', 'kind', 'selected', 'confidence', 'inferredFrom', 'reasoning'],
      },
    },
    targeting: {
      type: 'object',
      properties: {
        states: field({ selected: { type: 'array', items: { type: 'string' } } }),
        whyNowDays: field({ value: { type: 'integer', enum: [30, 60, 90] } }),
        contactTitles: field({
          selected: { type: 'array', items: { type: 'string' } },
          options: { type: 'array', items: { type: 'string' } },
        }),
        size: field({ value: { type: 'string', enum: ['Small business'] } }),
      },
      required: ['states', 'whyNowDays', 'contactTitles', 'size'],
    },
    agentSteps: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'segments', 'targeting', 'agentSteps'],
};

export async function suggestSegments(intake: IntakeData): Promise<SegmentPlan> {
  const prompt = `Here are Maria's intake answers as JSON. Build her targeting plan.\n\n${JSON.stringify(
    {
      role: intake.userRole,
      workspace: intake.workspace.name,
      serviceDescription: intake.serviceDescription,
      detectedKeywords: intake.detectedKeywords,
      website: intake.website,
      pastClients: intake.pastClients.map((c) => c.name),
      pricingModels: intake.pricingModels,
      priceRange: intake.priceRange,
    },
    null,
    2,
  )}`;
  const raw = await askForJson(SEGMENT_SYSTEM, prompt, SEGMENT_PLAN_SCHEMA);
  // Never trust the model blindly: keep only allowed codes, real states, valid numbers.
  return cleanSegmentPlan(raw, intake);
}

// ---------- Task 2: draft an outreach email for one lead ----------

const DRAFT_SYSTEM = `You write short, helpful first emails from a compliance consultant to a small government contractor.
Rules (follow all of them):
- 90 to 140 words. Plain, warm, professional. No hype, no exclamation marks.
- Lay it out like a real email with line breaks ("\\n"): greeting line, blank line, 2 short paragraphs
  separated by a blank line, blank line, sign-off ("Best,") then the sender's name and firm on separate
  lines, blank line, then the source line.
- Subject: short and specific, mentions the renewal date (e.g. "Your SAM.gov renewal on Dec 5").
- Name the real, dated reason to write: their SAM.gov registration expiration date (given below).
- Offer help preparing for the renewal and a free review of their registration details.
- NEVER offer to manage, file, submit or log into their SAM.gov account, and never ask for their login.
  The company files its own renewal; the consultant only guides and reviews.
- NEVER mention business types or ownership categories (minority-owned, woman-owned, veteran-owned, etc.).
- Never invent facts, numbers, prices, past results or deadlines that are not given.
- Greet the contact by first name if a contact name is given, otherwise "Hi there".
- Sign off with the sender's name and firm.
- End the body with this exact line on its own: "Source: SAM.gov, UEI {uei}" (with the real UEI).
- agentUnsure: short plain notes on what is uncertain (e.g. "No website found", "Email not verified",
  "Contact title may be out of date"). Can be empty.
- agentSteps: 3 to 5 short plain sentences describing what you used and decided, in order.`;

const DRAFT_SCHEMA = {
  type: 'object',
  properties: {
    draftSubject: { type: 'string' },
    draftBody: { type: 'string' },
    agentUnsure: { type: 'array', items: { type: 'string' } },
    agentSteps: { type: 'array', items: { type: 'string' } },
  },
  required: ['draftSubject', 'draftBody', 'agentUnsure', 'agentSteps'],
};

const FORBIDDEN_DRAFT =
  /\b(log ?in(to)?|login|password|credentials|manage your (sam|account|registration)|file (it|your renewal) for you|submit (it )?for you)\b|minority|woman[- ]owned|women[- ]owned|veteran[- ]owned|disadvantaged|hubzone|8\(a\)/i;

const formatDate = (dateText: string) =>
  new Date(`${dateText}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

/** Lead facts the AI may use (no business types, so it can't mention them). */
function draftFacts(lead: Lead, sender: Sender, enrichment?: Partial<EnrichResponse>) {
  return {
    company: lead.legalName,
    city: lead.city,
    state: lead.state,
    contactName: lead.contactName,
    contactTitle: lead.contactTitle,
    industry: lead.primaryNaicsName,
    registrationExpires: formatDate(lead.registrationExpirationDate),
    daysUntilExpiry: lead.daysToExpiry,
    uei: lead.samSource?.uei ?? lead.id,
    website: enrichment?.website ?? lead.website ?? null,
    emailStatus: enrichment?.email ? enrichment.emailStatus : 'no email found yet',
    sender,
  };
}

/** Final safety pass: source line present, nothing that breaks the rules. */
function checkDraft(draft: { draftSubject: string; draftBody: string; agentUnsure: string[]; agentSteps: string[] }, uei: string) {
  const sourceLine = `Source: SAM.gov, UEI ${uei}`;
  let body = draft.draftBody.trim();
  if (!body.includes(sourceLine)) body = `${body.replace(/\n*Source:.*$/i, '')}\n\n${sourceLine}`;
  if (FORBIDDEN_DRAFT.test(`${draft.draftSubject} ${body}`)) {
    throw new Error('The draft broke a rule (account access or business type)');
  }
  return { ...draft, draftSubject: draft.draftSubject.trim(), draftBody: body };
}

/** Simple, safe template used if the AI is unavailable. Clearly labeled as a fallback. */
export function fallbackDraft(lead: Lead, sender: Sender, reason: string): DraftResponse {
  const first = lead.contactName?.trim().split(/\s+/)[0];
  const uei = lead.samSource?.uei ?? lead.id;
  const date = formatDate(lead.registrationExpirationDate);
  const firm = sender.firm || 'my firm';
  return {
    draftSubject: `Your SAM.gov registration renews ${date}`,
    draftBody: [
      `Hi ${first ? first.charAt(0) + first.slice(1).toLowerCase() : 'there'},`,
      '',
      `I noticed ${lead.legalName}'s SAM.gov registration is set to expire on ${date}. Renewals can take longer than expected, and a lapse can pause federal payments and awards.`,
      '',
      `I help small government contractors prepare for renewals and keep their registration details accurate. If it's useful, I'd be glad to do a free review of your registration before you renew.`,
      '',
      'Best,',
      sender.name || 'Your name',
      firm,
      '',
      `Source: SAM.gov, UEI ${uei}`,
    ].join('\n'),
    agentUnsure: [`Written from a template because the AI was unavailable (${reason}).`],
    agentSteps: [
      'The AI was not available, so a safe template was used.',
      `Used the SAM.gov registration expiration date (${date}) as the reason to write.`,
      'Offered a free review; did not offer to manage or log into their account.',
    ],
    source: 'fallback',
  };
}

export async function draftOutreach(
  lead: Lead,
  sender: Sender,
  enrichment?: Partial<EnrichResponse>,
): Promise<DraftResponse> {
  const facts = draftFacts(lead, sender, enrichment);
  const prompt = `Write the email using only these facts (JSON):\n\n${JSON.stringify(facts, null, 2)}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any = await askForJson(DRAFT_SYSTEM, prompt, DRAFT_SCHEMA);
  const toList = (v: unknown) => (Array.isArray(v) ? v.map(String).filter(Boolean) : []);
  const draft = checkDraft(
    {
      draftSubject: String(raw?.draftSubject ?? ''),
      draftBody: String(raw?.draftBody ?? ''),
      agentUnsure: toList(raw?.agentUnsure),
      agentSteps: toList(raw?.agentSteps),
    },
    facts.uei,
  );
  if (!draft.draftSubject || !draft.draftBody) throw new Error('The AI returned an empty draft');
  return { ...draft, source: 'ai' };
}
