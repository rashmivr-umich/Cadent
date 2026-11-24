'use client';

// Shows how sure the AI is: "92%" with a subtle bar, plus a small grey "Inferred from …" line.

import { HStack, VStack } from '@coinbase/cds-web/layout';
import { Text } from '@coinbase/cds-web/typography';
import { ProgressBar } from '@coinbase/cds-web/visualizations';

export const toPercent = (confidence: number) => `${Math.round(confidence * 100)}%`;

export function ConfidenceMeta({
  confidence,
  inferredFrom,
  note,
}: {
  confidence: number;
  inferredFrom?: string;
  /** Replaces the "Inferred from" line (e.g. for company size). */
  note?: string;
}) {
  return (
    <VStack gap={0.5}>
      <HStack gap={1} alignItems="center">
        <Text as="span" font="label1" color="fg">
          {toPercent(confidence)}
        </Text>
        <VStack width={72}>
          <ProgressBar progress={confidence} weight="thin" color="fgMuted" />
        </VStack>
        <Text as="span" font="label2" color="fgMuted">
          confidence
        </Text>
      </HStack>
      <Text as="span" font="label2" color="fgMuted">
        {note ?? `Inferred from ${inferredFrom}`}
      </Text>
    </VStack>
  );
}
