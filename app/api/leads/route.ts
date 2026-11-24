// GET /api/leads?naics=541512,541511&states=VA,MD&whyNowDays=60
//   → { leads: Lead[], totalInIndex, matchedSegments, hiddenByDays }
// Reads the Moss "leads" index (read only), keeps leads that match the Segments choices and
// expire within whyNowDays, recalculates days-to-expiry + fit score, sorts best first.

import { NextResponse } from 'next/server';
import { scoreLead, matchesSegments } from '@/lib/leadScore';
import { getAllLeads, MissingEnvError } from '@/lib/moss';

export const runtime = 'nodejs'; // Moss uses a native module: not available on Edge
export const dynamic = 'force-dynamic'; // expiry days change every day

const list = (value: string | null) =>
  (value ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const naics = list(params.get('naics'));
  const states = list(params.get('states')).map((s) => s.toUpperCase());
  const whyNowDays = Number(params.get('whyNowDays')) || null; // null = no expiry limit

  try {
    const all = await getAllLeads();
    const matched = all.filter((lead) => matchesSegments(lead, naics, states)).map((lead) => scoreLead(lead, naics));
    const inWindow = matched.filter(
      (lead) => whyNowDays === null || (lead.daysToExpiry >= 0 && lead.daysToExpiry <= whyNowDays),
    );
    inWindow.sort((a, b) => (b.fitScore ?? 0) - (a.fitScore ?? 0) || a.daysToExpiry - b.daysToExpiry);

    return NextResponse.json({
      leads: inWindow,
      totalInIndex: all.length,
      matchedSegments: matched.length,
      hiddenByDays: matched.length - inWindow.length,
    });
  } catch (error) {
    if (error instanceof MissingEnvError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    console.error('[leads] Moss read failed:', error);
    return NextResponse.json(
      { error: "Couldn't load leads from Moss right now. Please try again." },
      { status: 502 },
    );
  }
}
