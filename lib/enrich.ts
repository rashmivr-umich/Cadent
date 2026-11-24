// Enrichment: find a lead's website (Tavily, only if SAM.gov has none) and work email (Hunter).
// Server only. Called once per click on "Find email" — never in a loop (free plans are small).
// The email found here is ONLY shown on screen. It is never sent to.

import 'server-only';
import type { EmailStatus, EnrichResponse, Lead } from './types';

export class MissingKeyError extends Error {}

const TIMEOUT_MS = 15_000;

// Sites that list companies but aren't the company's own website.
const NOT_COMPANY_SITES =
  /linkedin|facebook|twitter|x\.com|instagram|youtube|sam\.gov|bizapedia|dnb\.com|zoominfo|opencorporates|govtribe|highergov|govspend|yelp|bbb\.org|mapquest|manta|crunchbase|glassdoor|indeed|bloomberg|usaspending|govcb|sba\.gov|wikipedia|buzzfile|corporationwiki/i;

const domainOf = (url: string) => new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '');

// Government sites are never a contractor's own website.
const GOVERNMENT_SITE = /\.(gov|mil)$/i;

// Words too common to prove a domain belongs to the company.
const GENERIC_WORDS = new Set([
  'llc', 'inc', 'corp', 'corporation', 'company', 'co', 'ltd', 'group', 'the', 'and', 'of',
  'services', 'service', 'solutions', 'consulting', 'technologies', 'technology', 'tech',
  'systems', 'global', 'international', 'associates', 'partners', 'enterprises', 'federal',
]);

/** Only trust a search result if its domain contains a distinctive word from the company name. */
function domainMatchesCompany(domain: string, legalName: string): boolean {
  const host = domain.toLowerCase().replace(/[^a-z0-9]/g, '');
  const words = legalName
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !GENERIC_WORDS.has(w));
  if (words.some((w) => host.includes(w))) return true;
  // Also accept initials, e.g. "Potomac Business Consulting" → "pbc".
  const initials = legalName
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !['llc', 'inc', 'corp', 'ltd', 'co', 'the', 'and', 'of'].includes(w))
    .map((w) => w[0])
    .join('');
  return initials.length >= 3 && host.includes(initials);
}

async function findWebsite(lead: Lead): Promise<string | null> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) throw new MissingKeyError('TAVILY_API_KEY is not set in .env');
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: `${lead.legalName} ${lead.city} ${lead.state} official website`, max_results: 8 }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Website search failed (${res.status})`);
  const data = await res.json();
  const urls: string[] = (data.results ?? []).map((r: { url?: string }) => r.url).filter(Boolean);
  // Skip directories and government sites, and only accept a domain that matches the company's name.
  // Better to say "No website found" than to guess wrong and look up someone else's email.
  const own = urls.find((u) => {
    const domain = domainOf(u);
    return !NOT_COMPANY_SITES.test(u) && !GOVERNMENT_SITE.test(domain) && domainMatchesCompany(domain, lead.legalName);
  });
  return own ? `https://${domainOf(own)}` : null;
}

async function hunter(path: string, query: Record<string, string>) {
  const key = process.env.HUNTER_API_KEY;
  if (!key) throw new MissingKeyError('HUNTER_API_KEY is not set in .env');
  const params = new URLSearchParams({ ...query, api_key: key });
  const res = await fetch(`https://api.hunter.io/v2/${path}?${params}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    // 404 / "no result" from the finder isn't an error: there's just no email.
    if (res.status === 404 || res.status === 400) return { data: null };
    throw new Error(`Email lookup failed (${res.status}): ${body?.errors?.[0]?.details ?? 'unknown'}`);
  }
  return body;
}

const toStatus = (hunterStatus: string | undefined): EmailStatus =>
  hunterStatus === 'valid' ? 'verified' : hunterStatus === 'accept_all' || hunterStatus === 'unknown' || !hunterStatus ? 'unknown' : 'risky';

export async function enrichLead(lead: Lead): Promise<EnrichResponse> {
  const agentUnsure: string[] = [];

  // 1. Website: SAM.gov first, else a web search (a guess).
  let website = lead.website;
  let websiteSource: EnrichResponse['websiteSource'] = website ? 'sam' : null;
  if (!website) {
    website = await findWebsite(lead);
    if (website) {
      websiteSource = 'search';
      agentUnsure.push('Website was found by a web search, not listed in SAM.gov; it may be wrong.');
    }
  }
  if (!website) {
    agentUnsure.push('No website found, so no work email could be looked up.');
    return { website: null, websiteSource: null, email: null, emailStatus: 'unknown', emailConfidence: null, agentUnsure };
  }

  // 2. Email: needs the contact's first + last name.
  const parts = (lead.contactName ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    agentUnsure.push('No contact name in SAM.gov, so no personal work email could be looked up.');
    return { website, websiteSource, email: null, emailStatus: 'unknown', emailConfidence: null, agentUnsure };
  }
  const domain = domainOf(website);
  const found = await hunter('email-finder', { domain, first_name: parts[0], last_name: parts[parts.length - 1] });
  const email: string | null = found?.data?.email ?? null;
  if (!email) {
    agentUnsure.push(`No work email found for ${lead.contactName} at ${domain}.`);
    return { website, websiteSource, email: null, emailStatus: 'unknown', emailConfidence: null, agentUnsure };
  }

  // 3. Verify it.
  const verified = await hunter('email-verifier', { email });
  const emailStatus = toStatus(verified?.data?.status);
  const emailConfidence: number | null = verified?.data?.score ?? found?.data?.score ?? null;
  if (emailStatus !== 'verified') agentUnsure.push('Email is not verified.');

  return { website, websiteSource, email, emailStatus, emailConfidence, agentUnsure };
}
