import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  KeyRound,
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
  | { kind: "fail"; reason: string };

const REASON_LABELS: Record<string, string> = {
  "no-key": "Keine gültige Sitzung — bitte Seite neu laden.",
  "placeholder-url": "Der FhGenie-Endpunkt ist nicht konfiguriert.",
  "token-invalid": "Der API-Token ist ungültig oder abgelaufen.",
  "upstream-error": "FhGenie ist derzeit nicht erreichbar.",
  "connection-failed": "Verbindungsproblem — bitte erneut versuchen.",
  "server-error": "Server-Fehler beim Test.",
};

export default function ApiConfigModal({ open, onClose, onSaved }: Props) {
  const [password, setPassword] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [baseUrlLocked, setBaseUrlLocked] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [test, setTest] = useState<TestState>({ kind: "idle" });

  // Load current session config when the modal opens.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setSaved(false);
    setTest({ kind: "idle" });
    getConfig()
      .then((cfg) => {
        setBaseUrl(cfg.baseUrl);
        setBaseUrlLocked(Boolean(cfg.baseUrlLocked));
        setApiKey("");
      })
      .catch(() => setError("Sitzung abgelaufen — bitte Seite neu laden."));
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
    if (!baseUrlLocked && baseUrl.trim().length > 0) payload.baseUrl = baseUrl.trim();

    if (Object.keys(payload).length === 0) {
      setError("Es gibt nichts zu speichern — ändere den API-Token oder die Basis-URL.");
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
        reason: REASON_LABELS[res.reason ?? ""] ?? "Unbekannter Fehler.",
      });
    }
  }

  return createPortal(
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
                Verbindungsstatus
              </h2>
              <p className="text-xs text-slate-500">
                Persönlichen API-Token für diese Sitzung verwalten
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
              Nötig, um Änderungen an dieser Sitzung zu speichern.
            </p>
          </div>

          {/* API token */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Persönlicher FhGenie API-Token{" "}
              <span className="text-xs font-normal text-slate-400">
                (nur ausfüllen, wenn du ihn für diese Sitzung ändern willst)
              </span>
            </label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="••••••••••••"
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
            <p className="mt-1 text-xs text-slate-400">
              Der Token gilt nur für diese Sitzung und wird nicht dauerhaft gespeichert.
            </p>
          </div>

          {/* Base URL */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              FhGenie Basis-URL
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://fhgenie.fraunhofer.de/v1"
              disabled={baseUrlLocked}
              className="input-field font-mono text-sm disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
              autoComplete="off"
              spellCheck={false}
            />
            <p className="mt-1 text-xs text-slate-400">
              {baseUrlLocked
                ? "In dieser Umgebung ist der Endpunkt fest konfiguriert."
                : "OpenAI-kompatibler Endpunkt. Der Pfad /chat/completions wird automatisch angehängt."}
            </p>
          </div>

          {/* Error / success messages */}
          {error && <ErrorNote text={error} />}
          {saved && (
            <div className="flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Für diese Sitzung gespeichert.
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
              Verbindung erfolgreich! FhGenie antwortet.
            </div>
          )}
          {test.kind === "fail" && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{test.reason}</p>
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
    </div>,
    document.body
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
