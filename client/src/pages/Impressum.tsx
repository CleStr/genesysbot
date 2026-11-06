import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Bot,
  Building2,
  Mail,
  Globe,
  Landmark,
  UserCheck,
  Scale,
  AlertTriangle,
  Copyright,
} from "lucide-react";
import { AiBadge } from "../components/AiDisclosure";

/**
 * Impressum (§ 5 DDG) — öffentlich erreichbar ohne Login.
 * Rechtsangaben entsprechend dem offiziellen CeRRI/Fraunhofer-Impressum
 * (cerri.iao.fraunhofer.de). Verantwortlicher Redakteur: Dr. Clemens Striebing.
 */
export default function Impressum() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            to="/"
            className="btn-ghost !px-3 !py-2 text-slate-600 hover:text-slate-900"
            aria-label="Zurück zur Startseite"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-tight text-slate-900">
              gEneSysBot
            </span>
            <AiBadge />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Impressum
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Angaben gemäß § 5 Digitale-Dienste-Gesetz (DDG)
        </p>

        {/* Anbieter */}
        <section className="card mt-8 p-6">
          <SectionTitle icon={<Building2 className="h-4 w-4" />} title="Anbieter" />
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-slate-700">
            <div>
              <p className="font-semibold text-slate-900">
                CeRRI — Center for Responsible Research and Innovation
              </p>
              <p>Fraunhofer-Institut für Arbeitswirtschaft und Organisation IAO</p>
              <p>Hardenbergstraße 20</p>
              <p>10623 Berlin</p>
            </div>
            <div className="border-t border-slate-100 pt-4">
              <p>
                CeRRI ist eine rechtlich nicht selbstständige Einrichtung der
                Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung
                e.V.
              </p>
              <p className="mt-2">Hansastraße 27 c</p>
              <p>80686 München</p>
            </div>
          </div>
        </section>

        {/* Kontakt, USt, Register */}
        <section className="card mt-4 p-6">
          <SectionTitle icon={<Landmark className="h-4 w-4" />} title="Kontakt und Rechtsangaben" />
          <dl className="mt-4 space-y-4 text-sm leading-relaxed">
            <div className="flex items-start gap-3">
              <dt className="flex w-40 shrink-0 items-center gap-1.5 font-medium text-slate-500">
                <Mail className="h-3.5 w-3.5" aria-hidden /> E-Mail:
              </dt>
              <dd className="text-slate-700">
                <a
                  href="mailto:info@zv.fraunhofer.de"
                  className="text-brand-700 underline decoration-brand-300 underline-offset-2 hover:text-brand-800"
                >
                  info@zv.fraunhofer.de
                </a>
              </dd>
            </div>
            <div className="flex items-start gap-3">
              <dt className="flex w-40 shrink-0 items-center gap-1.5 font-medium text-slate-500">
                <Globe className="h-3.5 w-3.5" aria-hidden /> Website:
              </dt>
              <dd className="text-slate-700">
                <a
                  href="https://www.fraunhofer.de"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-700 underline decoration-brand-300 underline-offset-2 hover:text-brand-800"
                >
                  www.fraunhofer.de
                </a>
              </dd>
            </div>
            <div className="flex items-start gap-3">
              <dt className="w-40 shrink-0 pt-0.5 font-medium text-slate-500">
                USt-IdNr.:
              </dt>
              <dd className="text-slate-700">
                DE 129515865
                <span className="block text-xs text-slate-400">
                  Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG
                </span>
              </dd>
            </div>
            <div className="flex items-start gap-3">
              <dt className="w-40 shrink-0 pt-0.5 font-medium text-slate-500">
                Registergericht:
              </dt>
              <dd className="text-slate-700">
                Amtsgericht München, Eingetragener Verein
                <span className="block text-xs text-slate-400">
                  Register-Nr. VR 4461
                </span>
              </dd>
            </div>
            <div className="flex items-start gap-3">
              <dt className="w-40 shrink-0 pt-0.5 font-medium text-slate-500">
                Vorstand:
              </dt>
              <dd className="text-slate-700">
                Prof. Dr.-Ing. Holger Hanselka (Präsident), Prof. Dr. Constantin
                Häfner, Prof. Dr. Axel Müller-Groeling, Elisabeth Ewen, Dr.
                Sandra Krey
              </dd>
            </div>
          </dl>
        </section>

        {/* Verantwortlich § 18 MStV */}
        <section className="card mt-4 border-l-4 !border-l-brand-500 p-6">
          <SectionTitle
            icon={<UserCheck className="h-4 w-4" />}
            title="Verantwortlich für den Inhalt"
          />
          <p className="mt-1 text-xs text-slate-400">
            gemäß § 18 Abs. 2 Medienstaatsvertrag (MStV)
          </p>
          <div className="mt-4 text-sm leading-relaxed text-slate-700">
            <p className="font-semibold text-slate-900">Dr. Clemens Striebing</p>
            <p>CeRRI — Fraunhofer-Institut für Arbeitswirtschaft und Organisation IAO</p>
            <p>Hardenbergstraße 20, 10623 Berlin</p>
          </div>
        </section>

        {/* KI-Kennzeichnung */}
        <section className="card mt-4 p-6">
          <SectionTitle
            icon={<Bot className="h-4 w-4" />}
            title="KI-Kennzeichnung"
          />
          <p className="mt-1 text-xs text-slate-400">
            gemäß Verordnung (EU) 2024/1689 („AI Act"), Art. 50 Abs. 1
          </p>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-700">
            <p>
              Der gEneSysBot ist ein KI-System: Die Antworten der Chat-Personas
              werden in Echtzeit von einem KI-Sprachmodell erzeugt. Alle Personas
              (z.&nbsp;B. Emma, Piotr, Zainab) sind <strong>fiktive Figuren</strong>{" "}
              auf Basis von Umfragedaten — keine echten Menschen. Äußerungen der
              Personas geben keine realen Meinungen oder Erfahrungen wieder.
            </p>
            <p>
              Diese Kennzeichnung erfolgt spätestens bei der ersten Interaktion
              und bleibt während der gesamten Nutzung sichtbar.
            </p>
          </div>
        </section>

        {/* Haftungsausschluss */}
        <section className="card mt-4 p-6">
          <SectionTitle
            icon={<Scale className="h-4 w-4" />}
            title="Haftungsausschluss"
          />

          <h3 className="mt-5 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" aria-hidden />
            KI-generierte Inhalte
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Die Antworten dieses Chatbots werden automatisiert von künstlicher
            Intelligenz erzeugt. Sie können fehlerhaft, unvollständig,
            veraltet oder irreführend sein. Die Inhalte stellen{" "}
            <strong>keine Beratung</strong> dar — insbesondere keine
            finanzielle, medizinische, psychologische oder rechtliche Beratung
            — und geben nicht unbedingt die Auffassung des Betreibers wieder.
            Für Entscheidungen, die auf Grundlage der Chat-Inhalte getroffen
            werden, wird jede Haftung ausgeschlossen.
          </p>

          <h3 className="mt-6 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" aria-hidden />
            Haftung für Inhalte
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Die Inhalte dieses Angebots wurden mit Sorgfalt erstellt. Für
            Aktualität, Richtigkeit und Vollständigkeit der Inhalte kann
            jedoch keine Gewähr übernommen werden. Eine Haftung ist — soweit
            gesetzlich zulässig — nur für Schäden ausgeschlossen, die auf
            Vorsatz oder grober Fahrlässigkeit beruhen; darüber hinaus nur bei
            Verletzung wesentlicher Vertragspflichten.
          </p>

          <h3 className="mt-6 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" aria-hidden />
            Externe Links
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Dieses Angebot kann Links zu Websites Dritter enthalten. Für deren
            Inhalte ist der jeweilige Anbieter verantwortlich. Zum Zeitpunkt
            der Verlinkung waren keine rechtswidrigen Inhalte erkennbar; eine
            ständige Kontrolle verlinkter Seiten ist ohne konkrete
            Anhaltspunkte nicht zumutbar. Bei Bekanntwerden rechtswidriger
            Inhalte werden entsprechende Links unverzüglich entfernt.
          </p>
        </section>

        {/* Urheberrecht */}
        <section className="card mt-4 p-6">
          <SectionTitle
            icon={<Copyright className="h-4 w-4" />}
            title="Urheberrecht und Nutzungsrechte"
          />
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            Die Inhalte und Werke auf diesen Seiten unterliegen dem deutschen
            Urheberrecht. © Fraunhofer-Gesellschaft e.V., München. Vervielfältigung,
            Bearbeitung und Verbreitung bedürfen der schriftlichen Zustimmung.
            Downloads und Ausdrucke sind nur für den persönlichen Gebrauch
            gestattet; grafische Veränderungen an Bildmotiven sind nicht
            gestattet.
          </p>
        </section>

        <p className="mt-8 text-center text-xs text-slate-400">
          gEneSysBot · Ein Projekt im Rahmen von Horizon Europe (Fördervereinbarung Nr. 101094326)
        </p>
      </main>
    </div>
  );
}

function SectionTitle({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500/10 text-brand-700">
        {icon}
      </span>
      {title}
    </h2>
  );
}
