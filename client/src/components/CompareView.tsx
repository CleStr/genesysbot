import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, AlertCircle, Users, X, Check, Loader2 } from "lucide-react";
import type { Persona } from "../types";
import { personas } from "../data/personas";
import { sendChat } from "../lib/api";
import PersonaAvatar from "./PersonaAvatar";

interface Props {
  onPick: (persona: Persona) => void;
}

interface CompareResult {
  personaId: string;
  loading: boolean;
  answer: string;
  error: string | null;
}

const MAX_PERSONAS = 4;

export default function CompareView({ onPick }: Props) {
  const [selected, setSelected] = useState<Persona[]>([]);
  const [input, setInput] = useState("");
  const [results, setResults] = useState<Record<string, CompareResult>>({});
  const [showPicker, setShowPicker] = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function togglePersona(persona: Persona) {
    setSelected((prev) => {
      const exists = prev.find((p) => p.id === persona.id);
      if (exists) {
        return prev.filter((p) => p.id !== persona.id);
      }
      if (prev.length >= MAX_PERSONAS) return prev;
      return [...prev, persona];
    });
  }

  function isSelected(id: string) {
    return selected.some((p) => p.id === id);
  }

  async function sendComparison(text: string) {
    const content = text.trim();
    if (!content || selected.length === 0) return;
    setGlobalError(null);
    setInput("");
    setShowPicker(false);

    // Initialize results for all selected personas
    const initialResults: Record<string, CompareResult> = {};
    selected.forEach((p) => {
      initialResults[p.id] = {
        personaId: p.id,
        loading: true,
        answer: "",
        error: null,
      };
    });
    setResults(initialResults);

    // Send the same question to all selected personas in parallel
    await Promise.all(
      selected.map(async (persona) => {
        try {
          const reply = await sendChat(persona, [
            { id: "q", role: "user", content, createdAt: Date.now() },
          ]);
          setResults((prev) => ({
            ...prev,
            [persona.id]: {
              personaId: persona.id,
              loading: false,
              answer: reply,
              error: null,
            },
          }));
        } catch (e) {
          setResults((prev) => ({
            ...prev,
            [persona.id]: {
              personaId: persona.id,
              loading: false,
              answer: "",
              error: e instanceof Error ? e.message : "Ein Fehler ist aufgetreten.",
            },
          }));
        }
      })
    );
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendComparison(input);
    }
  }

  const hasResults = Object.keys(results).length > 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="border-b border-slate-200/60 bg-white/80 px-4 py-5 backdrop-blur sm:px-6">
        <div className="mx-auto max-w-5xl">
          <h1 className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-brand-100">
              <Users className="h-4.5 w-4.5" />
            </span>
            Persona-Vergleich
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Stelle eine Frage an mehrere Personen gleichzeitig und vergleiche ihre
            Antworten direkt nebeneinander.
          </p>
        </div>
      </header>

      {/* Selected personas bar */}
      {selected.length > 0 && (
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Ausgewählt ({selected.length}/{MAX_PERSONAS}):
            </span>
            {selected.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 rounded-full bg-white py-1 pl-1 pr-3 ring-1 ring-slate-200"
              >
                <PersonaAvatar persona={p} size="sm" />
                <span className="text-sm font-medium text-slate-700">{p.name}</span>
                <button
                  onClick={() => {
                    togglePersona(p);
                    setResults((prev) => {
                      const next = { ...prev };
                      delete next[p.id];
                      return next;
                    });
                  }}
                  className="rounded-full p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  aria-label={`${p.name} entfernen`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button
              onClick={() => setShowPicker((s) => !s)}
              className="ml-auto rounded-lg px-3 py-1.5 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50"
            >
              {showPicker ? "Personen ausblenden" : "Personen hinzufügen"}
            </button>
          </div>
        </div>
      )}

      {/* Persona picker (collapsible) */}
      {showPicker && (
        <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-4 sm:px-6">
          <div className="mx-auto max-w-5xl">
            {selected.length === 0 && (
              <div className="mb-4 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
                <Users className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-2 text-sm text-slate-600">
                  Wähle unten bis zu {MAX_PERSONAS} Personen aus, um
                  ihre Antworten zu vergleichen.
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {personas.map((persona) => {
                const sel = isSelected(persona.id);
                const disabled = !sel && selected.length >= MAX_PERSONAS;
                return (
                  <button
                    key={persona.id}
                    onClick={() => togglePersona(persona)}
                    disabled={disabled}
                    className={`relative flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-all ${
                      sel
                        ? "border-brand-500 bg-brand-50 ring-2 ring-brand-200"
                        : disabled
                        ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-50"
                        : "border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/50"
                    }`}
                  >
                    <PersonaAvatar persona={persona} size="lg" />
                    <div>
                      <div className="text-sm font-semibold text-slate-800">
                        {persona.name}
                      </div>
                      <div className="text-xs text-slate-500">{persona.groupLabel}</div>
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
          </div>
        </div>
      )}

      {/* Results area */}
      {hasResults && !showPicker && (
        <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-4 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <div
              className={`grid gap-4 ${
                selected.length <= 2
                  ? "grid-cols-1 md:grid-cols-2"
                  : "grid-cols-1 lg:grid-cols-2"
              }`}
            >
              {selected.map((persona) => {
                const r = results[persona.id];
                if (!r) return null;
                return (
                  <div
                    key={persona.id}
                    className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm"
                  >
                    {/* Persona header */}
                    <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
                      <PersonaAvatar persona={persona} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-slate-800">
                          {persona.name}
                        </div>
                        <div className="truncate text-xs text-slate-500">
                          {persona.groupLabel}
                        </div>
                      </div>
                      <button
                        onClick={() => onPick(persona)}
                        className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-50"
                        title="Mit dieser Person allein weitersprechen"
                      >
                        Einzel-Chat
                      </button>
                    </div>
                    {/* Answer */}
                    <div className="flex-1 px-4 py-3">
                      {r.loading ? (
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Denkt nach…
                        </div>
                      ) : r.error ? (
                        <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>{r.error}</span>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                          {r.answer}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto max-w-5xl">
          {globalError && (
            <div className="mb-2 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {globalError}
            </div>
          )}
          <div className="flex items-end gap-2">
            <div className="relative flex-1">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder={
                  selected.length === 0
                    ? "Wähle zuerst Personen aus…"
                    : "Stelle eine Frage an alle ausgewählten Personen…"
                }
                disabled={selected.length === 0}
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <Sparkles className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-300" />
            </div>
            <button
              onClick={() => sendComparison(input)}
              disabled={!input.trim() || selected.length === 0}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Frage senden"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
