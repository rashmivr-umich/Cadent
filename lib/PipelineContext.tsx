'use client';

// The work done on each lead: email lookup, draft, approve/reject, stage + history.
// Saved in the browser's localStorage (no database, per docs/FRONTEND_HANDOFF.md).
// The board and analytics will read the same data.

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ApprovalStatus, DraftResponse, EnrichResponse, Lead, Stage } from './types';

const STORAGE_KEY = 'cadent.pipeline';

export type LeadWork = {
  lead: Lead; // snapshot so the queue/board can show it without re-fetching
  enrichment?: EnrichResponse;
  draft?: DraftResponse & { createdAt: string };
  /** What Maria edited (subject/body), if anything. */
  edited?: { subject: string; body: string };
  approval: ApprovalStatus | null; // null until a draft exists
  sent?: { sentTo: string; sentAt: string };
  stage: Stage;
  stageHistory: { stage: Stage; movedBy: 'ai' | 'person'; at: string }[];
};

type PipelineValue = {
  work: Record<string, LeadWork>;
  /** Create (or refresh the lead snapshot of) a lead's record. */
  track: (lead: Lead) => void;
  update: (leadId: string, changes: Partial<LeadWork>) => void;
  moveStage: (leadId: string, stage: Stage, movedBy: 'ai' | 'person') => void;
};

const PipelineContext = createContext<PipelineValue | null>(null);

export function PipelineProvider({ children }: { children: React.ReactNode }) {
  const [work, setWork] = useState<Record<string, LeadWork>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setWork(JSON.parse(saved));
    } catch {
      // Broken saved data: start fresh.
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(work));
  }, [work, loaded]);

  const track = useCallback((lead: Lead) => {
    setWork((all) => {
      const existing = all[lead.id];
      if (existing) return { ...all, [lead.id]: { ...existing, lead } };
      const at = new Date().toISOString();
      return {
        ...all,
        [lead.id]: { lead, approval: null, stage: 'Matched', stageHistory: [{ stage: 'Matched', movedBy: 'ai', at }] },
      };
    });
  }, []);

  const update = useCallback((leadId: string, changes: Partial<LeadWork>) => {
    setWork((all) => (all[leadId] ? { ...all, [leadId]: { ...all[leadId], ...changes } } : all));
  }, []);

  const moveStage = useCallback((leadId: string, stage: Stage, movedBy: 'ai' | 'person') => {
    setWork((all) => {
      const item = all[leadId];
      if (!item || item.stage === stage) return all;
      const entry = { stage, movedBy, at: new Date().toISOString() };
      return { ...all, [leadId]: { ...item, stage, stageHistory: [...item.stageHistory, entry] } };
    });
  }, []);

  return (
    <PipelineContext.Provider value={{ work, track, update, moveStage }}>{children}</PipelineContext.Provider>
  );
}

export function usePipeline() {
  const value = useContext(PipelineContext);
  if (!value) throw new Error('usePipeline must be used inside <PipelineProvider>');
  return value;
}
