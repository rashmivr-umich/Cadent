'use client';

// Dense, spreadsheet-style table of leads.
// Columns: company (+ trade name), location, industry (code in tooltip), expires, fit, email, source.

import { HStack, VStack } from '@coinbase/cds-web/layout';
import { Tooltip } from '@coinbase/cds-web/overlays';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@coinbase/cds-web/tables';
import { Tag } from '@coinbase/cds-web/tag';
import { Text } from '@coinbase/cds-web/typography';
import type { Lead } from '@/lib/types';
import { EmailStatusBadge, type EmailUiState } from './EmailStatusBadge';
import { SourceCitation } from './SourceCitation';

const TIER_COLORS = { A: 'green', B: 'yellow', C: 'gray' } as const;

const emailState = (lead: Lead): EmailUiState =>
  lead.email && lead.emailStatus
    ? { kind: 'found', status: lead.emailStatus, confidence: lead.emailConfidence ?? null }
    : { kind: 'notChecked' };

const expiryText = (days: number) =>
  days < 0 ? 'Expired' : days === 0 ? 'Today' : `In ${days} day${days === 1 ? '' : 's'}`;

// "BRISTOW" → "Bristow" so every city looks the same (SAM.gov data mixes cases).
const cityCase = (city: string) =>
  city === city.toUpperCase() ? city.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : city;

// Hide the trade name when it just repeats the legal name ("RMDSYS INC" vs "RMDSYS, INC.").
const lettersOnly = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
const showDba = (lead: Lead) => !!lead.dbaName && lettersOnly(lead.dbaName) !== lettersOnly(lead.legalName);

const formatDate = (dateText: string) =>
  new Date(`${dateText}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

export function LeadsTable({ leads }: { leads: Lead[] }) {
  return (
    <Table bordered variant="ruled" compact>
      <TableHeader>
        <TableRow>
          <TableCell title="Company" />
          <TableCell title="Location" />
          <TableCell title="Industry" />
          <TableCell title="Why now" />
          <TableCell title="Fit" />
          <TableCell title="Email" />
          <TableCell title="Source" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {leads.map((lead) => (
          <TableRow key={lead.id}>
            {showDba(lead) ? (
              <TableCell title={lead.legalName} subtitle={lead.dbaName!} subtitleColor="fgMuted" />
            ) : (
              <TableCell title={lead.legalName} />
            )}
            <TableCell>
              <Text as="span" font="body">
                {cityCase(lead.city)}, {lead.state}
              </Text>
            </TableCell>
            <TableCell>
              <Tooltip content={`NAICS ${lead.primaryNaics}`}>
                <Text as="span" font="body" tabIndex={0}>
                  {lead.primaryNaicsName ?? `NAICS ${lead.primaryNaics}`}
                </Text>
              </Tooltip>
            </TableCell>
            <TableCell>
              <VStack>
                <Text as="span" font="headline" color={lead.daysToExpiry <= 30 ? 'fgNegative' : 'fg'}>
                  {expiryText(lead.daysToExpiry)}
                </Text>
                <Text as="span" font="label2" color="fgMuted">
                  {formatDate(lead.registrationExpirationDate)}
                </Text>
              </VStack>
            </TableCell>
            <TableCell>
              <Tooltip content={(lead.scoreReasons ?? []).join(' · ') || 'Not scored'}>
                <HStack gap={1} alignItems="center" tabIndex={0}>
                  <Text as="span" font="headline">
                    {lead.fitScore ?? '—'}
                  </Text>
                  {lead.tier && (
                    <Tag colorScheme={TIER_COLORS[lead.tier]} emphasis="low">
                      {`Tier ${lead.tier}`}
                    </Tag>
                  )}
                </HStack>
              </Tooltip>
            </TableCell>
            <TableCell>
              <EmailStatusBadge state={emailState(lead)} />
            </TableCell>
            <TableCell>
              <SourceCitation uei={lead.samSource?.uei ?? lead.id} compact />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
