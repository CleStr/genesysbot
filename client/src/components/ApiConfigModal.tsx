import { useEffect, useState } from "react";
import {
  X,
  KeyRound,
  Link2,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Wifi,
} from "lucide-react";
import { getConfig, updateConfig, testConnection } from "../lib/api";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called after the config was successfully saved so the parent can refresh its status. */
  onSaved?: () => void;
}

type TestState =
  | { kind: "idle" }
  | { kind: "testing" }
  | { kind: "ok" }
  | { kind: "fail"; reason: string; detail?: string };

const REASON_LABELS: Record<string, string> = {
  "no-key": "Kein API-Key gesetzt.",
  "placeholder-url": "Basis-URL ist noch ein Platzhalter (example.com).",
  "upstream-error": "Die API hat mit einem Fehler geantwortet.",
  "connection-failed": "Verbindung zur API fehlgeschlagen.",
  "server-error": "Server-Fehler beim Test.",
};

export default function ApiConfigModal({ open, onClose, onSaved }: Props) {
  const [password, setPassword] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [hasApiKey, setHasApiKey] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [test, setTest] = useState<TestState>({ kind: "idle" });

  // Load current config when the modal opens.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setSaved(false);
    setTest({ kind: "idle" });
    getConfig()
      .then((cfg) => {
        setBaseUrl(cfg.baseUrl);
        setHasApiKey(cfg.hasApiKey);
        // Don't prefill the API key — leave it empty so the user knows it's masked.
        setApiKey("");
      })
      .catch(() => setError("Konfiguration konnte nicht geladen werden."));
  }, [open]);

  if (!open) return null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setTest({ kind: "idle" });

    if (!password) {
      setError("Bitte Admin-Passwort eingeben, um Änderungen zu speichern.");
      return;
    }

    // Only send fields the user actually changed.
    const payload: { apiKey?: string; baseUrl?: string } = {};
    if (apiKey.trim().length > 0) payload.apiKey = apiKey.trim();
    if (baseUrl.trim().length > 0) payload.baseUrl = baseUrl.trim();

    if (Object.keys(payload).length === 0) {
      setError("Es gibt nichts zu speichern — ändere API-Key oder Basis-URL.");
      return;
    }

    setSaving(true);
    const res = await updateConfig(password, payload);
    setSaving(false);

    if (!res.ok) {
      setError(res.error ?? "Speichern fehlgeschlagen.");
      return;
    }

    setSaved(true);
    setHasApiKey(Boolean(res.hasApiKey));
    setApiKey("");
    onSaved?.();
  }

  async function handleTest() {
    setTest({ kind: "testing" });
    const res = await testConnection();
    if (res.ok) {
      setTest({ kind: "ok" });
    } else {
      setTest({
        kind: "fail",
        reason: REASON_LABELS[res.reason ?? ""] ?? res.reason ?? "Unbekannt",
        detail: res.detail,
      });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-lg animate-scale-in rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Wifi className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                API-Konfiguration
              </h2>
              <p className="text-xs text-slate-500">
                FhG API-Key und Endpunkt verwalten
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="space-y-5 px-6 py-5">
          {/* Current status */}
          <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5 text-sm">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                hasApiKey ? "bg-brand-500" : "bg-red-500"
              }`}
            />
            <span className="text-slate-600">
              API-Key:{" "}
              <span className={hasApiKey ? "text-brand-700" : "text-red-700"}>
                {hasApiKey ? "gesetzt" : "nicht gesetzt"}
              </span>
            </span>
            <span className="mx-1 text-slate-300">·</span>
            <span className="truncate text-slate-600">
              URL:{" "}
              <span className="font-mono text-xs text-slate-700">
                {baseUrl || "—"}
              </span>
            </span>
          </div>

          {/* Admin password */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Admin-Passwort
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Passwort zur Bestätigung"
                className="input-field pl-10 pr-10"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Nötig, um Änderungen zu speichern. Standard: FhG2026#!
            </p>
          </div>

          {/* API key */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              FhG API-Key{" "}
              {hasApiKey && (
                <span className="text-xs font-normal text-slate-400">
                  (nur ausfüllen, wenn du ihn ändern willst)
                </span>
              )}
            </label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={hasApiKey ? "••••••••••••" : "API-Key eingeben"}
                className="input-field pl-10 pr-10"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowKey((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Base URL */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              FhG API Basis-URL
            </label>
            <div className="relative">
              <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.fraunhofer.de/v1"
                className="input-field pl-10 font-mono text-sm"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <p className="mt-1 text-xs text-slate-400">
              OpenAI-kompatibler Endpunkt. Der Pfad <code>/chat/completions</code>{" "}
              wird automatisch angehängt.
            </p>
          </div>

          {/* Error / success messages */}
          {error && <ErrorNote text={error} />}
          {saved && (
            <div className="flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Konfiguration gespeichert.
            </div>
          )}

          {/* Test result */}
          {test.kind === "testing" && (
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Teste Verbindung…
            </div>
          )}
          {test.kind === "ok" && (
            <div className="flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Verbindung erfolgreich! Die API antwortet.
            </div>
          )}
          {test.kind === "fail" && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p>{test.reason}</p>
                {test.detail && (
                  <p className="mt-0.5 font-mono text-xs text-red-500">
                    {test.detail}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={handleTest}
              disabled={test.kind === "testing"}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-50"
            >
              <Wifi className="h-4 w-4" />
              Verbindung testen
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
              >
                Schließen
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary inline-flex items-center gap-1.5"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                Speichern
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function ErrorNote({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{text}</p>
    </div>
  );
}
