'use client';

// Light analytics above the board: count per stage, conversion between steps,
// splits by fit tier and industry, and moves by AI vs a person. All from real saved moves.

import { useState } from 'react';
import { Button } from '@coinbase/cds-web/buttons';
import { Collapsible } from '@coinbase/cds-web/collapsible';
import { Box, HStack, VStack } from '@coinbase/cds-web/layout';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@coinbase/cds-web/tables';
import { Text } from '@coinbase/cds-web/typography';
import { fitText } from '@/lib/leadScore';
import type { LeadWork } from '@/lib/PipelineContext';
import { conversions, countBy, countByStage, movesBy, STAGES } from '@/lib/pipelineStats';

function Tile({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <VStack gap={0.5} padding={2} borderRadius={400} bordered background="bg" flexGrow={1} flexBasis={130}>
      <Text as="span" font="label2" color="fgMuted">
        {label}
      </Text>
      <Text as="span" font="title2">
        {value}
      </Text>
      {note && (
        <Text as="span" font="label2" color="fgMuted">
          {note}
        </Text>
      )}
    </VStack>
  );
}

function SplitTable({ title, rows }: { title: string; rows: [string, Record<string, number>][] }) {
  return (
    <VStack gap={1} flexGrow={1} flexBasis={420} minWidth={0}>
      <Text as="h3" font="headline">
        {title}
      </Text>
      <Table bordered compact variant="ruled">
        <TableHeader>
          <TableRow>
            <TableCell title="" />
            {STAGES.map((s) => (
              <TableCell key={s} title={s} />
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell title="No leads yet" />
              {STAGES.map((s) => (
                <TableCell key={s} title="0" />
              ))}
            </TableRow>
          ) : (
            rows.map(([group, counts]) => (
              <TableRow key={group}>
                <TableCell title={group} />
                {STAGES.map((s) => (
                  <TableCell key={s} title={String(counts[s])} />
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </VStack>
  );
}

export function BoardAnalytics({ items }: { items: LeadWork[] }) {
  const [showSplits, setShowSplits] = useState(false);
  const counts = countByStage(items);
  const conv = conversions(items);
  const moves = movesBy(items);
  const convTo = (stage: string) => conv.find((c) => c.to === stage);

  return (
    <VStack gap={2}>
      <HStack gap={1.5} flexWrap="wrap">
        {STAGES.map((stage) => {
          const c = convTo(stage);
          return (
            <Tile
              key={stage}
              label={stage}
              value={counts[stage]}
              note={c ? (c.rate === null ? `— from ${c.from}` : `${c.rate}% from ${c.from}`) : undefined}
            />
          );
        })}
        <Tile label="Moves by AI" value={moves.ai} note="includes matching" />
        <Tile label="Moves by a person" value={moves.person} />
      </HStack>

      <Box>
        <Button
          variant="tertiary"
          compact
          endIcon={showSplits ? 'caretUp' : 'caretDown'}
          onClick={() => setShowSplits(!showSplits)}
          aria-expanded={showSplits}
        >
          {showSplits ? 'Hide breakdown' : 'Breakdown by fit and industry'}
        </Button>
      </Box>
      <Collapsible collapsed={!showSplits}>
        <HStack gap={3} flexWrap="wrap" alignItems="flex-start">
          <SplitTable
            title="By fit"
            rows={countBy(items, (it) => (it.lead.tier ? fitText(it.lead.tier) : 'Not scored'))}
          />
          <SplitTable
            title="By industry"
            rows={countBy(items, (it) => it.lead.primaryNaicsName ?? `NAICS ${it.lead.primaryNaics}`)}
          />
        </HStack>
      </Collapsible>
    </VStack>
  );
}
