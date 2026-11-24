// Board stages + analytics, computed in the browser from the saved lead work (cadent.pipeline).
// Only real moves are counted: nothing here invents replies or meetings.

import type { LeadWork } from './PipelineContext';
import type { Stage } from './types';

/** The lead lifecycle from the brief, in order. */
export const STAGES: Stage[] = ['Matched', 'Contacted', 'Replied', 'Meeting Booked', 'Closed', 'Lost'];

/** The "progress" path used for conversion (Lost is an exit, not a step). */
export const FUNNEL: Stage[] = ['Matched', 'Contacted', 'Replied', 'Meeting Booked', 'Closed'];

/** Current number of leads in each stage. */
export function countByStage(items: LeadWork[]): Record<Stage, number> {
  const counts = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<Stage, number>;
  for (const item of items) counts[item.stage] += 1;
  return counts;
}

/** Has this lead ever reached this stage (or a later step on the funnel)? */
function reached(item: LeadWork, stage: Stage): boolean {
  const target = FUNNEL.indexOf(stage);
  return item.stageHistory.some((h) => FUNNEL.indexOf(h.stage) >= target && FUNNEL.includes(h.stage));
}

/** Conversion from each funnel step to the next, e.g. Contacted → Replied. null when nothing to divide by. */
export function conversions(items: LeadWork[]) {
  return FUNNEL.slice(0, -1).map((from, i) => {
    const to = FUNNEL[i + 1];
    const base = items.filter((it) => reached(it, from)).length;
    const next = items.filter((it) => reached(it, to)).length;
    return { from, to, base, next, rate: base === 0 ? null : Math.round((next / base) * 100) };
  });
}

/** Stage counts split by a grouping (tier, industry, …). */
export function countBy(items: LeadWork[], groupOf: (item: LeadWork) => string) {
  const groups = new Map<string, Record<Stage, number>>();
  for (const item of items) {
    const key = groupOf(item);
    if (!groups.has(key)) groups.set(key, Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<Stage, number>);
    groups.get(key)![item.stage] += 1;
  }
  return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

/** Every recorded move, split by who made it. */
export function movesBy(items: LeadWork[]) {
  let ai = 0;
  let person = 0;
  for (const item of items) for (const h of item.stageHistory) h.movedBy === 'ai' ? ai++ : person++;
  return { ai, person };
}
