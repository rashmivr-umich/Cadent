// POST /api/leads/[id]/enrich  →  { website, websiteSource, email, emailStatus, emailConfidence, agentUnsure }
// One lead at a time, only when someone clicks "Find email". The email is shown only, never sent to.

import { NextResponse } from 'next/server';
import { enrichLead, MissingKeyError } from '@/lib/enrich';
import { getLeadById, MissingEnvError } from '@/lib/moss';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const lead = await getLeadById(id);
    if (!lead) return NextResponse.json({ error: 'This lead was not found.' }, { status: 404 });
    return NextResponse.json(await enrichLead(lead));
  } catch (error) {
    if (error instanceof MissingKeyError || error instanceof MissingEnvError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    console.error('[enrich] failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Couldn't look up this lead's email. ${message}` }, { status: 502 });
  }
}
