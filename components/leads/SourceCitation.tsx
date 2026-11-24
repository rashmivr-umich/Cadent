'use client';

// "Source: SAM.gov · UEI ABC123" with a copy button (no link: the public record URL isn't confirmed).
// iconOnly: just the copy button (used in the leads table), with the UEI in its tooltip.

import { useState } from 'react';
import { IconButton } from '@coinbase/cds-web/buttons';
import { HStack } from '@coinbase/cds-web/layout';
import { Tooltip } from '@coinbase/cds-web/overlays';
import { Text } from '@coinbase/cds-web/typography';

export function SourceCitation({
  uei,
  compact = false,
  iconOnly = false,
}: {
  uei: string;
  compact?: boolean;
  iconOnly?: boolean;
}) {
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

  const button = (
    <IconButton
      name={copied ? 'checkmark' : 'copy'}
      compact
      variant="tertiary"
      accessibilityLabel={copied ? 'Copied' : `Copy SAM.gov UEI ${uei}`}
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        copy();
      }}
    />
  );

  if (iconOnly) {
    return <Tooltip content={copied ? 'Copied!' : `Copy SAM.gov UEI ${uei}`}>{button}</Tooltip>;
  }

  return (
    <HStack gap={0.5} alignItems="center">
      <Text as="span" font={compact ? 'label2' : 'body'} color="fgMuted">
        {compact ? `SAM.gov · ${uei}` : `Source: SAM.gov · UEI ${uei}`}
      </Text>
      {button}
    </HStack>
  );
}
