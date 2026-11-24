'use client';

// Lead detail: everything about one lead, plus "Find email" (enrich) and "Draft email".
// Drafts go to the approval queue; nothing is sent from here.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Banner } from '@coinbase/cds-web/banner';
import { Button } from '@coinbase/cds-web/buttons';
import { Box, HStack, VStack } from '@coinbase/cds-web/layout';
import { Spinner } from '@coinbase/cds-web/loaders';
import { Tag } from '@coinbase/cds-web/tag';
import { Text } from '@coinbase/cds-web/typography';
import { draftEmail, enrichLead, getLead } from '@/lib/api';
import { useIntake } from '@/lib/IntakeContext';
import { cityCase, emailUiState, expiryText, formatDate, nameCase, showDba } from '@/lib/leadFormat';
import { FIT_LABELS } from '@/lib/leadScore';
import { usePipeline } from '@/lib/PipelineContext';
import type { Lead } from '@/lib/types';
import { CompanyLogo } from './CompanyLogo';
import { EmailStatusBadge } from './EmailStatusBadge';
import { SourceCitation } from './SourceCitation';
import { ThinkingPanel } from './ThinkingPanel';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <VStack gap={1.5} padding={3} bordered borderRadius={400}>
      <Text as="h2" font="title3">
        {title}
      </Text>
      {children}
    </VStack>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <HStack gap={2} alignItems="flex-start">
      <Box width={150} flexShrink={0}>
        <Text as="span" font="label2" color="fgMuted">
          {label}
        </Text>
      </Box>
      <Box flexGrow={1}>{children}</Box>
    </HStack>
  );
}

export function LeadDetail({ leadId }: { leadId: string }) {
  const router = useRouter();
  const { intake, targeting } = useIntake();
  const { work, track, update } = usePipeline();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loadError, setLoadError] = useState('');
  const [finding, setFinding] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [actionError, setActionError] = useState('');
  const item = work[leadId];

  useEffect(() => {
    getLead(leadId, targeting?.segments.map((s) => s.naicsCode) ?? [])
      .then((l) => {
        setLead(l);
        track(l);
      })
      .catch((e: Error) => setLoadError(e.message));
  }, [leadId, targeting, track]);

  const findEmail = async () => {
    if (!lead) return;
    setActionError('');
    setFinding(true);
    try {
      update(lead.id, { enrichment: await enrichLead(lead.id) });
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setFinding(false);
    }
  };

  const writeDraft = async () => {
    if (!lead) return;
    setActionError('');
    setDrafting(true);
    try {
      const draft = await draftEmail(
        lead.id,
        { name: intake.userName, firm: intake.workspace.name, service: intake.serviceDescription },
        item?.enrichment,
      );
      update(lead.id, { draft: { ...draft, createdAt: new Date().toISOString() }, edited: undefined, approval: 'pending' });
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setDrafting(false);
    }
  };

  if (loadError) {
    return (
      <VStack gap={2} maxWidth={760} width="100%" paddingX={3} paddingY={5}>
        <Banner variant="error" styleVariant="inline" startIcon="error" title="Couldn't load this lead">
          {loadError}
        </Banner>
        <Box>
          <Button variant="secondary" onClick={() => router.push('/leads')}>
            Back to leads
          </Button>
        </Box>
      </VStack>
    );
  }

  if (!lead) {
    return (
      <HStack gap={1.5} alignItems="center" paddingY={5}>
        <Spinner size={2} />
        <Text as="p" font="body" color="fgMuted">
          Loading lead…
        </Text>
      </HStack>
    );
  }

  const enrichment = item?.enrichment;
  const website = enrichment?.website ?? lead.website;
  const draft = item?.draft;
  const unsure = [...(enrichment?.agentUnsure ?? []), ...(draft?.agentUnsure ?? [])];
  const fit = lead.tier ? FIT_LABELS[lead.tier] : null;

  return (
    <VStack gap={4} maxWidth={1120} width="100%" paddingX={3} paddingY={5}>
      <Box>
        <Button variant="tertiary" compact startIcon="backArrow" onClick={() => router.push('/leads')}>
          All leads
        </Button>
      </Box>

      {/* Header */}
      <HStack gap={2} alignItems="center" flexWrap="wrap">
        <CompanyLogo name={lead.legalName} website={website} size="xl" />
        <VStack gap={0.5} flexGrow={1}>
          <Text as="h1" font="title1">
            {lead.legalName}
          </Text>
          <Text as="p" font="body" color="fgMuted">
            {showDba(lead) ? `${lead.dbaName} · ` : ''}
            {cityCase(lead.city)}, {lead.state} · {lead.primaryNaicsName}
          </Text>
        </VStack>
        {fit && (
          <VStack alignItems="flex-end" gap={0.5}>
            <Text as="span" font="title2">
              {lead.fitScore}
            </Text>
            <Tag colorScheme={fit.colorScheme} emphasis="low">
              {fit.label}
            </Tag>
          </VStack>
        )}
      </HStack>

      {/* Why now */}
      <HStack
        gap={1.5}
        padding={2}
        borderRadius={400}
        background={lead.daysToExpiry <= 30 ? 'bgNegativeWash' : 'bgAlternate'}
        alignItems="center"
      >
        <Text as="span" font="headline" color={lead.daysToExpiry <= 30 ? 'fgNegative' : 'fg'}>
          SAM.gov registration {expiryText(lead.daysToExpiry).toLowerCase()}
        </Text>
        <Text as="span" font="body" color="fgMuted">
          {formatDate(lead.registrationExpirationDate, true)}
        </Text>
      </HStack>

      {actionError && (
        <Banner variant="error" styleVariant="inline" startIcon="error" title="Something didn't work">
          {actionError}
        </Banner>
      )}

      <HStack gap={4} alignItems="flex-start" flexWrap="wrap">
        <VStack gap={3} flexGrow={1} flexBasis={560} maxWidth={760} minWidth={0}>
          {/* Contact */}
          <Section title="Contact">
            <Row label="Name">
              <Text as="span" font="body">
                {nameCase(lead.contactName) ?? 'No contact listed'}
              </Text>
            </Row>
            <Row label="Title">
              <Text as="span" font="body">
                {lead.contactTitle ?? '—'}
              </Text>
            </Row>
            <Row label="Work email">
              <VStack gap={1}>
                <HStack gap={1} alignItems="center" flexWrap="wrap">
                  {enrichment?.email && (
                    <Text as="span" font="body">
                      {enrichment.email}
                    </Text>
                  )}
                  <EmailStatusBadge state={emailUiState(lead, item, finding)} />
                </HStack>
                {!finding && (
                  <Box>
                    <Button variant="secondary" compact startIcon="search" onClick={findEmail}>
                      {enrichment ? 'Look up again' : 'Find email'}
                    </Button>
                  </Box>
                )}
                <Text as="span" font="label2" color="fgMuted">
                  Shown for your reference only. Emails are never sent to this address.
                </Text>
              </VStack>
            </Row>
            <Row label="Website">
              <Text as="span" font="body">
                {website ?? 'No website found'}
                {enrichment?.websiteSource === 'search' ? ' (found by web search, may be wrong)' : ''}
              </Text>
            </Row>
          </Section>

          {/* Outreach */}
          <Section title="Outreach email">
            {drafting && (
              <HStack gap={1.5} alignItems="center">
                <Spinner size={2} />
                <Text as="p" font="body" color="fgMuted">
                  Drafting…
                </Text>
              </HStack>
            )}
            {!drafting && !draft && (
              <VStack gap={1.5} alignItems="flex-start">
                <Text as="p" font="body" color="fgMuted">
                  The agent writes a short, helpful email that names the renewal date and links the SAM.gov
                  source. You review every email before anything is sent.
                </Text>
                <Button variant="primary" startIcon="pencil" onClick={writeDraft}>
                  Draft email
                </Button>
              </VStack>
            )}
            {!drafting && draft && (
              <VStack gap={2}>
                {draft.source === 'fallback' && (
                  <Banner variant="warning" styleVariant="inline" startIcon="warning" title="Template draft (AI unavailable)">
                    This draft was made from a template, not by the AI.
                  </Banner>
                )}
                <VStack gap={1} padding={2} borderRadius={300} background="bgAlternate">
                  <Text as="p" font="headline">
                    {item?.edited?.subject ?? draft.draftSubject}
                  </Text>
                  <Text as="p" font="body" style={{ whiteSpace: 'pre-wrap' }}>
                    {item?.edited?.body ?? draft.draftBody}
                  </Text>
                </VStack>
                <HStack gap={1} flexWrap="wrap" alignItems="center">
                  <Button variant="primary" endIcon="forwardArrow" onClick={() => router.push('/queue')}>
                    Review in approval queue
                  </Button>
                  <Button variant="secondary" onClick={writeDraft}>
                    Redraft
                  </Button>
                  {item?.approval && item.approval !== 'pending' && (
                    <Tag colorScheme={item.approval === 'approved' ? 'green' : 'red'} emphasis="low">
                      {item.approval === 'approved' ? 'Approved and sent' : 'Rejected'}
                    </Tag>
                  )}
                </HStack>
              </VStack>
            )}
          </Section>

          {/* Company */}
          <Section title="Company">
            <Row label="Industries">
              <HStack gap={0.5} flexWrap="wrap">
                {(lead.naicsList ?? []).map((n) => (
                  <Tag key={n.code} colorScheme={n.code === lead.primaryNaics ? 'blue' : 'gray'} emphasis="low">
                    {`${n.code} · ${n.name}`}
                  </Tag>
                ))}
              </HStack>
            </Row>
            {lead.productsAndServices?.length > 0 && (
              <Row label="Products & services">
                <Text as="span" font="body">
                  {lead.productsAndServices.join(' · ')}
                </Text>
              </Row>
            )}
            {lead.businessTypes?.length > 0 && (
              <Row label="Business types">
                <HStack gap={0.5} flexWrap="wrap">
                  {lead.businessTypes.map((t) => (
                    <Tag key={t} colorScheme="gray" emphasis="low">
                      {t}
                    </Tag>
                  ))}
                </HStack>
              </Row>
            )}
            <Row label="Registered">
              <Text as="span" font="body">
                {formatDate(lead.registrationDate, true)} · {lead.registrationStatus}
              </Text>
            </Row>
            <Row label="Expires">
              <Text as="span" font="body">
                {formatDate(lead.registrationExpirationDate, true)}
              </Text>
            </Row>
            <Row label="Data freshness">
              <Text as="span" font="body">
                SAM.gov record last updated {formatDate(lead.lastUpdateDate, true)}
                {lead.samSource?.fetchedOn ? ` · fetched ${formatDate(lead.samSource.fetchedOn, true)}` : ''}
              </Text>
            </Row>
            <Row label="Source">
              <SourceCitation uei={lead.samSource?.uei ?? lead.id} />
            </Row>
          </Section>
        </VStack>

        <VStack flexBasis={300} flexGrow={0} flexShrink={0} width={300}>
          <ThinkingPanel
            sections={[
              { title: 'Why this lead', items: lead.scoreReasons ?? [] },
              { title: 'How the email was written', items: draft?.agentSteps ?? [] },
              { title: 'What the agent is unsure about', items: unsure },
            ]}
          />
        </VStack>
      </HStack>
    </VStack>
  );
}
