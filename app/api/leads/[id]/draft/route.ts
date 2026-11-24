// POST /api/leads/[id]/draft  body (optional) { sender: {name, firm, service}, enrichment }
//   → { draftSubject, draftBody, agentUnsure[], agentSteps[], source: "ai" | "fallback" }
// Writes the outreach email with Gemini (lib/ai.ts). If the AI fails, returns a clearly labeled
// template so the demo never breaks. Nothing is sent here; sending happens only on Approve.

import { NextResponse } from 'next/server';
import { draftOutreach, fallbackDraft } from '@/lib/ai';
import { scoreLead } from '@/lib/leadScore';
import { getLeadById, MissingEnvError } from '@/lib/moss';
import type { EnrichResponse, Sender } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const input = (await request.json().catch(() => ({}))) as {
    sender?: Partial<Sender>;
    enrichment?: Partial<EnrichResponse>;
  };
  const sender: Sender = {
    name: input.sender?.name?.trim() || '',
    firm: input.sender?.firm?.trim() || '',
    service: input.sender?.service?.trim() || '',
  };

  let lead;
  try {
    const found = await getLeadById(id);
    if (!found) return NextResponse.json({ error: 'This lead was not found.' }, { status: 404 });
    lead = scoreLead(found, []); // fresh days-to-expiry
  } catch (error) {
    const message = error instanceof MissingEnvError ? error.message : "Couldn't load this lead right now.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  try {
    return NextResponse.json(await draftOutreach(lead, sender, input.enrichment));
  } catch (error) {
    let reason = error instanceof Error ? error.message : 'Unknown error';
    try {
      reason = JSON.parse(reason)?.error?.message ?? reason;
    } catch {}
    console.warn('[draft] Using template:', reason);
    return NextResponse.json(fallbackDraft(lead, sender, reason));
  }
}
