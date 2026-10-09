import { Bot, User } from "lucide-react";
import type { ReactNode } from "react";
import type { ChatMessage } from "../types";
import PersonaAvatar from "./PersonaAvatar";
import type { Persona } from "../types";

interface Props {
  message: ChatMessage;
  persona: Persona;
}

/* ── Sicheres Markdown-Rendering (P2) ────────────────────────────────────
 *
 * Eigener, bewusst kleiner Markdown-Parser, der direkt React-Elemente
 * erzeugt (kein HTML-String, kein dangerouslySetInnerHTML). Dadurch ist
 * HTML-/Script-Injection per Konstruktion ausgeschlossen.
 *
 * Unterstützt: **fett**, *kursiv* (auch Erzähl-Aktionen wie *schüttelt den
 * Kopf*), `#`–`###`-Überschriften, `-`/`*`-Listen, Absätze. Unvollständige
 * Tokens (z. B. beim Streaming ein einzelnes `*`) werden als normaler Text
 * dargestellt.
 */

/** Inline-Formatierung: **fett** und *kursiv* (nicht-gierig, paarweise). */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  // Reihenfolge wichtig: erst **fett**, dann *kursiv*.
  const pattern = /\*\*([^*]+)\*\*|\*([^*\n]+)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      out.push(
        <strong key={`${keyPrefix}-b${i}`} className="font-semibold">
          {m[1]}
        </strong>
      );
    } else if (m[2] !== undefined) {
      out.push(
        <em key={`${keyPrefix}-i${i}`} className="italic">
          {m[2]}
        </em>
      );
    }
    last = m.index + m[0].length;
    i += 1;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

interface Block {
  kind: "p" | "h" | "ul";
  level?: number;
  items?: string[];
  text?: string;
}

/** Block-Level-Parsing: Absätze, Überschriften, Listen. */
function parseBlocks(content: string): Block[] {
  const blocks: Block[] = [];
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  let para: string[] = [];
  let list: string[] | null = null;

  const flushPara = () => {
    if (para.length > 0) {
      blocks.push({ kind: "p", text: para.join(" ") });
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      blocks.push({ kind: "ul", items: list });
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.trim() === "") {
      flushPara();
      flushList();
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      flushPara();
      flushList();
      blocks.push({ kind: "h", level: heading[1].length, text: heading[2] });
      continue;
    }
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      flushPara();
      if (!list) list = [];
      list.push(bullet[1]);
      continue;
    }
    flushList();
    para.push(line.trim());
  }
  flushPara();
  flushList();
  return blocks;
}

function MarkdownContent({ content }: { content: string }) {
  const blocks = parseBlocks(content);
  return (
    <div className="space-y-2 break-words">
      {blocks.map((b, i) => {
        if (b.kind === "h") {
          const size =
            b.level === 1
              ? "text-base font-bold"
              : b.level === 2
              ? "text-sm font-bold"
              : "text-sm font-semibold";
          return (
            <p key={i} className={`${size} text-slate-900`}>
              {renderInline(b.text ?? "", `h${i}`)}
            </p>
          );
        }
        if (b.kind === "ul") {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {(b.items ?? []).map((item, j) => (
                <li key={j}>{renderInline(item, `l${i}-${j}`)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap">
            {renderInline(b.text ?? "", `p${i}`)}
          </p>
        );
      })}
    </div>
  );
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
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <MarkdownContent content={message.content} />
        )}
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
