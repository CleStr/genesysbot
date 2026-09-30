import type { PersonaValues } from "./index";

/* ── Roles ──────────────────────────────────────────────────────────── */

export type RoleId = "policy" | "sales" | "activist";

export interface Role {
  id: RoleId;
  /** Display name, e.g. "Policy Designer". */
  name: string;
  /** German label shown in the UI, e.g. "Politik entwickeln". */
  label: string;
  /** Short tagline for the role-selection card. */
  tagline: string;
  /** Longer description shown on the role card. */
  description: string;
  /** Emoji / icon fallback. */
  icon: string;
  /** Lucide icon name (matched in component). */
  lucideIcon: "Briefcase" | "ShoppingBag" | "Megaphone";
  /** Accent colour for the role card. */
  accent: "brand" | "amber" | "violet";
  /** The system prompt injected *in addition to* the persona's own prompt. */
  systemPrompt: string;
  /** Suggested opening lines the player can use. */
  starters: string[];
}

/* ── Scenarios ──────────────────────────────────────────────────────── */

export interface Scenario {
  id: string;
  /** Which role this scenario belongs to. */
  role: RoleId;
  /** Short title. */
  title: string;
  /** The situation the player finds themselves in. */
  brief: string;
  /** The concrete goal the player must achieve. */
  goal: string;
  /** How many personas the player must convince. */
  targetCount: number;
  /** Suggested personas to pick (by id) — or empty for free choice. */
  suggestedPersonaIds?: string[];
  /** Which persona value dimensions matter most for this scenario. */
  keyDimensions: (keyof PersonaValues)[];
  /** A hint shown to the player. */
  hint?: string;
}

/* ── Scoring ────────────────────────────────────────────────────────── */

export interface PersonaScore {
  personaId: string;
  personaName: string;
  /** 0–100: how well the arguments matched the persona's values. */
  fitScore: number;
  /** 0–100: AI judgement of persuasiveness from the conversation. */
  aiScore: number;
  /** Combined 0–100. */
  total: number;
  /** Short qualitative verdict, e.g. "Überzeugt", "Teilweise", "Nicht überzeugt". */
  verdict: "convinced" | "partial" | "failed";
  /** 1–2 sentence explanation from the AI. */
  reasoning: string;
  /** Which dimensions matched well. */
  matchedDimensions: string[];
}

export interface GameResult {
  role: RoleId;
  scenarioId: string;
  scenarioTitle: string;
  scores: PersonaScore[];
  /** Overall 0–100 across all personas. */
  overallScore: number;
  /** How many personas were "convinced". */
  convincedCount: number;
  /** Total personas attempted. */
  totalCount: number;
  /** Star rating 1–3. */
  stars: number;
  /** Short summary verdict. */
  summary: string;
}
