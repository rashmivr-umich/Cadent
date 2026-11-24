'use client';

// One industry segment as a selectable card. Click anywhere (or press Space/Enter) to toggle.
// Suggested cards also have a small Dismiss (×) button.

import { IconButton } from '@coinbase/cds-web/buttons';
import { Checkbox } from '@coinbase/cds-web/controls';
import { HStack, VStack } from '@coinbase/cds-web/layout';
import { Tag } from '@coinbase/cds-web/tag';
import { Text } from '@coinbase/cds-web/typography';
import type { Segment } from '@/lib/types';
import { ConfidenceMeta } from './ConfidenceMeta';

type Props = {
  segment: Segment;
  selected: boolean;
  countLine: string; // "1,234 contractors in SAM.gov" or "Not searched yet"
  onToggle: () => void;
  onDismiss?: () => void;
};

export function SegmentCard({ segment, selected, countLine, onToggle, onDismiss }: Props) {
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onToggle();
    }
  };

  return (
    <HStack
      role="checkbox"
      aria-checked={selected}
      aria-label={`${segment.naicsTitle} (${segment.naicsCode})`}
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={handleKey}
      gap={2}
      padding={3}
      borderRadius={400}
      bordered
      borderWidth={selected ? 200 : 100}
      borderColor={selected ? 'bgPrimary' : 'bgLine'}
      background={selected ? 'bgPrimaryWash' : 'bg'}
      style={{ cursor: 'pointer' }}
    >
      {/* Visual checkbox only; the whole card is the control. */}
      <VStack paddingTop={0.5} aria-hidden style={{ pointerEvents: 'none' }}>
        <Checkbox checked={selected} onChange={() => {}} tabIndex={-1} />
      </VStack>

      <VStack gap={1.5} flexGrow={1}>
        <HStack justifyContent="space-between" alignItems="flex-start" gap={2}>
          <VStack gap={0.5}>
            <HStack gap={1} alignItems="center" flexWrap="wrap">
              <Text as="h3" font="headline">
                {segment.naicsTitle}
              </Text>
              {segment.kind === 'suggested' && (
                <Tag colorScheme="purple" emphasis="low">
                  Suggested
                </Tag>
              )}
            </HStack>
            <Text as="span" font="label2" color="fgMuted">
              NAICS {segment.naicsCode} · {countLine}
            </Text>
          </VStack>
          {onDismiss && (
            <IconButton
              name="close"
              compact
              variant="tertiary"
              accessibilityLabel={`Dismiss ${segment.naicsTitle}`}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation(); // don't also toggle the card
                onDismiss();
              }}
            />
          )}
        </HStack>

        <Text as="p" font="body">
          {segment.reasoning}
        </Text>
        <ConfidenceMeta confidence={segment.confidence} inferredFrom={segment.inferredFrom} />
      </VStack>
    </HStack>
  );
}
