// GET /api/leads/[id]?naics=541512,541519  →  Lead (with today's days-to-expiry and fit score)
// naics (optional) = Maria's picked codes, so the fit score matches the leads table.

import { NextResponse } from 'next/server';
import { scoreLead } from '@/lib/leadScore';
import { getLeadById, MissingEnvError } from '@/lib/moss';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const naics = (new URL(request.url).searchParams.get('naics') ?? '').split(',').filter(Boolean);
  try {
    const lead = await getLeadById(id);
    if (!lead) return NextResponse.json({ error: 'This lead was not found.' }, { status: 404 });
    return NextResponse.json(scoreLead(lead, naics));
  } catch (error) {
    const message = error instanceof MissingEnvError ? error.message : "Couldn't load this lead right now.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
