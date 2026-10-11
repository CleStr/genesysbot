import { useState } from "react";
import {
  X,
  Globe,
  Users,
  BarChart3,
  Heart,
  Lightbulb,
  Sparkles,
  GraduationCap,
  HandHeart,
  ArrowRight,
  BookOpen,
  FlaskConical,
  Database,
  ShieldCheck,
} from "lucide-react";

interface Props {
  onClose: () => void;
}

type Section =
  | "overview"
  | "personas"
  | "method"
  | "indices"
  | "data";

const sections: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Über das Projekt", icon: <Globe className="h-4 w-4" /> },
  { id: "personas", label: "Die Personen", icon: <Users className="h-4 w-4" /> },
  { id: "method", label: "Wie entstanden die Daten?", icon: <FlaskConical className="h-4 w-4" /> },
  { id: "indices", label: "Was bedeuten die Werte?", icon: <BarChart3 className="h-4 w-4" /> },
  { id: "data", label: "Datenschutz & Sicherheit", icon: <ShieldCheck className="h-4 w-4" /> },
];

export default function AboutBot({ onClose }: Props) {
  const [section, setSection] = useState<Section>("overview");

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
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Hintergrund</h2>
              <p className="text-sm text-white/80">
                Alles über den gEneSysBot und die Personen
              </p>
            </div>
          </div>
        </div>

        {/* Section tabs */}
        <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-200 bg-white px-4">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`relative flex shrink-0 items-center gap-1.5 px-3 py-3 text-sm font-medium transition-colors ${
                section === s.id ? "text-brand-700" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {s.icon}
              {s.label}
              {section === s.id && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600" />
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {section === "overview" && <OverviewSection />}
          {section === "personas" && <PersonasSection />}
          {section === "method" && <MethodSection />}
          {section === "indices" && <IndicesSection />}
          {section === "data" && <DataSection />}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-3 sm:px-6">
          <button onClick={onClose} className="btn-primary w-full justify-center">
            <Sparkles className="h-4 w-4" />
            Zurück zur Persona-Auswahl
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Sections ---------- */

function OverviewSection() {
  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      <p className="text-sm leading-relaxed text-slate-600">
        Der <strong>gEneSysBot</strong> ist ein Chatbot, der auf einer Messe Besuchern
        ermöglicht, mit verschiedenen Personen über ihren Alltag mit Energie zu sprechen.
        Die Personen basieren auf <strong>echten Umfragedaten</strong> aus dem
        Forschungsprojekt <strong>gEneSys</strong>.
      </p>

      <InfoCard icon={<Globe className="h-5 w-5" />} title="Was ist gEneSys?" color="brand">
        <p>
          gEneSys ist ein von der Europäischen Union gefördertes Forschungsprojekt
          (Horizon Europe). Es untersucht, wie Menschen in Europa und Sub-Sahara-Afrika
          von Energiearmut und Ausgrenzung betroffen sind – und welche politischen
          Maßnahmen helfen können.
        </p>
      </InfoCard>

      <InfoCard icon={<Users className="h-5 w-5" />} title="Warum Personen zum Chatten?" color="amber">
        <p>
          Statt trockener Statistik gibt es hier <strong>echte Persönlichkeiten</strong>:
          Insgesamt <strong>38 Personen</strong> – 6 vulnerable Gruppen, 16 typische Alltagsprofile
          aus Europa und 16 aus Sub-Sahara-Afrika. Sie stehen für reale Lebensrealitäten
          aus der gEneSys-Umfrage.
        </p>
      </InfoCard>

      <InfoCard icon={<Lightbulb className="h-5 w-5" />} title="Was lernt man hier?" color="brand">
        <p>
          Im Chat erzählen die Personen von ihrem Alltag: Wie kochen sie? Haben sie
          Stromausfälle? Wie geht es ihnen gesundheitlich? Machen sie sich Sorgen um
          die Umwelt? So wird sichtbar, wie unterschiedlich Menschen weltweit mit
          Energie leben.
        </p>
      </InfoCard>

      <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500">
        <p>
          <strong className="text-slate-600">Projekt:</strong> gEneSys – Intersectional
          Analysis and Personas of Marginalized Groups for Energy Policy Development
        </p>
        <p className="mt-1">
          <strong className="text-slate-600">Förderung:</strong> Horizon Europe,
          Fördervereinbarung Nr. 101094326
        </p>
        <p className="mt-1">
          <strong className="text-slate-600">Durchgeführt von:</strong> Fraunhofer IAO
          und Partner
        </p>
      </div>
    </div>
  );
}

function PersonasSection() {
  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      <p className="text-sm leading-relaxed text-slate-600">
        Insgesamt gibt es <strong>38 Personen</strong>, mit denen du sprechen kannst.
        Sie teilen sich in drei Kategorien auf:
      </p>

      <div>
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Heart className="h-4 w-4 text-amber-600" />
          Besonders vulnerable Gruppen (6 Personen)
        </h4>
        <div className="flex flex-col gap-2">
          <PersonaRow
            emoji="👵"
            name="Maria"
            desc="Alleinlebende Frau Anfang 50 in der EU. Lebt bescheiden, kämpft mit knappen Einkünften."
            tags={["Alleinlebend", "Älter", "Europa"]}
          />
          <PersonaRow
            emoji="👩🏾‍🎓"
            name="Aisha"
            desc="Junge Frau Anfang 20 aus einer Minderheit in der EU. Studiert, kämpft mit Diskriminierung und Eco-Angst."
            tags={["Jung", "Minderheit", "Europa"]}
          />
          <PersonaRow
            emoji="👩‍💼"
            name="Elena"
            desc="Frau Mitte 40 mit Pflegeverantwortung in der EU. Arbeitet Vollzeit, spürt den Druck zwischen Beruf und Familie."
            tags={["Pflegeverantwortung", "Familie", "Europa"]}
          />
          <PersonaRow
            emoji="👩🏾‍🌾"
            name="Amina"
            desc="Frau Ende 20 in einem ländlichen Dorf in Sub-Sahara-Afrika. Kocht mit Dreisteinfeuerung, begrenzter Energiezugang."
            tags={["Ländlich", "Pflegeverantwortung", "Afrika"]}
          />
          <PersonaRow
            emoji="👩🏾‍💻"
            name="Zainab"
            desc="Junge Frau Mitte 20 aus einer marginalisierten Gruppe in Sub-Sahara-Afrika. Jobbt, kämpft mit Stromausfällen."
            tags={["Jung", "Minderheit", "Afrika"]}
          />
          <PersonaRow
            emoji="👩🏾‍🍳"
            name="Fatuma"
            desc="Frau Mitte 30 in einem Großhaushalt in Lagos/Nairobi. Spart aktiv Energie, um Kosten zu beherrschen."
            tags={["Großhaushalt", "Städtisch", "Afrika"]}
          />
        </div>
      </div>

      <div>
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Users className="h-4 w-4 text-violet-600" />
          Typische Alltagsprofile: Europa (16 Personen)
        </h4>
        <p className="mb-3 text-xs text-slate-500">
          Diese Personen entstammen einer statistischen Analyse der EU-Daten
          (n=18.465). Jedes Profil steht für ein typisches Energie-Lebensmuster.
        </p>
        <div className="flex flex-col gap-2">
          <PersonaRow
            emoji="👩"
            name="Maria (Warschau)"
            desc="Stadt, Familie, mittlere Bildung, Mittleres Einkommen."
            tags={["Städtisch", "Familie", "Europa"]}
          />
          <PersonaRow
            emoji="👨"
            name="Marek (Warschau)"
            desc="Stadt, Familie, mittlere Bildung, Mittleres Einkommen."
            tags={["Städtisch", "Familie", "Europa"]}
          />
          <PersonaRow
            emoji="👩"
            name="Sofia (Lyon)"
            desc="Land, Familie, mittlere Bildung, Mittleres Einkommen."
            tags={["Ländlich", "Familie", "Europa"]}
          />
          <PersonaRow
            emoji="👨"
            name="Antoine (Dijon)"
            desc="Land, Paar, mittlere Bildung, Mittleres Einkommen."
            tags={["Ländlich", "Paar", "Europa"]}
          />
          <PersonaRow
            emoji="👩"
            name="Elena (Neapel)"
            desc="Land, Paar, niedrige Bildung, Geringes Einkommen."
            tags={["Ländlich", "Paar", "Europa"]}
          />
          <PersonaRow
            emoji="👨"
            name="Giovanni (Neapel)"
            desc="Land, Paar, niedrige Bildung, Älter."
            tags={["Ländlich", "Paar", "Älter", "Europa"]}
          />
          <PersonaRow
            emoji="👩"
            name="Camille (Marseille)"
            desc="Stadt, alleinlebend, niedrige Bildung, Sehr knappe Finanzen."
            tags={["Städtisch", "Alleinlebend", "Europa"]}
          />
          <PersonaRow
            emoji="👨"
            name="Marcus (Marseille)"
            desc="Stadt, alleinlebend, niedrige Bildung, Sehr knappe Finanzen."
            tags={["Städtisch", "Alleinlebend", "Europa"]}
          />
          <PersonaRow
            emoji="👩"
            name="Agnieszka (Warschau)"
            desc="Stadt, Familie, hohe Bildung, Hohes Einkommen."
            tags={["Städtisch", "Familie", "Europa"]}
          />
          <PersonaRow
            emoji="👨"
            name="Jakub (Krakau)"
            desc="Stadt, Familie, hohe Bildung, Hohes Einkommen."
            tags={["Städtisch", "Familie", "Europa"]}
          />
          <PersonaRow
            emoji="👩"
            name="Cathrin (Lissabon)"
            desc="Stadt, Familie, mittlere Bildung, Knappe Finanzen."
            tags={["Städtisch", "Familie", "Europa"]}
          />
          <PersonaRow
            emoji="👨"
            name="Piotr (Danzig)"
            desc="Stadt, Familie, mittlere Bildung, Knappe Finanzen."
            tags={["Städtisch", "Familie", "Europa"]}
          />
          <PersonaRow
            emoji="👩"
            name="Emma (Stockholm)"
            desc="Stadt, Familie, hohe Bildung, Finanziell abgesichert."
            tags={["Städtisch", "Familie", "Europa"]}
          />
          <PersonaRow
            emoji="👨"
            name="Erik (Stockholm)"
            desc="Stadt, Familie, hohe Bildung, Finanziell abgesichert."
            tags={["Städtisch", "Familie", "Europa"]}
          />
          <PersonaRow
            emoji="👩"
            name="Lena (Freiburg)"
            desc="Land, Paar, mittlere Bildung, Finanziell abgesichert."
            tags={["Ländlich", "Paar", "Europa"]}
          />
          <PersonaRow
            emoji="👨"
            name="Lukas"
            desc="Land, Paar, mittlere Bildung, Finanziell abgesichert."
            tags={["Ländlich", "Paar", "Europa"]}
          />
        </div>
      </div>

      <div>
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Users className="h-4 w-4 text-violet-600" />
          Typische Alltagsprofile: Sub-Sahara-Afrika (16 Personen)
        </h4>
        <p className="mb-3 text-xs text-slate-500">
          Diese Personen entstammen einer Analyse der afrikanischen Daten
          (n=11.536). Die Energiequellen reichen von Dreistein-Herd über Solar bis Generator.
        </p>
        <div className="flex flex-col gap-2">
          <PersonaRow
            emoji="👩🏾"
            name="Sarah (Gulu)"
            desc="Land, Familie, mittlere Bildung, Knappe Finanzen."
            tags={["Ländlich", "Familie", "Afrika"]}
          />
          <PersonaRow
            emoji="👨🏿"
            name="Juma (Kenia)"
            desc="Land, Familie, mittlere Bildung, Knappe Finanzen."
            tags={["Ländlich", "Familie", "Afrika"]}
          />
          <PersonaRow
            emoji="👩🏾"
            name="Amara (Nairobi)"
            desc="Stadt, Familie, hohe Bildung, Sehr knappe Finanzen."
            tags={["Städtisch", "Familie", "Afrika"]}
          />
          <PersonaRow
            emoji="👨🏿"
            name="Chidi (Lagos)"
            desc="Stadt, Familie, hohe Bildung, Sehr knappe Finanzen."
            tags={["Städtisch", "Familie", "Afrika"]}
          />
          <PersonaRow
            emoji="👩🏾"
            name="Lerato (Joburg)"
            desc="Stadt, Paar, hohe Bildung, Finanziell abgesichert."
            tags={["Städtisch", "Paar", "Afrika"]}
          />
          <PersonaRow
            emoji="👨🏿"
            name="Ade (Abuja)"
            desc="Stadt, Paar, hohe Bildung, Finanziell abgesichert."
            tags={["Städtisch", "Paar", "Afrika"]}
          />
          <PersonaRow
            emoji="👩🏾"
            name="Zawadi (Mbale)"
            desc="Land, Familie, hohe Bildung, Hohes Einkommen."
            tags={["Ländlich", "Familie", "Afrika"]}
          />
          <PersonaRow
            emoji="👨🏿"
            name="Kamau (Nairobi)"
            desc="Stadt, Familie, hohe Bildung, Hohes Einkommen."
            tags={["Städtisch", "Familie", "Afrika"]}
          />
          <PersonaRow
            emoji="👩🏾"
            name="Nia (Lagos)"
            desc="Stadt, Familie, hohe Bildung, Hohes Einkommen."
            tags={["Städtisch", "Familie", "Afrika"]}
          />
          <PersonaRow
            emoji="👨🏿"
            name="Tunde (Lagos)"
            desc="Stadt, Familie, hohe Bildung, Hohes Einkommen."
            tags={["Städtisch", "Familie", "Afrika"]}
          />
          <PersonaRow
            emoji="👩🏾"
            name="Aisha (Kapstadt)"
            desc="Stadt, Familie, mittlere Bildung, Mittleres Einkommen."
            tags={["Städtisch", "Familie", "Afrika"]}
          />
          <PersonaRow
            emoji="👨🏿"
            name="Sipho (Joburg)"
            desc="Stadt, Familie, mittlere Bildung, Mittleres Einkommen."
            tags={["Städtisch", "Familie", "Afrika"]}
          />
          <PersonaRow
            emoji="👩🏾"
            name="Fatima (Kampala)"
            desc="Stadt, alleinlebend, niedrige Bildung, Finanziell prekär."
            tags={["Städtisch", "Alleinlebend", "Afrika"]}
          />
          <PersonaRow
            emoji="👨🏿"
            name="Okello (Kampala)"
            desc="Stadt, alleinlebend, niedrige Bildung, Finanziell prekär."
            tags={["Städtisch", "Alleinlebend", "Afrika"]}
          />
          <PersonaRow
            emoji="👩🏾"
            name="Jamilla (Joburg)"
            desc="Stadt, alleinlebend, mittlere Bildung, Finanziell stark belastet."
            tags={["Städtisch", "Alleinlebend", "Afrika"]}
          />
          <PersonaRow
            emoji="👨🏿"
            name="Thabo (Kapstadt)"
            desc="Stadt, alleinlebend, mittlere Bildung, Finanziell stark belastet."
            tags={["Städtisch", "Alleinlebend", "Afrika"]}
          />
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-brand-100 bg-brand-50/60 p-4 text-sm leading-relaxed text-slate-600">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
        <p>
          <strong>Tipp:</strong> Nutze die Filter oben (Kategorie, Region,
          Lebenssituation), um die Person zu finden, die dich am meisten interessiert.
          Klicke auf „Mehr erfahren", um das Energie-Profil und weitere Details zu sehen.
          Oder probiere den <strong>Selbsttest</strong>-Reiter, um dein eigenes Profil
          zu berechnen und mit den Personen zu vergleichen.
        </p>
      </div>
    </div>
  );
}

function MethodSection() {
  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      <p className="text-sm leading-relaxed text-slate-600">
        Die Personen basieren auf echten Umfragedaten von über <strong>30.000
        Teilnehmerinnen und Teilnehmern</strong> in Europa und Sub-Sahara-Afrika.
      </p>

      <StepCard
        number={1}
        icon={<Database className="h-4 w-4" />}
        title="Umfrage"
        text="Im Rahmen des gEneSys-Projekts wurden 18.465 Menschen in der EU und 11.536 Menschen in Sub-Sahara-Afrika befragt. Die Fragen drehten sich um Energieverbrauch, Gesundheit, Werte und Sorgen."
      />
      <StepCard
        number={2}
        icon={<Users className="h-4 w-4" />}
        title="Gruppen finden"
        text="Mit statistischen Methoden wurden Gruppen identifiziert, die im Energiesystem besonders benachteiligt sind – z. B. alleinlebende Frauen mit niedriger Bildung oder junge Menschen aus Minderheiten."
      />
      <StepCard
        number={3}
        icon={<BarChart3 className="h-4 w-4" />}
        title="Werte berechnen"
        text="Für jede Gruppe wurden Durchschnittswerte berechnet – z. B. wie viel Eco-Angst sie spüren oder wie gut sie Energie managen kann. Diese Werte werden mit dem Regionsdurchschnitt verglichen."
      />
      <StepCard
        number={4}
        icon={<HandHeart className="h-4 w-4" />}
        title="Personen erschaffen"
        text="Aus den Daten wurden lebensechte Personen entwickelt: mit Namen, Alter, Wohnsituation und einer eigenen Stimme. Sie stehen stellvertretend für ihre ganze Gruppe."
      />
      <StepCard
        number={5}
        icon={<Sparkles className="h-4 w-4" />}
        title="Chatbot"
        text="Die Personen wurden mit einem KI-Chatbot verbunden. Wenn du mit ihnen schreibst, antworten sie so, wie es ihre Daten und ihre Lebenssituation nahelegen."
      />

      <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500">
        <p>
          Die Gruppen wurden durch <strong>intersectionale Analyse</strong> gebildet
          – das bedeutet, es wurde nicht nur ein Merkmal betrachtet (z. B. nur Alter),
          sondern mehrere gleichzeitig (z. B. Alter + Geschlecht + Bildung + Wohnort).
          So werden die vielschichtigen Ursachen von Energiearmut sichtbar.
        </p>
      </div>
    </div>
  );
}

function IndicesSection() {
  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      <p className="text-sm leading-relaxed text-slate-600">
        Die Werte, die du in den Profilen siehst, stammen aus zwei Gruppen von
        Fragebogen-Indizes. Alle Werte sind auf einer <strong>Skala von 1 bis 7</strong>.
        Höher bedeutet meist <strong>besser</strong> – außer bei Dingen, die belasten.
      </p>

      <div>
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <BarChart3 className="h-4 w-4 text-brand-600" />
          Energie im Alltag (6 Bereiche)
        </h4>
        <p className="mb-3 text-xs text-slate-500">
          Der sogenannte <em>Energy Capability Index</em> misst, wie gut Menschen mit
          Energie umgehen können – in sechs Teilbereichen:
        </p>
        <div className="flex flex-col gap-2">
          <IndexRow
            label="Energie-Management"
            hint="Energie effizient nutzen & Umweltentscheidungen treffen"
          />
          <IndexRow
            label="Alltagsbarrieren"
            hint="Wie sehr Energiekosten den Alltag behindern"
            inverted
          />
          <IndexRow
            label="Zugang & Sicherheit"
            hint="Zuverlässige & sichere Energieversorgung"
          />
          <IndexRow
            label="Gesundheitsfolgen"
            hint="Wie stark Energie die Gesundheit beeinträchtigt"
            inverted
          />
          <IndexRow
            label="Entscheidungskompetenz"
            hint="Informierte Energieentscheidungen treffen"
          />
          <IndexRow
            label="Politisches Engagement"
            hint="Vertrauen, dass Politiker zuhören"
          />
        </div>
      </div>

      <div>
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Heart className="h-4 w-4 text-amber-600" />
          Verhalten & Sorgen (6 Bereiche)
        </h4>
        <p className="mb-3 text-xs text-slate-500">
          Diese Werte erfassen, wie Menschen sich verhalten und was sie fühlen –
          rund um Energie und Umwelt:
        </p>
        <div className="flex flex-col gap-2">
          <IndexRow label="Energiespar-Verhalten" hint="Aktives Sparen von Energie" />
          <IndexRow label="Effizientes Verhalten" hint="Nachhaltige Konsumentscheidungen" />
          <IndexRow label="Eco-Angst" hint="Sorge um Umwelt & Klima" inverted />
          <IndexRow
            label="Relative Deprivation"
            hint="Gefühl, schlechter gestellt zu sein"
            inverted
          />
          <IndexRow label="Pro-Umwelt-Norm" hint="Persönliche Werte für die Natur" />
          <IndexRow
            label="Polit. Selbstwirksamkeit"
            hint="Glaube an eigenen politischen Einfluss"
          />
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50/60 p-4 text-sm leading-relaxed text-slate-600">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <p>
          <strong>Farben:</strong> In den Profilen siehst du farbige Balken.{" "}
          <span className="font-medium text-amber-600">Bernstein</span> bedeutet
          schlechter als der Regionsdurchschnitt,{" "}
          <span className="font-medium text-brand-600">Grün</span> bedeutet besser.
          Bei Werten, die eine Belastung messen (z. B. Eco-Angst), bedeutet ein höherer
          Wert eine stärkere Belastung.
        </p>
      </div>
    </div>
  );
}

function DataSection() {
  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      <InfoCard icon={<ShieldCheck className="h-5 w-5" />} title="Deine Daten sind sicher" color="brand">
        <p>
          Der Chatbot speichert <strong>keine persönlichen Daten</strong> von dir.
          Du brauchst dich nicht anzumelden. Deine Chat-Nachrichten werden nur an
          die KI gesendet, um eine Antwort zu erzeugen – danach sind sie weg.
        </p>
      </InfoCard>

      <InfoCard icon={<Database className="h-5 w-5" />} title="Woher kommen die Daten?" color="amber">
        <p>
          Die Personen-Daten stammen aus der gEneSys-Umfrage (EU: 18.465 Befragte,
          Sub-Sahara-Afrika: 11.536 Befragte). Die Umfrage wurde im Rahmen des
          Horizon-Europe-Projekts gEneSys durchgeführt. Die Daten sind vollständig
          anonymisiert – keine Rückschlüsse auf einzelne Personen möglich.
        </p>
      </InfoCard>

      <InfoCard icon={<Sparkles className="h-5 w-5" />} title="Wie funktioniert der Chat?" color="brand">
        <p>
          Wenn du einer Person schreibst, nutzt der Bot eine KI (Sprachmodell), um
          die Antwort zu erzeugen. Die KI erhält die Daten und die Lebenssituation
          der Person als „Rolle" und antwortet so, wie diese Person es tun würde.
          Die Antworten sind <strong>nicht vorab geschrieben</strong> – sie entstehen
          live aus den Daten.
        </p>
      </InfoCard>

      <InfoCard icon={<GraduationCap className="h-5 w-5" />} title="Wissenschaftliche Grundlage" color="brand">
        <p>
          Die Methodik basiert auf dem <em>Capability Approach</em> nach Martha
          Nussbaum – einer anerkannten Theorie, die untersucht, was Menschen
          tatsächlich tun und sein können. Die Fragebögen wurden für den
          Energiekontext neu entwickelt und statistisch geprüft.
        </p>
      </InfoCard>

      <div className="rounded-xl bg-brand-50 p-4 text-xs text-slate-600 ring-1 ring-brand-100">
        <p className="mb-2 font-medium text-slate-700">Projekt-Details:</p>
        <ul className="space-y-1">
          <li>• Projekt: gEneSys (Horizon Europe, Nr. 101094326)</li>
          <li>• Deliverable: D2.5 – Intersectional Analysis and Personas</li>
          <li>• Federführung: Fraunhofer IAO</li>
          <li>• Befragte: 18.465 (EU) + 11.536 (Sub-Sahara-Afrika) = 30.001</li>
          <li>• Veröffentlichung: September 2025</li>
        </ul>
      </div>
    </div>
  );
}

/* ---------- Helper components ---------- */

function InfoCard({
  icon,
  title,
  color,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  color: "brand" | "amber" | "emerald";
  children: React.ReactNode;
}) {
  const colorMap = {
    brand: "border-brand-100 bg-brand-50/50 text-brand-600",
    amber: "border-amber-100 bg-amber-50/50 text-amber-600",
    emerald: "border-brand-100 bg-brand-50/50 text-brand-600",
  };
  return (
    <div className={`rounded-xl border p-4 ${colorMap[color]}`}>
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
      </div>
      <div className="text-sm leading-relaxed text-slate-600">{children}</div>
    </div>
  );
}

function StepCard({
  number,
  icon,
  title,
  text,
}: {
  number: number;
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
        {number}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
          {icon}
          {title}
        </div>
        <p className="text-sm leading-relaxed text-slate-600">{text}</p>
      </div>
    </div>
  );
}

function PersonaRow({
  emoji,
  name,
  desc,
  tags,
}: {
  emoji: string;
  name: string;
  desc: string;
  tags: string[];
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-brand-200 text-xl">
        {emoji}
      </div>
      <div className="min-w-0 flex-1">
        <h5 className="text-sm font-semibold text-slate-800">{name}</h5>
        <p className="text-xs leading-relaxed text-slate-500">{desc}</p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function IndexRow({
  label,
  hint,
  inverted,
}: {
  label: string;
  hint: string;
  inverted?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
      <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-slate-700">{label}</p>
          {inverted && (
            <span className="inline-flex items-center rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
              höher = mehr Belastung
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500">{hint}</p>
      </div>
    </div>
  );
}
