// Fake workspaces for the "Join a workspace" option. UI only, no backend.

import type { PricingModel } from './types';

export type MockWorkspace = {
  id: string;
  name: string;
  pricing?: { models: PricingModel[]; priceRange: string };
};

export const MOCK_WORKSPACES: MockWorkspace[] = [
  {
    id: 'lopez',
    name: 'Lopez Compliance Advisors',
    pricing: { models: ['retainer'], priceRange: '$1,500–3,000 / month' },
  },
  { id: 'capitol', name: 'Capitol GovCon Partners' },
  { id: 'bayview', name: 'Bayview Contract Readiness' },
];

export const findWorkspace = (name: string) => MOCK_WORKSPACES.find((w) => w.name === name);
