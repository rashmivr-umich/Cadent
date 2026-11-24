// All AI calls live in this one file: one function per AI task.
// To switch to Claude later, change only this file and .env (AI_PROVIDER, AI_MODEL, key).
// Runs on the server only (inside API routes), so API keys never reach the browser.

import 'server-only';
import { GoogleGenAI } from '@google/genai';
import { ALLOWED_NAICS } from './naics';
import { cleanSegmentPlan } from './segmentPlan';
import type { IntakeData, SegmentPlan } from './types';

const AI_PROVIDER = process.env.AI_PROVIDER || 'gemini';
// Default is a fast model (~1 s). Tested Nov 24: gemini-3.8-flash and 3.7-flash took 2+ minutes,
// gemini-2.5-flash is retired for new keys. Override with AI_MODEL in .env.
const AI_MODEL = process.env.AI_MODEL || 'gemini-3.5-flash-lite';
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
      model: AI_MODEL,
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
