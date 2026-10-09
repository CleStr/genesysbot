import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Send,
  Sparkles,
  AlertCircle,
  Check,
  X,
  Loader2,
  Briefcase,
  ShoppingBag,
  Megaphone,
  Trophy,
  Target,
  RotateCcw,
  Star,
  Users,
  Info,
  MessageCircle,
} from "lucide-react";
import type { Persona, ChatMessage } from "../types";
import type { Role, Scenario, PersonaScore, GameResult } from "../types/roleplay";
import { personas } from "../data/personas";
import { ROLES, getScenariosForRole } from "../data/roleplay";
import { sendRoleChat, evaluateConversation } from "../lib/api";
import { detectEnglishMix } from "../lib/languageCheck";
import PersonaAvatar from "./PersonaAvatar";
import MessageBubble, { TypingIndicator } from "./MessageBubble";

/* ── Icon helper ────────────────────────────────────────────────────── */

function RoleIcon({ role, className }: { role: Role; className?: string }) {
  const props = { className };
  if (role.lucideIcon === "Briefcase") return <Briefcase {...props} />;
  if (role.lucideIcon === "ShoppingBag") return <ShoppingBag {...props} />;
  return <Megaphone {...props} />;
}

/* ── Accent helpers ─────────────────────────────────────────────────── */

const ACCENT_CLASSES: Record<string, {
  bg: string;
  bgLight: string;
  text: string;
  textDark: string;
  border: string;
  ring: string;
  gradient: string;
}> = {
  brand: {
    bg: "bg-brand-600",
    bgLight: "bg-brand-50",
    text: "text-brand-600",
    textDark: "text-brand-700",
    border: "border-brand-300",
    ring: "ring-brand-200",
    gradient: "from-brand-500 to-brand-700",
  },
  amber: {
    bg: "bg-amber-600",
    bgLight: "bg-amber-50",
    text: "text-amber-600",
    textDark: "text-amber-700",
    border: "border-amber-300",
    ring: "ring-amber-200",
    gradient: "from-amber-500 to-amber-700",
  },
  violet: {
    bg: "bg-violet-600",
    bgLight: "bg-violet-50",
    text: "text-violet-600",
    textDark: "text-violet-700",
    border: "border-violet-300",
    ring: "ring-violet-200",
    gradient: "from-violet-500 to-violet-700",
  },
};

/* ── Value-based fit score ──────────────────────────────────────────── */

const VALUE_LABELS: Record<string, string> = {
  income: "Einkommen",
  energySecurity: "Energiezugang",
  ecoAnxiety: "Eco-Angst",
  politicalEfficacy: "Politisches Vertrauen",
  healthChallenges: "Gesundheit",
  proEnvironmental: "Umweltschutz",
  energySaving: "Energiesparen",
  relativeDeprivation: "Benachteiligung",
  region: "Region",
  education: "Bildung",
};

/** Compute a deterministic 0–100 fit score based on how many of the scenario's
 *  key dimensions the persona has in a "reachable" state. This is a heuristic
 *  that rewards the player for choosing personas whose values align with the
 *  scenario's key dimensions — it does NOT depend on the conversation. */
function computeFitScore(
  persona: Persona,
  scenario: Scenario,
  conversationLength: number
): { fitScore: number; matchedDimensions: string[] } {
  if (!persona.values) {
    return { fitScore: 50, matchedDimensions: [] };
  }

  const matched: string[] = [];
  let reachable = 0;

  for (const dim of scenario.keyDimensions) {
    const val = persona.values[dim];
    if (val === undefined) continue;

    // A persona is "reachable" on a dimension if it's not the worst state.
    // For most dimensions, "low" is the hardest to reach; for ecoAnxiety and
    // relativeDeprivation, "high" is actually the engaged state.
    let isReachable = false;
    if (dim === "ecoAnxiety" || dim === "proEnvironmental" || dim === "energySaving") {
      // High eco-anxiety / pro-environmental / energy-saving = engaged = reachable
      isReachable = val === "high" || val === "moderate";
    } else if (dim === "relativeDeprivation") {
      // High deprivation = feels injustice = reachable for activist messaging
      isReachable = val === "high" || val === "moderate";
    } else if (dim === "income") {
      // All income levels are reachable, but "struggling" needs price arguments
      isReachable = true;
    } else if (dim === "region") {
      isReachable = true;
    } else {
      // energySecurity, politicalEfficacy, healthChallenges, education
      isReachable = val !== "low";
    }

    if (isReachable) {
      reachable++;
      matched.push(VALUE_LABELS[dim] ?? dim);
    }
  }

  const dimCount = scenario.keyDimensions.length || 1;
  const baseScore = (reachable / dimCount) * 100;

  // Bonus for having a real conversation (at least 4 messages = 2 exchanges)
  const conversationBonus = Math.min(20, Math.floor(conversationLength / 4) * 10);

  const fitScore = Math.max(0, Math.min(100, Math.round(baseScore + conversationBonus)));
  return { fitScore, matchedDimensions: matched };
}

/* ── Phase type ─────────────────────────────────────────────────────── */

type Phase = "role-select" | "scenario-select" | "persona-select" | "conversation" | "evaluating" | "results";

/* ── Conversation state per persona ────────────────────────────────── */

interface PersonaConversation {
  persona: Persona;
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  done: boolean;
  score?: PersonaScore;
}

/* ── Main component ─────────────────────────────────────────────────── */

interface Props {
  onPick?: (persona: Persona) => void;
}

export default function RolePlay({ onPick }: Props) {
  const [phase, setPhase] = useState<Phase>("role-select");
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [conversations, setConversations] = useState<PersonaConversation[]>([]);
  const [activePersonaId, setActivePersonaId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<GameResult | null>(null);

  /* ── Role selection ────────────────────────────────────────────────── */
  if (phase === "role-select") {
    return (
      <div className="mx-auto h-full max-w-4xl overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mb-6 text-center animate-fade-in">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 ring-1 ring-brand-100">
            <Trophy className="h-7 w-7 text-brand-600" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Rollen-Spiel
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">
            Schlüpfe in eine Rolle und versuche, Menschen von deinem Anliegen
            zu überzeugen. Wähle Personen aus, führe Gespräche und sieh,
            wie überzeugend du warst.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {ROLES.map((role, i) => {
            const accent = ACCENT_CLASSES[role.accent];
            return (
              <button
                key={role.id}
                onClick={() => {
                  setSelectedRole(role);
                  setPhase("scenario-select");
                }}
                style={{ animationDelay: `${i * 80}ms` }}
                className={`card group flex flex-col items-start gap-3 p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg animate-slide-up`}
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${accent.bgLight} ${accent.text}`}>
                  <RoleIcon role={role} className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">{role.name}</h3>
                <p className="text-xs font-medium text-slate-500">{role.label}</p>
                <p className="text-sm leading-relaxed text-slate-600">{role.tagline}</p>
                <span className={`mt-auto inline-flex items-center gap-1 text-xs font-semibold ${accent.textDark} group-hover:opacity-80`}>
                  Auswählen <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex items-start gap-2 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <p>
            <strong className="text-slate-600">So funktioniert's:</strong> Wähle
            eine Rolle, dann ein Szenario mit Ziel. Sprich mit den Personen,
            überzeuge sie und erhalte am Ende einen Score – basierend auf ihren
            Werten und einer KI-Bewertung deines Gesprächs.
          </p>
        </div>
      </div>
    );
  }

  /* ── Scenario selection ────────────────────────────────────────────── */
  if (phase === "scenario-select" && selectedRole) {
    const scenarios = getScenariosForRole(selectedRole.id);
    const accent = ACCENT_CLASSES[selectedRole.accent];
    return (
      <div className="mx-auto h-full max-w-3xl overflow-y-auto px-4 py-6 sm:px-6">
        <button
          onClick={() => setPhase("role-select")}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" /> Rolle wechseln
        </button>

        <div className="mb-6 animate-fade-in">
          <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl ${accent.bgLight} ${accent.text}`}>
            <RoleIcon role={selectedRole} className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Szenario wählen
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Du spielst als <strong>{selectedRole.name}</strong>. Wähle ein
            Szenario mit einem klaren Ziel.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {scenarios.map((scn, i) => (
            <button
              key={scn.id}
              onClick={() => {
                setSelectedScenario(scn);
                setPhase("persona-select");
              }}
              style={{ animationDelay: `${i * 80}ms` }}
              className="card group flex flex-col gap-3 p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg animate-slide-up"
            >
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${accent.bgLight} ${accent.text}`}>
                  <Target className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-slate-900">{scn.title}</h3>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-slate-600">{scn.brief}</p>
              <div className={`rounded-lg ${accent.bgLight} px-3 py-2 text-xs ${accent.textDark}`}>
                <strong>Ziel:</strong> {scn.goal}
              </div>
              {scn.hint && (
                <div className="flex items-start gap-2 text-xs text-slate-400">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                  <span>{scn.hint}</span>
                </div>
              )}
              <span className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-brand-600 group-hover:opacity-80">
                Starten <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ── Persona selection ─────────────────────────────────────────────── */
  if (phase === "persona-select" && selectedRole && selectedScenario) {
    return (
      <PersonaSelection
        role={selectedRole}
        scenario={selectedScenario}
        onBack={() => setPhase("scenario-select")}
        onStart={(selected) => {
          setConversations(
            selected.map((p) => ({
              persona: p,
              messages: [],
              loading: false,
              error: null,
              done: false,
            }))
          );
          setActivePersonaId(selected[0]?.id ?? null);
          setPhase("conversation");
        }}
      />
    );
  }

  /* ── Conversation phase ────────────────────────────────────────────── */
  if (phase === "conversation" && selectedRole && selectedScenario) {
    const activeConv = conversations.find((c) => c.persona.id === activePersonaId);

    return (
      <ConversationPhase
        role={selectedRole}
        scenario={selectedScenario}
        conversations={conversations}
        activePersonaId={activePersonaId}
        activeConv={activeConv}
        input={input}
        setInput={setInput}
        onBack={() => setPhase("persona-select")}
        onSend={async (text) => {
          if (!activeConv || !selectedRole) return;
          const content = text.trim();
          if (!content || activeConv.loading) return;
          setInput("");

          const userMsg: ChatMessage = {
            id: Math.random().toString(36).slice(2) + Date.now().toString(36),
            role: "user",
            content,
            createdAt: Date.now(),
          };

          setConversations((prev) =>
            prev.map((c) =>
              c.persona.id === activeConv.persona.id
                ? { ...c, messages: [...c.messages, userMsg], loading: true, error: null }
                : c
            )
          );

          try {
            const reply = await sendRoleChat(
              activeConv.persona,
              selectedRole.systemPrompt,
              [...activeConv.messages, userMsg]
            );
            const botMsg: ChatMessage = {
              id: Math.random().toString(36).slice(2) + Date.now().toString(36),
              role: "assistant",
              content: reply,
              createdAt: Date.now(),
            };
            // P3 QA: lightweight client-side language-mix check (no LLM call).
            const lang = detectEnglishMix(reply);
            if (lang.detected) {
              console.warn(
                `[QA] Möglicher Sprachmix in der Rollenspiel-Antwort von ${activeConv.persona.name}:`,
                lang.markers.slice(0, 8).join(", ")
              );
            }
            setConversations((prev) =>
              prev.map((c) =>
                c.persona.id === activeConv.persona.id
                  ? { ...c, messages: [...c.messages, botMsg], loading: false }
                  : c
              )
            );
          } catch (e) {
            setConversations((prev) =>
              prev.map((c) =>
                c.persona.id === activeConv.persona.id
                  ? { ...c, loading: false, error: e instanceof Error ? e.message : "Fehler" }
                  : c
              )
            );
          }
        }}
        onFinishPersona={() => {
          if (!activeConv || !selectedRole) return;
          // Mark this conversation as done
          setConversations((prev) =>
            prev.map((c) =>
              c.persona.id === activeConv.persona.id ? { ...c, done: true } : c
            )
          );
          // Move to next not-done conversation, or go to evaluation
          const next = conversations.find((c) => !c.done && c.persona.id !== activeConv.persona.id);
          if (next) {
            setActivePersonaId(next.persona.id);
          } else {
            setPhase("evaluating");
          }
        }}
        onSwitchPersona={(id) => setActivePersonaId(id)}
      />
    );
  }

  /* ── Evaluation phase ──────────────────────────────────────────────── */
  if (phase === "evaluating" && selectedRole && selectedScenario) {
    return (
      <EvaluationPhase
        conversations={conversations}
        scenario={selectedScenario}
        role={selectedRole}
        onDone={(res) => {
          setResult(res);
          setPhase("results");
        }}
      />
    );
  }

  /* ── Results phase ─────────────────────────────────────────────────── */
  if (phase === "results" && selectedRole && selectedScenario) {
    return (
      <ResultsPhase
        result={result}
        role={selectedRole}
        scenario={selectedScenario}
        conversations={conversations}
        onRestart={() => {
          setPhase("role-select");
          setSelectedRole(null);
          setSelectedScenario(null);
          setConversations([]);
          setActivePersonaId(null);
          setResult(null);
          setInput("");
        }}
        onRetryScenario={() => {
          setConversations([]);
          setActivePersonaId(null);
          setResult(null);
          setInput("");
          setPhase("persona-select");
        }}
        onPick={onPick}
      />
    );
  }

  return null;
}

/* ── Persona Selection sub-component ────────────────────────────────── */

function PersonaSelection({
  role,
  scenario,
  onBack,
  onStart,
}: {
  role: Role;
  scenario: Scenario;
  onBack: () => void;
  onStart: (selected: Persona[]) => void;
}) {
  const [selected, setSelected] = useState<Persona[]>([]);
  const accent = ACCENT_CLASSES[role.accent];

  const toggle = (p: Persona) => {
    setSelected((prev) => {
      const exists = prev.find((x) => x.id === p.id);
      if (exists) return prev.filter((x) => x.id !== p.id);
      if (prev.length >= 4) return prev;
      return [...prev, p];
    });
  };

  return (
    <div className="mx-auto h-full max-w-5xl overflow-y-auto px-4 py-6 sm:px-6">
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Szenario wechseln
      </button>

      <div className="mb-5 animate-fade-in">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Personen auswählen
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Wähle 1–4 Personen, mit denen du als <strong>{role.name}</strong>{" "}
          sprechen möchtest. Ziel: {scenario.goal}
        </p>
      </div>

      {/* Scenario reminder */}
      <div className={`mb-5 rounded-xl ${accent.bgLight} border ${accent.border} p-4`}>
        <div className="flex items-start gap-2">
          <Target className={`mt-0.5 h-4 w-4 shrink-0 ${accent.text}`} />
          <div>
            <p className="text-sm font-semibold text-slate-800">{scenario.title}</p>
            <p className="mt-1 text-xs text-slate-600">{scenario.brief}</p>
          </div>
        </div>
      </div>

      {/* Selected bar */}
      {selected.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Ausgewählt ({selected.length}/4):
          </span>
          {selected.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-2 rounded-full bg-white py-1 pl-1 pr-3 ring-1 ring-slate-200"
            >
              <PersonaAvatar persona={p} size="sm" />
              <span className="text-sm font-medium text-slate-700">{p.name}</span>
              <button
                onClick={() => toggle(p)}
                className="rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label={`${p.name} entfernen`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Persona grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {personas.map((p) => {
          const sel = selected.some((x) => x.id === p.id);
          const disabled = !sel && selected.length >= 4;
          return (
            <button
              key={p.id}
              onClick={() => toggle(p)}
              disabled={disabled}
              className={`relative flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-all ${
                sel
                  ? `border-brand-500 bg-brand-50 ring-2 ring-brand-200`
                  : disabled
                  ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-50"
                  : "border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/50"
              }`}
            >
              <PersonaAvatar persona={p} size="lg" />
              <div>
                <div className="text-sm font-semibold text-slate-800">{p.name}</div>
                <div className="text-xs text-slate-500">{p.groupLabel}</div>
              </div>
              {sel && (
                <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white">
                  <Check className="h-3 w-3" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Start button */}
      <div className="mt-6 flex justify-center pb-4">
        <button
          onClick={() => onStart(selected)}
          disabled={selected.length === 0}
          className={`inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all ${
            selected.length > 0
              ? "bg-brand-600 hover:bg-brand-700"
              : "cursor-not-allowed bg-slate-300"
          }`}
        >
          Gespräch starten <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ── Conversation Phase sub-component ───────────────────────────────── */

function ConversationPhase({
  role,
  scenario,
  conversations,
  activePersonaId,
  activeConv,
  input,
  setInput,
  onBack,
  onSend,
  onFinishPersona,
  onSwitchPersona,
}: {
  role: Role;
  scenario: Scenario;
  conversations: PersonaConversation[];
  activePersonaId: string | null;
  activeConv?: PersonaConversation;
  input: string;
  setInput: (v: string) => void;
  onBack: () => void;
  onSend: (text: string) => void;
  onFinishPersona: () => void;
  onSwitchPersona: (id: string) => void;
}) {
  const accent = ACCENT_CLASSES[role.accent];
  const doneCount = conversations.filter((c) => c.done).length;

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend(input);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="border-b border-slate-200/60 bg-white/80 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <button
            onClick={onBack}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            aria-label="Zurück"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${accent.bgLight} ${accent.text}`}>
            <RoleIcon role={role} className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-bold text-slate-900">
              {role.name} · {scenario.title}
            </h2>
            <p className="truncate text-xs text-slate-500">
              {doneCount}/{conversations.length} Gespräche abgeschlossen
            </p>
          </div>
        </div>
      </header>

      {/* Persona tabs */}
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 sm:px-6">
        <div className="mx-auto flex max-w-5xl gap-2 overflow-x-auto">
          {conversations.map((c) => {
            const isActive = c.persona.id === activePersonaId;
            return (
              <button
                key={c.persona.id}
                onClick={() => onSwitchPersona(c.persona.id)}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                    : "text-slate-500 hover:bg-white/60"
                }`}
              >
                <PersonaAvatar persona={c.persona} size="sm" />
                {c.persona.name}
                {c.done && (
                  <Check className="h-3.5 w-3.5 text-brand-600" />
                )}
                {c.messages.length > 0 && !c.done && (
                  <span className="text-xs text-slate-400">({c.messages.length})</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-brand-50/30 px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {activeConv && activeConv.messages.length === 0 && !activeConv.loading && (
            <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
              <PersonaAvatar persona={activeConv.persona} size="xl" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                Sprich mit {activeConv.persona.name}
              </h3>
              <p className="mt-1 max-w-md text-sm text-slate-500">
                {activeConv.persona.description}
              </p>
              <div className="mt-4 flex items-start gap-2 rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-500">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                <p>
                  Du sprichst als <strong>{role.name}</strong>. {role.description}
                </p>
              </div>
              {role.starters.length > 0 && (
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {role.starters.map((s) => (
                    <button
                      key={s}
                      onClick={() => onSend(s)}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:text-brand-700"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeConv?.messages.map((m) => (
            <MessageBubble key={m.id} message={m} persona={activeConv.persona} />
          ))}

          {activeConv?.loading && <TypingIndicator persona={activeConv.persona} />}

          {activeConv?.error && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 animate-fade-in-fast">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{activeConv.error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={
              activeConv ? `Nachricht an ${activeConv.persona.name}…` : "Nachricht…"
            }
            className="max-h-32 flex-1 resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            style={{ minHeight: "44px" }}
          />
          <button
            onClick={() => onSend(input)}
            disabled={!input.trim() || activeConv?.loading}
            className="btn-primary h-11 w-11 !px-0"
            aria-label="Senden"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <div className="mx-auto mt-1.5 flex max-w-3xl items-center justify-between">
          <p className="text-center text-xs text-slate-400">
            Enter zum Senden · Shift+Enter für neue Zeile
          </p>
          {activeConv && activeConv.messages.length >= 2 && !activeConv.loading && (
            <button
              onClick={onFinishPersona}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-100"
            >
              <Check className="h-3.5 w-3.5" />
              Gespräch abschließen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Evaluation Phase sub-component ──────────────────────────────────── */

function EvaluationPhase({
  conversations,
  scenario,
  role,
  onDone,
}: {
  conversations: PersonaConversation[];
  scenario: Scenario;
  role: Role;
  onDone: (result: GameResult) => void;
}) {
  const [progress, setProgress] = useState(0);
  const [currentName, setCurrentName] = useState("");

  // Run evaluation on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const scores: PersonaScore[] = [];
      for (let i = 0; i < conversations.length; i++) {
        if (cancelled) return;
        const conv = conversations[i];
        setCurrentName(conv.persona.name);
        setProgress(Math.round((i / conversations.length) * 100));

        const { fitScore, matchedDimensions } = computeFitScore(
          conv.persona,
          scenario,
          conv.messages.length
        );

        let aiScore = 50;
        let verdict: PersonaScore["verdict"] = "partial";
        let reasoning = "Keine KI-Bewertung verfügbar.";

        if (conv.messages.length >= 2) {
          try {
            const evalResult = await evaluateConversation(
              conv.persona,
              role.systemPrompt,
              conv.messages
            );
            aiScore = evalResult.aiScore;
            verdict = evalResult.verdict;
            reasoning = evalResult.reasoning;
          } catch {
            // Keep defaults
          }
        }

        const total = Math.round(fitScore * 0.4 + aiScore * 0.6);

        scores.push({
          personaId: conv.persona.id,
          personaName: conv.persona.name,
          fitScore,
          aiScore,
          total,
          verdict,
          reasoning,
          matchedDimensions,
        });
      }

      if (cancelled) return;
      setProgress(100);

      const convincedCount = scores.filter((s) => s.verdict === "convinced").length;
      const overallScore = Math.round(
        scores.reduce((sum, s) => sum + s.total, 0) / (scores.length || 1)
      );
      const stars = overallScore >= 80 ? 3 : overallScore >= 50 ? 2 : overallScore >= 25 ? 1 : 0;

      const summary =
        stars === 3
          ? "Hervorragend! Du hast die Menschen sehr gut erreicht."
          : stars === 2
          ? "Gut gemacht! Du hast viele überzeugt – aber es geht noch besser."
          : stars === 1
          ? "Ein Anfang. Achte mehr auf die Werte deiner Gesprächspartner."
          : "Schwer? Versuche, genauer hinzuhören und Argumente anzupassen.";

      onDone({
        role: role.id,
        scenarioId: scenario.id,
        scenarioTitle: scenario.title,
        scores,
        overallScore,
        convincedCount,
        totalCount: scores.length,
        stars,
        summary,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex h-full flex-col items-center justify-center px-4 py-8">
      <div className="card w-full max-w-md p-8 text-center animate-fade-in">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 ring-1 ring-brand-100">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Auswertung läuft…</h2>
        <p className="mt-2 text-sm text-slate-500">
          Wir bewerten deine Gespräche anhand der Personen-Werte und der
          KI-Analyse.
        </p>
        {currentName && (
          <p className="mt-4 text-xs font-medium text-slate-400">
            Aktuell: {currentName}
          </p>
        )}
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-brand-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-400">{progress}%</p>
      </div>
    </div>
  );
}

/* ── Results Phase sub-component ─────────────────────────────────────── */

function ResultsPhase({
  result,
  role,
  scenario,
  conversations,
  onRestart,
  onRetryScenario,
  onPick,
}: {
  result: GameResult | null;
  role: Role;
  scenario: Scenario;
  conversations: PersonaConversation[];
  onRestart: () => void;
  onRetryScenario: () => void;
  onPick?: (p: Persona) => void;
}) {
  // If evaluation failed, build a fallback result from fit scores only
  const displayResult: GameResult = useMemo(() => {
    if (result) return result;
    const scores: PersonaScore[] = conversations.map((c) => {
      const { fitScore, matchedDimensions } = computeFitScore(
        c.persona,
        scenario,
        c.messages.length
      );
      return {
        personaId: c.persona.id,
        personaName: c.persona.name,
        fitScore,
        aiScore: 0,
        total: fitScore,
        verdict: fitScore >= 60 ? "convinced" : fitScore >= 30 ? "partial" : "failed",
        reasoning: "Nur Werte-basierte Bewertung (KI-Bewertung nicht verfügbar).",
        matchedDimensions,
      };
    });
    const overallScore = Math.round(
      scores.reduce((s, x) => s + x.total, 0) / (scores.length || 1)
    );
    const stars = overallScore >= 80 ? 3 : overallScore >= 50 ? 2 : overallScore >= 25 ? 1 : 0;
    return {
      role: role.id,
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      scores,
      overallScore,
      convincedCount: scores.filter((s) => s.verdict === "convinced").length,
      totalCount: scores.length,
      stars,
      summary: "Auswertung abgeschlossen (ohne KI-Bewertung).",
    };
  }, [result, conversations, scenario, role]);

  return (
    <div className="mx-auto h-full max-w-3xl overflow-y-auto px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="mb-6 text-center animate-fade-in">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 ring-1 ring-amber-100">
          <Trophy className="h-8 w-8 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Ergebnis
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {role.name} · {scenario.title}
        </p>

        {/* Stars */}
        <div className="mt-4 flex justify-center gap-1">
          {[1, 2, 3].map((n) => (
            <Star
              key={n}
              className={`h-8 w-8 ${
                n <= displayResult.stars
                  ? "fill-amber-400 text-amber-400"
                  : "fill-slate-100 text-slate-200"
              }`}
            />
          ))}
        </div>

        {/* Overall score */}
        <div className="mx-auto mt-4 max-w-xs">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-slate-500">Gesamtscore</span>
            <span className="font-bold text-slate-900">{displayResult.overallScore}/100</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                displayResult.overallScore >= 70
                  ? "bg-brand-500"
                  : displayResult.overallScore >= 40
                  ? "bg-amber-500"
                  : "bg-red-400"
              }`}
              style={{ width: `${displayResult.overallScore}%` }}
            />
          </div>
        </div>

        <p className="mx-auto mt-4 max-w-md text-sm font-medium text-slate-600">
          {displayResult.summary}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          {displayResult.convincedCount} von {displayResult.totalCount} Personen überzeugt
        </p>
      </div>

      {/* Per-persona scores */}
      <div className="mb-6 space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Users className="h-5 w-5 text-brand-600" />
          Einzelbewertungen
        </h2>
        {displayResult.scores.map((score, i) => {
          const conv = conversations.find((c) => c.persona.id === score.personaId);
          const persona = conv?.persona;
          if (!persona) return null;

          const verdictColor =
            score.verdict === "convinced"
              ? "bg-brand-50 text-brand-700"
              : score.verdict === "partial"
              ? "bg-amber-50 text-amber-700"
              : "bg-red-50 text-red-700";
          const verdictLabel =
            score.verdict === "convinced" ? "Überzeugt" : score.verdict === "partial" ? "Teilweise" : "Nicht überzeugt";

          return (
            <div
              key={score.personaId}
              style={{ animationDelay: `${i * 80}ms` }}
              className="card p-5 animate-slide-up"
            >
              <div className="flex items-center gap-3">
                <PersonaAvatar persona={persona} size="md" />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold text-slate-900">{persona.name}</h3>
                  <p className="truncate text-xs text-slate-500">{persona.tagline}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${verdictColor}`}>
                  {verdictLabel}
                </span>
              </div>

              {/* Score bars */}
              <div className="mt-4 space-y-3">
                <ScoreBar label="Werte-Passung" value={score.fitScore} color="bg-brand-400" />
                <ScoreBar label="KI-Bewertung" value={score.aiScore} color="bg-violet-400" />
                <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                  <span className="text-sm font-semibold text-slate-700">Gesamt</span>
                  <span className="text-sm font-bold text-slate-900">{score.total}/100</span>
                </div>
              </div>

              {/* Matched dimensions */}
              {score.matchedDimensions.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {score.matchedDimensions.map((d) => (
                    <span
                      key={d}
                      className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700"
                    >
                      <Check className="h-3 w-3" /> {d}
                    </span>
                  ))}
                </div>
              )}

              {/* AI reasoning */}
              {score.reasoning && (
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  <MessageCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span>{score.reasoning}</span>
                </div>
              )}

              {/* Continue chatting */}
              {onPick && (
                <button
                  onClick={() => onPick(persona)}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Mit {persona.name} allein weitersprechen
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Method note */}
      <div className="mb-6 rounded-lg bg-brand-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-brand-100">
        <strong className="text-brand-700">So wurde bewertet:</strong> Der Score
        kombiniert zwei Faktoren: <strong>Werte-Passung</strong> (40 %) – wie gut
        deine Argumente zur Lebenssituation der Person passen, basierend auf
        ihren Werten aus der gEneSys-Umfrage. <strong>KI-Bewertung</strong>{" "}
        (60 %) – wie überzeugend das Gespräch verlief, bewertet durch die KI.
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 pb-6 sm:flex-row sm:justify-center">
        <button
          onClick={onRetryScenario}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
        >
          <RotateCcw className="h-4 w-4" />
          Szenario wiederholen
        </button>
        <button
          onClick={onRestart}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-slate-600 ring-1 ring-slate-200 transition-colors hover:bg-slate-50"
        >
          <Trophy className="h-4 w-4" />
          Neue Rolle
        </button>
      </div>
    </div>
  );
}

/* ── Small helper: score bar ────────────────────────────────────────── */

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-slate-500">{label}</span>
        <span className="font-semibold text-slate-700">{value}/100</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
