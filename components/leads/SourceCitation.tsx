'use client';

// "Source: SAM.gov · UEI ABC123" with a copy button (no link: the public record URL isn't confirmed).

import { useState } from 'react';
import { IconButton } from '@coinbase/cds-web/buttons';
import { HStack } from '@coinbase/cds-web/layout';
import { Text } from '@coinbase/cds-web/typography';

export function SourceCitation({ uei, compact = false }: { uei: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(uei);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked: nothing to do, the UEI is visible on screen.
    }
  };

  return (
    <HStack gap={0.5} alignItems="center">
      <Text as="span" font={compact ? 'label2' : 'body'} color="fgMuted">
        {compact ? `SAM.gov · ${uei}` : `Source: SAM.gov · UEI ${uei}`}
      </Text>
      <IconButton
        name={copied ? 'checkmark' : 'copy'}
        compact
        variant="tertiary"
        accessibilityLabel={copied ? 'Copied' : `Copy UEI ${uei}`}
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          copy();
        }}
      />
    </HStack>
  );
}
