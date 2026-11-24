// GET /api/sample-leads  →  { leads: Lead[], found: boolean }
// Sample data used ONLY while Roshni's /api/leads isn't available yet.
// Reads lead.example.json (repo root, or data/lead.example.json). We never invent companies:
// if the file isn't there, this returns an empty list.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

const CANDIDATES = [
  path.join(process.cwd(), 'lead.example.json'),
  path.join(process.cwd(), 'data', 'lead.example.json'),
];

export async function GET() {
  for (const file of CANDIDATES) {
    try {
      const data = JSON.parse(await readFile(file, 'utf8'));
      // Accept a single lead, a list of leads, or { leads: [...] } (the clean-leads.mjs format).
      const leads = Array.isArray(data) ? data : Array.isArray(data?.leads) ? data.leads : [data];
      return NextResponse.json({ leads, found: true });
    } catch {
      // Try the next location.
    }
  }
  return NextResponse.json({ leads: [], found: false });
}
