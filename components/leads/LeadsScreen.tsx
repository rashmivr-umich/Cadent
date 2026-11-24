'use client';

// Leads screen: real leads from Moss (via GET /api/leads), filtered by the Segments choices.
// Tick leads (or "Select top 5"), then "Prepare outreach" finds emails + drafts for each,
// and sends Maria to the approval queue. Nothing is emailed until she approves each one.

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
import { usePrepareOutreach } from '@/lib/usePrepareOutreach';
import { stateName } from '@/lib/usStates';
import { LeadsTable } from './LeadsTable';
import { OutreachProgress } from './OutreachProgress';

/** Max leads per batch, to protect Hunter's small free-plan credits. */
const MAX_SELECTED = 10;

export function LeadsScreen() {
  const router = useRouter();
  const { hydrated, targeting } = useIntake();
  const [result, setResult] = useState<LeadsResult | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const outreach = usePrepareOutreach();

  const toggle = (id: string) =>
    setSelected((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= MAX_SELECTED ? cur : [...cur, id],
    );
  const selectTop5 = () => setSelected((result?.leads ?? []).slice(0, 5).map((l) => l.id));
  const prepare = async () => {
    const leads = (result?.leads ?? []).filter((l) => selected.includes(l.id));
    setSelected([]);
    await outreach.run(leads);
    // When the batch is done, go to the approval queue (the progress list stays on Leads as a record).
    router.push('/queue');
  };

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
          {outreach.progress.length > 0 && (
            <OutreachProgress
              progress={outreach.progress}
              running={outreach.running}
              onOpenQueue={() => router.push('/queue')}
            />
          )}

          <HStack justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
            <Text as="p" font="label1" color="fgMuted">
              {count} lead{count === 1 ? '' : 's'}, best fit first
              {result.hiddenByDays
                ? ` · ${result.hiddenByDays} more renew after ${targeting?.whyNowDays} days`
                : ''}
            </Text>
            {count > 0 && (
              <Button variant="secondary" compact onClick={selectTop5} disabled={outreach.running}>
                Select top 5
              </Button>
            )}
          </HStack>

          {count > 0 ? (
            <>
              <LeadsTable
                leads={result.leads}
                selected={selected}
                onToggle={toggle}
                selectionFull={selected.length >= MAX_SELECTED}
              />
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

      {/* Sticky action bar while leads are selected */}
      {selected.length > 0 && (
        <HStack
          position="sticky"
          bottom={16}
          zIndex={10}
          gap={2}
          padding={2}
          borderRadius={500}
          bordered
          elevation={2}
          background="bg"
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
        >
          <VStack>
            <Text as="span" font="headline">
              {selected.length} lead{selected.length === 1 ? '' : 's'} selected
            </Text>
            <Text as="span" font="label2" color="fgMuted">
              Up to {MAX_SELECTED} at a time, to save email-lookup credits. Leads already looked up aren&apos;t looked up again.
            </Text>
          </VStack>
          <HStack gap={1}>
            <Button variant="tertiary" onClick={() => setSelected([])}>
              Clear
            </Button>
            <Button variant="primary" startIcon="pencil" onClick={prepare} disabled={outreach.running}>
              {`Prepare outreach (${selected.length})`}
            </Button>
          </HStack>
        </HStack>
      )}
    </VStack>
  );
}
