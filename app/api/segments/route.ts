// POST /api/segments  body: IntakeData  →  SegmentPlanResponse
// Asks the AI for a segment plan. If the key is missing or the call fails,
// returns a clearly labeled fallback plan so the demo never breaks.

import { NextResponse } from 'next/server';
import { suggestSegments } from '@/lib/ai';
import { buildFallbackPlan } from '@/lib/segmentPlan';
import { emptyIntake, type IntakeData, type SegmentPlanResponse } from '@/lib/types';

export async function POST(request: Request) {
  const intake: IntakeData = { ...emptyIntake, ...(await request.json().catch(() => ({}))) };

  let body: SegmentPlanResponse;
  try {
    body = { plan: await suggestSegments(intake), source: 'ai' };
  } catch (error) {
    let reason = error instanceof Error ? error.message : 'Unknown error';
    if (error instanceof Error && error.name === 'AbortError') reason = 'The AI took too long to answer.';
    // Google sends errors as JSON text; keep just the human-readable message.
    try {
      reason = JSON.parse(reason)?.error?.message ?? reason;
    } catch {}
    console.warn('[segments] Using fallback plan:', reason);
    body = { plan: buildFallbackPlan(intake), source: 'fallback', fallbackReason: reason };
  }
  return NextResponse.json(body);
}
