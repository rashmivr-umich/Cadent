'use client';

// Step 2: describe your service in plain words.
// Key words are picked up locally (no AI) ~300 ms after you stop typing,
// highlighted in the text, and listed below as removable chips.

import { useEffect, useMemo, useState } from 'react';
import { InputChip } from '@coinbase/cds-web/chips';
import { TextInput } from '@coinbase/cds-web/controls';
import { Box, HStack, VStack } from '@coinbase/cds-web/layout';
import { Text } from '@coinbase/cds-web/typography';
import { useIntake } from '@/lib/IntakeContext';
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  detectKeywords,
  findKeywordMatches,
  keywordKey,
} from '@/lib/intakeKeywords';
import type { DetectedKeyword, KeywordCategory } from '@/lib/types';
import { HighlightTextArea } from './HighlightTextArea';
import { StepHeader } from './StepHeader';

const PLACEHOLDER =
  "e.g. I'm a compliance consultant helping small government IT contractors keep their certifications and SAM registration accurate.";

const CATEGORY_ORDER: KeywordCategory[] = ['role', 'serves', 'helpsWith', 'location'];

export function StepWhatYouDo() {
  const { intake, updateIntake, removedKeywordKeys, setRemovedKeywordKeys } = useIntake();
  const text = intake.serviceDescription;

  // Wait until typing pauses for 300 ms before re-detecting.
  const [debouncedText, setDebouncedText] = useState(text);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedText(text), 300);
    return () => clearTimeout(timer);
  }, [text]);

  // Detect key words in the paused text, minus any the user removed.
  useEffect(() => {
    const detected = detectKeywords(debouncedText).filter(
      (k) => !removedKeywordKeys.includes(keywordKey(k)),
    );
    updateIntake({ detectedKeywords: detected });
  }, [debouncedText, removedKeywordKeys, updateIntake]);

  // Highlight only the detected words, but at their *current* positions so colors never drift.
  const highlights = useMemo(() => {
    const keep = new Set(intake.detectedKeywords.map(keywordKey));
    return findKeywordMatches(text).filter((m) => keep.has(keywordKey(m)));
  }, [text, intake.detectedKeywords]);

  const removeKeyword = (k: DetectedKeyword) =>
    setRemovedKeywordKeys([...removedKeywordKeys, keywordKey(k)]);

  return (
    <VStack gap={3}>
      <StepHeader
        title="What do you do?"
        description="Describe your service the way you'd tell a client. We'll pick out the important parts."
      />

      <HighlightTextArea
        accessibilityLabel="Describe your service"
        placeholder={PLACEHOLDER}
        value={text}
        onChange={(value) => updateIntake({ serviceDescription: value })}
        highlights={highlights}
      />

      <VStack gap={1.5}>
        <Text as="p" font="label1">
          What we picked up
        </Text>
        {intake.detectedKeywords.length === 0 ? (
          <Text as="p" font="label2" color="fgMuted">
            Nothing yet. Try mentioning your role, who you serve, what you help with, and where.
          </Text>
        ) : (
          <HStack gap={1} flexWrap="wrap">
            {CATEGORY_ORDER.flatMap((category) =>
              intake.detectedKeywords
                .filter((k) => k.category === category)
                .map((k) => (
                  <InputChip
                    key={keywordKey(k)}
                    active={false}
                    maxWidth="100%"
                    accessibilityLabel={`Remove ${CATEGORY_LABELS[k.category]}: ${k.text}`}
                    onClick={() => removeKeyword(k)}
                    start={
                      <Box
                        width={10}
                        height={10}
                        borderRadius={1000}
                        dangerouslySetBackground={CATEGORY_COLORS[k.category]}
                      />
                    }
                  >
                    {`${CATEGORY_LABELS[k.category]}: ${k.text}`}
                  </InputChip>
                )),
            )}
          </HStack>
        )}
      </VStack>

      <TextInput
        label="Your firm's website (optional)"
        placeholder="https://lopezcompliance.com"
        value={intake.website ?? ''}
        onChange={(e) => updateIntake({ website: e.target.value })}
      />
    </VStack>
  );
}
