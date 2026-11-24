// "Why now" + fit score for a lead. Plain rules (no AI), so the numbers are explainable.
// Score out of 100:
//   Expiry:   ≤30 days 40–50 pts (sooner = more) · ≤60 days 35 · ≤90 days 20 · later 5 · expired 0
//   Industry: primary code is one Maria picked 30 pts · picked code in its other codes 15
//   Size:     small business for the matching code 20 pts
// Tier: A ≥ 75, B ≥ 50, else C. Shown as plain words plus the letter: "Strong fit · A" (fitText).

import type { Lead } from './types';

const DAY_MS = 86_400_000;

/** What each tier means on screen. */
export const FIT_LABELS = {
  A: { label: 'Strong fit', colorScheme: 'green' },
  B: { label: 'Good fit', colorScheme: 'yellow' },
  C: { label: 'Weak fit', colorScheme: 'gray' },
} as const;

/** "Strong fit · A" (the brief asks for the tier letter next to the score). */
export const fitText = (tier: 'A' | 'B' | 'C') => `${FIT_LABELS[tier].label} · ${tier}`;

/** Whole days from today (UTC) until the registration expires. Negative = already expired. */
export function daysUntil(dateText: string, today = new Date()): number {
  const start = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.round((new Date(`${dateText}T00:00:00Z`).getTime() - start) / DAY_MS);
}

const formatDate = (dateText: string) =>
  new Date(`${dateText}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

const isSmall = (flag: unknown) => flag === true || flag === 'Y' || flag === 'y';

export function scoreLead(lead: Lead, pickedNaics: string[]): Lead {
  const days = daysUntil(lead.registrationExpirationDate);
  const reasons: string[] = [];
  let score = 0;

  // Expiry
  if (days < 0) reasons.push('Registration already expired');
  else if (days <= 30) (score += 50 - Math.floor(days / 3)), reasons.push(`Expires in ${days} day${days === 1 ? '' : 's'}`);
  else if (days <= 60) (score += 35), reasons.push(`Expires in ${days} days`);
  else if (days <= 90) (score += 20), reasons.push(`Expires in ${days} days`);
  else (score += 5), reasons.push(`Expires in ${days} days (not urgent)`);

  // Industry match
  const codes = lead.naicsList ?? [];
  const primaryPicked = pickedNaics.length === 0 || pickedNaics.includes(lead.primaryNaics);
  const otherPicked = codes.find((c) => pickedNaics.includes(c.code));
  if (primaryPicked) (score += 30), reasons.push('Primary industry code matches');
  else if (otherPicked) (score += 15), reasons.push(`Also registered under ${otherPicked.code}`);

  // Size (small business for the matching code)
  const matchCode = primaryPicked ? lead.primaryNaics : otherPicked?.code;
  if (isSmall(codes.find((c) => c.code === matchCode)?.small)) {
    score += 20;
    reasons.push('Small business for this code');
  }

  const tier = score >= 75 ? 'A' : score >= 50 ? 'B' : 'C';
  const signals =
    days >= 0
      ? [`SAM.gov registration expires ${formatDate(lead.registrationExpirationDate)} (in ${days} day${days === 1 ? '' : 's'})`]
      : [`SAM.gov registration expired ${formatDate(lead.registrationExpirationDate)}`];

  return { ...lead, daysToExpiry: days, fitScore: score, tier, scoreReasons: reasons, signals };
}

/** Does this lead match Maria's chosen codes and states? (Expiry window is checked separately.) */
export function matchesSegments(lead: Lead, naics: string[], states: string[]): boolean {
  const codeOk =
    naics.length === 0 ||
    naics.includes(lead.primaryNaics) ||
    (lead.naicsList ?? []).some((c) => naics.includes(c.code));
  const stateOk = states.length === 0 || states.includes(lead.state);
  return codeOk && stateOk;
}
