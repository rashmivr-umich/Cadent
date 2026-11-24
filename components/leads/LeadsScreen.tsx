'use client';

// Leads screen: real leads from Moss (via GET /api/leads), filtered by the Segments choices.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Banner } from '@coinbase/cds-web/banner';
import { Button } from '@coinbase/cds-web/buttons';
import { Box, HStack, VStack } from '@coinbase/cds-web/layout';
import { Spinner } from '@coinbase/cds-web/loaders';
import { Tag } from '@coinbase/cds-web/tag';
import { Text } from '@coinbase/cds-web/typography';
import { getLeads, type LeadsResult } from '@/lib/api';
import { useIntake } from '@/lib/IntakeContext';
import { stateName } from '@/lib/usStates';
import { LeadsTable } from './LeadsTable';

export function LeadsScreen() {
  const router = useRouter();
  const { hydrated, targeting } = useIntake();
  const [result, setResult] = useState<LeadsResult | null>(null);

  useEffect(() => {
    if (!targeting) return;
    setResult(null);
    getLeads({
      naics: targeting.segments.map((s) => s.naicsCode),
      states: targeting.states,
      whyNowDays: targeting.whyNowDays,
    }).then(setResult);
  }, [targeting]);

  if (hydrated && !targeting) {
    return (
      <VStack gap={2} maxWidth={760} width="100%" paddingX={3} paddingY={5}>
        <Text as="h1" font="title2">
          Choose your segments first
        </Text>
        <Text as="p" font="body" color="fgMuted">
          Leads are filtered by the industries, states and timing you pick on the Segments screen.
        </Text>
        <Box>
          <Button onClick={() => router.push('/segments')}>Go to segments</Button>
        </Box>
      </VStack>
    );
  }

  const count = result?.leads.length ?? 0;

  return (
    <VStack gap={4} maxWidth={1200} width="100%" paddingX={3} paddingY={5}>
      <Box>
        <Button variant="tertiary" compact startIcon="backArrow" onClick={() => router.push('/segments')}>
          Edit segments
        </Button>
      </Box>

      {/* Header: title + the choices these leads are filtered by */}
      {targeting && (
        <VStack gap={1.5}>
          <HStack gap={1} alignItems="center">
            <Text as="h1" font="title1">
              Your leads
            </Text>
            {result?.isSample && (
              <Tag colorScheme="yellow" emphasis="low">
                Sample data
              </Tag>
            )}
          </HStack>
          <HStack gap={1} flexWrap="wrap">
            {targeting.segments.map((s) => (
              <Tag key={s.naicsCode} colorScheme="gray" emphasis="low">
                {`${s.naicsTitle} · ${s.naicsCode}`}
              </Tag>
            ))}
            <Tag colorScheme="gray" emphasis="low">
              {targeting.states.map(stateName).join(', ')}
            </Tag>
            <Tag colorScheme="gray" emphasis="low">
              {`Renews within ${targeting.whyNowDays} days`}
            </Tag>
          </HStack>
        </VStack>
      )}

      {!result && (
        <HStack gap={1.5} alignItems="center">
          <Spinner size={2} />
          <Text as="p" font="body" color="fgMuted">
            Loading leads from SAM.gov data…
          </Text>
        </HStack>
      )}

      {result?.error && (
        <Banner variant="error" styleVariant="inline" startIcon="error" title="Couldn't load leads">
          {result.error}
        </Banner>
      )}

      {result && !result.error && (
        <VStack gap={2}>
          <Text as="p" font="label1" color="fgMuted">
            {count} lead{count === 1 ? '' : 's'}, best fit first
            {result.hiddenByDays
              ? ` · ${result.hiddenByDays} more renew after ${targeting?.whyNowDays} days`
              : ''}
          </Text>

          {count > 0 ? (
            <>
              <LeadsTable leads={result.leads} />
              {/* Placeholder for now: doesn't load anything yet (only 10 leads exist in Moss). */}
              <HStack justifyContent="center" paddingTop={1}>
                <Button variant="secondary" endIcon="caretDown">
                  {result.hiddenByDays
                    ? `Show ${result.hiddenByDays} more lead${result.hiddenByDays === 1 ? '' : 's'} that renew later`
                    : 'View more leads'}
                </Button>
              </HStack>
            </>
          ) : (
            <VStack gap={1} padding={4} bordered borderRadius={400} alignItems="center">
              <Text as="p" font="headline">
                No leads match these choices
              </Text>
              <Text as="p" font="body" color="fgMuted">
                {result.isSample
                  ? 'No sample data yet.'
                  : 'Try another state, more industry codes, or a longer renewal window.'}
              </Text>
              <Box paddingTop={1}>
                <Button variant="secondary" onClick={() => router.push('/segments')}>
                  Edit segments
                </Button>
              </Box>
            </VStack>
          )}
        </VStack>
      )}
    </VStack>
  );
}
