'use client';

// The audit log for one lead: every stage move, who made it (AI or a person) and when.

import { useRouter } from 'next/navigation';
import { Button } from '@coinbase/cds-web/buttons';
import { HStack, VStack } from '@coinbase/cds-web/layout';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@coinbase/cds-web/overlays';
import { Tag } from '@coinbase/cds-web/tag';
import { Text } from '@coinbase/cds-web/typography';
import type { LeadWork } from '@/lib/PipelineContext';
import { moverName } from './BoardCard';

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export function HistoryModal({
  item,
  personName,
  onClose,
}: {
  item: LeadWork | null;
  personName: string;
  onClose: () => void;
}) {
  const router = useRouter();
  if (!item) return null;
  const history = [...item.stageHistory].reverse(); // newest first

  return (
    <Modal visible onRequestClose={onClose}>
      <ModalHeader title={item.lead.legalName} />
      <ModalBody>
        <VStack gap={2}>
          <Text as="p" font="body" color="fgMuted">
            Every move of this lead, newest first.
          </Text>
          {history.map((h, i) => (
            <HStack key={`${h.at}-${i}`} gap={1.5} alignItems="center" justifyContent="space-between">
              <VStack>
                <Text as="span" font="headline">
                  {h.stage}
                </Text>
                <Text as="span" font="label2" color="fgMuted">
                  {dateTime(h.at)}
                </Text>
              </VStack>
              <Tag colorScheme={h.movedBy === 'ai' ? 'purple' : 'blue'} emphasis="low">
                {`Moved by ${moverName(h.movedBy, personName)}`}
              </Tag>
            </HStack>
          ))}
          {item.sent && (
            <Text as="p" font="label2" color="fgMuted">
              Outreach email approved and sent {dateTime(item.sent.sentAt)}.
            </Text>
          )}
        </VStack>
      </ModalBody>
      <ModalFooter
        primaryAction={<Button onClick={() => router.push(`/leads/${item.lead.id}`)}>Open lead</Button>}
        secondaryAction={
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        }
      />
    </Modal>
  );
}
