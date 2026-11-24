'use client';

// Collapsible "Agent thinking" panel: what the agent did, and why it chose each item.

import { useState } from 'react';
import { Button } from '@coinbase/cds-web/buttons';
import { Collapsible } from '@coinbase/cds-web/collapsible';
import { VStack } from '@coinbase/cds-web/layout';
import { Text } from '@coinbase/cds-web/typography';
import { stateName } from '@/lib/usStates';
import type { SegmentPlan } from '@/lib/types';

export function AgentThinkingPanel({ plan }: { plan: SegmentPlan }) {
  const [open, setOpen] = useState(false);
  const t = plan.targeting;

  // Each chosen item and the one-sentence reason behind it.
  const reasons = [
    ...plan.segments.map((s) => ({ item: `${s.naicsTitle} (${s.naicsCode})`, reason: s.reasoning })),
    { item: `Location: ${t.states.selected.map(stateName).join(', ') || 'none'}`, reason: t.states.reasoning },
    { item: `Why now: within ${t.whyNowDays.value} days`, reason: t.whyNowDays.reasoning },
    { item: `Contacts: ${t.contactTitles.selected.join(', ')}`, reason: t.contactTitles.reasoning },
    { item: 'Size: Small business', reason: t.size.reasoning },
  ].filter((r) => r.reason);

  return (
    <VStack bordered borderRadius={400} padding={2} gap={1} background="bgAlternate">
      <Button
        variant="tertiary"
        compact
        block
        endIcon={open ? 'caretUp' : 'caretDown'}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        Agent thinking
      </Button>
      <Collapsible collapsed={!open}>
        <VStack gap={2} padding={1}>
          <VStack as="ol" gap={1} paddingStart={2}>
            {plan.agentSteps.map((step, i) => (
              <Text as="li" key={i} font="label2">
                {step}
              </Text>
            ))}
          </VStack>
          <VStack gap={1.5} borderedTop paddingTop={2}>
            {reasons.map((r) => (
              <VStack key={r.item} gap={0.25}>
                <Text as="p" font="label1">
                  {r.item}
                </Text>
                <Text as="p" font="label2" color="fgMuted">
                  {r.reason}
                </Text>
              </VStack>
            ))}
          </VStack>
        </VStack>
      </Collapsible>
    </VStack>
  );
}
