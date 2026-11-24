'use client';

// Collapsible "Agent thinking" panel: short titled lists of what the agent did and why.

import { useState } from 'react';
import { Button } from '@coinbase/cds-web/buttons';
import { Collapsible } from '@coinbase/cds-web/collapsible';
import { VStack } from '@coinbase/cds-web/layout';
import { Text } from '@coinbase/cds-web/typography';

export type ThinkingSection = { title: string; items: string[] };

export function ThinkingPanel({ sections }: { sections: ThinkingSection[] }) {
  const [open, setOpen] = useState(false);
  const visible = sections.filter((s) => s.items.length > 0);

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
          {visible.length === 0 && (
            <Text as="p" font="label2" color="fgMuted">
              Nothing yet.
            </Text>
          )}
          {visible.map((section) => (
            <VStack key={section.title} gap={0.5}>
              <Text as="p" font="label1">
                {section.title}
              </Text>
              <VStack as="ul" gap={0.5} paddingStart={2}>
                {section.items.map((item, i) => (
                  <Text as="li" key={i} font="label2" color="fgMuted">
                    {item}
                  </Text>
                ))}
              </VStack>
            </VStack>
          ))}
        </VStack>
      </Collapsible>
    </VStack>
  );
}
