'use client';

// Board: Matched → Contacted → Replied → Meeting Booked → Closed → Lost.
// Leads from GET /api/leads start in Matched (moved by AI). Cards only move when Maria moves
// them (menu or drag) or when an email is approved. Nothing invents replies or meetings.

import { useEffect, useMemo, useState } from 'react';
import { Banner } from '@coinbase/cds-web/banner';
import { HStack, VStack } from '@coinbase/cds-web/layout';
import { Spinner } from '@coinbase/cds-web/loaders';
import { Text } from '@coinbase/cds-web/typography';
import { getLeads } from '@/lib/api';
import { useIntake } from '@/lib/IntakeContext';
import { usePipeline } from '@/lib/PipelineContext';
import { STAGES } from '@/lib/pipelineStats';
import type { Stage } from '@/lib/types';
import { BoardAnalytics } from './BoardAnalytics';
import { BoardCard } from './BoardCard';
import { HistoryModal } from './HistoryModal';

export function BoardScreen() {
  const { hydrated, intake, targeting } = useIntake();
  const { work, track, moveStage } = usePipeline();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<Stage | null>(null);
  const personName = intake.userName.trim().split(/\s+/)[0] || 'you';

  // Make sure every current lead has a card (new ones start in Matched, moved by AI).
  useEffect(() => {
    if (!hydrated) return;
    getLeads(
      targeting
        ? {
            naics: targeting.segments.map((s) => s.naicsCode),
            states: targeting.states,
            whyNowDays: targeting.whyNowDays,
          }
        : { naics: [], states: [], whyNowDays: 90 },
    )
      .then((res) => {
        if (res.error) setError(res.error);
        else if (!res.isSample) res.leads.forEach(track);
      })
      .finally(() => setLoading(false));
  }, [hydrated, targeting, track]);

  const items = useMemo(
    () => Object.values(work).sort((a, b) => a.lead.daysToExpiry - b.lead.daysToExpiry),
    [work],
  );
  const move = (leadId: string, stage: Stage) => moveStage(leadId, stage, 'person');

  return (
    <VStack gap={4} width="100%" maxWidth={1440} paddingX={3} paddingY={5}>
      <VStack gap={1}>
        <Text as="h1" font="title1">
          Board
        </Text>
        <Text as="p" font="body" color="fgMuted">
          Move a lead with “Move to…” or drag it to another column. Click a card to see who moved it and when.
        </Text>
      </VStack>

      {error && (
        <Banner variant="error" styleVariant="inline" startIcon="error" title="Couldn't load leads">
          {error}
        </Banner>
      )}

      <BoardAnalytics items={items} />

      {loading && items.length === 0 ? (
        <HStack gap={1.5} alignItems="center">
          <Spinner size={2} />
          <Text as="p" font="body" color="fgMuted">
            Loading leads…
          </Text>
        </HStack>
      ) : (
        <HStack gap={1.5} alignItems="flex-start" overflow="auto" paddingBottom={2}>
          {STAGES.map((stage) => {
            const cards = items.filter((it) => it.stage === stage);
            return (
              <VStack
                key={stage}
                gap={1}
                padding={1.5}
                borderRadius={400}
                background={dragOver === stage ? 'bgPrimaryWash' : 'bgAlternate'}
                bordered={dragOver === stage}
                borderColor="bgPrimary"
                minWidth={220}
                flexBasis={220}
                flexGrow={1}
                minHeight={240}
                onDragOver={(e: React.DragEvent) => {
                  e.preventDefault();
                  setDragOver(stage);
                }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e: React.DragEvent) => {
                  e.preventDefault();
                  setDragOver(null);
                  const id = e.dataTransfer.getData('text/plain');
                  if (id && work[id] && work[id].stage !== stage) move(id, stage);
                }}
              >
                <HStack justifyContent="space-between" alignItems="center" paddingX={0.5}>
                  <Text as="h2" font="headline">
                    {stage}
                  </Text>
                  <Text as="span" font="label1" color="fgMuted">
                    {cards.length}
                  </Text>
                </HStack>
                {cards.length === 0 && (
                  <Text as="p" font="label2" color="fgMuted" paddingX={0.5}>
                    No leads
                  </Text>
                )}
                {cards.map((item) => (
                  <BoardCard
                    key={item.lead.id}
                    item={item}
                    personName={personName}
                    onMove={(s) => move(item.lead.id, s)}
                    onOpen={() => setOpenId(item.lead.id)}
                  />
                ))}
              </VStack>
            );
          })}
        </HStack>
      )}

      <HistoryModal item={openId ? work[openId] ?? null : null} personName={personName} onClose={() => setOpenId(null)} />
    </VStack>
  );
}
