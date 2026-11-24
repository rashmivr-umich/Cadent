'use client';

// Progress list while "Prepare outreach" runs: one row per lead.

import { Button } from '@coinbase/cds-web/buttons';
import { Icon } from '@coinbase/cds-web/icons';
import { HStack, VStack } from '@coinbase/cds-web/layout';
import { Spinner } from '@coinbase/cds-web/loaders';
import { Text } from '@coinbase/cds-web/typography';
import type { LeadProgress } from '@/lib/usePrepareOutreach';

const STEP_TEXT = {
  waiting: 'Waiting…',
  finding: 'Finding email…',
  drafting: 'Drafting…',
  done: 'Draft ready',
  failed: 'Failed',
} as const;

export function OutreachProgress({
  progress,
  running,
  onOpenQueue,
}: {
  progress: LeadProgress[];
  running: boolean;
  onOpenQueue: () => void;
}) {
  const done = progress.filter((p) => p.status === 'done').length;

  return (
    <VStack gap={1.5} padding={3} bordered borderRadius={400} background="bg" aria-live="polite">
      <HStack justifyContent="space-between" alignItems="center">
        <Text as="h2" font="headline">
          {running ? `Preparing outreach… ${done} of ${progress.length}` : `${done} of ${progress.length} drafts ready`}
        </Text>
        {!running && (
          <Button variant="primary" endIcon="forwardArrow" onClick={onOpenQueue}>
            Review in queue
          </Button>
        )}
      </HStack>
      {progress.map((p) => (
        <HStack key={p.lead.id} gap={1.5} alignItems="center">
          {p.status === 'finding' || p.status === 'drafting' ? (
            <Spinner size={2} />
          ) : p.status === 'done' ? (
            <Icon name="checkmark" size="s" color="fgPositive" />
          ) : p.status === 'failed' ? (
            <Icon name="close" size="s" color="fgNegative" />
          ) : (
            <Icon name="clock" size="s" color="fgMuted" />
          )}
          <Text as="span" font="body" flexGrow={1}>
            {p.lead.legalName}
          </Text>
          <Text as="span" font="label2" color={p.status === 'failed' ? 'fgNegative' : 'fgMuted'}>
            {p.note ?? STEP_TEXT[p.status]}
          </Text>
        </HStack>
      ))}
      <Text as="p" font="label2" color="fgMuted">
        Nothing is sent yet. Each email waits in the approval queue until you click Approve & send.
      </Text>
    </VStack>
  );
}
