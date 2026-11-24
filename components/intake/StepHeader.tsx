'use client';

import { VStack } from '@coinbase/cds-web/layout';
import { Text } from '@coinbase/cds-web/typography';

// Title + one-line explanation at the top of each step.
export function StepHeader({ title, description }: { title: string; description: string }) {
  return (
    <VStack gap={1}>
      <Text as="h2" font="title2">
        {title}
      </Text>
      <Text as="p" font="body" color="fgMuted">
        {description}
      </Text>
    </VStack>
  );
}
