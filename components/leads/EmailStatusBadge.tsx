'use client';

// The email states every lead screen uses:
// "Finding email…" → "Verified" / "Risky" / "Unknown" badge (tooltip: confidence),
// or "No email found" / "No website found".

import { Tooltip } from '@coinbase/cds-web/overlays';
import { HStack } from '@coinbase/cds-web/layout';
import { Spinner } from '@coinbase/cds-web/loaders';
import { Tag } from '@coinbase/cds-web/tag';
import { Text } from '@coinbase/cds-web/typography';
import type { EmailStatus } from '@/lib/types';

export type EmailUiState =
  | { kind: 'finding' }
  | { kind: 'found'; status: EmailStatus; confidence: number | null }
  | { kind: 'noEmail' }
  | { kind: 'noWebsite' };

const STATUS = {
  verified: { label: 'Verified', colorScheme: 'green' },
  risky: { label: 'Risky', colorScheme: 'yellow' },
  unknown: { label: 'Unknown', colorScheme: 'gray' },
} as const;

export function EmailStatusBadge({ state }: { state: EmailUiState }) {
  if (state.kind === 'finding') {
    return (
      <HStack gap={1} alignItems="center">
        <Spinner size={1.5} />
        <Text as="span" font="label2" color="fgMuted">
          Finding email…
        </Text>
      </HStack>
    );
  }
  if (state.kind === 'noEmail' || state.kind === 'noWebsite') {
    return (
      <Text as="span" font="label2" color="fgMuted">
        {state.kind === 'noEmail' ? 'No email found' : 'No website found'}
      </Text>
    );
  }
  const s = STATUS[state.status];
  const tip = state.confidence == null ? 'Confidence not available' : `Confidence: ${state.confidence}%`;
  return (
    <Tooltip content={tip}>
      <Tag colorScheme={s.colorScheme} emphasis="low" tabIndex={0}>
        {s.label}
      </Tag>
    </Tooltip>
  );
}
