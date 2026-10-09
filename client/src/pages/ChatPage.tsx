import { useState } from "react";
import { MessageCircle, Radar, Users, Gamepad2 } from "lucide-react";
import type { Persona } from "../types";
import PersonaPicker from "../components/PersonaPicker";
import ChatWindow from "../components/ChatWindow";
import SelfAssessment from "../components/SelfAssessment";
import CompareView from "../components/CompareView";
import RolePlay from "../components/RolePlay";
import ApiStatusIndicator from "../components/ApiStatusIndicator";
import BrandHeader from "../components/BrandHeader";
import FundingFooter from "../components/FundingFooter";
import HelpPanel from "../components/HelpPanel";

type Tab = "chat" | "compare" | "selftest" | "roles";

export default function ChatPage() {
  const [persona, setPersona] = useState<Persona | null>(null);
  const [tab, setTab] = useState<Tab>("chat");

  // When a persona is selected (from either tab), show the chat window.
  if (persona) {
    return (
      <div className="h-screen bg-brand-50/30">
        <div className="h-full animate-fade-in-fast">
          <ChatWindow
            persona={persona}
            onBack={() => setPersona(null)}
            onNavigateTab={(t) => {
              setPersona(null);
              setTab(t);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-brand-50/30">
      {/* Brand header */}
      <div className="shrink-0 border-b border-brand-100 bg-white/85 backdrop-blur">
        <BrandHeader />
        {/* Tab navigation */}
        <div className="mx-auto flex max-w-5xl items-center gap-1 px-4 sm:px-6">
          <TabButton
            active={tab === "chat"}
            onClick={() => setTab("chat")}
            icon={<MessageCircle className="h-4 w-4" />}
            label="Personen-Chat"
          />
          <TabButton
            active={tab === "compare"}
            onClick={() => setTab("compare")}
            icon={<Users className="h-4 w-4" />}
            label="Vergleich"
          />
          <TabButton
            active={tab === "selftest"}
            onClick={() => setTab("selftest")}
            icon={<Radar className="h-4 w-4" />}
            label="Selbsttest"
          />
          <TabButton
            active={tab === "roles"}
            onClick={() => setTab("roles")}
            icon={<Gamepad2 className="h-4 w-4" />}
            label="Rollen-Spiel"
          />
          <div className="ml-auto flex items-center gap-1 py-2">
            <HelpPanel />
            <ApiStatusIndicator />
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {tab === "chat" ? (
          <div className="h-full overflow-y-auto">
            <PersonaPicker
              onPick={setPersona}
              onNavigateTab={(t) => setTab(t)}
            />
          </div>
        ) : tab === "compare" ? (
          <CompareView onPick={setPersona} />
        ) : tab === "roles" ? (
          <div className="h-full overflow-hidden">
            <RolePlay onPick={setPersona} />
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            <SelfAssessment onPick={setPersona} />
          </div>
        )}
      </div>

      {/* Funding acknowledgment */}
      <FundingFooter />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
        active ? "text-brand-700" : "text-slate-500 hover:text-slate-800"
      }`}
    >
      {icon}
      {label}
      {active && (
        <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600" />
      )}
    </button>
  );
}
