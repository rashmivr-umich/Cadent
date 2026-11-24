// POST /api/leads/[id]/approve  body { subject, body }  →  { sentTo, sentAt }
// Sends ONLY through Roshni's sendDemoEmail(), which can only ever send to DEMO_RECIPIENT.
// We never pass a recipient. The lead's real email (from Hunter) is never used here.

import { NextResponse } from 'next/server';
import { sendDemoEmail, DemoEmailBlocked } from '../../../../../lib/demo-email.mjs'; // relative path per the guide
import { getLeadById, MissingEnvError } from '@/lib/moss';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { subject, body } = (await request.json().catch(() => ({}))) as { subject?: string; body?: string };
  if (!subject?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'Subject and body are required. Nothing was sent.' }, { status: 400 });
  }

  try {
    const lead = await getLeadById(id);
    if (!lead) return NextResponse.json({ error: 'This lead was not found. Nothing was sent.' }, { status: 404 });
    const sent = await sendDemoEmail({ subject, body, leadName: lead.legalName }); // no recipient, ever
    return NextResponse.json({ sentTo: sent.sentTo, sentAt: sent.sentAt });
  } catch (error) {
    // Errors like "DEMO_RECIPIENT is not set. Nothing was sent." go straight to the screen.
    if (error instanceof DemoEmailBlocked || error instanceof MissingEnvError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('[approve] send failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `The email was not sent. ${message}` }, { status: 502 });
  }
}
