export type Role = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
}

/** Qualitative descriptors for a persona — used for direct feature matching
 *  in the self-assessment and as input to genValues(). */
export interface PersonaValues {
  region: "north" | "south";
  education: "low" | "medium" | "high";
  income: "struggling" | "coping" | "comfortable";
  energySecurity: "low" | "moderate" | "high";
  ecoAnxiety: "low" | "moderate" | "high";
  politicalEfficacy: "low" | "moderate" | "high";
  healthChallenges: "few" | "moderate" | "significant";
  proEnvironmental: "low" | "moderate" | "high";
  energySaving: "low" | "moderate" | "high";
  relativeDeprivation: "low" | "moderate" | "high";
}

/** A single index value with a label, the group mean and the regional average. */
export interface IndexValue {
  /** Short key, e.g. "ecoAnxiety". */
  key: string;
  /** Human readable label. */
  label: string;
  /** Value for this persona's group. */
  value: number;
  /** Regional average to compare against. */
  average: number;
  /** Scale maximum (used to normalise bars / radar). */
  max: number;
  /** When true, a HIGHER value means a worse situation (e.g. barriers, anxiety). */
  inverted?: boolean;
  /** Optional short hint shown on hover. */
  hint?: string;
}

export interface Persona {
  id: string;
  name: string;
  /** Short tagline shown on the selection card. */
  tagline: string;
  /** Longer description shown on the detail / chat header. */
  description: string;
  /** Emoji or short label used as the avatar fallback. */
  avatar: string;
  /** Optional path (relative to /public) to a persona portrait image. */
  image?: string;
  /** Region / group the persona belongs to. */
  group: "Global North" | "Global South";
  /** Sub-group label, e.g. "EU Group 1". */
  groupLabel?: string;
  /** Category for the selection system: vulnerable group, regional average, or cluster persona. */
  category?: "vulnerable" | "average" | "cluster";
  /** Cluster number (1–8) for personas derived from the Two-Step Clustering. */
  cluster?: number;
  /** Cluster label, e.g. "Urban Coping Medium". */
  clusterLabel?: string;
  /** Intuitive German tags for filtering, e.g. "Alleinlebend", "Jung", "Minderheit". */
  tags?: string[];
  country?: string;
  /** Demographic snapshot for the detail view. */
  demographics?: {
    age: number;
    ageRange?: string;
    gender: string;
    household: string;
    housing: string;
    education: string;
    employment: string;
    income: string;
    religion?: string;
    ethnicity?: string;
  };
  /** Primary energy sources used by the persona. */
  energy?: {
    cooking: string;
    heating: string;
    lighting: string;
    renewableOwnership: string;
  };
  /** The six ECI subdimensions (1–7 scale). */
  eci?: IndexValue[];
  /** Additional behavioural / psychological indices. */
  indices?: IndexValue[];
  /** System prompt injected at the start of every conversation. */
  systemPrompt: string;
  /** Suggested opening questions for the visitor. */
  starters?: string[];
  /** Short "did you know" facts for the wow effect. */
  facts?: string[];
  /** Qualitative descriptors used for direct feature matching. */
  values?: PersonaValues;
}

export interface Conversation {
  id: string;
  personaId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}
