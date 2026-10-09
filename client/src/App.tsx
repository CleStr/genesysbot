import { Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";
import SetupScreen from "./pages/SetupScreen";
import ChatPage from "./pages/ChatPage";

/**
 * Authentifizierung ist rein sitzungsbasiert (P0):
 *  - Bei jedem frischen Laden der Seite startet die App im Setup, weil der
 *    persönliche API-Token serverseitig nur in einer kurzlebigen Sitzung
 *    gehalten wird und nicht über Seitenaufrufe hinweg verfügbar ist.
 *  - Innerhalb einer geladenen App-Instanz (SPA) bleibt die Anmeldung im
 *    React-State erhalten; der zugehörige HttpOnly-Sitzungs-Cookie wird vom
 *    Browser automatisch mitgesendet.
 */
export default function App() {
  const [authed, setAuthed] = useState(false);

  return (
    <Routes>
      <Route
        path="/setup"
        element={
          authed ? <Navigate to="/chat" replace /> : <SetupScreen onDone={() => setAuthed(true)} />
        }
      />
      <Route
        path="/chat/*"
        element={authed ? <ChatPage /> : <Navigate to="/setup" replace />}
      />
      <Route path="*" element={<Navigate to={authed ? "/chat" : "/setup"} replace />} />
    </Routes>
  );
}
