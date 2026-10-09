// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MessageBubble from "./MessageBubble";
import type { Persona } from "../types";

const persona: Persona = {
  id: "test-persona",
  name: "Testperson",
  tagline: "Test",
  emoji: "🙂",
  color: "#0ea5e9",
  values: {},
  systemPrompt: "",
} as unknown as Persona;

function renderBot(content: string) {
  return render(
    <MessageBubble
      message={{ id: "m1", role: "assistant", content, createdAt: 0 }}
      persona={persona}
    />
  );
}

describe("P2: Markdown-Rendering in MessageBubble", () => {
  it("rendert das beobachtete Literal `**Bereit bin:**` als fett, nicht als Rohtext", () => {
    renderBot("**Bereit bin:** Ich bin bereit.");
    const strong = screen.getByText("Bereit bin:");
    expect(strong.tagName).toBe("STRONG");
    expect(screen.getByText("Ich bin bereit.")).toBeInTheDocument();
    // Der Rohtext mit Sternchen darf nicht sichtbar sein:
    expect(screen.queryByText(/\*\*/)).not.toBeInTheDocument();
  });

  it("rendert Erzähl-Aktionen wie *seufzt leise* kursiv", () => {
    renderBot("Sie schaut auf. *seufzt leise* Dann sagt sie nichts.");
    const em = screen.getByText("seufzt leise");
    expect(em.tagName).toBe("EM");
  });

  it("rendert Überschriften (# bis ###) als fett, nicht als Text-#", () => {
    renderBot("## Mein Tag\n\nZwei Absätze.");
    const heading = screen.getByText("Mein Tag");
    expect(heading.className).toContain("font-bold");
    expect(screen.queryByText("## Mein Tag")).not.toBeInTheDocument();
    expect(screen.getByText("Zwei Absätze.")).toBeInTheDocument();
  });

  it("rendert Aufzählungen als Liste", () => {
    const { container } = renderBot(
      "Ich mache heute:\n- Wäsche waschen\n- Einkaufen gehen\n- Kinder abholen"
    );
    const ul = container.querySelector("ul");
    expect(ul).not.toBeNull();
    const items = container.querySelectorAll("li");
    expect(items).toHaveLength(3);
    expect(screen.getByText("Wäsche waschen")).toBeInTheDocument();
    expect(screen.getByText("Einkaufen gehen")).toBeInTheDocument();
    expect(screen.getByText("Kinder abholen")).toBeInTheDocument();
  });

  it("führt Inline-Formatierung in Listenpunkten aus (fett + kursiv)", () => {
    const { container } = renderBot("- **Wichtig:** Strom *teuer*");
    const li = container.querySelector("li");
    expect(li).not.toBeNull();
    expect(li!.querySelector("strong")?.textContent).toBe("Wichtig:");
    expect(li!.querySelector("em")?.textContent).toBe("teuer");
  });

  it("schließt HTML-/Script-Injection aus (XSS-Schutz)", () => {
    const { container } = renderBot(
      '<script>window.__xss = true;</script><img src=x onerror="window.__xss2 = true">'
    );
    // Kein script-Element wurde erzeugt:
    expect(container.querySelector("script")).toBeNull();
    expect((window as unknown as Record<string, unknown>).__xss).toBeUndefined();
    expect((window as unknown as Record<string, unknown>).__xss2).toBeUndefined();
    // Der Inhalt wird als Text dargestellt, nicht als HTML interpretiert:
    expect(
      screen.getByText(/window.__xss = true/)
    ).toBeInTheDocument();
  });

  it("zeigt unvollständige Markdown-Tokens als normalen Text (Streaming-Sicherheit)", () => {
    renderBot("Ein einzelner * Stern bleibt Text");
    expect(screen.getByText("Ein einzelner * Stern bleibt Text")).toBeInTheDocument();
    expect(container_of_em()).toBeNull();
  });

  it("behält Absätze getrennt (zwei Absätze → zwei p-Elemente)", () => {
    const { container } = renderBot("Erster Absatz.\n\nZweiter Absatz.");
    const ps = container.querySelectorAll("p");
    expect(ps.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Erster Absatz.")).toBeInTheDocument();
    expect(screen.getByText("Zweiter Absatz.")).toBeInTheDocument();
  });

  it("rendert Nutzer-Nachrichten als Klartext (kein Markdown)", () => {
    const { container } = render(
      <MessageBubble
        message={{ id: "m2", role: "user", content: "**nicht fett** <b>auch nicht</b>", createdAt: 0 }}
        persona={persona}
      />
    );
    expect(container.querySelector("strong")).toBeNull();
    expect(container.querySelector("b")).toBeNull();
    expect(screen.getByText("**nicht fett** <b>auch nicht</b>")).toBeInTheDocument();
  });
});

function container_of_em() {
  return document.querySelector("em");
}
