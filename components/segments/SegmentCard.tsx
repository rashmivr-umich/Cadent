'use client';

// One industry segment as a card (sits in a row of 3).
// Layout: icon + tag on top → code & count → title → tags → reason → divider → confidence + Select button.

import { Button, IconButton } from '@coinbase/cds-web/buttons';
import { Icon } from '@coinbase/cds-web/icons';
import { Box, Divider, HStack, VStack } from '@coinbase/cds-web/layout';
import { Tag } from '@coinbase/cds-web/tag';
import { Text } from '@coinbase/cds-web/typography';
import type { IconName } from '@coinbase/cds-common/types/IconName';
import type { Segment } from '@/lib/types';
import { toPercent } from './ConfidenceMeta';

// A simple icon per industry code.
const NAICS_ICONS: Record<string, IconName> = {
  '541511': 'api', // custom programming
  '541512': 'laptop', // computer systems design
  '541513': 'building', // facilities management
  '541519': 'gear', // other computer services
  '518210': 'cloud', // hosting / data processing
  '541715': 'beaker', // research & development
};

type Props = {
  segment: Segment;
  selected: boolean;
  countLine: string; // "1,234 contractors in SAM.gov" or "Not searched yet"
  onToggle: () => void;
  onDismiss?: () => void;
};

export function SegmentCard({ segment, selected, countLine, onToggle, onDismiss }: Props) {
  const isPrimary = segment.kind === 'primary';

  return (
    <VStack
      gap={2}
      padding={3}
      borderRadius={500}
      bordered
      borderWidth={selected ? 200 : 100}
      borderColor={selected ? 'bgPrimary' : 'bgLine'}
      background="bg"
      height="100%"
    >
      {/* Top: icon + tag (+ dismiss for suggested) */}
      <HStack justifyContent="space-between" alignItems="center">
        <Box
          width={48}
          height={48}
          borderRadius={1000}
          bordered
          alignItems="center"
          justifyContent="center"
          background="bgAlternate"
        >
          <Icon name={NAICS_ICONS[segment.naicsCode] ?? 'briefcase'} size="m" color="fg" />
        </Box>
        <HStack gap={0.5} alignItems="center">
          <Tag colorScheme={isPrimary ? 'blue' : 'purple'} emphasis="low">
            {isPrimary ? 'Best match' : 'Suggested'}
          </Tag>
          {onDismiss && (
            <IconButton
              name="close"
              compact
              variant="tertiary"
              accessibilityLabel={`Dismiss ${segment.naicsTitle}`}
              onClick={onDismiss}
            />
          )}
        </HStack>
      </HStack>

      {/* Code, count and title */}
      <VStack gap={0.5}>
        <HStack gap={1} alignItems="baseline" flexWrap="wrap">
          <Text as="span" font="label1">
            NAICS {segment.naicsCode}
          </Text>
          <Text as="span" font="label2" color="fgMuted">
            {countLine}
          </Text>
        </HStack>
        <Text as="h3" font="title3">
          {segment.naicsTitle}
        </Text>
      </VStack>

      <HStack gap={1} flexWrap="wrap">
        <Tag colorScheme="gray" emphasis="low">
          {`From ${segment.inferredFrom}`}
        </Tag>
      </HStack>

      <Text as="p" font="body" color="fgMuted">
        {segment.reasoning}
      </Text>

      {/* Spacer pushes the footer to the bottom so all 3 cards line up */}
      <Box flexGrow={1} />
      <VStack gap={2}>
        <Divider />
        <HStack justifyContent="space-between" alignItems="center" gap={2}>
          <VStack>
            <Text as="span" font="title3">
              {toPercent(segment.confidence)}
            </Text>
            <Text as="span" font="label2" color="fgMuted">
              confidence
            </Text>
          </VStack>
          <Button
            variant={selected ? 'primary' : 'secondary'}
            startIcon={selected ? 'checkmark' : undefined}
            onClick={onToggle}
            aria-pressed={selected}
            accessibilityLabel={`${selected ? 'Deselect' : 'Select'} ${segment.naicsTitle}`}
          >
            {selected ? 'Selected' : 'Select'}
          </Button>
        </HStack>
      </VStack>
    </VStack>
  );
}
