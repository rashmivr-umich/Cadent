// GET /api/sam-counts  →  { counts: { "541512|VA": 1234, ... } }
// Reads the cached SAM.gov responses in data/sam_cache/ (saved by scripts/fetch-sam.mjs).
// Each file is named entities_<naics>_<state>_p<page>_<time>.json and holds the raw
// SAM.gov answer, which includes totalRecords. Read-only; never calls SAM.gov.
// If the folder doesn't exist on this computer, returns no counts ("Not searched yet").

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

const CACHE_DIR = path.join(process.cwd(), 'data', 'sam_cache');
const FILE_PATTERN = /^entities_(\d{6})_([A-Z]{2})_p\d+_.*\.json$/;

export async function GET() {
  const counts: Record<string, number> = {};
  let files: string[] = [];
  try {
    files = await readdir(CACHE_DIR);
  } catch {
    return NextResponse.json({ counts, cacheFound: false });
  }

  for (const file of files) {
    const match = file.match(FILE_PATTERN);
    if (!match) continue;
    const [, naics, state] = match;
    try {
      const data = JSON.parse(await readFile(path.join(CACHE_DIR, file), 'utf8'));
      if (typeof data.totalRecords === 'number') counts[`${naics}|${state}`] = data.totalRecords;
    } catch {
      // Skip files that aren't valid JSON (e.g. a failed request).
    }
  }
  return NextResponse.json({ counts, cacheFound: true });
}
