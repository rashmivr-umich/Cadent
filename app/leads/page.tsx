'use client';

// Placeholder Leads page: shows the saved Segments choices and what getLeads() returns.
// The real leads table comes next.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@coinbase/cds-web/buttons';
import { Box, HStack, VStack } from '@coinbase/cds-web/layout';
import { Tag } from '@coinbase/cds-web/tag';
import { Text } from '@coinbase/cds-web/typography';
import { EmailStatusBadge, type EmailUiState } from '@/components/leads/EmailStatusBadge';
import { getLeads, type LeadsResult } from '@/lib/api';
import { useIntake } from '@/lib/IntakeContext';
import type { Lead } from '@/lib/types';

const emailState = (lead: Lead): EmailUiState =>
  lead.email && lead.emailStatus
    ? { kind: 'found', status: lead.emailStatus, confidence: lead.emailConfidence ?? null }
    : lead.website
      ? { kind: 'noEmail' }
      : { kind: 'noWebsite' };

export default function LeadsPlaceholderPage() {
  const router = useRouter();
  const { hydrated, targeting } = useIntake();
  const [result, setResult] = useState<LeadsResult | null>(null);

  useEffect(() => {
    if (!targeting) return;
    getLeads({
      naics: targeting.segments.map((s) => s.naicsCode),
      states: targeting.states,
      days: targeting.whyNowDays,
    }).then(setResult);
  }, [targeting]);

  if (hydrated && !targeting) {
    return (
      <VStack gap={2} maxWidth={760} width="100%" paddingX={3} paddingY={5}>
        <Text as="h1" font="title2">
          No segments chosen yet
        </Text>
        <Box>
          <Button onClick={() => router.push('/segments')}>Go to segments</Button>
        </Box>
      </VStack>
    );
  }

  return (
    <VStack gap={3} maxWidth={760} width="100%" paddingX={3} paddingY={5}>
      <Box>
        <Button variant="tertiary" compact startIcon="backArrow" onClick={() => router.push('/segments')}>
          Back to segments
        </Button>
      </Box>
      <VStack gap={1}>
        <Text as="h1" font="title1">
          Your leads
        </Text>
        <Text as="p" font="body" color="fgMuted">
          Placeholder: the leads table comes next. Below are your saved choices and the leads returned.
        </Text>
      </VStack>

      <Box bordered borderRadius={300} padding={3} background="bgAlternate" overflow="auto">
        <Text as="pre" font="label2" mono>
          {JSON.stringify(targeting, null, 2)}
        </Text>
      </Box>

      <VStack gap={1.5}>
        <HStack gap={1} alignItems="center">
          <Text as="h2" font="title3">
            Leads
          </Text>
          {result?.isSample && (
            <Tag colorScheme="yellow" emphasis="low">
              Sample data
            </Tag>
          )}
        </HStack>
        {!result && (
          <Text as="p" font="body" color="fgMuted">
            Loading leads…
          </Text>
        )}
        {result && result.leads.length === 0 && (
          <Text as="p" font="body" color="fgMuted">
            {result.isSample
              ? 'No sample data yet. Lead data appears here once /api/leads is available or lead.example.json is added.'
              : 'No leads match these choices.'}
          </Text>
        )}
        {result?.leads.map((lead) => (
          <HStack key={lead.id} justifyContent="space-between" padding={2} bordered borderRadius={300} gap={2}>
            <VStack gap={0.5}>
              <Text as="p" font="headline">
                {lead.legalName}
              </Text>
              <Text as="p" font="label2" color="fgMuted">
                {lead.city}, {lead.state} · NAICS {lead.primaryNaics}
              </Text>
              {lead.signals?.[0] && (
                <Text as="p" font="label2">
                  {lead.signals[0]}
                </Text>
              )}
            </VStack>
            <EmailStatusBadge state={emailState(lead)} />
          </HStack>
        ))}
      </VStack>
    </VStack>
  );
}
