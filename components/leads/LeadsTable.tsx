'use client';

// Dense, spreadsheet-style table of leads.
// Columns: company (logo + name + trade name), location, industry (code in tooltip),
// why now (SAM.gov registration expiry), fit, email, source link (copy UEI).
// Clicking a row opens the lead's detail page. The checkbox selects it for "Prepare outreach".

import { Checkbox } from '@coinbase/cds-web/controls';
import { Box, HStack, VStack } from '@coinbase/cds-web/layout';
import { Tooltip } from '@coinbase/cds-web/overlays';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@coinbase/cds-web/tables';
import { Tag } from '@coinbase/cds-web/tag';
import { Text } from '@coinbase/cds-web/typography';
import { useRouter } from 'next/navigation';
import type { Lead } from '@/lib/types';
import { FIT_LABELS, fitText } from '@/lib/leadScore';
import { cityCase, emailUiState, expiryText, formatDate, showDba } from '@/lib/leadFormat';
import { usePipeline } from '@/lib/PipelineContext';
import { CompanyLogo } from './CompanyLogo';
import { EmailStatusBadge } from './EmailStatusBadge';
import { SourceCitation } from './SourceCitation';


type Props = {
  leads: Lead[];
  selected: string[];
  onToggle: (leadId: string) => void;
  /** True when the selection is full (new boxes can't be ticked). */
  selectionFull: boolean;
};

export function LeadsTable({ leads, selected, onToggle, selectionFull }: Props) {
  const router = useRouter();
  const { work } = usePipeline();
  return (
    <Table bordered variant="ruled" compact>
      <TableHeader>
        <TableRow>
          <TableCell title="" width="44px" />
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
          <TableRow key={lead.id} onClick={() => router.push(`/leads/${lead.id}`)} style={{ cursor: 'pointer' }}>
            <TableCell>
              {/* Stop the click from also opening the lead. */}
              <Box onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                <Checkbox
                  checked={selected.includes(lead.id)}
                  disabled={selectionFull && !selected.includes(lead.id)}
                  onChange={() => onToggle(lead.id)}
                  aria-label={`Select ${lead.legalName}`}
                />
              </Box>
            </TableCell>
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
                      {fitText(lead.tier)}
                    </Tag>
                  )}
                </HStack>
              </Tooltip>
            </TableCell>
            <TableCell>
              <VStack gap={0.5} alignItems="flex-start">
                {work[lead.id]?.enrichment?.email && (
                  <Text as="span" font="label2">
                    {work[lead.id]!.enrichment!.email}
                  </Text>
                )}
                <EmailStatusBadge state={emailUiState(lead, work[lead.id])} />
              </VStack>
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
