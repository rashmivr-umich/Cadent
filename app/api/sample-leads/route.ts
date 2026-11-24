// GET /api/sample-leads  →  { leads: Lead[], found: boolean }
// Sample data used ONLY when /api/leads can't be reached. Reads ONLY data/lead.example.json
// (data/ is git-ignored, and lead.example.json is ignored everywhere: real lead data is never committed).
// We never invent companies: if the file isn't there, this returns an empty list.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

const SAMPLE_FILE = path.join(process.cwd(), 'data', 'lead.example.json');

export async function GET() {
  try {
    const data = JSON.parse(await readFile(SAMPLE_FILE, 'utf8'));
    // Accept a single lead, a list of leads, or { leads: [...] } (the clean-leads.mjs format).
    const leads = Array.isArray(data) ? data : Array.isArray(data?.leads) ? data.leads : [data];
    return NextResponse.json({ leads, found: true });
  } catch {
    return NextResponse.json({ leads: [], found: false });
  }
}
