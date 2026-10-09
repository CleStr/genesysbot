import { useCallback, useEffect, useRef, useState } from "react";
import { Settings2, Loader2 } from "lucide-react";
import { checkHealth, getConfig } from "../lib/api";
import ApiConfigModal from "./ApiConfigModal";

/**
 * Status-Anzeige (P1):
 *  - Unterscheidet: Backend erreichbar / Sitzung gültig / FhGenie-Endpunkt.
 *  - Kein automatisches Polling mit echten LLM-Anfragen mehr (Kosten!);
 *    der Backend-Health wird günstig alle 60 s geprüft, der FhGenie-Test
 *    nur auf ausdrücklichen Klick ("Verbindung testen").
 *  - Ein einzelner transienter Fehler schaltet nicht dauerhaft auf "offline".
 */

type Status =
  | "checking"
  | "ok"
  | "session-invalid"
  | "backend-offline"
  | "transient";

const STATUS_META: Record<
  Status,
  { color: string; ring: string; label: string; dot: string }
> = {
  checking: {
    color: "text-slate-500 hover:bg-slate-100",
    ring: "ring-slate-200",
    label: "Verbindung wird geprüft",
    dot: "bg-slate-400",
  },
  ok: {
    color: "text-brand-700 hover:bg-brand-50",
    ring: "ring-brand-200",
    label: "Verbindung verfügbar",
    dot: "bg-brand-500",
  },
  "session-invalid": {
    color: "text-amber-700 hover:bg-amber-50",
    ring: "ring-amber-200",
    label: "Sitzung abgelaufen",
    dot: "bg-amber-500",
  },
  "backend-offline": {
    color: "text-red-700 hover:bg-red-50",
    ring: "ring-red-200",
    label: "Server offline",
    dot: "bg-red-500",
  },
  transient: {
    color: "text-amber-700 hover:bg-amber-50",
    ring: "ring-amber-200",
    label: "Verbindungsproblem – erneut versuchen",
    dot: "bg-amber-500",
  },
};

const HEALTH_INTERVAL_MS = 60000;
const TRANSIENT_THRESHOLD = 2; // erst nach 2 aufeinanderfolgenden Fehlern "offline"

export default function ApiStatusIndicator() {
  const [status, setStatus] = useState<Status>("checking");
  const [modalOpen, setModalOpen] = useState(false);
  const failCount = useRef(0);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    try {
      await checkHealth();
      if (!mounted.current) return;
      failCount.current = 0;
      // Sitzung (Cookie) ist vorhanden, solange die App nicht neu geladen wurde.
      try {
        await getConfig();
        if (!mounted.current) return;
        setStatus("ok");
      } catch (cfgErr) {
        if (!mounted.current) return;
        const expired = (cfgErr as { sessionExpired?: boolean }).sessionExpired;
        setStatus(expired ? "session-invalid" : "transient");
      }
    } catch {
      if (!mounted.current) return;
      failCount.current += 1;
      // Erst wiederholte Fehlschläge deuten auf einen echten Serverausfall.
      setStatus(failCount.current >= TRANSIENT_THRESHOLD ? "backend-offline" : "transient");
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    refresh();
    const timer = setInterval(refresh, HEALTH_INTERVAL_MS);
    return () => {
      mounted.current = false;
      clearInterval(timer);
    };
  }, [refresh]);

  const handleModalClose = () => {
    setModalOpen(false);
    setStatus("checking");
    refresh();
  };

  const meta = STATUS_META[status];

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        title={meta.label}
        className={`inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-medium ring-1 transition-colors ${meta.color} ${meta.ring}`}
      >
        {status === "checking" ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
        )}
        <span className="hidden sm:inline">{meta.label}</span>
        <Settings2 className="h-3 w-3 opacity-60" />
      </button>

      <ApiConfigModal
        open={modalOpen}
        onClose={handleModalClose}
        onSaved={refresh}
      />
    </>
  );
}
