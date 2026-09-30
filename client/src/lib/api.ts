import type { ChatMessage, Persona } from "../types";

const API_BASE = "/api";

export async function checkHealth(): Promise<{
  status: string;
  hasApiKey: boolean;
  baseUrl?: string;
  baseUrlIsPlaceholder?: boolean;
}> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error("Server nicht erreichbar.");
  return res.json();
}

export async function getConfig(): Promise<{
  hasApiKey: boolean;
  baseUrl: string;
  baseUrlIsPlaceholder: boolean;
}> {
  const res = await fetch(`${API_BASE}/config`);
  if (!res.ok) throw new Error("Konfiguration konnte nicht geladen werden.");
  return res.json();
}

export async function updateConfig(
  password: string,
  data: { apiKey?: string; baseUrl?: string }
): Promise<{ ok: boolean; error?: string; hasApiKey?: boolean; baseUrl?: string; baseUrlIsPlaceholder?: boolean }> {
  const res = await fetch(`${API_BASE}/config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password, ...data }),
  });
  const json = await res.json();
  if (!res.ok) return { ok: false, error: json.error ?? "Konfiguration fehlgeschlagen." };
  return { ok: true, ...json };
}

export async function testConnection(): Promise<{
  ok: boolean;
  reason?: string;
  status?: number;
  detail?: string;
}> {
  const res = await fetch(`${API_BASE}/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) return { ok: false, reason: "server-error" };
  return res.json();
}

export async function submitSetup(
  password: string,
  apiKey: string
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/setup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password, apiKey }),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false, error: data.error ?? "Setup fehlgeschlagen." };
  return { ok: true };
}

export async function sendChat(
  persona: Persona,
  history: ChatMessage[]
): Promise<string> {
  const messages = [
    { role: "system", content: persona.systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content })),
  ];

  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Chat-Anfrage fehlgeschlagen.");
  }

  // OpenAI-compatible shape: { choices: [{ message: { content } }] }
  if (data?.choices?.[0]?.message?.content) {
    return data.choices[0].message.content;
  }
  // Fallback: { content: "..." }
  if (typeof data?.content === "string") {
    return data.content;
  }
  throw new Error("Unerwartete Antwort der API.");
}

/* ── Role-play: send a message with an extra system prompt ──────────── */

export async function sendRoleChat(
  persona: Persona,
  roleSystemPrompt: string,
  history: ChatMessage[]
): Promise<string> {
  const messages = [
    { role: "system", content: persona.systemPrompt },
    { role: "system", content: roleSystemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content })),
  ];

  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Chat-Anfrage fehlgeschlagen.");
  }

  if (data?.choices?.[0]?.message?.content) {
    return data.choices[0].message.content;
  }
  if (typeof data?.content === "string") {
    return data.content;
  }
  throw new Error("Unerwartete Antwort der API.");
}

/* ── Role-play: AI evaluation of a conversation ────────────────────── */

export interface AIEvaluation {
  aiScore: number;
  verdict: "convinced" | "partial" | "failed";
  reasoning: string;
}

export async function evaluateConversation(
  persona: Persona,
  roleSystemPrompt: string,
  history: ChatMessage[]
): Promise<AIEvaluation> {
  const transcript = history
    .map((m) => `${m.role === "user" ? "Spieler" : persona.name}: ${m.content}`)
    .join("\n\n");

  const evalPrompt = `Du bist ein neutraler Schiedsrichter in einem Rollenspiel. Ein Spieler hat als ${roleSystemPrompt.includes("Policy Designer") ? "Policy Designer" : roleSystemPrompt.includes("Vertriebler") ? "Vertriebler" : "Aktivist"} mit der Person "${persona.name}" gesprochen.

Hier ist die Person:
${persona.description}

Lebenssituation der Person:
- Einkommen: ${persona.values?.income ?? "unbekannt"}
- Energiezugang: ${persona.values?.energySecurity ?? "unbekannt"}
- Eco-Angst: ${persona.values?.ecoAnxiety ?? "unbekannt"}
- Politisches Vertrauen: ${persona.values?.politicalEfficacy ?? "unbekannt"}
- Gesundheit: ${persona.values?.healthChallenges ?? "unbekannt"}
- Umweltschutz: ${persona.values?.proEnvironmental ?? "unbekannt"}

Gesprächsverlauf:
${transcript}

Bewerte, wie überzeugend der Spieler war. Hat die Person am Ende zugestimmt oder sich zumindest positiv geäußert? Berücksichtige, ob die Argumente zur Lebenssituation der Person passten.

Antworte AUSSCHLIESSLICH als gültiges JSON im folgenden Format (kein Markdown, keine Erklärung davor oder danach):
{"aiScore": <0-100 als ganze Zahl>, "verdict": "convinced" | "partial" | "failed", "reasoning": "<1-2 Sätze auf Deutsch>"}`;

  const messages = [
    { role: "system", content: evalPrompt },
    { role: "user", content: "Bewerte das Gespräch." },
  ];

  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Bewertung fehlgeschlagen.");
  }

  let content: string;
  if (data?.choices?.[0]?.message?.content) {
    content = data.choices[0].message.content;
  } else if (typeof data?.content === "string") {
    content = data.content;
  } else {
    throw new Error("Unerwartete Antwort der API.");
  }

  // Extract JSON from the response (in case the model wraps it in markdown)
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Bewertung konnte nicht gelesen werden.");
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      aiScore: Math.max(0, Math.min(100, Math.round(parsed.aiScore ?? 0))),
      verdict: parsed.verdict ?? "partial",
      reasoning: parsed.reasoning ?? "",
    };
  } catch {
    throw new Error("Bewertung konnte nicht gelesen werden.");
  }
}
