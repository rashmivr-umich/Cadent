// Two helpers for the Segments step:
// 1. cleanSegmentPlan: checks the AI's answer and fixes/removes anything that breaks our rules.
// 2. buildFallbackPlan: a simple plan made from the intake keywords, used when the AI is unavailable.

import { ALLOWED_NAICS, isAllowedNaics, naicsTitle } from './naics';
import { stateName, toStateCode } from './usStates';
import type { InferredFrom, IntakeData, Segment, SegmentPlan, WhyNowDays } from './types';

export const DEFAULT_TITLE_OPTIONS = ['Owner', 'CEO', 'President', 'Contracts Manager', 'COO', 'Compliance Manager'];
const SOURCES: InferredFrom[] = ['your description', 'your past clients', 'SAM.gov data', 'workspace settings'];

const clamp01 = (n: unknown) => Math.min(1, Math.max(0, Number(n) || 0));
const asSource = (s: unknown): InferredFrom =>
  SOURCES.includes(s as InferredFrom) ? (s as InferredFrom) : 'your description';
const asText = (s: unknown, fallback = '') => (typeof s === 'string' && s.trim() ? s.trim() : fallback);
const asDays = (n: unknown): WhyNowDays => ([30, 60, 90].includes(Number(n)) ? (Number(n) as WhyNowDays) : 90);
const unique = <T,>(items: T[]) => [...new Set(items)];

/** States mentioned in the intake keywords, as codes. */
function statesFromIntake(intake: IntakeData): string[] {
  return unique(
    intake.detectedKeywords
      .filter((k) => k.category === 'location')
      .map((k) => toStateCode(k.text))
      .filter((c): c is string => !!c),
  );
}

/** Keeps the headline short and direct: "Maria should target X." → "Target X". */
function tidySummary(summary: string): string {
  let s = summary.trim().replace(/[.!]+$/, '');
  s = s.replace(/^(maria|you|the consultant)\s+(should|could|can|needs to|ought to)\s+/i, '');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------- 1. Clean the AI's answer ----------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function cleanSegmentPlan(raw: any, intake: IntakeData): SegmentPlan {
  // Segments: allowed codes only, no duplicates, official titles, exactly one primary.
  const seen = new Set<string>();
  let segments: Segment[] = (Array.isArray(raw?.segments) ? raw.segments : [])
    .filter((s: { naicsCode?: string }) => s && isAllowedNaics(String(s.naicsCode)))
    .filter((s: { naicsCode: string }) => !seen.has(s.naicsCode) && seen.add(s.naicsCode))
    .map((s: Record<string, unknown>) => ({
      naicsCode: String(s.naicsCode),
      naicsTitle: naicsTitle(String(s.naicsCode))!,
      kind: s.kind === 'primary' ? 'primary' : 'suggested',
      selected: false,
      confidence: clamp01(s.confidence),
      inferredFrom: asSource(s.inferredFrom),
      reasoning: asText(s.reasoning),
    }));
  if (segments.length === 0) throw new Error('The AI returned no usable industry codes');

  const primaryIndex = Math.max(0, segments.findIndex((s) => s.kind === 'primary'));
  segments = segments.map((s, i) => ({
    ...s,
    kind: i === primaryIndex ? 'primary' : 'suggested',
    selected: i === primaryIndex,
  }));
  // Primary first, then at most 2 suggested.
  segments = [segments[primaryIndex], ...segments.filter((_, i) => i !== primaryIndex).slice(0, 2)];

  const t = raw?.targeting ?? {};
  const aiStates = unique(
    (Array.isArray(t.states?.selected) ? t.states.selected : [])
      .map((s: string) => toStateCode(String(s)))
      .filter((c: string | null): c is string => !!c),
  ) as string[];
  const states = aiStates.length > 0 ? aiStates : statesFromIntake(intake);

  const titleOptions = unique([
    ...(Array.isArray(t.contactTitles?.options) ? t.contactTitles.options.map(String) : []),
    ...DEFAULT_TITLE_OPTIONS,
  ]).filter(Boolean) as string[];
  const titles = unique((Array.isArray(t.contactTitles?.selected) ? t.contactTitles.selected : []).map(String))
    .filter(Boolean) as string[];

  return {
    summary: tidySummary(asText(raw?.summary, 'Target small government contractors in your industry segments.')),
    segments,
    targeting: {
      states: {
        selected: states,
        confidence: clamp01(t.states?.confidence),
        inferredFrom: asSource(t.states?.inferredFrom),
        reasoning: asText(t.states?.reasoning),
      },
      whyNowDays: {
        value: asDays(t.whyNowDays?.value),
        confidence: clamp01(t.whyNowDays?.confidence),
        inferredFrom: asSource(t.whyNowDays?.inferredFrom),
        reasoning: asText(t.whyNowDays?.reasoning),
      },
      contactTitles: {
        selected: titles.length > 0 ? titles : ['Owner', 'Contracts Manager'],
        options: unique([...titles, ...titleOptions]),
        confidence: clamp01(t.contactTitles?.confidence),
        inferredFrom: asSource(t.contactTitles?.inferredFrom),
        reasoning: asText(t.contactTitles?.reasoning),
      },
      // Always "Small business": SAM.gov only gives a yes/no per industry code.
      size: {
        value: 'Small business',
        confidence: clamp01(t.size?.confidence ?? 0.9),
        inferredFrom: 'SAM.gov data',
        reasoning: 'SAM.gov small-business status for the industry code.',
      },
    },
    agentSteps: (Array.isArray(raw?.agentSteps) ? raw.agentSteps : []).map(String).filter(Boolean),
  };
}

// ---------- 2. Fallback plan (no AI) ----------

export function buildFallbackPlan(intake: IntakeData): SegmentPlan {
  const text = `${intake.serviceDescription} ${intake.detectedKeywords.map((k) => k.text).join(' ')}`.toLowerCase();
  const mentionsSoftware = /software|programming|developer|app development/.test(text);
  const mentionsHosting = /hosting|cloud|data center|infrastructure/.test(text);

  const primaryCode = mentionsSoftware ? '541511' : '541512';
  const suggestedCodes = [mentionsHosting ? '518210' : '541519', mentionsSoftware ? '541512' : '541511'];

  const segment = (code: string, kind: 'primary' | 'suggested', confidence: number, reasoning: string): Segment => ({
    naicsCode: code,
    naicsTitle: naicsTitle(code)!,
    kind,
    selected: kind === 'primary',
    confidence,
    inferredFrom: 'your description',
    reasoning,
  });

  const keywordStates = statesFromIntake(intake);
  const states = keywordStates.length > 0 ? keywordStates : ['VA'];
  const hasPastClients = intake.pastClients.length > 0;

  return {
    summary: `Target small government IT contractors in ${states.map(stateName).join(' and ')} whose SAM registrations are expiring soon`,
    segments: [
      segment(primaryCode, 'primary', 0.6, 'Your description mentions IT contractors, which maps to this code.'),
      ...suggestedCodes
        .filter((c) => c !== primaryCode && ALLOWED_NAICS.some((n) => n.code === c))
        .slice(0, 2)
        .map((c) => segment(c, 'suggested', 0.35, 'A closely related IT code that similar contractors often register under.')),
    ],
    targeting: {
      states: {
        selected: states,
        confidence: keywordStates.length > 0 ? 0.7 : 0.3,
        inferredFrom: keywordStates.length > 0 ? 'your description' : 'SAM.gov data',
        reasoning:
          keywordStates.length > 0
            ? 'These states are named in your description.'
            : 'No state was mentioned, so this starts with Virginia, where our cached SAM.gov data is.',
      },
      whyNowDays: {
        value: 90,
        confidence: 0.5,
        inferredFrom: 'your description',
        reasoning: 'Ninety days gives contractors time to prepare a renewal with your help.',
      },
      contactTitles: {
        selected: ['Owner', 'CEO', 'Contracts Manager'],
        options: DEFAULT_TITLE_OPTIONS,
        confidence: 0.5,
        inferredFrom: 'your description',
        reasoning: 'At small contractors, owners and contracts managers handle SAM.gov registration.',
      },
      size: {
        value: 'Small business',
        confidence: 0.9,
        inferredFrom: 'SAM.gov data',
        reasoning: 'SAM.gov small-business status for the industry code.',
      },
    },
    agentSteps: [
      'The AI was not available, so this plan was built from the keywords picked up in your description.',
      `Matched your description to industry code ${primaryCode} (${naicsTitle(primaryCode)}).`,
      hasPastClients
        ? `Noted ${intake.pastClients.length} past clients; they will be compared once lead data is loaded.`
        : 'No past clients were added.',
      keywordStates.length > 0
        ? `Picked locations named in your description: ${keywordStates.join(', ')}.`
        : 'No location was mentioned, so Virginia was used as a starting point.',
    ],
  };
}
