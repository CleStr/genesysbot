import type { Role, Scenario } from "../types/roleplay";

/* ── Roles ──────────────────────────────────────────────────────────── */

export const ROLES: Role[] = [
  {
    id: "policy",
    name: "Policy Designer",
    label: "Politik entwickeln",
    tagline: "Entwickle eine Maßnahme, die viele Menschen überzeugt",
    description:
      "Du bist Policy Designer und musst eine Energie-Maßnahme entwickeln, " +
      "die möglichst viele verschiedene Menschen gut finden. Sprich mit " +
      "Personen aus unterschiedlichen Lebenswelten, verstehe ihre Sorgen " +
      "und passe deine Maßnahme so an, dass sie breit akzeptiert wird.",
    icon: "📋",
    lucideIcon: "Briefcase",
    accent: "brand",
    systemPrompt:
      "Du nimmst ab sofort die Rolle eines Policy Designers ein, der eine " +
      "Energie-Maßnahme entwickelt. Der Nutzer spielt diesen Policy Designer " +
      "und spricht mit dir. Antworte aus deiner Perspektive als die Person, " +
      "die du bist (dein Name, deine Lebenssituation). Beziehe dich auf deine " +
      "konkreten Werte und Sorgen: Einkommen, Energiezugang, Eco-Angst, " +
      "politisches Vertrauen, Gesundheit, Umweltschutz. Wenn der Policy " +
      "Designer etwas vorschlägt, reagiere ehrlich: Würdest du die Maßnahme " +
      "unterstützen? Warum oder warum nicht? Bleibe in deiner Rolle und " +
      "antworte wie immer in der Ich-Form.",
    starters: [
      "Hallo, ich entwickle gerade eine Energie-Maßnahme. Was ist dir im Alltag mit Energie am wichtigsten?",
      "Wenn es ein Programm gäbe, das dir beim Energiesparen hilft – würdest du das nutzen?",
      "Was müsste eine Politik tun, damit sie dir wirklich hilft?",
    ],
  },
  {
    id: "sales",
    name: "Vertriebler",
    label: "Produkt verkaufen",
    tagline: "Überzeuge eine Person von deinem Energie-Produkt",
    description:
      "Du bist Vertriebler und möchtest ein Energie-Produkt oder einen " +
      "Service verkaufen – z. B. eine Solaranlage, einen Stromtarif oder " +
      "einen Energiespar-Service. Wähle eine Person aus und versuche, sie " +
      "von deinem Angebot zu überzeugen. Passe deine Argumente an ihre " +
      "Lebenssituation an.",
    icon: "💼",
    lucideIcon: "ShoppingBag",
    accent: "amber",
    systemPrompt:
      "Der Nutzer spielt ab jetzt einen Vertriebler, der dir ein Energie-Produkt " +
      "oder einen Service verkaufen möchte. Antworte aus deiner Perspektive " +
      "als die Person, die du bist. Beziehe dich auf deine konkrete Lebenssituation: " +
      "Kannst du dir das Produkt leisten? Passt es zu deinem Alltag? Hast du " +
      "überhaupt Zugang zu den nötigen Voraussetzungen (z. B. eigenes Dach, " +
      "stabiles Stromnetz)? Reagiere ehrlich und realistisch: Lass dich nur " +
      "überzeugen, wenn die Argumente zu deiner Situation passen. Bleibe in " +
      "deiner Rolle und antworte in der Ich-Form.",
    starters: [
      "Hallo! Ich möchte dir ein Angebot vorstellen, das dir beim Thema Energie helfen kann.",
      "Hast du schon einmal über eine Solaranlage nachgedacht?",
      "Ich habe hier einen Energiespar-Service, der dir Geld sparen könnte. Darf ich erzählen?",
    ],
  },
  {
    id: "activist",
    name: "Aktivist",
    label: "Kampagne starten",
    tagline: "Entwickle eine Kampagne, die Menschen aus allen Welten anspricht",
    description:
      "Du bist Aktivist und möchtest eine Kampagne für gerechte Energiewende " +
      "starten. Sprich mit Menschen aus Europa und Sub-Sahara-Afrika, um zu " +
      "verstehen, welche Botschaften sie erreichen. Entwickle eine Kampagne, " +
      "die Menschen aus ganz unterschiedlichen Lebenswelten anspricht und " +
      "bewegt.",
    icon: "📣",
    lucideIcon: "Megaphone",
    accent: "violet",
    systemPrompt:
      "Der Nutzer spielt ab jetzt einen Aktivisten, der eine Kampagne für " +
      "gerechte Energiewende entwickelt. Antworte aus deiner Perspektive als " +
      "die Person, die du bist. Beziehe dich auf deine Werte und Sorgen: " +
      "Welche Botschaft würde dich erreichen? Welche Themen sind dir wichtig " +
      "(Umweltschutz, Gerechtigkeit, Gesundheit, Geld)? Reagiere ehrlich: " +
      "Würde dich diese Kampagne ansprechen? Warum oder warum nicht? Bleibe " +
      "in deiner Rolle und antworte in der Ich-Form.",
    starters: [
      "Hallo! Ich arbeite an einer Kampagne für gerechte Energiewende. Was bewegt dich beim Thema Energie?",
      "Welche Botschaft würde dich erreichen, wenn es um Energiegerechtigkeit geht?",
      "Was müsste eine Kampagne ansprechen, damit du dich angesprochen fühlst?",
    ],
  },
];

/* ── Scenarios ──────────────────────────────────────────────────────── */

export const SCENARIOS: Scenario[] = [
  // ── Policy Designer ──────────────────────────────────────────────────
  {
    id: "policy-subsidy",
    role: "policy",
    title: "Subventionsprogramm für erneuerbare Energien",
    brief:
      "Du sollst ein Förderprogramm entwickeln, das Menschen mit " +
      "unterschiedlichem Einkommen und unterschiedlicher Bildung den " +
      "Einstieg in erneuerbare Energien erleichtert.",
    goal:
      "Entwickle eine Maßnahme, die mindestens 3 von 4 Personen überzeugt. " +
      "Achte darauf, dass sie auch Menschen mit knappen Einkommen und " +
      "geringer politischer Wirksamkeit erreicht.",
    targetCount: 3,
    keyDimensions: ["income", "politicalEfficacy", "energySecurity", "proEnvironmental"],
    hint:
      "Personen mit geringem Einkommen brauchen andere Argumente als " +
      "Personen mit hoher Eco-Angst. Höre zuerst zu, bevor du vorschlägst.",
  },
  {
    id: "policy-blackout",
    role: "policy",
    title: "Schutz bei Stromausfällen",
    brief:
      "In vielen Regionen gibt es Stromausfälle. Du sollst eine Maßnahme " +
      "entwickeln, die besonders vulnerable Gruppen schützt.",
    goal:
      "Überzeuge mindestens 3 von 4 Personen – darunter mindestens eine " +
      "aus Sub-Sahara-Afrika, wo Stromausfälle häufiger sind.",
    targetCount: 3,
    keyDimensions: ["energySecurity", "healthChallenges", "income", "region"],
    hint:
      "Frag zuerst nach konkreten Erfahrungen mit Stromausfällen. " +
      "Personen mit Gesundheitsproblemen haben andere Prioritäten.",
  },

  // ── Vertriebler ──────────────────────────────────────────────────────
  {
    id: "sales-solar",
    role: "sales",
    title: "Solaranlage für zu Hause",
    brief:
      "Du vertreibst kleine Solaranlagen für Haushalte. Wähle eine Person " +
      "aus und versuche, sie von deinem Produkt zu überzeugen.",
    goal:
      "Überzeuge mindestens 1 Person, dass das Produkt zu ihr passt. " +
      "Achte auf Einkommen, Wohnsituation und Energiezugang.",
    targetCount: 1,
    keyDimensions: ["income", "energySecurity", "proEnvironmental", "energySaving"],
    hint:
      "Eine Solaranlage braucht ein eigenes Dach oder zumindest eine " +
      "geeignete Wohnsituation. Personen im Mietwohnungsbau sind schwerer " +
      "zu überzeugen – es sei denn, du hast ein Community-Modell.",
  },
  {
    id: "sales-tariff",
    role: "sales",
    title: "Grüner Stromtarif",
    brief:
      "Du vertreibst einen Ökostrom-Tarif, der 100 % erneuerbar ist und " +
      "fair produziert wird. Überzeuge eine Person, zu wechseln.",
    goal:
      "Überzeuge mindestens 1 Person. Personen mit hoher Eco-Angst und " +
      "hohem Umweltschutz-Wert sind leichter zu erreichen – aber schaffst " +
      "du es auch bei jemandem mit knappen Einkommen?",
    targetCount: 1,
    keyDimensions: ["ecoAnxiety", "proEnvironmental", "income", "energySaving"],
    hint:
      "Der Tarif kostet etwas mehr. Personen mit knappen Einkommen brauchen " +
      "ein überzeugendes Preisargument oder eine Ersparnis.",
  },

  // ── Aktivist ────────────────────────────────────────────────────────
  {
    id: "activist-justice",
    role: "activist",
    title: "Kampagne für Energiegerechtigkeit",
    brief:
      "Du startest eine Kampagne für gerechte Energiewende. Sprich mit " +
      "Menschen aus Europa und Sub-Sahara-Afrika, um Botschaften zu finden, " +
      "die beide Welten erreichen.",
    goal:
      "Entwickle eine Kampagne, die mindestens 3 von 4 Personen aus " +
      "unterschiedlichen Regionen anspricht.",
    targetCount: 3,
    keyDimensions: ["ecoAnxiety", "relativeDeprivation", "politicalEfficacy", "proEnvironmental"],
    hint:
      "Menschen, die sich benachteiligt fühlen, reagieren auf " +
      "Gerechtigkeitsargumente. Menschen mit hoher Eco-Angst reagieren " +
      "auf Klimanotwendigkeit. Finde eine Botschaft, die beide erreicht.",
  },
  {
    id: "activist-health",
    role: "activist",
    title: "Kampagne gegen gesundheitsschädliche Energie",
    brief:
      "Viele Menschen kochen noch mit Holz oder Kohle, was die Gesundheit " +
      "belastet. Du startest eine Kampagne für saubere Kochenergie.",
    goal:
      "Überzeuge mindestens 3 von 4 Personen – darunter mindestens eine " +
      "aus Sub-Sahara-Afrika, wo das Problem am größten ist.",
    targetCount: 3,
    keyDimensions: ["healthChallenges", "energySecurity", "region", "income"],
    hint:
      "Personen mit Gesundheitsproblemen sind am ehesten erreichbar. " +
      "Aber auch hier zählt: Passt die Lösung zu ihrem Alltag?",
  },
];

/* ── Helpers ────────────────────────────────────────────────────────── */

export function getRole(id: string): Role | undefined {
  return ROLES.find((r) => r.id === id);
}

export function getScenariosForRole(roleId: string): Scenario[] {
  return SCENARIOS.filter((s) => s.role === roleId);
}
