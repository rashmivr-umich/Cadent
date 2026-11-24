'use client';

// Step 1: name, role, and which workspace (join an existing one or create a new one).

import { Select, SelectOption, RadioCell, TextInput } from '@coinbase/cds-web/controls';
import { HStack, VStack } from '@coinbase/cds-web/layout';
import { useIntake } from '@/lib/IntakeContext';
import { MOCK_WORKSPACES } from '@/lib/mockWorkspaces';
import { StepHeader } from './StepHeader';

export function StepAboutYou() {
  const { intake, updateIntake } = useIntake();
  const { mode, name: workspaceName } = intake.workspace;

  // Switching between join/create clears the workspace name and pricing so the two don't mix
  // (a joined workspace fills in its own pricing; a new one starts empty).
  const setMode = (newMode: 'join' | 'create') => {
    if (newMode !== mode) {
      updateIntake({ workspace: { mode: newMode, name: '' }, pricingModels: [], priceRange: '' });
    }
  };

  return (
    <VStack gap={3}>
      <StepHeader title="About you" description="A little about you and the firm you work with." />

      <HStack gap={2}>
        <TextInput
          label="Your name"
          placeholder="Maria Lopez"
          value={intake.userName}
          onChange={(e) => updateIntake({ userName: e.target.value })}
        />
        <TextInput
          label="Your role or title"
          placeholder="Compliance consultant"
          value={intake.userRole}
          onChange={(e) => updateIntake({ userRole: e.target.value })}
        />
      </HStack>

      <VStack gap={1}>
        <RadioCell
          name="workspace-mode"
          value="join"
          checked={mode === 'join'}
          onChange={() => setMode('join')}
          title="Join a workspace"
          description="Your firm already uses Cadent."
        />
        <RadioCell
          name="workspace-mode"
          value="create"
          checked={mode === 'create'}
          onChange={() => setMode('create')}
          title="Create a new one"
          description="Set up a workspace for your firm."
        />
      </VStack>

      {mode === 'join' ? (
        <Select
          label="Workspace"
          placeholder="Pick your firm's workspace"
          value={workspaceName}
          onChange={(value: string) => updateIntake({ workspace: { mode: 'join', name: value } })}
        >
          {MOCK_WORKSPACES.map((w) => (
            <SelectOption key={w.id} value={w.name} title={w.name} />
          ))}
        </Select>
      ) : (
        <TextInput
          label="Firm name"
          placeholder="e.g. Lopez Compliance Advisors"
          value={workspaceName}
          onChange={(e) => updateIntake({ workspace: { mode: 'create', name: e.target.value } })}
        />
      )}
    </VStack>
  );
}
