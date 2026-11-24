// Shared data shapes for Cadent.
// Anything the intake collects lives in IntakeData so later screens (ICP, discovery) can read it.

export type KeywordCategory = 'role' | 'serves' | 'helpsWith' | 'location';

export type DetectedKeyword = {
  category: KeywordCategory;
  text: string;
};

export type PricingModel = 'hourly' | 'fixed' | 'retainer';

export type PastClient = {
  name: string;
  source: 'excel' | 'paste';
};

export type IntakeData = {
  userName: string;
  userRole: string;
  workspace: { mode: 'join' | 'create'; name: string };
  serviceDescription: string;
  detectedKeywords: DetectedKeyword[];
  website?: string;
  pastClients: PastClient[];
  pricingModels: PricingModel[];
  priceRange?: string;
};

export const emptyIntake: IntakeData = {
  userName: '',
  userRole: '',
  workspace: { mode: 'join', name: '' },
  serviceDescription: '',
  detectedKeywords: [],
  website: '',
  pastClients: [],
  pricingModels: [],
  priceRange: '',
};
