// Reads leads from Roshni's Moss "leads" index. READ ONLY: never creates, changes or deletes the index.
// Server only (API routes), so the Moss keys never reach the browser.

import 'server-only';
import { MossClient } from '@moss-js/moss';
import type { Lead } from './types';

const INDEX = 'leads';
const CACHE_MS = 60_000; // re-read Moss at most once a minute

let client: MossClient | null = null;
let cache: { at: number; leads: Lead[] } | null = null;

/** Thrown when a required .env value is missing; the route turns it into a plain message. */
export class MissingEnvError extends Error {}

function getClient(): MossClient {
  const { MOSS_PROJECT_ID, MOSS_PROJECT_KEY } = process.env;
  if (!MOSS_PROJECT_ID) throw new MissingEnvError('MOSS_PROJECT_ID is not set in .env');
  if (!MOSS_PROJECT_KEY) throw new MissingEnvError('MOSS_PROJECT_KEY is not set in .env');
  client ??= new MossClient(MOSS_PROJECT_ID, MOSS_PROJECT_KEY);
  return client;
}

/** All leads in the index. Each Moss document holds the full lead as JSON in metadata.lead. */
export async function getAllLeads(): Promise<Lead[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.leads;
  const docs = await getClient().getDocs(INDEX);
  const leads = docs
    .map((doc) => {
      try {
        return JSON.parse(String(doc.metadata?.lead)) as Lead;
      } catch {
        return null; // skip a broken document instead of failing the whole list
      }
    })
    .filter((lead): lead is Lead => lead !== null);
  cache = { at: Date.now(), leads };
  return leads;
}

let loaded: Promise<unknown> | null = null;
const MIN_SCORE = 0.05; // below this, Moss is saying "not really a match"

/** Search the index (read only). Returns lead id → match score, best first. */
export async function searchLeadIds(q: string): Promise<Map<string, number>> {
  const client = getClient();
  loaded ??= client.loadIndex(INDEX).catch((e) => {
    loaded = null; // let the next search try again
    throw e;
  });
  await loaded; // ~9 s the first time per server start, then searches take milliseconds
  const res = await client.query(INDEX, q, { topK: 10 });
  return new Map(res.docs.filter((d) => d.score > MIN_SCORE).map((d) => [d.id, d.score]));
}

export async function getLeadById(id: string): Promise<Lead | null> {
  return (await getAllLeads()).find((lead) => lead.id === id) ?? null;
}
