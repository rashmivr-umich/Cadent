// Local, instant keyword detection for the "What do you do?" step.
// No AI here: we just look for known phrases. Later this can be swapped for an AI call
// as long as it still returns DetectedKeyword[].

import type { DetectedKeyword, KeywordCategory } from './types';

export const CATEGORY_LABELS: Record<KeywordCategory, string> = {
  role: 'Role',
  serves: 'Serves',
  helpsWith: 'Helps with',
  location: 'Location',
};

// Highlight color per category, from the CDS theme's spectrum palette (soft tints).
// (CDS's "accentSubtle*" tokens were too pale to see behind text, so we use one step stronger.)
export const CATEGORY_COLORS: Record<KeywordCategory, string> = {
  role: 'rgb(var(--blue10))',
  serves: 'rgb(var(--green10))',
  helpsWith: 'rgb(var(--purple15))',
  location: 'rgb(var(--yellow10))',
};

const ROLE = [
  'compliance consultant',
  'government contracts consultant',
  'govcon consultant',
  'consultant',
  'accountant',
  'cpa',
  'advisor',
  'adviser',
  'compliance officer',
  'contracts manager',
  'attorney',
  'lawyer',
  'bookkeeper',
  'coach',
];

const SERVES = [
  'small government it contractors',
  'government it contractors',
  'small government contractors',
  'government contractors',
  'federal contractors',
  'defense contractors',
  'it contractors',
  'contractors',
  'small businesses',
  'small business',
  'nonprofits',
  'non-profits',
  'startups',
  'veteran-owned businesses',
  'woman-owned businesses',
  'minority-owned businesses',
  '8(a) firms',
];

const HELPS_WITH = [
  'sam registration',
  'sam.gov registration',
  'sam.gov',
  'registration renewals',
  'renewals',
  'renewal',
  'certifications',
  'certification',
  'compliance',
  'audits',
  'audit',
  'cmmc',
  'far compliance',
  'dcaa',
  'proposals',
  'bids',
  'size standards',
  'paperwork',
  'record keeping',
  'cybersecurity',
];

const STATE_NAMES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
  'Wisconsin', 'Wyoming', 'District of Columbia', 'Washington DC', 'Washington, D.C.',
];

// Abbreviations only match in UPPERCASE so words like "in", "or", "me" aren't picked up.
const STATE_ABBREVIATIONS = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA',
  'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT',
  'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
];

type Term = { text: string; category: KeywordCategory; caseSensitive: boolean };

// Longest phrases first, so "compliance consultant" wins over "consultant".
const TERMS: Term[] = [
  ...ROLE.map((text) => ({ text, category: 'role' as const, caseSensitive: false })),
  ...SERVES.map((text) => ({ text, category: 'serves' as const, caseSensitive: false })),
  ...HELPS_WITH.map((text) => ({ text, category: 'helpsWith' as const, caseSensitive: false })),
  ...STATE_NAMES.map((text) => ({ text, category: 'location' as const, caseSensitive: false })),
  ...STATE_ABBREVIATIONS.map((text) => ({ text, category: 'location' as const, caseSensitive: true })),
].sort((a, b) => b.text.length - a.text.length);

export type KeywordMatch = DetectedKeyword & { start: number; end: number };

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** A stable id for a keyword, used to remember which chips the user removed. */
export const keywordKey = (k: DetectedKeyword) => `${k.category}:${k.text.toLowerCase()}`;

/**
 * Find every known phrase in the text. Returns positions (for highlighting)
 * and never overlaps two matches.
 */
export function findKeywordMatches(text: string, terms: Term[] = TERMS): KeywordMatch[] {
  const matches: KeywordMatch[] = [];
  const taken = new Array<boolean>(text.length).fill(false);

  for (const term of terms) {
    // \b doesn't work next to "(" or ".", so use "not a letter/number" on each side instead.
    const pattern = new RegExp(
      `(?<![A-Za-z0-9])${escapeRegex(term.text)}(?![A-Za-z0-9])`,
      term.caseSensitive ? 'g' : 'gi',
    );
    for (const m of text.matchAll(pattern)) {
      const start = m.index ?? 0;
      const end = start + m[0].length;
      if (taken.slice(start, end).some(Boolean)) continue;
      for (let i = start; i < end; i++) taken[i] = true;
      matches.push({ category: term.category, text: m[0], start, end });
    }
  }
  return matches.sort((a, b) => a.start - b.start);
}

/** Unique keywords found in the text (what the chips show). */
export function detectKeywords(text: string): DetectedKeyword[] {
  const seen = new Set<string>();
  const result: DetectedKeyword[] = [];
  for (const m of findKeywordMatches(text)) {
    const key = keywordKey(m);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ category: m.category, text: m.text });
  }
  return result;
}
