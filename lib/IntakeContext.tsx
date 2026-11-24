'use client';

// Shared state for the intake answers and the Segments choices.
// Any screen inside <IntakeProvider> can read or update them with useIntake().
// We also copy saved data into the browser's sessionStorage so a page refresh doesn't lose it.

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  emptyIntake,
  type IntakeData,
  type SegmentPlanResponse,
  type TargetingChoices,
} from './types';

const INTAKE_KEY = 'cadent.intake';
const PLAN_KEY = 'cadent.segmentPlan';
const TARGETING_KEY = 'cadent.targeting';

/** The AI's plan plus the intake it was made from, so we only re-ask when answers change. */
export type SavedPlan = { forIntake: string; response: SegmentPlanResponse };

type IntakeContextValue = {
  /** False until saved data has been restored from sessionStorage (wait for this before using it). */
  hydrated: boolean;
  intake: IntakeData;
  updateIntake: (changes: Partial<IntakeData>) => void;
  /** Saves the answers (used by "Suggest ideal segments"). */
  saveIntake: () => IntakeData;
  /** Keywords the user removed (by keywordKey), so they aren't picked up again. */
  removedKeywordKeys: string[];
  setRemovedKeywordKeys: (keys: string[]) => void;
  /** Last segment plan from the AI (or fallback). */
  savedPlan: SavedPlan | null;
  setSavedPlan: (plan: SavedPlan) => void;
  /** What Maria chose on the Segments screen. */
  targeting: TargetingChoices | null;
  saveTargeting: (choices: TargetingChoices) => void;
};

const IntakeContext = createContext<IntakeContextValue | null>(null);

const readJson = <T,>(key: string): T | null => {
  const saved = sessionStorage.getItem(key);
  return saved ? (JSON.parse(saved) as T) : null;
};

export function IntakeProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [intake, setIntake] = useState<IntakeData>(emptyIntake);
  const [removedKeywordKeys, setRemovedKeywordKeys] = useState<string[]>([]);
  const [savedPlan, setSavedPlanState] = useState<SavedPlan | null>(null);
  const [targeting, setTargeting] = useState<TargetingChoices | null>(null);

  // On first load, bring back anything saved earlier in this browser tab.
  useEffect(() => {
    const savedIntake = readJson<IntakeData>(INTAKE_KEY);
    if (savedIntake) setIntake({ ...emptyIntake, ...savedIntake });
    setSavedPlanState(readJson<SavedPlan>(PLAN_KEY));
    setTargeting(readJson<TargetingChoices>(TARGETING_KEY));
    setHydrated(true);
  }, []);

  const updateIntake = useCallback((changes: Partial<IntakeData>) => {
    setIntake((current) => ({ ...current, ...changes }));
  }, []);

  const saveIntake = useCallback(() => {
    sessionStorage.setItem(INTAKE_KEY, JSON.stringify(intake));
    return intake;
  }, [intake]);

  const setSavedPlan = useCallback((plan: SavedPlan) => {
    sessionStorage.setItem(PLAN_KEY, JSON.stringify(plan));
    setSavedPlanState(plan);
  }, []);

  const saveTargeting = useCallback((choices: TargetingChoices) => {
    sessionStorage.setItem(TARGETING_KEY, JSON.stringify(choices));
    setTargeting(choices);
  }, []);

  return (
    <IntakeContext.Provider
      value={{
        hydrated,
        intake,
        updateIntake,
        saveIntake,
        removedKeywordKeys,
        setRemovedKeywordKeys,
        savedPlan,
        setSavedPlan,
        targeting,
        saveTargeting,
      }}
    >
      {children}
    </IntakeContext.Provider>
  );
}

export function useIntake() {
  const value = useContext(IntakeContext);
  if (!value) throw new Error('useIntake must be used inside <IntakeProvider>');
  return value;
}
