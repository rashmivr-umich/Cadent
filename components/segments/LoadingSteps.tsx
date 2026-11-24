'use client';

// Shown while the AI works: steps appear one by one so it feels like progress, not a freeze.

import { useEffect, useState } from 'react';
import { Icon } from '@coinbase/cds-web/icons';
import { HStack, VStack } from '@coinbase/cds-web/layout';
import { Spinner } from '@coinbase/cds-web/loaders';
import { Text } from '@coinbase/cds-web/typography';

const STEPS = [
  'Reading your description…',
  'Matching industry codes…',
  'Checking past clients…',
  'Choosing locations…',
];

export function LoadingSteps() {
  const [shown, setShown] = useState(1);
  useEffect(() => {
    const timer = setInterval(() => setShown((n) => Math.min(n + 1, STEPS.length)), 900);
    return () => clearInterval(timer);
  }, []);

  return (
    <VStack gap={2} padding={4} bordered borderRadius={400} aria-live="polite">
      <Text as="h2" font="title3">
        Finding your ideal segments
      </Text>
      {STEPS.slice(0, shown).map((step, i) => {
        const current = i === shown - 1;
        return (
          <HStack key={step} gap={1.5} alignItems="center">
            {current ? <Spinner size={2} /> : <Icon name="checkmark" size="s" color="fgPositive" />}
            <Text as="p" font="body" color={current ? 'fg' : 'fgMuted'}>
              {step}
            </Text>
          </HStack>
        );
      })}
    </VStack>
  );
}
