import { useState } from "react";
import { createPortal } from "react-dom";
import { HelpCircle, X, Bot, Users, Theater, Database, BrainCircuit, Scale, Info } from "lucide-react";

/**
 * Collapsible help panel (P6): explains what gEneSysBot is, how the
 * personas work, what role-play does, where the data comes from, the
 * limits of the AI, and how the matching score is computed.
 */
export default function HelpPanel() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-brand-700"
        aria-label="Hilfe öffnen"
        title="Was ist gEneSysBot?"
      >
        <HelpCircle className="h-5 w-5" />
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Hilfe zu gEneSysBot"
            onClick={() => setOpen(false)}
          >
            <div
              className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl animate-fade-in-fast"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
                <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                  <HelpCircle className="h-5 w-5 text-brand-600" />
                  Hilfe zu gEneSysBot
                </h2>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Hilfe schließen"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6 px-6 py-5 text-sm leading-relaxed text-slate-600">
                <Section icon={<Bot className="h-4 w-4" />} title="Was ist gEneSysBot?">
                  gEneSysBot ist ein Ausstellungs-Chatbot: Besucher chatten
                  mit fiktiven Personen, deren Merkmale auf echten
                  Fraunhofer-Umfragedaten basieren. Der Bot soll vermitteln,
                  wie unterschiedlich Menschen in Europa und Sub-Sahara-Afrika
                  mit Energie, Kosten und Alltag umgehen.
                </Section>

                <Section icon={<Users className="h-4 w-4" />} title="Wer sind die Personen (Personas)?">
                  Jede Persona steht für ein Antwortmuster aus der gEneSys-Studie
                  (18.465 Befragte in Europa, 11.536 in Sub-Sahara-Afrika).
                  Alter, Beruf und Name sind illustrativ; Werte, Einkommen und
                  Energieverhalten folgen den Umfragedaten. Personas sind
                  keine echten Personen.
                </Section>

                <Section icon={<Theater className="h-4 w-4" />} title="Was ist das Rollenspiel?">
                  Im Rollenspiel nimmst du eine Rolle ein (z. B. Journalist,
                  Nachbar oder Energieberater) und sprichst mit einer Persona
                  über deren Alltag. Die KI bleibt dabei in der Rolle der
                  Persona — sie erfindet keine neuen Fakten, sondern bleibt
                  bei den Studiendaten.
                </Section>

                <Section icon={<Database className="h-4 w-4" />} title="Welche Rolle spielen die Umfragedaten?">
                  Die Daten liefern die Merkmale jeder Persona: Region,
                  Bildung, Einkommen, Energiezugang, Sorgen und Verhalten.
                  Alles, was die KI darüber hinaus erzählt (Geschichten,
                  Anekdoten, Emotionen), ist eine modellbasierte Schätzung —
                  nicht Teil der Studie.
                </Section>

                <Section icon={<BrainCircuit className="h-4 w-4" />} title="Grenzen der KI">
                  Die Antworten werden von einem Sprachmodell erzeugt. Das
                  Modell kann Fehler machen, vereinfachen oder Situationen
                  dramatischer oder harmloser darstellen als sie real sind.
                  Antworten sind keine Expertenmeinung und keine
                  wissenschaftliche Quelle.
                </Section>

                <Section icon={<Scale className="h-4 w-4" />} title="Wie entsteht der Ähnlichkeits-Score?">
                  Beim Selbsttest werden deine 10 Merkmale mit denen jeder
                  Persona verglichen — jede Übereinstimmung zählt. Im
                  Rollenspiel fließt zusätzlich eine KI-Bewertung ein:
                  40&nbsp;% Werte-Passung und 60&nbsp;% KI-Bewertung des
                  Gesprächs. Die KI-Bewertung ist eine modellbasierte
                  Schätzung und nicht objektiv.
                </Section>

                <Section icon={<Info className="h-4 w-4" />} title="Score-Interpretation">
                  Ein hoher Score bedeutet: Deine Merkmale ähneln dem
                  Umfragemuster dieser Persona. Er sagt nichts über dich als
                  Person aus und ist keine Diagnose. Zwei Personen mit
                  gleichem Score können sehr unterschiedliche Leben führen.
                </Section>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-1.5 flex items-center gap-2 font-semibold text-slate-900">
        <span className="text-brand-600">{icon}</span>
        {title}
      </h3>
      <p>{children}</p>
    </section>
  );
}
