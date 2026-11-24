'use client';

// Step 3: past clients. Upload a spreadsheet, paste names, or (later) connect a CRM.
// This step can be skipped.

import { useRef, useState } from 'react';
import { Banner } from '@coinbase/cds-web/banner';
import { Button } from '@coinbase/cds-web/buttons';
import { InputChip } from '@coinbase/cds-web/chips';
import { NativeTextArea } from '@coinbase/cds-web/controls';
import { Box, HStack, VStack } from '@coinbase/cds-web/layout';
import { Text } from '@coinbase/cds-web/typography';
import { useIntake } from '@/lib/IntakeContext';
import { parseClientFile, parsePastedNames } from '@/lib/parseClientFile';
import type { PastClient } from '@/lib/types';
import { StepHeader } from './StepHeader';
import styles from './intake.module.css';

const CRMS = ['HubSpot', 'Salesforce', 'other CRM'];

export function StepPastClients({ onSkip }: { onSkip: () => void }) {
  const { intake, updateIntake } = useIntake();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pasted, setPasted] = useState('');
  const [fileError, setFileError] = useState('');
  const [comingSoon, setComingSoon] = useState('');
  const clients = intake.pastClients;

  // Add new names, skipping ones already in the list.
  const addClients = (names: string[], source: PastClient['source']) => {
    const existing = new Set(clients.map((c) => c.name.toLowerCase()));
    const fresh = names
      .filter((n) => !existing.has(n.toLowerCase()))
      .map((name) => ({ name, source }));
    updateIntake({ pastClients: [...clients, ...fresh] });
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setFileError('');
    try {
      const names = await parseClientFile(file);
      if (names.length === 0) setFileError(`We couldn't find any company names in ${file.name}.`);
      else addClients(names, 'excel');
    } catch {
      setFileError(`We couldn't read ${file.name}. Try a .xlsx or .csv file.`);
    }
    // Let the same file be picked again later.
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddPasted = () => {
    addClients(parsePastedNames(pasted), 'paste');
    setPasted('');
  };

  const removeClient = (name: string) =>
    updateIntake({ pastClients: clients.filter((c) => c.name !== name) });

  return (
    <VStack gap={3}>
      <HStack justifyContent="space-between" alignItems="flex-start" gap={2}>
        <StepHeader
          title="Who have you worked with?"
          description="Past clients help us find companies like them. Optional."
        />
        <Button variant="tertiary" compact onClick={onSkip}>
          Skip this step
        </Button>
      </HStack>

      {/* Spreadsheet upload */}
      <VStack gap={1} padding={3} bordered borderRadius={300} background="bg">
        <Text as="p" font="headline">
          Upload a client list
        </Text>
        <Text as="p" font="label2" color="fgMuted">
          An Excel or CSV file with a company name column. It stays on your computer.
        </Text>
        <Box paddingTop={1}>
          <Button variant="secondary" startIcon="upload" onClick={() => fileInputRef.current?.click()}>
            Choose file (.xlsx, .csv)
          </Button>
        </Box>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.csv"
          className={styles.hiddenFileInput}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        {fileError && (
          <Text as="p" font="label2" color="fgNegative">
            {fileError}
          </Text>
        )}
      </VStack>

      {/* Paste fallback */}
      <VStack gap={1}>
        <Text as="label" font="label1" htmlFor="pasted-clients">
          Or paste company names (one per line)
        </Text>
        <Box bordered borderRadius={200}>
          <NativeTextArea
            id="pasted-clients"
            rows={3}
            className={styles.textarea}
            placeholder={'Acme Federal Solutions\nBlue Ridge IT Services'}
            value={pasted}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPasted(e.target.value)}
          />
        </Box>
        <Box>
          <Button variant="secondary" compact disabled={!pasted.trim()} onClick={handleAddPasted}>
            Add names
          </Button>
        </Box>
      </VStack>

      {/* Results */}
      {clients.length > 0 && (
        <VStack gap={1.5}>
          <Text as="p" font="label1">
            {clients.length} past {clients.length === 1 ? 'client' : 'clients'} found
          </Text>
          <HStack gap={1} flexWrap="wrap">
            {clients.map((c) => (
              <InputChip
                key={c.name}
                active={false}
                maxWidth="100%"
                onClick={() => removeClient(c.name)}
              >
                {c.name}
              </InputChip>
            ))}
          </HStack>
        </VStack>
      )}

      {/* CRM connections (not built yet) */}
      <VStack gap={1}>
        <Text as="p" font="label1">
          Connect your CRM
        </Text>
        <HStack gap={1} flexWrap="wrap">
          {CRMS.map((crm) => (
            <Button key={crm} variant="secondary" compact onClick={() => setComingSoon(crm)}>
              {`Connect ${crm}`}
            </Button>
          ))}
        </HStack>
        {comingSoon && (
          <Banner
            variant="informational"
            styleVariant="inline"
            startIcon="info"
            title="Coming soon"
            showDismiss
            onClose={() => setComingSoon('')}
          >
            {`Connecting ${comingSoon} isn't available yet. Upload a file or paste names for now.`}
          </Banner>
        )}
      </VStack>
    </VStack>
  );
}
