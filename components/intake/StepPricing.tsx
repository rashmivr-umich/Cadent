'use client';

// Step 4: how you charge.
// - Joined a workspace that has pricing saved (e.g. Lopez Compliance Advisors): show it read-only,
//   labeled "From your workspace settings", with an Edit button.
// - Created a new workspace: empty, editable fields.

import { useEffect, useState } from 'react';
import { Button } from '@coinbase/cds-web/buttons';
import { Chip } from '@coinbase/cds-web/chips';
import { TextInput } from '@coinbase/cds-web/controls';
import { Icon } from '@coinbase/cds-web/icons';
import { HStack, VStack } from '@coinbase/cds-web/layout';
import { Text } from '@coinbase/cds-web/typography';
import { useIntake } from '@/lib/IntakeContext';
import { findWorkspace } from '@/lib/mockWorkspaces';
import type { PricingModel } from '@/lib/types';
import { StepHeader } from './StepHeader';

const MODELS: { id: PricingModel; label: string }[] = [
  { id: 'hourly', label: 'Hourly' },
  { id: 'fixed', label: 'Fixed fee' },
  { id: 'retainer', label: 'Retainer' },
];

const modelLabel = (id: PricingModel) => MODELS.find((m) => m.id === id)?.label ?? id;

export function StepPricing() {
  const { intake, updateIntake } = useIntake();
  const workspacePricing =
    intake.workspace.mode === 'join' ? findWorkspace(intake.workspace.name)?.pricing : undefined;
  const [editing, setEditing] = useState(!workspacePricing);

  // When joining a workspace with saved pricing, start from those settings.
  useEffect(() => {
    if (workspacePricing && !editing) {
      updateIntake({
        pricingModels: workspacePricing.models,
        priceRange: workspacePricing.priceRange,
      });
    }
  }, [workspacePricing, editing, updateIntake]);

  const toggleModel = (id: PricingModel) => {
    const current = intake.pricingModels;
    updateIntake({
      pricingModels: current.includes(id) ? current.filter((m) => m !== id) : [...current, id],
    });
  };

  return (
    <VStack gap={3}>
      <StepHeader
        title="How you charge"
        description="Helps us suggest clients who are a good fit for your pricing."
      />

      {!editing && workspacePricing ? (
        <VStack gap={2} padding={3} bordered borderRadius={300} background="bgAlternate">
          <HStack justifyContent="space-between" alignItems="center">
            <Text as="p" font="label2" color="fgMuted">
              From your workspace settings
            </Text>
            <Button variant="tertiary" compact startIcon="pencil" onClick={() => setEditing(true)}>
              Edit
            </Button>
          </HStack>
          <VStack gap={0.5}>
            <Text as="p" font="headline">
              {workspacePricing.models.map(modelLabel).join(', ')}
            </Text>
            <Text as="p" font="body">
              {workspacePricing.priceRange}
            </Text>
          </VStack>
        </VStack>
      ) : (
        <VStack gap={3}>
          <VStack gap={1}>
            <Text as="p" font="label1">
              Pricing model (pick any that apply)
            </Text>
            <HStack gap={1} flexWrap="wrap">
              {MODELS.map((m) => {
                const selected = intake.pricingModels.includes(m.id);
                return (
                  <Chip
                    key={m.id}
                    active={selected}
                    aria-pressed={selected}
                    start={selected ? <Icon name="checkmark" size="xs" color="fg" /> : undefined}
                    onClick={() => toggleModel(m.id)}
                  >
                    {m.label}
                  </Chip>
                );
              })}
            </HStack>
          </VStack>
          <TextInput
            label="Typical price range (optional)"
            placeholder="e.g. $1,500–3,000 / month"
            value={intake.priceRange ?? ''}
            onChange={(e) => updateIntake({ priceRange: e.target.value })}
          />
        </VStack>
      )}
    </VStack>
  );
}
