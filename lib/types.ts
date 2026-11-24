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

// ---------- Segments (first AI step) ----------

export type InferredFrom =
  | 'your description'
  | 'your past clients'
  | 'SAM.gov data'
  | 'workspace settings';

export type Segment = {
  naicsCode: string;
  naicsTitle: string;
  kind: 'primary' | 'suggested';
  selected: boolean; // primary = true, suggested = false
  confidence: number; // 0 to 1, shown as a percentage
  inferredFrom: InferredFrom;
  reasoning: string; // one sentence
};

export type WhyNowDays = 30 | 60 | 90;

export type SegmentPlan = {
  summary: string; // one plain sentence describing who Maria should target
  segments: Segment[]; // 1 primary + 1–2 suggested
  targeting: {
    states: { selected: string[]; confidence: number; inferredFrom: string; reasoning: string };
    whyNowDays: { value: WhyNowDays; confidence: number; inferredFrom: string; reasoning: string };
    contactTitles: {
      selected: string[];
      options: string[];
      confidence: number;
      inferredFrom: string;
      reasoning: string;
    };
    size: { value: 'Small business'; confidence: number; inferredFrom: string; reasoning: string };
  };
  agentSteps: string[];
};

/** What /api/segments sends back: the plan, plus whether it came from the AI or the fallback. */
export type SegmentPlanResponse = {
  plan: SegmentPlan;
  source: 'ai' | 'fallback';
  fallbackReason?: string;
};

/** What Maria chose on the Segments screen (saved next to IntakeData). */
export type TargetingChoices = {
  segments: { naicsCode: string; naicsTitle: string }[];
  states: string[];
  whyNowDays: WhyNowDays;
  contactTitles: string[];
  size: 'Small business';
};

// ---------- Leads (data comes from Roshni's /api/leads and /api/enrich) ----------
// Field names follow Roshni's scripts/clean-leads.mjs output (see docs/lead_data_points.csv).

export type EmailStatus = 'verified' | 'risky' | 'unknown';

export type Lead = {
  id: string; // SAM.gov UEI
  legalName: string;
  dbaName: string | null;
  city: string;
  state: string;
  primaryNaics: string;
  primaryNaicsName: string | null;
  naicsList?: { code: string; name: string; small: string | boolean }[];
  productsAndServices: string[];
  businessTypes: string[];
  registrationExpirationDate: string;
  daysToExpiry: number;
  registrationDate: string;
  registrationStatus: string;
  lastUpdateDate: string;
  signals: string[];
  samSource?: { api: string; uei: string; file?: string; fetchedOn?: string };
  samSourceUrl: string | null;
  website: string | null;
  contactName: string | null;
  contactTitle: string | null;
  fitScore: number | null;
  tier: 'A' | 'B' | 'C' | null;
  scoreReasons: string[];
  email: string | null;
  emailStatus: EmailStatus | null;
  emailConfidence?: number | null;
  draftSubject: string | null;
  draftBody: string | null;
  agentUnsure: string[];
  stage: string;
  stageHistory: { stage: string; by: 'ai' | 'person'; at: string }[];
};

export type LeadFilters = {
  naics: string[];
  states: string[];
  days: WhyNowDays;
};

export type EnrichResult = {
  email: string | null;
  emailStatus: EmailStatus;
  emailConfidence: number | null;
  website: string | null;
};
