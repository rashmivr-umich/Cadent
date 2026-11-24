'use client';

// The 4-step guided setup. Shows a progress bar (CDS Stepper), one step at a time,
// and Back / Next buttons. The last step's button is "Find my ideal clients".

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@coinbase/cds-web/buttons';
import { HStack, VStack } from '@coinbase/cds-web/layout';
import { Stepper } from '@coinbase/cds-web/stepper';
import { useIntake } from '@/lib/IntakeContext';
import { StepAboutYou } from './StepAboutYou';
import { StepWhatYouDo } from './StepWhatYouDo';
import { StepPastClients } from './StepPastClients';
import { StepPricing } from './StepPricing';

const STEPS = [
  { id: 'about', label: 'About you' },
  { id: 'service', label: 'What do you do?' },
  { id: 'clients', label: 'Who have you worked with?' },
  { id: 'pricing', label: 'How you charge' },
];

export function IntakeWizard() {
  const router = useRouter();
  const { intake, saveIntake } = useIntake();
  const [stepIndex, setStepIndex] = useState(0);

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;
  const stepId = STEPS[stepIndex].id;

  // "Find my ideal clients" needs at least a name and a service description.
  const canFinish =
    intake.userName.trim().length > 0 && intake.serviceDescription.trim().length > 0;

  const handleFinish = () => {
    const saved = saveIntake();
    console.log('Cadent intake saved:', saved);
    router.push('/icp');
  };

  return (
    <VStack gap={4} maxWidth={760} width="100%" paddingX={3} paddingY={5}>
      <Stepper direction="horizontal" steps={STEPS} activeStepId={stepId} />

      <VStack bordered borderRadius={400} padding={4} background="bg">
        {stepId === 'about' && <StepAboutYou />}
        {stepId === 'service' && <StepWhatYouDo />}
        {stepId === 'clients' && <StepPastClients onSkip={() => setStepIndex(stepIndex + 1)} />}
        {stepId === 'pricing' && <StepPricing />}
      </VStack>

      <HStack justifyContent="space-between">
        <Button
          variant="secondary"
          startIcon="backArrow"
          disabled={isFirst}
          onClick={() => setStepIndex(stepIndex - 1)}
        >
          Back
        </Button>
        {isLast ? (
          <Button variant="primary" endIcon="forwardArrow" disabled={!canFinish} onClick={handleFinish}>
            Find my ideal clients
          </Button>
        ) : (
          <Button variant="primary" endIcon="forwardArrow" onClick={() => setStepIndex(stepIndex + 1)}>
            Next
          </Button>
        )}
      </HStack>
    </VStack>
  );
}
