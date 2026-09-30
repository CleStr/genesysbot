import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  RotateCcw,
  Radar,
  Users,
  Globe,
  Compass,
  Info,
  Sparkles,
  Heart,
} from "lucide-react";
import type { Persona, PersonaValues } from "../types";
import { personas } from "../data/personas";
import PersonaAvatar from "./PersonaAvatar";

/* ── Question types ─────────────────────────────────────────────────── */

interface Question {
  id: string;
  prompt: string;
  hint?: string;
  options: { label: string; value: string }[];
}

/* ── The questionnaire ──────────────────────────────────────────────── */

const QUESTIONS: Question[] = [
  {
    id: "region",
    prompt: "In welcher Region lebst du?",
    hint: "Wir vergleichen dich mit Personen aus derselben Region und der anderen.",
    options: [
      { label: "Europa (EU)", value: "north" },
      { label: "Sub-Sahara-Afrika", value: "south" },
    ],
  },
  {
    id: "education",
    prompt: "Wie ist dein Bildungsabschluss?",
    options: [
      { label: "Primarstufe oder weniger", value: "low" },
      { label: "Sekundarstufe / Berufsausbildung", value: "medium" },
      { label: "Hochschule / Universität", value: "high" },
    ],
  },
  {
    id: "income",
    prompt: "Wie würdest du deine finanzielle Situation beschreiben?",
    options: [
      { label: "Ich komme kaum über die Runden", value: "struggling" },
      { label: "Es reicht, aber knapp", value: "coping" },
      { label: "Ich bin finanziell abgesichert", value: "comfortable" },
    ],
  },
  {
    id: "energySecurity",
    prompt: "Wie zuverlässig ist deine Energieversorgung (Strom, Kochen, Heizen)?",
    hint: "Denk an Stromausfälle, teure Rechnungen oder fehlenden Zugang.",
    options: [
      { label: "Oft unzuverlässig oder teuer", value: "low" },
      { label: "Mal gut, mal schwierig", value: "moderate" },
      { label: "Zuverlässig und erschwinglich", value: "high" },
    ],
  },
  {
    id: "ecoAnxiety",
    prompt: "Wie stark belasten dich Umwelt- und Klimasorgen?",
    hint: "Verlieren sie dir Schlaf oder Konzentration?",
    options: [
      { label: "Kaum – ich mache mir wenig Sorgen", value: "low" },
      { label: "Manchmal, aber ich komme damit klar", value: "moderate" },
      { label: "Stark – sie belasten mich deutlich", value: "high" },
    ],
  },
  {
    id: "politicalEfficacy",
    prompt: "Glaubst du, dass Politiker deine Energie-Sorgen ernst nehmen?",
    options: [
      { label: "Nein, gar nicht", value: "low" },
      { label: "Eher wenig", value: "moderate" },
      { label: "Ja, ich fühle mich gehört", value: "high" },
    ],
  },
  {
    id: "healthChallenges",
    prompt: "Wie sehr beeinflusst Energie deine Gesundheit?",
    hint: "Z. B. Rauch beim Kochen, Kälte im Winter, Stress durch Kosten.",
    options: [
      { label: "Kaum – ich bin gesund", value: "few" },
      { label: "Etwas – ab und zu", value: "moderate" },
      { label: "Stark – es belastet mich", value: "significant" },
    ],
  },
  {
    id: "proEnvironmental",
    prompt: "Wie wichtig ist dir der Schutz der Natur und Umwelt?",
    options: [
      { label: "Nicht so wichtig", value: "low" },
      { label: "Ziemlich wichtig", value: "moderate" },
      { label: "Sehr wichtig – ein Kernwert", value: "high" },
    ],
  },
  {
    id: "energySaving",
    prompt: "Wie aktiv sparst du Energie im Alltag?",
    options: [
      { label: "Selten – ich mache mir wenig Gedanken", value: "low" },
      { label: "Manchmal – ich achte darauf", value: "moderate" },
      { label: "Sehr aktiv – es ist Gewohnheit", value: "high" },
    ],
  },
  {
    id: "relativeDeprivation",
    prompt: "Fühlst du dich im Vergleich zu anderen benachteiligt?",
    options: [
      { label: "Nein, ich stehe gut da", value: "low" },
      { label: "Etwas – andere haben es besser", value: "moderate" },
      { label: "Ja, deutlich schlechter gestellt", value: "high" },
    ],
  },
];

/* ── Feature matching ──────────────────────────────────────────────── */

/** Sociodemographic features (3): region, education, income */
const SOCIO_KEYS = ["region", "education", "income"] as const;

/** Opinion & behavior features (7): the remaining 7 questions */
const BEHAVIOR_KEYS = [
  "energySecurity",
  "ecoAnxiety",
  "politicalEfficacy",
  "healthChallenges",
  "proEnvironmental",
  "energySaving",
  "relativeDeprivation",
] as const;

/** Human-readable labels for each feature. */
const FEATURE_LABELS: Record<string, string> = {
  region: "Region",
  education: "Bildung",
  income: "Einkommen",
  energySecurity: "Energiezugang",
  ecoAnxiety: "Eco-Angst",
  politicalEfficacy: "Politisches Vertrauen",
  healthChallenges: "Gesundheit",
  proEnvironmental: "Umweltschutz",
  energySaving: "Energiesparen",
  relativeDeprivation: "Benachteiligung",
};

interface FeatureMatch {
  /** Matching sociodemographic features (0–3) */
  socio: number;
  /** Matching behavior features (0–7) */
  behavior: number;
  /** Total matching features (0–10) */
  total: number;
  /** Keys that matched */
  matchedKeys: string[];
  /** Keys that did not match */
  unmatchedKeys: string[];
}

/** Compare the user's values against a persona's values, feature by feature. */
function matchPersona(user: PersonaValues, pv: PersonaValues): FeatureMatch {
  let socio = 0;
  let behavior = 0;
  const matchedKeys: string[] = [];
  const unmatchedKeys: string[] = [];

  for (const key of SOCIO_KEYS) {
    if (user[key] === pv[key]) {
      socio++;
      matchedKeys.push(key);
    } else {
      unmatchedKeys.push(key);
    }
  }
  for (const key of BEHAVIOR_KEYS) {
    if (user[key] === pv[key]) {
      behavior++;
      matchedKeys.push(key);
    } else {
      unmatchedKeys.push(key);
    }
  }

  return { socio, behavior, total: socio + behavior, matchedKeys, unmatchedKeys };
}

/** Convert the raw answers record into a typed PersonaValues object. */
function answersToValues(answers: Record<string, string>): PersonaValues {
  return {
    region: answers.region as "north" | "south",
    education: answers.education as "low" | "medium" | "high",
    income: answers.income as "struggling" | "coping" | "comfortable",
    energySecurity: answers.energySecurity as "low" | "moderate" | "high",
    ecoAnxiety: answers.ecoAnxiety as "low" | "moderate" | "high",
    politicalEfficacy: answers.politicalEfficacy as "low" | "moderate" | "high",
    healthChallenges: answers.healthChallenges as "few" | "moderate" | "significant",
    proEnvironmental: answers.proEnvironmental as "low" | "moderate" | "high",
    energySaving: answers.energySaving as "low" | "moderate" | "high",
    relativeDeprivation: answers.relativeDeprivation as "low" | "moderate" | "high",
  };
}

/** Get the human-readable label for a feature value (e.g. "north" → "Europa (EU)"). */
function featureValueLabel(key: string, value: string): string {
  const q = QUESTIONS.find((q) => q.id === key);
  return q?.options.find((o) => o.value === value)?.label ?? value;
}

interface ScoredPersona {
  persona: Persona;
  match: FeatureMatch;
}

/** Score every persona that has a `values` field against the user's values. */
function scoreAllPersonas(userValues: PersonaValues): ScoredPersona[] {
  return personas
    .filter((p) => p.values)
    .map((p) => ({
      persona: p,
      match: matchPersona(userValues, p.values!),
    }));
}

/* ── Persona match card (reusable) ─────────────────────────────────── */

type AccentColor = "brand" | "emerald" | "amber";

function PersonaMatchCard({
  scored,
  onPick,
  accent,
  delay,
}: {
  scored: ScoredPersona;
  onPick: (p: Persona) => void;
  accent: AccentColor;
  delay: number;
}) {
  const { persona, match } = scored;
  const barWidth = (match.total / 10) * 100;

  const barColor =
    accent === "brand"
      ? "bg-brand-500"
      : accent === "emerald"
        ? "bg-brand-400"
        : "bg-amber-500";

  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className="card group flex flex-col gap-3 p-5 animate-slide-up"
    >
      <div className="flex items-center gap-3">
        <PersonaAvatar persona={persona} size="md" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-slate-900">
            {persona.name}
          </h3>
          <p className="truncate text-xs text-slate-500">{persona.tagline}</p>
        </div>
      </div>

      {/* Match count + bar */}
      <div>
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-slate-500">Übereinstimmung</span>
          <span className="font-semibold text-slate-700">
            {match.total} von 10 Merkmalen
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all duration-700 ${barColor}`}
            style={{ width: `${barWidth}%` }}
          />
        </div>
        <div className="mt-1.5 flex gap-4 text-xs text-slate-400">
          <span>Soziodemografie {match.socio}/3</span>
          <span>Verhalten &amp; Meinung {match.behavior}/7</span>
        </div>
      </div>

      {/* Category badge */}
      <div className="flex flex-wrap gap-1">
        {persona.category === "vulnerable" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
            <Heart className="h-3 w-3" /> Vulnerable Gruppe
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">
            <Users className="h-3 w-3" /> {persona.clusterLabel ?? `Gruppe ${persona.cluster}`}
          </span>
        )}
      </div>

      <p className="line-clamp-2 text-sm text-slate-600">
        {persona.description}
      </p>

      <button
        onClick={() => onPick(persona)}
        className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-100"
      >
        Mit {persona.name} sprechen <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ── Component ──────────────────────────────────────────────────────── */

interface Props {
  onPick: (persona: Persona) => void;
}

export default function SelfAssessment({ onPick }: Props) {
  const [step, setStep] = useState(0); // 0 = intro, 1..N = questions, N+1 = results
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const totalSteps = QUESTIONS.length;
  const isIntro = step === 0;
  const isResults = step === totalSteps + 1;
  const currentQuestion = !isIntro && !isResults ? QUESTIONS[step - 1] : null;

  const userValues = useMemo(
    () => (isResults ? answersToValues(answers) : null),
    [isResults, answers],
  );

  const scored = useMemo(
    () => (isResults && userValues ? scoreAllPersonas(userValues) : []),
    [isResults, userValues],
  );

  // 2–3 closest personas from the SAME region
  const closest = useMemo(() => {
    if (!scored.length || !userValues) return [];
    return scored
      .filter((s) => s.persona.values!.region === userValues.region)
      .sort((a, b) => b.match.total - a.match.total)
      .slice(0, 3);
  }, [scored, userValues]);

  // Cross-region statistical twin (most matching persona from the OTHER region)
  const crossTwin = useMemo(() => {
    if (!scored.length || !userValues) return null;
    return (
      scored
        .filter((s) => s.persona.values!.region !== userValues.region)
        .sort((a, b) => b.match.total - a.match.total)[0] ?? null
    );
  }, [scored, userValues]);

  // Most different persona (fewest matches, excluding already-shown personas)
  const mostDifferent = useMemo(() => {
    if (!scored.length || !crossTwin) return null;
    const shown = new Set([
      ...closest.map((s) => s.persona.id),
      crossTwin.persona.id,
    ]);
    return (
      scored
        .filter((s) => !shown.has(s.persona.id))
        .sort((a, b) => a.match.total - b.match.total)[0] ?? null
    );
  }, [scored, closest, crossTwin]);

  const reset = () => {
    setAnswers({});
    setStep(0);
  };

  const canProceed =
    isIntro || (currentQuestion && answers[currentQuestion.id]);

  /* ── Intro screen ──────────────────────────────────────────────────── */
  if (isIntro) {
    return (
      <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center px-4 py-8 sm:px-6">
        <div className="card w-full p-8 text-center animate-fade-in">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 ring-1 ring-brand-100">
            <Radar className="h-8 w-8 text-brand-600" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Energie-Selbsttest
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-slate-500">
            Beantworte {totalSteps} kurze Fragen zu deinem Alltag mit Energie.
            Wir vergleichen deine Antworten direkt mit den Personen aus der
            gEneSys-Studie und zeigen dir, wem du ähnlich bist.
          </p>
          <div className="mt-6 flex flex-col gap-3 rounded-xl bg-brand-50 p-4 text-left text-xs text-slate-600 ring-1 ring-brand-100">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
              <span>
                Deine Antworten werden <strong>direkt</strong> mit den
                Merkmalen jeder Person verglichen – ehrlich und ohne
                künstliche Messwerte.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
              <span>
                Du siehst, <strong>wie viele deiner Merkmale</strong> mit
                jeder Person übereinstimmen – aufgeteilt in Soziodemografie
                und Verhalten &amp; Meinung.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Globe className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
              <span>
                Wir zeigen dir auch deinen <strong>statistischen Zwilling</strong>{" "}
                in der anderen Region und die Person, die am wenigsten wie du ist.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
              <span>
                Dauer: ca. <strong>2 Minuten</strong>. Keine Daten werden gespeichert.
              </span>
            </div>
          </div>
          <button
            onClick={() => setStep(1)}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
          >
            Los geht's <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  /* ── Results screen ────────────────────────────────────────────────── */
  if (isResults && userValues) {
    const regionLabel =
      userValues.region === "north" ? "Europa" : "Sub-Sahara-Afrika";
    const otherRegionLabel =
      userValues.region === "north" ? "Sub-Sahara-Afrika" : "Europa";

    return (
      <div className="mx-auto h-full max-w-3xl overflow-y-auto px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="mb-6 text-center animate-fade-in">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 ring-1 ring-brand-100">
            <Check className="h-7 w-7 text-brand-600" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Dein Energie-Profil
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Wir haben deine Antworten mit allen {personas.length} Personen aus
            der Studie verglichen.
          </p>
        </div>

        {/* User's answers summary */}
        <div className="card mb-6 p-5 animate-slide-up">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
            Deine Antworten
          </h2>
          <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
            {QUESTIONS.map((q) => (
              <div key={q.id} className="flex items-baseline justify-between gap-2 text-sm">
                <span className="shrink-0 text-slate-400">
                  {FEATURE_LABELS[q.id]}
                </span>
                <span className="text-right font-medium text-slate-700">
                  {featureValueLabel(q.id, answers[q.id])}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Closest personas (same region) */}
        {closest.length > 0 && (
          <div className="mb-6 animate-slide-up">
            <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-slate-900">
              <Users className="h-5 w-5 text-brand-600" />
              Personen, die dir ähnlich sind
            </h2>
            <p className="mb-4 text-sm text-slate-500">
              Diese Personen aus {regionLabel} teilen die meisten Merkmale
              mit dir.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {closest.map((s, i) => (
                <PersonaMatchCard
                  key={s.persona.id}
                  scored={s}
                  onPick={onPick}
                  accent="brand"
                  delay={i * 80}
                />
              ))}
            </div>
          </div>
        )}

        {/* Cross-region statistical twin */}
        {crossTwin && (
          <div className="mb-6 animate-slide-up">
            <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-slate-900">
              <Globe className="h-5 w-5 text-brand-600" />
              Dein statistischer Zwilling in {otherRegionLabel}
            </h2>
            <p className="mb-4 text-sm text-slate-500">
              Trotz anderer Lebensumstände teilt diese Person aus{" "}
              {otherRegionLabel} viele Merkmale mit dir – ein Blick über
              den Tellerrand.
            </p>
            <PersonaMatchCard
              scored={crossTwin}
              onPick={onPick}
              accent="brand"
              delay={0}
            />
          </div>
        )}

        {/* Most different persona */}
        {mostDifferent && (
          <div className="mb-6 animate-slide-up">
            <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-slate-900">
              <Compass className="h-5 w-5 text-amber-600" />
              Die Person, die am wenigsten wie du ist
            </h2>
            <p className="mb-4 text-sm text-slate-500">
              {mostDifferent.match.total} von 10 Merkmalen stimmen überein –
              eine ganz andere Lebenswirklichkeit.
            </p>
            <PersonaMatchCard
              scored={mostDifferent}
              onPick={onPick}
              accent="amber"
              delay={0}
            />
          </div>
        )}

        {/* Method note */}
        <div className="mb-6 rounded-lg bg-brand-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-brand-100">
          <strong className="text-brand-700">Grundlage:</strong>{" "}
          Vergleich deiner 10 Antworten mit den Merkmalen jeder Person aus der
          gEneSys-Studie (n=18.465 in Europa, n=4.620 in Sub-Sahara-Afrika).
          Jede Übereinstimmung zählt als ein Merkmal.
        </div>

        {/* Restart */}
        <div className="mt-6 flex justify-center pb-4">
          <button
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-medium text-slate-600 ring-1 ring-brand-200 transition-colors hover:bg-brand-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Test wiederholen
          </button>
        </div>
      </div>
    );
  }

  /* ── Question screen ───────────────────────────────────────────────── */
  if (!currentQuestion) return null;

  const progress = ((step - 1) / totalSteps) * 100;
  const selected = answers[currentQuestion.id];

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col px-4 py-6 sm:px-6">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
          <span>
            Frage {step} von {totalSteps}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-brand-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="card flex flex-1 flex-col p-6 animate-fade-in sm:p-8">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          {currentQuestion.prompt}
        </h2>
        {currentQuestion.hint && (
          <p className="mt-2 text-sm text-slate-400">{currentQuestion.hint}</p>
        )}

        <div className="mt-6 flex flex-col gap-3">
          {currentQuestion.options.map((opt) => {
            const isSelected = selected === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() =>
                  setAnswers((prev) => ({ ...prev, [currentQuestion.id]: opt.value }))
                }
                className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left text-sm font-medium transition-all ${
                  isSelected
                    ? "border-brand-500 bg-brand-50 text-brand-900"
                    : "border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-slate-50"
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    isSelected
                      ? "border-brand-600 bg-brand-600"
                      : "border-slate-300"
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3 text-white" />}
                </span>
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Navigation */}
        <div className="mt-auto flex items-center justify-between pt-6">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück
          </button>
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canProceed}
            className={`inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors ${
              canProceed
                ? "bg-brand-600 text-white hover:bg-brand-700"
                : "cursor-not-allowed bg-slate-100 text-slate-400"
            }`}
          >
            {step === totalSteps ? "Ergebnis sehen" : "Weiter"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
