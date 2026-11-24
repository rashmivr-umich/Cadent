'use client';

// "Prepare outreach": for each selected lead, one after another:
//   1. find email (POST /api/leads/[id]/enrich), unless the lead already has a result
//   2. draft the email (POST /api/leads/[id]/draft)
// One lead failing never stops the batch. Nothing is sent: drafts wait in the approval queue.

import { useCallback, useState } from 'react';
import { draftEmail, enrichLead } from './api';
import { useIntake } from './IntakeContext';
import { usePipeline } from './PipelineContext';
import type { EnrichResponse, Lead } from './types';

export type StepStatus = 'waiting' | 'finding' | 'drafting' | 'done' | 'failed';
export type LeadProgress = { lead: Lead; status: StepStatus; note?: string };

export function usePrepareOutreach() {
  const { intake } = useIntake();
  const { work, track, update } = usePipeline();
  const [progress, setProgress] = useState<LeadProgress[]>([]);
  const [running, setRunning] = useState(false);

  const setStep = (leadId: string, status: StepStatus, note?: string) =>
    setProgress((list) => list.map((p) => (p.lead.id === leadId ? { ...p, status, note } : p)));

  const run = useCallback(
    async (leads: Lead[]) => {
      setRunning(true);
      setProgress(leads.map((lead) => ({ lead, status: 'waiting' })));
      const sender = { name: intake.userName, firm: intake.workspace.name, service: intake.serviceDescription };

      for (const lead of leads) {
        track(lead);
        const unsure: string[] = [];

        // 1. Email: reuse an earlier result (saves Hunter credits), otherwise look it up.
        let enrichment: EnrichResponse | undefined = work[lead.id]?.enrichment;
        if (!enrichment) {
          setStep(lead.id, 'finding');
          try {
            enrichment = await enrichLead(lead.id);
            update(lead.id, { enrichment });
          } catch (e) {
            unsure.push(`Email lookup failed: ${(e as Error).message}`);
          }
        }
        if (enrichment && !enrichment.email && !enrichment.agentUnsure.some((u) => /email/i.test(u))) {
          unsure.push('No email found.');
        }

        // 2. Draft (always, even without an email).
        setStep(lead.id, 'drafting');
        try {
          const draft = await draftEmail(lead.id, sender, enrichment);
          update(lead.id, {
            draft: { ...draft, agentUnsure: [...unsure, ...draft.agentUnsure], createdAt: new Date().toISOString() },
            edited: undefined,
            approval: 'pending',
          });
          const emailNote = enrichment?.email ? 'Email found' : 'No email found';
          setStep(lead.id, 'done', `${emailNote} · draft ready${draft.source === 'fallback' ? ' (template)' : ''}`);
        } catch (e) {
          setStep(lead.id, 'failed', `Couldn't draft: ${(e as Error).message}`);
        }
      }
      setRunning(false);
    },
    [intake, work, track, update],
  );

  return { run, running, progress, reset: () => setProgress([]) };
}
