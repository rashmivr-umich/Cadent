'use client';

// One lead on the board: name, fit + tier, days to expiry, last move, and "Move to…".
// Drag it to another column, or use the menu. Click it to see its full history.

import { Button } from '@coinbase/cds-web/buttons';
import { SelectOption } from '@coinbase/cds-web/controls';
import { Dropdown } from '@coinbase/cds-web/dropdown';
import { Box, HStack, VStack } from '@coinbase/cds-web/layout';
import { Tag } from '@coinbase/cds-web/tag';
import { Text } from '@coinbase/cds-web/typography';
import { expiryText } from '@/lib/leadFormat';
import { FIT_LABELS, fitText } from '@/lib/leadScore';
import type { LeadWork } from '@/lib/PipelineContext';
import { STAGES } from '@/lib/pipelineStats';
import type { Stage } from '@/lib/types';

export const timeText = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

export const moverName = (movedBy: 'ai' | 'person', personName: string) =>
  movedBy === 'ai' ? 'AI' : personName;

type Props = {
  item: LeadWork;
  personName: string;
  onMove: (stage: Stage) => void;
  onOpen: () => void;
};

export function BoardCard({ item, personName, onMove, onOpen }: Props) {
  const { lead } = item;
  const last = item.stageHistory[item.stageHistory.length - 1];
  const fit = lead.tier ? FIT_LABELS[lead.tier] : null;

  return (
    <VStack
      gap={1}
      padding={1.5}
      borderRadius={300}
      bordered
      background="bg"
      draggable
      onDragStart={(e: React.DragEvent) => e.dataTransfer.setData('text/plain', lead.id)}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && onOpen()}
      aria-label={`${lead.legalName}, ${item.stage}. Open history`}
      style={{ cursor: 'grab' }}
    >
      <Text as="p" font="headline">
        {lead.legalName}
      </Text>
      {fit && (
        <Box>
          <Tag colorScheme={fit.colorScheme} emphasis="low">
            {`${fitText(lead.tier!)} · ${lead.fitScore}`}
          </Tag>
        </Box>
      )}
      <Text as="p" font="label2" color={lead.daysToExpiry <= 30 ? 'fgNegative' : 'fgMuted'}>
        SAM.gov {expiryText(lead.daysToExpiry).toLowerCase()}
      </Text>
      {last && (
        <Text as="p" font="label2" color="fgMuted">
          Moved by {moverName(last.movedBy, personName)} · {timeText(last.at)}
        </Text>
      )}
      {/* Stop clicks here from also opening the history panel. */}
      <HStack onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <Dropdown
          value={item.stage}
          onChange={(value: string) => onMove(value as Stage)}
          width={180}
          content={
            <>
              {STAGES.map((s) => (
                <SelectOption key={s} value={s} title={s} />
              ))}
            </>
          }
        >
          <Button compact variant="secondary" endIcon="caretDown">
            Move to…
          </Button>
        </Dropdown>
      </HStack>
    </VStack>
  );
}
