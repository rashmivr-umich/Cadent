'use client';

// Dense, spreadsheet-style table of leads.
// Columns: company (logo + name + trade name), location, industry (code in tooltip),
// why now (SAM.gov registration expiry), fit, email, source link (copy UEI).

import { HStack, VStack } from '@coinbase/cds-web/layout';
import { Tooltip } from '@coinbase/cds-web/overlays';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@coinbase/cds-web/tables';
import { Tag } from '@coinbase/cds-web/tag';
import { Text } from '@coinbase/cds-web/typography';
import type { Lead } from '@/lib/types';
import { FIT_LABELS } from '@/lib/leadScore';
import { CompanyLogo } from './CompanyLogo';
import { EmailStatusBadge, type EmailUiState } from './EmailStatusBadge';
import { SourceCitation } from './SourceCitation';



const emailState = (lead: Lead): EmailUiState =>
  lead.email && lead.emailStatus
    ? { kind: 'found', status: lead.emailStatus, confidence: lead.emailConfidence ?? null }
    : { kind: 'notChecked' };

const expiryText = (days: number) =>
  days < 0 ? 'Expired' : days === 0 ? 'Expires today' : `Expires in ${days} day${days === 1 ? '' : 's'}`;

// "BRISTOW" → "Bristow" so every city looks the same (SAM.gov data mixes cases).
const cityCase = (city: string) =>
  city === city.toUpperCase() ? city.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : city;

// Hide the trade name when it just repeats the legal name ("RMDSYS INC" vs "RMDSYS, INC.").
const lettersOnly = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
const showDba = (lead: Lead) => !!lead.dbaName && lettersOnly(lead.dbaName) !== lettersOnly(lead.legalName);

// "Dec 2" this year, "Jan 5, 2027" otherwise.
const formatDate = (dateText: string) => {
  const date = new Date(`${dateText}T00:00:00Z`);
  const sameYear = date.getUTCFullYear() === new Date().getUTCFullYear();
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
    timeZone: 'UTC',
  });
};

export function LeadsTable({ leads }: { leads: Lead[] }) {
  return (
    <Table bordered variant="ruled" compact>
      <TableHeader>
        <TableRow>
          <TableCell title="Company" width="26%" />
          <TableCell title="Location" width="11%" />
          <TableCell title="Industry" width="18%" />
          <TableCell title="Why now" width="20%" />
          <TableCell title="Fit" />
          <TableCell title="Email" />
          <TableCell title="Source Link" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {leads.map((lead) => (
          <TableRow key={lead.id}>
            <TableCell>
              <HStack gap={1.5} alignItems="center">
                <CompanyLogo name={lead.legalName} website={lead.website} size="l" />
                <VStack>
                  <Text as="span" font="headline">
                    {lead.legalName}
                  </Text>
                  {showDba(lead) && (
                    <Text as="span" font="label2" color="fgMuted">
                      {lead.dbaName}
                    </Text>
                  )}
                </VStack>
              </HStack>
            </TableCell>
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
                <Text as="span" font="label2" color="fgMuted">
                  SAM.gov registration
                </Text>
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
                    <Tag colorScheme={FIT_LABELS[lead.tier].colorScheme} emphasis="low">
                      {FIT_LABELS[lead.tier].label}
                    </Tag>
                  )}
                </HStack>
              </Tooltip>
            </TableCell>
            <TableCell>
              <EmailStatusBadge state={emailState(lead)} />
            </TableCell>
            <TableCell>
              <SourceCitation uei={lead.samSource?.uei ?? lead.id} iconOnly />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
