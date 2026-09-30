import express from "express";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const PORT = process.env.PORT || 3001;
const clientDist = resolve(dirname(fileURLToPath(import.meta.url)), "../../client/dist");

// In-memory storage for the FhG API key and base URL (set via the setup
// screen or the in-app config dialog). Persists for the lifetime of the
// server process.
let fhgApiKey = process.env.FHG_API_KEY || "";
let fhgBaseUrl = (process.env.FHG_BASE_URL || "https://fhgenie.fraunhofer.de/v1").replace(/\/+$/, "");

app.use(express.json({ limit: "1mb" }));

// --- Health check ----------------------------------------------------------
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasApiKey: Boolean(fhgApiKey),
    baseUrl: fhgBaseUrl,
    baseUrlIsPlaceholder: fhgBaseUrl.includes("example.com"),
  });
});

// --- Set the FhG API key ---------------------------------------------------
// The frontend sends the password + the API key. The password must match
// the configured admin password before the key is stored.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "local-development-only";

if (process.env.NODE_ENV === "production" && !process.env.ADMIN_PASSWORD) {
  throw new Error("ADMIN_PASSWORD must be configured in production.");
}

app.post("/api/setup/verify", (req, res) => {
  const { password } = req.body ?? {};

  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ ok: false, error: "Ungültiges Admin-Passwort." });
  }

  return res.json({ ok: true });
});

app.post("/api/setup", (req, res) => {
  const { password, apiKey } = req.body ?? {};

  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ ok: false, error: "Ungültiges Passwort." });
  }

  if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length < 8) {
    return res
      .status(400)
      .json({ ok: false, error: "Bitte einen gültigen API-Key eingeben." });
  }

  fhgApiKey = apiKey.trim();
  return res.json({ ok: true });
});

// --- Get / set the runtime API configuration -------------------------------
// Allows the frontend to read and update the FhG API key and base URL without
// restarting the server. Both endpoints require the admin password.

app.get("/api/config", (_req, res) => {
  res.json({
    hasApiKey: Boolean(fhgApiKey),
    baseUrl: fhgBaseUrl,
    baseUrlIsPlaceholder: fhgBaseUrl.includes("example.com"),
  });
});

app.post("/api/config", (req, res) => {
  const { password, apiKey, baseUrl } = req.body ?? {};

  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ ok: false, error: "Ungültiges Passwort." });
  }

  if (apiKey !== undefined && apiKey !== null) {
    if (typeof apiKey !== "string" || apiKey.trim().length < 8) {
      return res
        .status(400)
        .json({ ok: false, error: "API-Key muss mindestens 8 Zeichen lang sein." });
    }
    fhgApiKey = apiKey.trim();
  }

  if (baseUrl !== undefined && baseUrl !== null) {
    const trimmed = String(baseUrl).trim().replace(/\/+$/, "");
    if (trimmed.length === 0) {
      return res
        .status(400)
        .json({ ok: false, error: "Basis-URL darf nicht leer sein." });
    }
    fhgBaseUrl = trimmed;
  }

  return res.json({
    ok: true,
    hasApiKey: Boolean(fhgApiKey),
    baseUrl: fhgBaseUrl,
    baseUrlIsPlaceholder: fhgBaseUrl.includes("example.com"),
  });
});

// --- Test the upstream connection -----------------------------------------
// Sends a minimal chat-completions request to the configured FhG endpoint
// and reports whether it responded successfully. Used by the status
// indicator in the UI.
app.post("/api/test", async (_req, res) => {
  if (!fhgApiKey) {
    return res.json({ ok: false, reason: "no-key" });
  }
  if (fhgBaseUrl.includes("example.com")) {
    return res.json({ ok: false, reason: "placeholder-url" });
  }

  try {
    const upstream = await fetch(`${fhgBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${fhgApiKey}`,
      },
      body: JSON.stringify({
        model: "nvidia/GLM-5.2-NVFP4",
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1,
        stream: false,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (upstream.ok) {
      return res.json({ ok: true });
    }
    return res.json({
      ok: false,
      reason: "upstream-error",
      status: upstream.status,
    });
  } catch (err) {
    return res.json({
      ok: false,
      reason: "connection-failed",
      detail: String(err),
    });
  }
});

// --- Chat proxy ------------------------------------------------------------
// Forwards a chat completion request to the FhG API without exposing the key.
// The body shape is intentionally generic so it can adapt to the real FhG
// endpoint. Currently assumes an OpenAI-compatible chat completions API.
app.post("/api/chat", async (req, res) => {
  if (!fhgApiKey) {
    return res
      .status(503)
      .json({ error: "Kein API-Key konfiguriert. Bitte zuerst Setup durchführen." });
  }

  const { messages, model = "nvidia/GLM-5.2-NVFP4", temperature = 0.7 } = req.body ?? {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Nachrichten fehlen." });
  }

  try {
    const upstream = await fetch(`${fhgBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${fhgApiKey}`,
      },
      body: JSON.stringify({ model, messages, temperature, stream: false }),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      return res
        .status(upstream.status)
        .json({ error: `FhG-API Fehler: ${upstream.status}`, detail: text });
    }

    const data = await upstream.json();
    return res.json(data);
  } catch (err) {
    return res
      .status(502)
      .json({ error: "Verbindung zur FhG-API fehlgeschlagen.", detail: String(err) });
  }
});

app.use(express.static(clientDist));
app.get("*", (_req, res) => {
  res.sendFile(resolve(clientDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`gEneSysBot proxy server running on http://localhost:${PORT}`);
  console.log(`API key configured: ${fhgApiKey ? "yes" : "no (setup pending)"}`);
});
