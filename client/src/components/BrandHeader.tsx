/**
 * Elegant brand header for the gEneSys project.
 * Shows the official gEneSys project logo and the Fraunhofer IAO logo.
 * Styled to match the gEneSys project website (genesys-project.eu).
 */
export default function BrandHeader() {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
      {/* Official gEneSys project logo */}
      <a
        href="https://genesys-project.eu/"
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center transition-opacity hover:opacity-80"
        title="gEneSys Project"
      >
        <img
          src="/genesys-logo.png"
          alt="gEneSys Project"
          className="h-11 w-auto sm:h-12"
          style={{ width: "auto" }}
        />
      </a>

      {/* Real Fraunhofer IAO logo */}
      <a
        href="https://www.iao.fraunhofer.de"
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-2 transition-opacity hover:opacity-80"
        title="Fraunhofer IAO"
      >
        <img
          src="/fraunhofer-logo.svg"
          alt="Fraunhofer IAO"
          className="h-7 w-auto sm:h-8"
          style={{ width: "auto" }}
        />
      </a>
    </div>
  );
}
