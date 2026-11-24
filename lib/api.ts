// Front-end API client: the only place screens talk to the server.
// Endpoint names follow docs/FRONTEND_HANDOFF.md Part 3 (GET /api/leads, POST /api/leads/[id]/enrich, ...).
// If an endpoint isn't there yet (or fails / 404s), we fall back to sample data read from
// lead.example.json and flag it as sample data, so screens can show a "Sample data" note.

import type {
  DraftResponse,
  EnrichResponse,
  IntakeData,
  Lead,
  LeadFilters,
  SegmentPlanResponse,
  Sender,
} from './types';

export type LeadsResult = {
  leads: Lead[];
  isSample: boolean;
  /** Plain-language error from the server (e.g. "MOSS_PROJECT_ID is not set in .env"). */
  error?: string;
  /** Leads that match the segments but renew later than the chosen window. */
  hiddenByDays?: number;
  totalInIndex?: number;
};

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
    const body = await res.json().catch(() => null);
    if (res.ok && Array.isArray(body?.leads)) {
      return {
        leads: body.leads as Lead[],
        isSample: false,
        hiddenByDays: body.hiddenByDays,
        totalInIndex: body.totalInIndex,
      };
    }
    // The endpoint exists but reported a problem: show its message, don't hide it behind samples.
    if (res.status !== 404) {
      return { leads: [], isSample: false, error: body?.error ?? `Couldn't load leads (${res.status})` };
    }
  } catch {
    // Network problem: fall through to sample data.
  }
  return { leads: await getSampleLeads(), isSample: true };
}

// ---------- One lead: detail, enrich, draft, approve ----------
// These throw an Error whose message is the server's plain-language reason
// (e.g. "HUNTER_API_KEY is not set in .env"), so screens can show it as-is.

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new Error("Couldn't reach the server. Is the app running?");
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? `Request failed (${res.status})`);
  return body as T;
}

const post = (body?: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body ?? {}),
});

/** GET /api/leads/[id] (naics = Maria's picked codes, so the fit score matches the table). */
export const getLead = (leadId: string, naics: string[] = []) =>
  call<Lead>(`/api/leads/${encodeURIComponent(leadId)}?naics=${naics.join(',')}`);

/** POST /api/leads/[id]/enrich: website + work email (shown only, never sent to). */
export const enrichLead = (leadId: string) =>
  call<EnrichResponse>(`/api/leads/${encodeURIComponent(leadId)}/enrich`, post());

/** POST /api/leads/[id]/draft: AI-written outreach email (or a labeled template). */
export const draftEmail = (leadId: string, sender: Sender, enrichment?: EnrichResponse) =>
  call<DraftResponse>(`/api/leads/${encodeURIComponent(leadId)}/draft`, post({ sender, enrichment }));

/** POST /api/leads/[id]/approve: sends ONLY to the demo inbox via sendDemoEmail. */
export const approveEmail = (leadId: string, subject: string, body: string) =>
  call<{ sentTo: string; sentAt: string }>(`/api/leads/${encodeURIComponent(leadId)}/approve`, post({ subject, body }));
