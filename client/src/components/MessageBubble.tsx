import { Bot, User } from "lucide-react";
import type { ChatMessage } from "../types";
import PersonaAvatar from "./PersonaAvatar";
import type { Persona } from "../types";

interface Props {
  message: ChatMessage;
  persona: Persona;
}

export default function MessageBubble({ message, persona }: Props) {
  const isUser = message.role === "user";
  return (
    <div
      className={`flex w-full gap-3 animate-fade-in-fast ${
        isUser ? "flex-row-reverse" : "flex-row"
      }`}
    >
      {isUser ? (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
          <User className="h-4 w-4" />
        </div>
      ) : (
        <PersonaAvatar persona={persona} size="sm" />
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
          isUser
            ? "rounded-tr-sm bg-brand-600 text-white"
            : "rounded-tl-sm bg-white text-slate-800 ring-1 ring-slate-200"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
      </div>
    </div>
  );
}

export function TypingIndicator({ persona }: { persona: Persona }) {
  return (
    <div className="flex w-full gap-3 animate-fade-in-fast">
      <PersonaAvatar persona={persona} size="sm" />
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-white px-4 py-3 ring-1 ring-slate-200">
        <span className="h-2 w-2 animate-bounce-dot rounded-full bg-slate-400 [animation-delay:-0.32s]" />
        <span className="h-2 w-2 animate-bounce-dot rounded-full bg-slate-400 [animation-delay:-0.16s]" />
        <span className="h-2 w-2 animate-bounce-dot rounded-full bg-slate-400" />
      </div>
    </div>
  );
}

export function BotIcon() {
  return <Bot className="h-4 w-4" />;
}
