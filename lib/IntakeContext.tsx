'use client';

// Shared state for the intake answers.
// Any screen inside <IntakeProvider> can read or update them with useIntake().
// We also copy them into the browser's sessionStorage so a page refresh doesn't lose them.

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { emptyIntake, type IntakeData } from './types';

const STORAGE_KEY = 'cadent.intake';

type IntakeContextValue = {
  intake: IntakeData;
  updateIntake: (changes: Partial<IntakeData>) => void;
  /** Saves the answers (used by "Find my ideal clients"). */
  saveIntake: () => IntakeData;
  /** Keywords the user removed (by keywordKey), so they aren't picked up again. */
  removedKeywordKeys: string[];
  setRemovedKeywordKeys: (keys: string[]) => void;
};

const IntakeContext = createContext<IntakeContextValue | null>(null);

export function IntakeProvider({ children }: { children: React.ReactNode }) {
  const [intake, setIntake] = useState<IntakeData>(emptyIntake);
  const [removedKeywordKeys, setRemovedKeywordKeys] = useState<string[]>([]);

  // On first load, bring back anything saved earlier in this browser tab.
  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) setIntake({ ...emptyIntake, ...JSON.parse(saved) });
  }, []);

  const updateIntake = useCallback((changes: Partial<IntakeData>) => {
    setIntake((current) => ({ ...current, ...changes }));
  }, []);

  const saveIntake = useCallback(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(intake));
    return intake;
  }, [intake]);

  return (
    <IntakeContext.Provider
      value={{ intake, updateIntake, saveIntake, removedKeywordKeys, setRemovedKeywordKeys }}
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
