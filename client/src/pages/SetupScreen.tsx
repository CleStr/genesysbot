import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, KeyRound, ArrowRight, ShieldCheck, AlertCircle, Eye, EyeOff, Bot } from "lucide-react";
import { submitSetup, verifyAdminPassword } from "../lib/api";

interface Props {
  onDone: () => void;
}

export default function SetupScreen({ onDone }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState<"password" | "apiKey">("password");
  const [password, setPassword] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await verifyAdminPassword(password);
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? "Admin-Passwort ungültig.");
      return;
    }
    setStep("apiKey");
  }

  async function handleApiKey(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (apiKey.trim().length < 8) {
      setError("Bitte einen gültigen API-Token eingeben (mindestens 8 Zeichen).");
      return;
    }
    setLoading(true);
    const res = await submitSetup(password, apiKey.trim());
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? "Anmeldung fehlgeschlagen.");
      return;
    }
    onDone();
    navigate("/chat", { replace: true });
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4">
      {/* Animated gradient backdrop */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-1/4 top-0 h-[60vh] w-[60vh] rounded-full bg-brand-600/30 blur-[120px] animate-pulse-soft" />
        <div className="absolute -right-1/4 bottom-0 h-[60vh] w-[60vh] rounded-full bg-indigo-600/20 blur-[120px] animate-pulse-soft [animation-delay:0.75s]" />
        <div className="absolute left-1/2 top-1/2 h-[40vh] w-[40vh] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-500/10 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md animate-scale-in">
        {/* Logo / Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-lg shadow-brand-600/40">
            <span className="text-3xl">🤖</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">gEneSysBot</h1>
          <p className="mt-1 text-sm text-slate-400">
            Persona-Chatbot für Messen
          </p>
          <p className="mx-auto mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300 ring-1 ring-white/20">
            <Bot className="h-3.5 w-3.5 text-slate-400" aria-hidden />
            KI-gestützter Chat mit fiktiven Personas
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
          {/* Step indicator */}
          <div className="mb-6 flex items-center justify-center gap-2 text-xs">
            <StepDot active={step === "password"} done={step === "apiKey"} label="Passwort" />
            <div className={`h-px w-8 ${step === "apiKey" ? "bg-brand-500" : "bg-white/20"}`} />
            <StepDot active={step === "apiKey"} done={false} label="API-Token" />
          </div>

          {step === "password" ? (
            <form onSubmit={handlePassword} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-200">
                  Admin-Passwort
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Passwort eingeben"
                    autoFocus
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-10 text-sm text-white placeholder-slate-500 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Bitte gib das Admin-Passwort ein. Danach benötigst du deinen
                  persönlichen FhGenie API-Token — er wird bei jedem Besuch neu
                  abgefragt und nur für diese Sitzung verwendet.
                </p>
              </div>

              {error && <ErrorNote text={error} />}

              <button type="submit" className="btn-primary w-full">
                Weiter <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleApiKey} className="space-y-4">
              <div className="flex items-center gap-2 rounded-lg bg-brand-500/10 px-3 py-2 text-xs text-brand-200">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                Passwort bestätigt — jetzt deinen persönlichen API-Token eingeben.
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-200">
                  Persönlicher FhGenie API-Token
                </label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Persönlichen Token eingeben"
                    autoFocus
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-10 text-sm text-white placeholder-slate-500 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    tabIndex={-1}
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-slate-500">
                  Der Token wird nur für diese Sitzung im Arbeitsspeicher des
                  Servers gehalten — nicht dauerhaft gespeichert und nie an den
                  Browser gesendet. Beim Neuladen der Seite wird er erneut abgefragt.
                </p>
              </div>

              {error && <ErrorNote text={error} />}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep("password");
                    setError(null);
                  }}
                  className="btn-ghost text-slate-300 hover:bg-white/10 hover:text-white"
                >
                  Zurück
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? "Verbinden…" : <>Sitzung starten <ArrowRight className="h-4 w-4" /></>}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">
          Fraunhofer IAO · gEneSysBot Demo
        </p>
      </div>
    </div>
  );
}

function StepDot({
  active,
  done,
  label,
}: {
  active: boolean;
  done: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${
          done
            ? "bg-brand-500 text-white"
            : active
            ? "bg-brand-500/20 text-brand-300 ring-2 ring-brand-500"
            : "bg-white/10 text-slate-500"
        }`}
      >
        {done ? "✓" : active ? "1" : "2"}
      </span>
      <span className={active || done ? "text-slate-200" : "text-slate-500"}>{label}</span>
    </div>
  );
}

function ErrorNote({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300 animate-fade-in-fast">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{text}</span>
    </div>
  );
}
