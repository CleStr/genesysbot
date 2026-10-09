import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send, Sparkles, AlertCircle, Info, Users, Radar, ArrowRight } from "lucide-react";
import type { ChatMessage, Persona } from "../types";
import { sendChat } from "../lib/api";
import { detectEnglishMix } from "../lib/languageCheck";
import PersonaAvatar from "./PersonaAvatar";
import MessageBubble, { TypingIndicator } from "./MessageBubble";
import PersonaDetail from "./PersonaDetail";
import HelpPanel from "./HelpPanel";

interface Props {
  persona: Persona;
  onBack: () => void;
  onNavigateTab?: (tab: "compare" | "selftest") => void;
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function ChatWindow({ persona, onBack, onNavigateTab }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    setError(null);
    setInput("");

    const userMsg: ChatMessage = {
      id: uid(),
      role: "user",
      content,
      createdAt: Date.now(),
    };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);

    try {
      const reply = await sendChat(persona, [...messages, userMsg]);
      const botMsg: ChatMessage = {
        id: uid(),
        role: "assistant",
        content: reply,
        createdAt: Date.now(),
      };
      setMessages((m) => [...m, botMsg]);
      // P3 QA: lightweight client-side language-mix check (no LLM call).
      const lang = detectEnglishMix(reply);
      if (lang.detected) {
        console.warn(
          `[QA] Möglicher Sprachmix in der Antwort von ${persona.name}:`,
          lang.markers.slice(0, 8).join(", ")
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ein Fehler ist aufgetreten.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur sm:px-6">
        <button
          onClick={onBack}
          className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          aria-label="Zurück zur Persona-Auswahl"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <PersonaAvatar persona={persona} size="md" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold text-slate-900">{persona.name}</h2>
          <p className="truncate text-xs text-slate-500">{persona.tagline}</p>
        </div>
        <button
          onClick={() => setShowDetail(true)}
          className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-brand-700"
          aria-label="Profil ansehen"
          title="Profil & Energiedaten ansehen"
        >
          <Info className="h-5 w-5" />
        </button>
        <HelpPanel />
        <span className="hidden items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-600 sm:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
          Online
        </span>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-brand-50/30 px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <Sparkles className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                Chat mit {persona.name}
              </h3>
              <p className="mt-1 max-w-md text-sm text-slate-500">
                {persona.description}
              </p>
              {persona.starters && persona.starters.length > 0 && (
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {persona.starters.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:text-brand-700"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} persona={persona} />
          ))}

          {loading && <TypingIndicator persona={persona} />}

          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 animate-fade-in-fast">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Progressive engagement: after 2+ exchanges, invite deeper exploration */}
          {messages.length >= 4 && !loading && (
            <div className="mt-2 flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 animate-fade-in sm:flex-row sm:items-center">
              <p className="text-xs text-slate-500 sm:flex-1">
                <Sparkles className="mr-1 inline h-3.5 w-3.5 text-brand-500" />
                Tiefer eintauchen:
              </p>
              <button
                onClick={() => onNavigateTab?.("compare")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-brand-50 hover:text-brand-700"
              >
                <Users className="h-3.5 w-3.5" />
                Vergleichen
                <ArrowRight className="h-3 w-3" />
              </button>
              <button
                onClick={() => onNavigateTab?.("selftest")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-amber-50 hover:text-amber-700"
              >
                <Radar className="h-3.5 w-3.5" />
                Selbsttest
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={`Nachricht an ${persona.name}…`}
            className="max-h-32 flex-1 resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            style={{ minHeight: "44px" }}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            className="btn-primary h-11 w-11 !px-0"
            aria-label="Senden"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="mx-auto mt-1.5 max-w-3xl text-center text-xs text-slate-400">
          Enter zum Senden · Shift+Enter für neue Zeile
        </p>
      </div>

      {showDetail && (
        <PersonaDetail
          persona={persona}
          onClose={() => setShowDetail(false)}
          onStartChat={() => setShowDetail(false)}
        />
      )}
    </div>
  );
}
