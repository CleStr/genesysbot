/**
 * Discrete funding acknowledgment footer for the gEneSys project.
 * Horizon Europe grant no. 101094326.
 * Includes the official "Funded by the EU" logo, matching the project website.
 */
export default function FundingFooter() {
  return (
    <footer className="shrink-0 border-t border-brand-100 bg-brand-50/40 px-4 py-2.5 backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 text-center sm:flex-row sm:text-left">
        <p className="max-w-xl text-[10px] leading-relaxed text-slate-500">
          Dieses Projekt hat Förderung erhalten vom Programm Horizon Europe der
          Europäischen Union — Kultur, Kreativität und inklusive Gesellschaft —
          unter der Fördervereinbarung Nr.{" "}
          <span className="font-medium text-brand-700">101094326</span>.
        </p>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-[10px] font-medium text-slate-400">
            © 2026 gEneSys
          </span>
          <img
            src="/eu-funded.png"
            alt="Funded by the European Union"
            className="h-7 w-auto"
            style={{ width: "auto" }}
            title="Funded by the European Union"
          />
        </div>
      </div>
    </footer>
  );
}
