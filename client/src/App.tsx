import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import SetupScreen from "./pages/SetupScreen";
import ChatPage from "./pages/ChatPage";
import { checkHealth } from "./lib/api";

export default function App() {
  const [ready, setReady] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    let cancelled = false;
    checkHealth()
      .then((h) => {
        if (cancelled) return;
        setHasApiKey(Boolean(h.hasApiKey));
      })
      .catch(() => {
        // Server not reachable yet — show setup so the user can proceed.
        if (!cancelled) setHasApiKey(false);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-slate-400">
          <span className="h-2.5 w-2.5 animate-bounce-dot rounded-full bg-brand-500 [animation-delay:-0.32s]" />
          <span className="h-2.5 w-2.5 animate-bounce-dot rounded-full bg-brand-500 [animation-delay:-0.16s]" />
          <span className="h-2.5 w-2.5 animate-bounce-dot rounded-full bg-brand-500" />
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/setup"
        element={
          hasApiKey ? <Navigate to="/chat" replace /> : <SetupScreen onDone={() => setHasApiKey(true)} />
        }
      />
      <Route
        path="/chat/*"
        element={hasApiKey ? <ChatPage /> : <Navigate to="/setup" replace />}
      />
      <Route path="*" element={<Navigate to={hasApiKey ? "/chat" : "/setup"} replace />} />
    </Routes>
  );
}
