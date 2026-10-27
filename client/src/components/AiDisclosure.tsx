import { Bot } from "lucide-react";

/**
 * KI-Kennzeichnung gemäß EU AI Act (VO (EU) 2024/1689, Art. 50 Abs. 1):
 * Bei KI-Systemen, die direkt mit Menschen interagieren, muss spätestens bei
 * der ersten Interaktion klar erkennbar sein, dass es sich um KI handelt.
 * Die Personas wirken wie echte Menschen (Name, Gesicht, Lebensgeschichte) —
 * daher persistente, sichtbare Kennzeichnung an allen Chat-Eingängen.
 */

/** Kompaktes Badge, z. B. für Header oder Empty-States. */
export function AiBadge({
  className = "",
  variant = "light",
}: {
  className?: string;
  variant?: "light" | "onDark";
}) {
  const styles =
    variant === "onDark"
      ? "bg-white/15 text-white/90 ring-white/30"
      : "bg-slate-100 text-slate-600 ring-slate-200";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${styles} ${className}`}
    >
      <Bot
        className={`h-3.5 w-3.5 ${variant === "onDark" ? "text-white/80" : "text-slate-500"}`}
        aria-hidden
      />
      KI-Chat
    </span>
  );
}

/**
 * Persistenter Hinweis am Chat-Composer: an jeder Stelle sichtbar, an der
 * Antworten der KI gelesen werden — erfüllt „spätestens bei der ersten
 * Interaktion" (Art. 50 Abs. 1) und bleibt während des gesamten Gesprächs sichtbar.
 */
export function AiDisclosureNote({ personaName }: { personaName?: string }) {
  return (
    <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
      <Bot className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
      <span>
        Antworten werden von KI erzeugt
        {personaName ? (
          <>
            {" "}
            — {personaName} ist eine fiktive Persona auf Basis von Umfragedaten,
            keine echte Person.
          </>
        ) : (
          <>
            {" "}
            — alle Personen sind fiktive Personas auf Basis von Umfragedaten,
            keine echten Menschen.
          </>
        )}
      </span>
    </p>
  );
}
