'use client';

// Approval queue: every drafted email waits here. Nothing sends without Approve.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@coinbase/cds-web/buttons';
import { Box, VStack } from '@coinbase/cds-web/layout';
import { SegmentedTabs } from '@coinbase/cds-web/tabs';
import { Text } from '@coinbase/cds-web/typography';
import { usePipeline } from '@/lib/PipelineContext';
import { QueueCard } from './QueueCard';

type View = 'pending' | 'approved' | 'rejected';
const EMPTY: Record<View, string> = {
  pending: 'Nothing to review. Open a lead and click Draft email.',
  approved: 'No emails sent yet.',
  rejected: 'No rejected drafts.',
};

export function ApprovalQueue() {
  const router = useRouter();
  const { work } = usePipeline();
  const drafted = Object.values(work).filter((w) => w.draft && w.approval);
  const count = (v: View) => drafted.filter((w) => w.approval === v).length;

  const tabs = [
    { id: 'pending', label: `To review (${count('pending')})` },
    { id: 'approved', label: `Sent (${count('approved')})` },
    { id: 'rejected', label: `Rejected (${count('rejected')})` },
  ];
  const [view, setView] = useState<View>('pending');
  const items = drafted
    .filter((w) => w.approval === view)
    .sort((a, b) => a.lead.daysToExpiry - b.lead.daysToExpiry);

  return (
    <VStack gap={4} maxWidth={1120} width="100%" paddingX={3} paddingY={5}>
      <VStack gap={1}>
        <Text as="h1" font="title1">
          Approval queue
        </Text>
        <Text as="p" font="body" color="fgMuted">
          Review every email before it goes out. Approve to send, Edit to change it, or Reject.
        </Text>
      </VStack>

      <SegmentedTabs
        accessibilityLabel="Filter drafts"
        tabs={tabs}
        activeTab={tabs.find((t) => t.id === view) ?? null}
        onChange={(tab) => tab && setView(tab.id as View)}
        padding={0.5}
        borderRadius={400}
        width="fit-content"
        styles={{ activeIndicator: { borderRadius: 'var(--borderRadius-300)' } }}
      />

      {items.length === 0 ? (
        <VStack gap={1.5} padding={4} bordered borderRadius={400} alignItems="center">
          <Text as="p" font="body" color="fgMuted">
            {EMPTY[view]}
          </Text>
          {view === 'pending' && (
            <Box>
              <Button variant="secondary" onClick={() => router.push('/leads')}>
                Go to leads
              </Button>
            </Box>
          )}
        </VStack>
      ) : (
        <VStack gap={2}>
          {items.map((item) => (
            <QueueCard key={item.lead.id} item={item} />
          ))}
        </VStack>
      )}
    </VStack>
  );
}
