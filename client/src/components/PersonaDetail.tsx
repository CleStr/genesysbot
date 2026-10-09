import { useState } from "react";
import {
  X,
  MapPin,
  Users,
  GraduationCap,
  Briefcase,
  Home,
  Heart,
  Flame,
  Lightbulb,
  Sun,
  Sparkles,
  ChevronRight,
  Info,
} from "lucide-react";
import type { Persona } from "../types";
import PersonaAvatar from "./PersonaAvatar";
import RadarChart from "./RadarChart";
import IndexBars from "./IndexBars";

interface Props {
  persona: Persona;
  onClose: () => void;
  onStartChat: () => void;
}

type Tab = "profile" | "energy" | "behavior" | "facts";

export default function PersonaDetail({ persona, onClose, onStartChat }: Props) {
  const [tab, setTab] = useState<Tab>("profile");

  const tabs: { id: Tab; label: string }[] = [
    { id: "profile", label: "Profil" },
    { id: "energy", label: "Energie im Alltag" },
    { id: "behavior", label: "Verhalten & Sorgen" },
    { id: "facts", label: "Wissenswertes" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in-fast sm:items-center">
      <div
        className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl animate-slide-up sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-brand-600 to-brand-800 px-6 pb-5 pt-6 text-white">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Schließen"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-4">
            <PersonaAvatar persona={persona} size="lg" />
            <div className="min-w-0">
              <h2 className="text-xl font-bold">{persona.name}</h2>
              <p className="text-sm text-white/80">{persona.tagline}</p>
              {persona.groupLabel && (
                <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium">
                  {persona.groupLabel}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-200 bg-white px-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative shrink-0 px-3 py-3 text-sm font-medium transition-colors ${
                tab === t.id ? "text-brand-700" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {t.label}
              {tab === t.id && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600" />
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {tab === "profile" && <ProfileTab persona={persona} />}
          {tab === "energy" && (
            <div className="flex flex-col gap-5">
              <ExplainBox>
                Hier siehst du, wie es <strong>{persona.name}</strong> im Alltag mit Energie geht –
                vom Zugang zu Strom bis hin zu Gesundheit und Mitbestimmung. Die Werte vergleichen
                die Person mit dem Durchschnitt ihrer Region. <strong>Größer</strong> bedeutet
                meist <strong>besser</strong> – außer bei Dingen, die belasten (z. B. Alltagsbarrieren,
                Gesundheitsfolgen). Dort bedeutet größer <strong>mehr Belastung</strong>.
              </ExplainBox>
              <RadarChart
                values={persona.eci ?? []}
                title="Energie im Alltag"
                size={280}
                valueLabel={persona.name}
                averageLabel="Regionsdurchschnitt"
              />
              <div className="w-full">
                <IndexBars values={persona.eci ?? []} title="Im Detail verglichen" />
              </div>
            </div>
          )}
          {tab === "behavior" && (
            <div className="flex flex-col gap-5">
              <ExplainBox>
                Hier geht es um Verhalten, Werte und Sorgen rund um Energie und Umwelt. Wie aktiv
                spart die Person Energie? Wie stark belasten sie Umwelt- und Klimasorgen? Und wie
                sehr fühlt sie sich im Vergleich zu anderen benachteiligt? Die Werte vergleichen{" "}
                <strong>{persona.name}</strong> mit dem Regionsdurchschnitt.
              </ExplainBox>
              <IndexBars values={persona.indices ?? []} title="Verhalten & Sorgen im Vergleich" />
              <div className="rounded-xl bg-brand-50 p-4 text-xs text-slate-600 ring-1 ring-brand-100">
                <p>
                  Werte auf einer 1–7 Skala.{" "}
                  <span className="font-medium text-amber-600">Bernstein</span> bedeutet schlechter
                  als der Regionsdurchschnitt,{" "}
                  <span className="font-medium text-brand-600">Grün</span> besser. Bei Werten, die
                  eine Belastung messen (z. B. Eco-Angst, Relative Deprivation), bedeutet ein höherer
                  Wert eine stärkere Belastung.
                </p>
              </div>
            </div>
          )}
          {tab === "facts" && <FactsTab persona={persona} />}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-3 sm:px-6">
          <button
            onClick={onStartChat}
            className="btn-primary w-full justify-center"
          >
            <Sparkles className="h-4 w-4" />
            Chat mit {persona.name} starten
          </button>
        </div>
      </div>
    </div>
  );
}

function ExplainBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-brand-100 bg-brand-50/60 p-4 text-sm leading-relaxed text-slate-600">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
      <p>{children}</p>
    </div>
  );
}

function ProfileTab({ persona }: { persona: Persona }) {
  const d = persona.demographics;
  const e = persona.energy;
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm leading-relaxed text-slate-600">{persona.description}</p>

      {persona.tags && persona.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {persona.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {d && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Zur Person
          </h4>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <InfoRow icon={<Users className="h-4 w-4" />} label="Alter" value={`${d.age} (${d.ageRange ?? "—"})`} />
            <InfoRow icon={<Heart className="h-4 w-4" />} label="Geschlecht" value={d.gender} />
            <InfoRow icon={<Home className="h-4 w-4" />} label="Haushalt" value={d.household} />
            <InfoRow icon={<Home className="h-4 w-4" />} label="Wohnen" value={d.housing} />
            <InfoRow icon={<GraduationCap className="h-4 w-4" />} label="Bildung" value={d.education} />
            <InfoRow icon={<Briefcase className="h-4 w-4" />} label="Erwerb" value={d.employment} />
            <InfoRow icon={<Briefcase className="h-4 w-4" />} label="Einkommen" value={d.income} />
            {d.religion && <InfoRow icon={<Sparkles className="h-4 w-4" />} label="Religion" value={d.religion} />}
            {d.ethnicity && <InfoRow icon={<Users className="h-4 w-4" />} label="Ethnizität" value={d.ethnicity} />}
            {persona.country && <InfoRow icon={<MapPin className="h-4 w-4" />} label="Region" value={persona.country} />}
          </div>
        </div>
      )}

      {e && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Energie zu Hause
          </h4>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <InfoRow icon={<Flame className="h-4 w-4" />} label="Kochen" value={e.cooking} />
            <InfoRow icon={<Flame className="h-4 w-4" />} label="Heizen" value={e.heating} />
            <InfoRow icon={<Lightbulb className="h-4 w-4" />} label="Beleuchtung" value={e.lighting} />
            <InfoRow icon={<Sun className="h-4 w-4" />} label="Erneuerbare" value={e.renewableOwnership} />
          </div>
        </div>
      )}

      <ExplainBox>
        <strong>Transparenz:</strong> {persona.name} ist eine fiktive Person. Ihre Merkmale
        (Region, Bildung, Einkommen, Energieverhalten, Werte) basieren auf echten
        Fraunhofer-Umfragedaten (gEneSys-Studie). Alter, Name und Alltagsdetails sind
        illustrativ. Alles, was die KI im Chat darüber hinaus erzählt – Emotionen,
        Anekdoten, Einschätzungen – ist eine modellbasierte Schätzung des Sprachmodells
        und kein Umfrageergebnis.
      </ExplainBox>
    </div>
  );
}

function FactsTab({ persona }: { persona: Persona }) {
  const facts = persona.facts ?? [];
  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        Wusstest du schon?
      </h4>
      {facts.length === 0 ? (
        <p className="text-sm text-slate-500">Keine Fakten hinterlegt.</p>
      ) : (
        facts.map((f, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-xl border border-slate-200 bg-gradient-to-br from-brand-50 to-white p-4"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
              {i + 1}
            </div>
            <p className="text-sm leading-relaxed text-slate-700">{f}</p>
          </div>
        ))
      )}
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg bg-slate-50 px-3 py-2">
      <span className="mt-0.5 text-slate-400">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <p className="text-sm text-slate-700">{value}</p>
      </div>
    </div>
  );
}

/** Small inline chevron used by the picker to hint at the detail view. */
export function DetailHint() {
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-brand-600">
      Profil <ChevronRight className="h-3 w-3" />
    </span>
  );
}
