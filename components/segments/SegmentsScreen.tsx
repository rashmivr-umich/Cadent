'use client';

// The Segments screen: the AI suggests which industries, states, timing and contacts to target.
// Maria reviews and adjusts, then clicks "Find my ideal clients".

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Banner } from '@coinbase/cds-web/banner';
import { Button } from '@coinbase/cds-web/buttons';
import { Box, HStack, VStack } from '@coinbase/cds-web/layout';
import { Text } from '@coinbase/cds-web/typography';
import { getSamCounts, getSegmentPlan } from '@/lib/api';
import { useIntake } from '@/lib/IntakeContext';
import { stateName } from '@/lib/usStates';
import type { Segment, SegmentPlanResponse, WhyNowDays } from '@/lib/types';
import { AgentThinkingPanel } from './AgentThinkingPanel';
import { LoadingSteps } from './LoadingSteps';
import { SegmentCard } from './SegmentCard';
import { TargetingSection } from './TargetingSection';

export function SegmentsScreen() {
  const router = useRouter();
  const { hydrated, intake, savedPlan, setSavedPlan, saveTargeting } = useIntake();
  const [response, setResponse] = useState<SegmentPlanResponse | null>(null);
  const [error, setError] = useState('');
  const [samCounts, setSamCounts] = useState<Record<string, number>>({});

  // Maria's choices (start from the AI's suggestions).
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [lastDismissed, setLastDismissed] = useState<Segment | null>(null);
  const [states, setStates] = useState<string[]>([]);
  const [days, setDays] = useState<WhyNowDays>(90);
  const [titles, setTitles] = useState<string[]>([]);

  const intakeKey = JSON.stringify(intake);
  const hasIntake = intake.serviceDescription.trim().length > 0;

  // Ask the AI once per set of intake answers (reuse the saved plan if nothing changed).
  useEffect(() => {
    if (!hydrated || !hasIntake) return;
    if (savedPlan?.forIntake === intakeKey) {
      setResponse(savedPlan.response);
      return;
    }
    let cancelled = false;
    setResponse(null);
    setError('');
    getSegmentPlan(intake)
      .then((res) => {
        if (cancelled) return;
        setSavedPlan({ forIntake: intakeKey, response: res });
        setResponse(res);
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Something went wrong'));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, intakeKey]);

  // When a plan arrives, start Maria's choices from it.
  useEffect(() => {
    if (!response) return;
    const { plan } = response;
    setSelectedCodes(plan.segments.filter((s) => s.selected).map((s) => s.naicsCode));
    setDismissed([]);
    setLastDismissed(null);
    setStates(plan.targeting.states.selected);
    setDays(plan.targeting.whyNowDays.value);
    setTitles(plan.targeting.contactTitles.selected);
  }, [response]);

  // Cached SAM.gov totals, used for each card's count line.
  useEffect(() => {
    getSamCounts().then(setSamCounts);
  }, []);

  const countLine = (code: string) => {
    const found = states.filter((s) => samCounts[`${code}|${s}`] !== undefined);
    if (found.length === 0) return 'Not searched yet';
    const total = found.reduce((sum, s) => sum + samCounts[`${code}|${s}`], 0);
    return `${total.toLocaleString()} contractors in SAM.gov (${found.join(', ')})`;
  };

  const visibleSegments = useMemo(
    () => response?.plan.segments.filter((s) => !dismissed.includes(s.naicsCode)) ?? [],
    [response, dismissed],
  );
  const selectedSegments = visibleSegments.filter((s) => selectedCodes.includes(s.naicsCode));
  const canContinue = selectedSegments.length > 0 && states.length > 0;

  const toggleSegment = (code: string) =>
    setSelectedCodes((cur) => (cur.includes(code) ? cur.filter((c) => c !== code) : [...cur, code]));

  const dismiss = (segment: Segment) => {
    setDismissed((cur) => [...cur, segment.naicsCode]);
    setSelectedCodes((cur) => cur.filter((c) => c !== segment.naicsCode));
    setLastDismissed(segment);
  };
  const undoDismiss = () => {
    if (!lastDismissed) return;
    setDismissed((cur) => cur.filter((c) => c !== lastDismissed.naicsCode));
    setLastDismissed(null);
  };

  const handleContinue = () => {
    saveTargeting({
      segments: selectedSegments.map((s) => ({ naicsCode: s.naicsCode, naicsTitle: s.naicsTitle })),
      states,
      whyNowDays: days,
      contactTitles: titles,
      size: 'Small business',
    });
    router.push('/leads');
  };

  // ---------- Render ----------

  if (hydrated && !hasIntake) {
    return (
      <VStack gap={2} maxWidth={720} width="100%" paddingX={3} paddingY={5}>
        <Text as="h1" font="title2">
          Tell us about your work first
        </Text>
        <Text as="p" font="body" color="fgMuted">
          We need your service description to suggest segments.
        </Text>
        <Box>
          <Button onClick={() => router.push('/intake')}>Go to intake</Button>
        </Box>
      </VStack>
    );
  }

  return (
    <VStack gap={4} maxWidth={1120} width="100%" paddingX={3} paddingY={5}>
      <Box>
        <Button variant="tertiary" compact startIcon="backArrow" onClick={() => router.push('/intake')}>
          Edit intake
        </Button>
      </Box>

      {error && (
        <Banner variant="error" styleVariant="inline" startIcon="error" title="Couldn't load segments">
          {error}
        </Banner>
      )}

      {!response && !error && (
        <Box maxWidth={720} width="100%">
          <LoadingSteps />
        </Box>
      )}

      {response && (
        <VStack gap={5}>
          {/* Top: headline on the left, Agent thinking on the right */}
          <HStack gap={4} alignItems="flex-start" flexWrap="wrap">
            <VStack gap={1.5} flexGrow={1} flexBasis={480} maxWidth={760}>
              <Text as="p" font="label2" color="fgMuted">
                Suggested for {intake.userName || 'you'}
              </Text>
              <Text as="h1" font="title1">
                {response.plan.summary}
              </Text>
              {response.source === 'fallback' && (
                <Banner
                  variant="warning"
                  styleVariant="inline"
                  startIcon="warning"
                  title="Fallback plan (AI unavailable)"
                >
                  {`This plan was built from your keywords, not by the AI. Reason: ${response.fallbackReason}`}
                </Banner>
              )}
            </VStack>
            <VStack flexBasis={300} flexGrow={0} flexShrink={0} width={300}>
              <AgentThinkingPanel plan={response.plan} />
            </VStack>
          </HStack>

          {/* Industry segments: cards side by side */}
          <VStack gap={2}>
            <Text as="h2" font="title3">
              Industry segments
            </Text>
            <Box
              display="grid"
              gridTemplateColumns="repeat(auto-fit, minmax(280px, 1fr))"
              gap={2}
              alignItems="stretch"
            >
              {visibleSegments.map((s) => (
                <SegmentCard
                  key={s.naicsCode}
                  segment={s}
                  selected={selectedCodes.includes(s.naicsCode)}
                  countLine={countLine(s.naicsCode)}
                  onToggle={() => toggleSegment(s.naicsCode)}
                  onDismiss={s.kind === 'suggested' ? () => dismiss(s) : undefined}
                />
              ))}
            </Box>
            {lastDismissed && (
              <HStack gap={1} alignItems="center">
                <Text as="span" font="label2" color="fgMuted">
                  Dismissed {lastDismissed.naicsTitle}.
                </Text>
                <Button variant="tertiary" compact onClick={undoDismiss}>
                  Undo
                </Button>
              </HStack>
            )}
          </VStack>

          {/* Targeting + continue */}
          <VStack gap={5} maxWidth={760}>
            <VStack>
              <Text as="h2" font="title3">
                Targeting
              </Text>
              <TargetingSection
                targeting={response.plan.targeting}
                states={states}
                onStatesChange={setStates}
                days={days}
                onDaysChange={setDays}
                titles={titles}
                onTitlesChange={setTitles}
              />
            </VStack>

            <VStack gap={1} alignItems="flex-end" borderedTop paddingTop={3}>
              <Button variant="primary" endIcon="forwardArrow" disabled={!canContinue} onClick={handleContinue}>
                Find my ideal clients
              </Button>
              {!canContinue && (
                <Text as="p" font="label2" color="fgMuted">
                  Pick at least one industry segment and one state.
                </Text>
              )}
              {canContinue && (
                <Text as="p" font="label2" color="fgMuted">
                  {selectedSegments.length} segment{selectedSegments.length === 1 ? '' : 's'} in{' '}
                  {states.map(stateName).join(', ')}
                </Text>
              )}
            </VStack>
          </VStack>
        </VStack>
      )}
    </VStack>
  );
}
