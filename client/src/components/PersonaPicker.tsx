import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, MapPin, BarChart3, Sparkles, Heart, Filter, BookOpen, Users, MessageCircle, Radar, ArrowRight, Lightbulb, Zap, Gamepad2, Compass } from "lucide-react";
import type { Persona } from "../types";
import { personas } from "../data/personas";
import PersonaAvatar from "./PersonaAvatar";
import PersonaDetail from "./PersonaDetail";
import AboutBot from "./AboutBot";
import { AiBadge } from "./AiDisclosure";

interface Props {
  onPick: (persona: Persona) => void;
  onNavigateTab?: (tab: "compare" | "selftest" | "roles") => void;
}

type CategoryFilter = "all" | "vulnerable" | "cluster";
type RegionFilter = "all" | "Europa" | "Afrika";

const tagGroups: { label: string; tags: string[] }[] = [
  { label: "Haushalt", tags: ["Alleinlebend", "Familie", "Paar"] },
  { label: "Wohnort", tags: ["Städtisch", "Ländlich"] },
  { label: "Bildung", tags: ["Niedrige Bildung", "Mittlere Bildung", "Hohe Bildung"] },
  { label: "Einkommenssituation", tags: ["Angespannt", "Über die Runden", "Knappe Finanzen", "Sehr knappe Finanzen", "Mittleres Einkommen", "Geringes Einkommen", "Hohes Einkommen", "Finanziell abgesichert", "Finanziell prekär", "Finanziell stark belastet"] },
  { label: "Alter & Minderheit", tags: ["Jung", "Älter", "Minderheit"] },
];

export default function PersonaPicker({ onPick, onNavigateTab }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [region, setRegion] = useState<RegionFilter>("all");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [detail, setDetail] = useState<Persona | null>(null);
  const [showAbout, setShowAbout] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return personas.filter((p) => {
      const matchesCategory = category === "all" || p.category === category;
      const matchesRegion =
        region === "all" ||
        (region === "Europa" && p.group === "Global North") ||
        (region === "Afrika" && p.group === "Global South");
      const matchesTags =
        activeTags.length === 0 ||
        activeTags.every((t) => (p.tags ?? []).includes(t));
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.country ?? "").toLowerCase().includes(q) ||
        (p.tags ?? []).some((t) => t.toLowerCase().includes(q));
      return matchesCategory && matchesRegion && matchesTags && matchesQuery;
    });
  }, [query, category, region, activeTags]);

  const toggleTag = (tag: string) =>
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );

  const hasFilters = category !== "all" || region !== "all" || activeTags.length > 0 || query.trim() !== "";

  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col px-4 py-6 sm:px-6">
      {/* Welcome / Messe-Erlebnis */}
      {showWelcome && (
        <div className="mb-5 animate-fade-in">
          {/* Top bar: Hintergrund button */}
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => setShowAbout(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-brand-600 transition-colors hover:bg-brand-700 hover:text-white hover:ring-brand-700"
            >
              <BookOpen className="h-3.5 w-3.5" />
              Hintergrund
            </button>
          </div>

          {/* Hero */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 px-6 py-7 text-center text-white shadow-xl shadow-brand-700/25 sm:px-8 sm:py-9">
            {/* Layered waves background — gEneSys signature graphic */}
            <div
              className="pointer-events-none absolute inset-0 opacity-30"
              style={{
                backgroundImage: "url('/layered-waves.svg')",
                backgroundSize: "cover",
                backgroundPosition: "bottom",
                backgroundRepeat: "no-repeat",
              }}
            />
            {/* Subtle radial glow */}
            <div className="pointer-events-none absolute -top-12 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-white/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -right-10 h-44 w-44 rounded-full bg-brand-300/25 blur-3xl" />
            <div className="relative">
              <div className="mb-3 flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
                  <Zap className="h-7 w-7" />
                </div>
              </div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Wie nutzen Menschen Energie –
                <br className="hidden sm:block" /> und was denken sie darüber?
              </h1>
              <p className="mx-auto mt-3 max-w-xl text-sm text-white/85">
                Sprich mit 38 Personen aus Europa und Sub-Sahara-Afrika.
                Sie basieren auf echten Umfragedaten von mehr als 30.000 Menschen.
              </p>
              <div className="mt-3 flex justify-center">
                <AiBadge variant="onDark" />
              </div>
            </div>
          </div>

          {/* Guided entry cards */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: Stay here */}
            <button
              onClick={() => setShowWelcome(false)}
              className="group flex flex-col items-start gap-2 rounded-xl border border-brand-200 bg-brand-50/60 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                <MessageCircle className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800">
                Eine Person kennenlernen
              </h3>
              <p className="text-xs leading-relaxed text-slate-500">
                Wähle unten eine Person und sprich mit ihr über ihren Alltag.
              </p>
              <span className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-brand-600 group-hover:text-brand-700">
                Loslegen <ArrowRight className="h-3 w-3" />
              </span>
            </button>

            {/* Card 2: Compare */}
            <button
              onClick={() => onNavigateTab?.("compare")}
              className="group flex flex-col items-start gap-2 rounded-xl border border-slate-200 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800">
                Zwei Welten vergleichen
              </h3>
              <p className="text-xs leading-relaxed text-slate-500">
                Stelle dieselbe Frage an mehrere Personen gleichzeitig.
              </p>
              <span className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-slate-600 group-hover:text-slate-800">
                Zum Vergleich <ArrowRight className="h-3 w-3" />
              </span>
            </button>

            {/* Card 3: Self-test */}
            <button
              onClick={() => onNavigateTab?.("selftest")}
              className="group flex flex-col items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <Radar className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800">
                Wo stehst du selbst?
              </h3>
              <p className="text-xs leading-relaxed text-slate-500">
                10 Fragen – und du siehst, wem du am ähnlichsten bist.
              </p>
              <span className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-amber-700 group-hover:text-amber-800">
                Selbsttest starten <ArrowRight className="h-3 w-3" />
              </span>
            </button>

            {/* Card 4: Role-play game */}
            <button
              onClick={() => onNavigateTab?.("roles")}
              className="group flex flex-col items-start gap-2 rounded-xl border border-violet-200 bg-violet-50/60 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                <Gamepad2 className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800">
                Rollen-Spiel
              </h3>
              <p className="text-xs leading-relaxed text-slate-500">
                Schlüpfe in eine Rolle und überzeuge Menschen von deinem Anliegen.
              </p>
              <span className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-violet-700 group-hover:text-violet-800">
                Spiel starten <ArrowRight className="h-3 w-3" />
              </span>
            </button>
          </div>

          {/* Progressive hint */}
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-500">
            <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
            <p>
              <strong className="text-slate-600">Tipp:</strong> Beginne mit einer Person,
              vergleiche sie dann mit jemandem aus der anderen Region –
              und probiere am Ende den Selbsttest. So tauchst du Schritt für Schritt tiefer ein.
            </p>
          </div>
        </div>
      )}

      {/* Collapsed welcome bar */}
      {!showWelcome && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <button
            onClick={() => setShowWelcome(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-brand-600"
          >
            <Compass className="h-3.5 w-3.5" />
            Willkommen-Bereich anzeigen
          </button>
          <button
            onClick={() => setShowAbout(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-brand-600 transition-colors hover:bg-brand-700 hover:text-white hover:ring-brand-700"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Hintergrund
          </button>
        </div>
      )}

      {/* Header (when welcome is collapsed) */}
      {!showWelcome && (
        <div className="mb-5 text-center animate-fade-in">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Mit wem möchtest du sprechen?
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Wähle eine Person aus und entdecke ihren Alltag mit Energie.{" "}
            <span className="text-slate-400">Basiert auf echten Umfragedaten.</span>
          </p>
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, Land oder Lebenssituation suchen…"
            className="input-field pl-10"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Category filter — primary choice */}
      <div className="mb-3">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <Filter className="h-3 w-3" /> Kategorie
        </p>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip
            active={category === "all"}
            onClick={() => setCategory("all")}
            icon={<Sparkles className="h-3.5 w-3.5" />}
            label="Alle Personen"
          />
          <FilterChip
            active={category === "vulnerable"}
            onClick={() => setCategory("vulnerable")}
            icon={<Heart className="h-3.5 w-3.5" />}
            label="Besonders vulnerable Gruppen"
          />
          <FilterChip
            active={category === "cluster"}
            onClick={() => setCategory("cluster")}
            icon={<Users className="h-3.5 w-3.5" />}
            label="Typische Alltagsprofile"
          />
        </div>
      </div>

      {/* Region filter */}
      <div className="mb-3">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <MapPin className="h-3 w-3" /> Region
        </p>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip
            active={region === "all"}
            onClick={() => setRegion("all")}
            label="Alle Regionen"
          />
          <FilterChip
            active={region === "Europa"}
            onClick={() => setRegion("Europa")}
            label="Europa"
          />
          <FilterChip
            active={region === "Afrika"}
            onClick={() => setRegion("Afrika")}
            label="Sub-Sahara-Afrika"
          />
        </div>
      </div>

      {/* Tag filter — life situations, grouped */}
      <div className="mb-5 space-y-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <Sparkles className="h-3 w-3" /> Lebenssituation
        </p>
        {tagGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 text-[11px] font-medium text-slate-400">{group.label}</p>
            <div className="flex flex-wrap gap-1.5">
              {group.tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    activeTags.includes(tag)
                      ? "bg-brand-600 text-white shadow-sm"
                      : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Active filter reset */}
      {hasFilters && (
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            <span className="font-semibold text-slate-700">{filtered.length}</span>{" "}
            {filtered.length === 1 ? "Person" : "Personen"} gefunden
          </p>
          <button
            onClick={() => {
              setQuery("");
              setCategory("all");
              setRegion("all");
              setActiveTags([]);
            }}
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            <X className="h-3 w-3" /> Filter zurücksetzen
          </button>
        </div>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center text-slate-400">
          <Search className="mb-3 h-10 w-10 opacity-40" />
          <p className="text-sm">Keine Personen gefunden.</p>
          <p className="mt-1 text-xs">Versuche es mit weniger Filtern.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 pb-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p, i) => (
            <div
              key={p.id}
              style={{ animationDelay: `${i * 40}ms` }}
              className="card group flex flex-col items-start gap-3 p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg animate-slide-up"
            >
              <button
                onClick={() => onPick(p)}
                className="flex w-full items-center gap-4 text-left"
              >
                <PersonaAvatar persona={p} size="md" />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-semibold text-slate-900">{p.name}</h3>
                  <p className="truncate text-xs text-slate-500">{p.tagline}</p>
                </div>
              </button>
              <p className="line-clamp-2 text-sm text-slate-600">{p.description}</p>

              {/* Category badge */}
              <div className="flex flex-wrap gap-1">
                {p.category === "cluster" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">
                    <Users className="h-3 w-3" /> {p.clusterLabel ?? `Gruppe ${p.cluster}`}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                    <Heart className="h-3 w-3" /> Vulnerable Gruppe
                  </span>
                )}
                {p.country && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    <MapPin className="h-3 w-3" /> {p.country}
                  </span>
                )}
              </div>

              {/* Mini energy profile preview */}
              {p.eci && p.eci.length > 0 && (
                <button
                  onClick={() => setDetail(p)}
                  className="flex w-full items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2 text-xs text-slate-500 transition-colors hover:bg-brand-50 hover:text-brand-700"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span>Energie-Profil ansehen</span>
                  <span className="ml-auto flex gap-0.5">
                    {p.eci.map((v) => {
                      const diff = v.value - v.average;
                      const worse = v.inverted ? diff > 0.05 : diff < -0.05;
                      const better = v.inverted ? diff < -0.05 : diff > 0.05;
                      return (
                        <span
                          key={v.key}
                          className={`w-1 rounded-full ${worse ? "bg-amber-400" : better ? "bg-brand-400" : "bg-brand-300"}`}
                          style={{ height: `${8 + (v.value / v.max) * 16}px` }}
                          title={`${v.label}: ${v.value.toFixed(2)} (Ø ${v.average.toFixed(2)})`}
                        />
                      );
                    })}
                  </span>
                </button>
              )}

              <div className="mt-auto flex w-full items-center gap-1.5 pt-1">
                <button
                  onClick={() => setDetail(p)}
                  className="ml-auto text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  Mehr erfahren →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-auto pt-4 text-center">
        <button
          onClick={() => navigate("/setup")}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          API-Einstellungen
        </button>
      </div>

      {detail && (
        <PersonaDetail
          persona={detail}
          onClose={() => setDetail(null)}
          onStartChat={() => {
            onPick(detail);
            setDetail(null);
          }}
        />
      )}

      {showAbout && <AboutBot onClose={() => setShowAbout(false)} />}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-colors ${
        active
          ? "bg-brand-600 text-white shadow-sm"
          : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
