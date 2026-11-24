// Front-end API client: the only place screens talk to the server.
// Endpoint names follow docs/FRONTEND_HANDOFF.md Part 3 (GET /api/leads, POST /api/leads/[id]/enrich, ...).
// If an endpoint isn't there yet (or fails / 404s), we fall back to sample data read from
// lead.example.json and flag it as sample data, so screens can show a "Sample data" note.

import type {
  EnrichResult,
  IntakeData,
  Lead,
  LeadFilters,
  SegmentPlanResponse,
} from './types';

export type LeadsResult = { leads: Lead[]; isSample: boolean };
export type EnrichLeadResult = EnrichResult & { isSample: boolean };

// ---------- Segments (our AI route) ----------

export async function getSegmentPlan(intake: IntakeData): Promise<SegmentPlanResponse> {
  const res = await fetch('/api/segments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(intake),
  });
  if (!res.ok) throw new Error(`Segments request failed (${res.status})`);
  return res.json();
}

/** Cached SAM.gov totals keyed "naics|STATE" (e.g. "541512|VA"). Empty if nothing is cached. */
export async function getSamCounts(): Promise<Record<string, number>> {
  try {
    const res = await fetch('/api/sam-counts');
    if (!res.ok) return {};
    return (await res.json()).counts ?? {};
  } catch {
    return {};
  }
}

// ---------- Sample data (only from lead.example.json) ----------

let samplePromise: Promise<Lead[]> | null = null;
function getSampleLeads(): Promise<Lead[]> {
  samplePromise ??= fetch('/api/sample-leads')
    .then((res) => (res.ok ? res.json() : { leads: [] }))
    .then((body) => (body.leads ?? []) as Lead[])
    .catch(() => []);
  return samplePromise;
}

// ---------- Leads (Roshni's endpoints) ----------

/** GET /api/leads?naics=...&states=...&whyNowDays=... */
export async function getLeads(filters: LeadFilters): Promise<LeadsResult> {
  const params = new URLSearchParams({
    naics: filters.naics.join(','),
    states: filters.states.join(','),
    whyNowDays: String(filters.whyNowDays),
  });
  try {
    const res = await fetch(`/api/leads?${params}`);
    if (res.ok) {
      const body = await res.json();
      // Accept either a plain list or { leads: [...] }.
      const leads = (Array.isArray(body) ? body : body.leads) as Lead[] | undefined;
      if (Array.isArray(leads)) return { leads, isSample: false };
    }
  } catch {
    // Endpoint not there yet: use sample data below.
  }
  return { leads: await getSampleLeads(), isSample: true };
}

/** POST /api/leads/[id]/enrich */
export async function enrichLead(leadId: string): Promise<EnrichLeadResult> {
  try {
    const res = await fetch(`/api/leads/${encodeURIComponent(leadId)}/enrich`, { method: 'POST' });
    if (res.ok) return { ...((await res.json()) as EnrichResult), isSample: false };
  } catch {
    // Endpoint not there yet: use sample data below.
  }
  // Sample: use only what lead.example.json already says about this lead.
  const lead = (await getSampleLeads()).find((l) => l.id === leadId);
  return {
    email: lead?.email ?? null,
    emailStatus: lead?.emailStatus ?? 'unknown',
    emailConfidence: lead?.emailConfidence ?? null,
    website: lead?.website ?? null,
    isSample: true,
  };
}
