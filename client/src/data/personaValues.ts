import type { IndexValue } from "../types";

/**
 * Regional averages from the gEneSys survey (n=18.465 EU, n=11.536 Sub-Saharan Africa).
 * Used as the `average` baseline in all index bars and radar charts.
 */
export const EU_AVG = {
  mgmt: 4.85,
  barriers: 4.19,
  access: 5.75,
  health: 4.86,
  decision: 5.41,
  political: 2.4,
  saving: 4.71,
  efficient: 4.93,
  ecoAnxiety: 1.98,
  deprivation: 3.52,
  proEnv: 4.73,
  epsei: 2.88,
} as const;

export const AF_AVG = {
  mgmt: 5.49,
  barriers: 2.86,
  access: 5.0,
  health: 4.07,
  decision: 5.46,
  political: 2.69,
  saving: 5.21,
  efficient: 5.51,
  ecoAnxiety: 2.55,
  deprivation: 3.5,
  proEnv: 5.43,
  epsei: 3.36,
} as const;

type AverageValues = Record<keyof typeof EU_AVG, number>;
type ECIKey = "mgmt" | "barriers" | "access" | "health" | "decision" | "political";
type IndexKey = "saving" | "efficient" | "ecoAnxiety" | "deprivation" | "proEnv" | "epsei";

const ECI_LABELS: Record<ECIKey, { label: string; hint: string; inverted?: boolean }> = {
  mgmt: { label: "Energie-Management", hint: "Energie effizient nutzen & Umweltentscheidungen treffen" },
  barriers: { label: "Alltagsbarrieren", hint: "Wie sehr Energiekosten den Alltag behindern", inverted: true },
  access: { label: "Zugang & Sicherheit", hint: "Zuverlässige & sichere Energieversorgung" },
  health: { label: "Gesundheitsfolgen", hint: "Wie stark Energie die Gesundheit beeinträchtigt", inverted: true },
  decision: { label: "Entscheidungskompetenz", hint: "Informierte Energieentscheidungen treffen" },
  political: { label: "Politisches Engagement", hint: "Vertrauen, dass Politiker zuhören" },
};

const IDX_LABELS: Record<IndexKey, { label: string; hint: string; inverted?: boolean }> = {
  saving: { label: "Energiespar-Verhalten", hint: "Aktives Sparen von Energie" },
  efficient: { label: "Effizientes Verhalten", hint: "Nachhaltige Konsumentscheidungen" },
  ecoAnxiety: { label: "Eco-Angst", hint: "Sorge um Umwelt & Klima", inverted: true },
  deprivation: { label: "Relative Deprivation", hint: "Gefühl, schlechter gestellt zu sein", inverted: true },
  proEnv: { label: "Pro-Umwelt-Norm", hint: "Persönliche Werte für die Natur" },
  epsei: { label: "Polit. Selbstwirksamkeit", hint: "Glaube an eigenen politischen Einfluss" },
};

/**
 * Build the 6 ECI subdimension entries from a compact numeric spec,
 * using the given regional average as the `average` comparison baseline.
 */
export function makeECI(
  spec: Record<string, number>,
  avg: AverageValues,
): IndexValue[] {
  return (Object.keys(ECI_LABELS) as ECIKey[]).map((key) => ({
    key,
    label: ECI_LABELS[key].label,
    value: spec[key],
    average: avg[key],
    max: 7,
    inverted: ECI_LABELS[key].inverted,
    hint: ECI_LABELS[key].hint,
  }));
}

/**
 * Build the 6 additional index entries from a compact numeric spec.
 */
export function makeIndices(
  spec: Record<string, number>,
  avg: AverageValues,
): IndexValue[] {
  return (Object.keys(IDX_LABELS) as IndexKey[]).map((key) => ({
    key,
    label: IDX_LABELS[key].label,
    value: spec[key],
    average: avg[key],
    max: 7,
    inverted: IDX_LABELS[key].inverted,
    hint: IDX_LABELS[key].hint,
  }));
}

// ── Qualitative → numeric mapping helpers ──────────────────────────────

type Level = "low" | "moderate" | "high";

/** Map a qualitative level to a numeric offset from baseline. */
function levelOffset(level: Level, low: number, mod: number, high: number): number {
  if (level === "low") return low;
  if (level === "moderate") return mod;
  return high;
}

/**
 * Generate all 12 index values from qualitative descriptors.
 * This avoids hand-calculating 384 individual numbers.
 */
export function genValues(opts: {
  region: "north" | "south";
  education: "low" | "medium" | "high";
  income: "struggling" | "coping" | "comfortable";
  energySecurity: Level;
  ecoAnxiety: Level;
  politicalEfficacy: Level;
  healthChallenges: "few" | "moderate" | "significant";
  proEnvironmental: Level;
  energySaving: Level;
  relativeDeprivation: Level;
}): { eci: IndexValue[]; indices: IndexValue[] } {
  const avg = opts.region === "north" ? EU_AVG : AF_AVG;

  // Education → mgmt, decision, efficient
  // Higher education → better energy management, decision competence, efficiency
  const educationLevel = opts.education === "medium" ? "moderate" : opts.education;
  const eduMgmt = levelOffset(educationLevel, -0.9, 0.1, 0.8);
  const eduDecision = levelOffset(educationLevel, -0.8, 0.1, 0.7);
  const eduEfficient = levelOffset(educationLevel, -0.7, 0, 0.6);

  // Income → barriers (inverted: struggling = lower score = more barriers), deprivation
  const incomeBarriers = levelOffset(
    opts.income as Level,
    -1.5, // struggling → much more barriers → much lower score
    -0.2, // coping → slightly more barriers
    1.2, // comfortable → far fewer barriers → higher score
  );
  const incomeDeprivation = levelOffset(
    opts.income as Level,
    1.3, // struggling → much more deprivation → higher score (inverted)
    0.3,
    -1.1, // comfortable → much less deprivation
  );

  // Energy security → access
  const secAccess = levelOffset(opts.energySecurity, -1.4, -0.3, 0.5);

  // Eco-anxiety (inverted: higher = more anxiety)
  const ecoAnxVal = levelOffset(opts.ecoAnxiety, -0.6, 0.4, 1.3);

  // Political self-efficacy → political, epsei
  const polPolitical = levelOffset(opts.politicalEfficacy, -0.8, 0.2, 0.9);
  const polEpsei = levelOffset(opts.politicalEfficacy, -1.0, 0.2, 1.1);

  // Health challenges → health (inverted: more challenges = lower score)
  const healthVal = levelOffset(opts.healthChallenges as Level, 0.8, 0, -1.0);

  // Pro-environmental → proEnv, saving
  const proEnvVal = levelOffset(opts.proEnvironmental, -0.7, 0.2, 1.0);
  const proEnvSaving = levelOffset(opts.proEnvironmental, -0.5, 0.1, 0.6);

  // Energy-saving behavior → saving
  const savingVal = levelOffset(opts.energySaving, -0.8, 0.2, 1.0);

  // Relative deprivation (inverted)
  const deprivVal = levelOffset(opts.relativeDeprivation, -1.0, 0.2, 1.2);

  const eciSpec = {
    mgmt: round(avg.mgmt + eduMgmt),
    barriers: round(avg.barriers + incomeBarriers),
    access: round(avg.access + secAccess),
    health: round(avg.health + healthVal),
    decision: round(avg.decision + eduDecision),
    political: round(avg.political + polPolitical),
  };

  const idxSpec = {
    saving: round(avg.saving + savingVal + proEnvSaving),
    efficient: round(avg.efficient + eduEfficient),
    ecoAnxiety: round(avg.ecoAnxiety + ecoAnxVal),
    deprivation: round(avg.deprivation + deprivVal + incomeDeprivation * 0.5),
    proEnv: round(avg.proEnv + proEnvVal),
    epsei: round(avg.epsei + polEpsei),
  };

  return { eci: makeECI(eciSpec, avg), indices: makeIndices(idxSpec, avg) };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
