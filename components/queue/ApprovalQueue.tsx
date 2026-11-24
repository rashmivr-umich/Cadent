'use client';

// Approval queue: every drafted email waits here. Nothing sends without Approve.
// "Approve & send all" sends every draft in "To review", one after another, after a confirmation.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Banner } from '@coinbase/cds-web/banner';
import { Button } from '@coinbase/cds-web/buttons';
import { Box, HStack, VStack } from '@coinbase/cds-web/layout';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@coinbase/cds-web/overlays';
import { SegmentedTabs } from '@coinbase/cds-web/tabs';
import { Text } from '@coinbase/cds-web/typography';
import { approveEmail } from '@/lib/api';
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
  const { work, update, moveStage } = usePipeline();
  const [confirmAll, setConfirmAll] = useState(false);
  const [sendingAll, setSendingAll] = useState<{ done: number; total: number } | null>(null);
  const [failures, setFailures] = useState<string[]>([]);
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
  const pending = drafted
    .filter((w) => w.approval === 'pending')
    .sort((a, b) => a.lead.daysToExpiry - b.lead.daysToExpiry);

  // Send every draft still in "To review", one at a time. A failed one stays in To review.
  const sendAll = async () => {
    setConfirmAll(false);
    setFailures([]);
    const batch = [...pending];
    const failed: string[] = [];
    for (let i = 0; i < batch.length; i++) {
      const item = batch[i];
      setSendingAll({ done: i, total: batch.length });
      const subject = item.edited?.subject ?? item.draft!.draftSubject;
      const body = item.edited?.body ?? item.draft!.draftBody;
      try {
        const sent = await approveEmail(item.lead.id, subject, body);
        update(item.lead.id, { approval: 'approved', sent });
        moveStage(item.lead.id, 'Contacted', 'person');
      } catch (e) {
        failed.push(`${item.lead.legalName}: ${(e as Error).message}`);
      }
    }
    setSendingAll(null);
    setFailures(failed);
  };

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

      <HStack justifyContent="space-between" alignItems="center" gap={2} flexWrap="wrap">
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
        {view === 'pending' && pending.length > 1 && (
          <Button
            variant="primary"
            startIcon="checkmark"
            onClick={() => setConfirmAll(true)}
            loading={!!sendingAll}
            disabled={!!sendingAll}
          >
            {`Approve & send all (${pending.length})`}
          </Button>
        )}
      </HStack>

      {sendingAll && (
        <Text as="p" font="body" color="fgMuted" aria-live="polite">
          Sending {sendingAll.done + 1} of {sendingAll.total}…
        </Text>
      )}
      {failures.length > 0 && (
        <Banner variant="error" styleVariant="inline" startIcon="error" title="Some emails were not sent">
          {failures.join(' · ')}
        </Banner>
      )}

      {confirmAll && (
        <Modal visible onRequestClose={() => setConfirmAll(false)}>
          <ModalHeader title={`Send ${pending.length} emails?`} />
          <ModalBody>
            <VStack gap={1.5}>
              <Text as="p" font="body">
                This approves and sends every draft in To review, one email per lead:
              </Text>
              <VStack as="ul" gap={0.5} paddingStart={2}>
                {pending.map((w) => (
                  <Text as="li" key={w.lead.id} font="body">
                    {w.lead.legalName}
                  </Text>
                ))}
              </VStack>
              <Text as="p" font="label2" color="fgMuted">
                Your edits are used. Each lead moves to Contacted on the board.
              </Text>
            </VStack>
          </ModalBody>
          <ModalFooter
            primaryAction={<Button onClick={sendAll}>{`Send ${pending.length} emails`}</Button>}
            secondaryAction={
              <Button variant="secondary" onClick={() => setConfirmAll(false)}>
                Cancel
              </Button>
            }
          />
        </Modal>
      )}

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
