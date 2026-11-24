// Shared wording for lead screens (table, detail, approval queue, board).

import type { Lead } from './types';
import type { EmailUiState } from '@/components/leads/EmailStatusBadge';
import type { LeadWork } from './PipelineContext';

export const expiryText = (days: number) =>
  days < 0 ? 'Expired' : days === 0 ? 'Expires today' : `Expires in ${days} day${days === 1 ? '' : 's'}`;

/** "Dec 2" this year, "Jan 5, 2027" otherwise. long=true → "December 2, 2026". */
export const formatDate = (dateText: string | null | undefined, long = false) => {
  if (!dateText) return '—';
  const date = new Date(dateText.length === 10 ? `${dateText}T00:00:00Z` : dateText);
  const sameYear = date.getUTCFullYear() === new Date().getUTCFullYear();
  return date.toLocaleDateString('en-US', {
    month: long ? 'long' : 'short',
    day: 'numeric',
    ...(sameYear && !long ? {} : { year: 'numeric' }),
    timeZone: 'UTC',
  });
};

/** "BRISTOW" → "Bristow" so every city looks the same (SAM.gov data mixes cases). */
export const cityCase = (city: string) =>
  city === city.toUpperCase() ? city.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : city;

/** "SAMER SMITH" → "Samer Smith". */
export const nameCase = (name: string | null) =>
  name ? (name === name.toUpperCase() ? name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : name) : null;

/** Hide the trade name when it just repeats the legal name ("RMDSYS INC" vs "RMDSYS, INC."). */
const lettersOnly = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
export const showDba = (lead: Lead) =>
  !!lead.dbaName && lettersOnly(lead.dbaName) !== lettersOnly(lead.legalName);

/** Email badge state for a lead, using the email lookup result if there is one. */
export function emailUiState(lead: Lead, work?: LeadWork, finding = false): EmailUiState {
  if (finding) return { kind: 'finding' };
  const e = work?.enrichment;
  if (e) {
    if (!e.website) return { kind: 'noWebsite' };
    if (!e.email) return { kind: 'noEmail' };
    return { kind: 'found', status: e.emailStatus, confidence: e.emailConfidence };
  }
  if (lead.email && lead.emailStatus) {
    return { kind: 'found', status: lead.emailStatus, confidence: lead.emailConfidence ?? null };
  }
  return { kind: 'notChecked' };
}

/** "What the agent is unsure about" for a lead: lookup notes + draft notes, without repeats
 *  or contradictions (e.g. "Email not verified" when no email was found at all). */
export function unsureNotes(work?: LeadWork): string[] {
  if (!work) return [];
  const e = work.enrichment;
  const notes = [...(e?.agentUnsure ?? []), ...(work.draft?.agentUnsure ?? [])];
  const covered = (pattern: RegExp) => notes.some((n, i) => i < (e?.agentUnsure.length ?? 0) && pattern.test(n));
  const seen = new Set<string>();
  return notes.filter((note, i) => {
    const fromDraft = i >= (e?.agentUnsure.length ?? 0);
    if (fromDraft && /no website/i.test(note) && covered(/no website/i)) return false;
    if (fromDraft && /no (work )?email/i.test(note) && covered(/no (work )?email|no website/i)) return false;
    if (/not verified/i.test(note) && e && !e.email) return false;
    const key = note.toLowerCase().replace(/[^a-z]/g, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
