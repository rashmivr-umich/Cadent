'use client';

// Placeholder for the ICP screen. For now it just shows what the intake saved.
// The real ICP step (Claude/Gemini turning this into a profile) comes later.

import { useRouter } from 'next/navigation';
import { Button } from '@coinbase/cds-web/buttons';
import { Box, VStack } from '@coinbase/cds-web/layout';
import { Text } from '@coinbase/cds-web/typography';
import { useIntake } from '@/lib/IntakeContext';

export default function IcpPlaceholderPage() {
  const router = useRouter();
  const { intake } = useIntake();

  return (
    <VStack gap={3} maxWidth={760} width="100%" paddingX={3} paddingY={5}>
      <VStack gap={1}>
        <Text as="h1" font="title1">
          Your ideal client profile
        </Text>
        <Text as="p" font="body" color="fgMuted">
          Placeholder: the profile will be generated here. Below is what the intake saved.
        </Text>
      </VStack>

      <Box bordered borderRadius={300} padding={3} background="bgAlternate" overflow="auto">
        <Text as="pre" font="label2" mono>
          {JSON.stringify(intake, null, 2)}
        </Text>
      </Box>

      <Box>
        <Button variant="secondary" startIcon="backArrow" onClick={() => router.push('/intake')}>
          Back to intake
        </Button>
      </Box>
    </VStack>
  );
}
