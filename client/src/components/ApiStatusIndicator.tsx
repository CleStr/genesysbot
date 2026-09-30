import { useCallback, useEffect, useRef, useState } from "react";
import { Settings2, Loader2 } from "lucide-react";
import { getConfig, testConnection } from "../lib/api";
import ApiConfigModal from "./ApiConfigModal";

type Status = "checking" | "ok" | "no-key" | "placeholder" | "error" | "offline";

const STATUS_META: Record<
  Status,
  { color: string; ring: string; label: string; dot: string }
> = {
  checking: {
    color: "text-slate-500 hover:bg-slate-100",
    ring: "ring-slate-200",
    label: "Prüfe…",
    dot: "bg-slate-400",
  },
  ok: {
    color: "text-brand-700 hover:bg-brand-50",
    ring: "ring-brand-200",
    label: "API aktiv",
    dot: "bg-brand-500",
  },
  "no-key": {
    color: "text-red-700 hover:bg-red-50",
    ring: "ring-red-200",
    label: "Kein API-Key",
    dot: "bg-red-500",
  },
  placeholder: {
    color: "text-red-700 hover:bg-red-50",
    ring: "ring-red-200",
    label: "API-URL fehlt",
    dot: "bg-red-500",
  },
  error: {
    color: "text-red-700 hover:bg-red-50",
    ring: "ring-red-200",
    label: "API nicht erreichbar",
    dot: "bg-red-500",
  },
  offline: {
    color: "text-red-700 hover:bg-red-50",
    ring: "ring-red-200",
    label: "Server offline",
    dot: "bg-red-500",
  },
};

export default function ApiStatusIndicator() {
  const [status, setStatus] = useState<Status>("checking");
  const [modalOpen, setModalOpen] = useState(false);
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const cfg = await getConfig();
      if (!cfg.hasApiKey) {
        setStatus("no-key");
        return;
      }
      if (cfg.baseUrlIsPlaceholder) {
        setStatus("placeholder");
        return;
      }
      // Config looks good — do a quick connection test.
      const test = await testConnection();
      if (test.ok) {
        setStatus("ok");
      } else if (test.reason === "no-key") {
        setStatus("no-key");
      } else if (test.reason === "placeholder-url") {
        setStatus("placeholder");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("offline");
    }
  }, []);

  // Check on mount and periodically.
  useEffect(() => {
    refresh();
    refreshTimer.current = setInterval(refresh, 30000); // every 30s
    return () => {
      if (refreshTimer.current) clearInterval(refreshTimer.current);
    };
  }, [refresh]);

  // Re-check immediately after the config modal closes.
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
