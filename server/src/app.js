/* gEneSysBot — Express-App: sitzungsbasierte Authentifizierung + FhGenie-Proxy.
 *
 * Sicherheitsmodell (P0):
 *  - Es gibt KEINEN globalen API-Key mehr. Jede Besucherin / jeder Besucher
 *    authentifiziert sich bei jedem Seitenaufruf mit Admin-Passwort und
 *    persönlichem FhGenie-Token.
 *  - Der Token liegt ausschließlich in einer kurzlebigen In-Memory-Sitzung
 *    auf dem Server, referenziert über ein opakes Sitzungs-Cookie (HttpOnly,
 *    SameSite=Strict, in Produktion Secure). Er wird nie persistiert, nie
 *    an den Browser gesendet und nie geloggt.
 *  - Alle LLM-Endpunkte erfordern eine gültige Sitzung; es gibt keinen
 *    Fallback auf einen globalen Key.
 */

import express from "express";
import crypto from "node:crypto";
import fs from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SESSION_COOKIE = "gsb_session";
const SESSION_TTL_MS =
  Number.parseInt(process.env.SESSION_TTL_MS || "", 10) || 2 * 60 * 60 * 1000; // 2 h Inaktivität
const SESSION_ABSOLUTE_TTL_MS =
  Number.parseInt(process.env.SESSION_ABSOLUTE_TTL_MS || "", 10) || 12 * 60 * 60 * 1000; // 12 h Obergrenze
const RATE_WINDOW_MS =
  Number.parseInt(process.env.RATE_WINDOW_MS || "", 10) || 10 * 60 * 1000;
const RATE_MAX_ATTEMPTS =
  Number.parseInt(process.env.RATE_MAX_ATTEMPTS || "", 10) || 10;
const UPSTREAM_MODEL = "nvidia/GLM-5.2-NVFP4";

export function createApp() {
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "local-development-only";
  if (!process.env.ADMIN_PASSWORD && process.env.NODE_ENV === "production") {
    throw new Error("ADMIN_PASSWORD must be set in production.");
  }
  const DEFAULT_BASE_URL = (
    process.env.FHG_BASE_URL || "https://fhgenie.fraunhofer.de/v1"
  ).replace(/\/+$/, "");
  const isProduction = process.env.NODE_ENV === "production";
  const baseUrlLocked = isProduction;

  const app = express();
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));

  // Grundlegende Security-Header
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    next();
  });

  /* ── Sitzungs-Store (nur im Speicher, nie persistiert) ─────────────── */

  /** @type {Map<string, {apiKey: string, baseUrl: string, createdAt: number, expiresAt: number}>} */
  const sessions = new Map();

  const purgeTimer = setInterval(() => {
    const now = Date.now();
    for (const [id, s] of sessions) {
      if (now >= s.expiresAt || now - s.createdAt >= SESSION_ABSOLUTE_TTL_MS) {
        sessions.delete(id);
      }
    }
  }, 5 * 60 * 1000);
  purgeTimer.unref();
  app.locals.stopPurgeTimer = () => clearInterval(purgeTimer);

  function createSession(apiKey) {
    const id = crypto.randomBytes(32).toString("hex");
    const now = Date.now();
    sessions.set(id, {
      apiKey,
      baseUrl: DEFAULT_BASE_URL,
      createdAt: now,
      expiresAt: now + SESSION_TTL_MS,
    });
    return id;
  }

  /* ── Brute-force-Schutz (pro IP, gleitendes Zeitfenster) ───────────── */

  /** @type {Map<string, number[]>} */
  const authAttempts = new Map();

  function tooManyAttempts(req) {
    const ip = req.ip || req.socket?.remoteAddress || "unknown";
    const now = Date.now();
    const recent = (authAttempts.get(ip) || []).filter(
      (t) => now - t < RATE_WINDOW_MS
    );
    if (recent.length >= RATE_MAX_ATTEMPTS) {
      authAttempts.set(ip, recent);
      return true;
    }
    recent.push(now);
    authAttempts.set(ip, recent);
    return false;
  }

  /* ── Cookie- und Origin-Helfer (ohne Zusatzabhängigkeiten) ────────── */

  function parseCookies(req) {
    const header = req.headers.cookie;
    const out = {};
    if (!header) return out;
    for (const part of header.split(";")) {
      const idx = part.indexOf("=");
      if (idx === -1) continue;
      const key = part.slice(0, idx).trim();
      const val = part.slice(idx + 1).trim();
      if (key) {
        try {
          out[key] = decodeURIComponent(val);
        } catch {
          out[key] = val;
        }
      }
    }
    return out;
  }

  function sessionCookieHeader(req, sid) {
    const secure = isProduction || req.secure;
    return [
      `${SESSION_COOKIE}=${sid}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Strict",
      `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
      ...(secure ? ["Secure"] : []),
    ].join("; ");
  }

  function clearCookieHeader() {
    return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
  }

  function allowedOrigins() {
    const list = (process.env.ALLOWED_ORIGINS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (process.env.NODE_ENV !== "production") {
      list.push("http://localhost:5173", "http://127.0.0.1:5173");
    }
    return list;
  }

  // CSRF-Schutz: SameSite=Strict verhindert Cross-Site-Requests mit Cookie;
  // zusätzlich werden POST-Requests mit abweichender Origin abgewiesen.
  function sameOrigin(req) {
    const origin = req.headers.origin;
    if (!origin) return true; // Nicht-Browser-Clients (curl, Tests, Health-Checks)
    if (typeof origin !== "string") return false;
    if (allowedOrigins().includes(origin)) return true;
    try {
      return new URL(origin).host === req.headers.host;
    } catch {
      return false;
    }
  }

  /* ── Passwort-Prüfung (zeitkonstant) ──────────────────────────────── */

  function passwordMatches(candidate) {
    if (typeof candidate !== "string" || candidate.length === 0) return false;
    const a = Buffer.from(candidate);
    const b = Buffer.from(ADMIN_PASSWORD);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }

  /* ── Sitzungs-Middleware ───────────────────────────────────────────── */

  function requireSession(req, res, next) {
    const sid = parseCookies(req)[SESSION_COOKIE];
    const session = sid ? sessions.get(sid) : undefined;
    const now = Date.now();
    if (!session) {
      return res.status(401).json({
        error:
          "Keine gültige Sitzung. Bitte Seite neu laden und erneut anmelden.",
        code: "session-invalid",
      });
    }
    if (
      now >= session.expiresAt ||
      now - session.createdAt >= SESSION_ABSOLUTE_TTL_MS
    ) {
      sessions.delete(sid);
      return res.status(401).json({
        error: "Sitzung abgelaufen. Bitte Seite neu laden und erneut anmelden.",
        code: "session-invalid",
      });
    }
    // Gleitende Gültigkeit: jede aktive Nutzung verlängert die Sitzung.
    session.expiresAt = Math.min(
      now + SESSION_TTL_MS,
      session.createdAt + SESSION_ABSOLUTE_TTL_MS
    );
    req.sessionId = sid;
    req.session = session;
    res.setHeader("Set-Cookie", sessionCookieHeader(req, sid));
    next();
  }

  /* ── CSRF: Origin-Prüfung für alle Zustandsänderungen ──────────────── */

  app.use((req, res, next) => {
    if (req.method === "POST" && !sameOrigin(req)) {
      return res.status(403).json({ error: "Unerlaubte Anfragequelle." });
    }
    next();
  });

  /* ── Endpunkte ─────────────────────────────────────────────────────── */

  // Günstiger, unauthentifizierter Health-Check (Render healthCheckPath).
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/setup/verify", (req, res) => {
    if (tooManyAttempts(req)) {
      return res
        .status(429)
        .json({ error: "Zu viele Anmeldeversuche. Bitte später erneut versuchen." });
    }
    if (!passwordMatches(req.body?.password)) {
      return res.status(401).json({ error: "Ungültiges Admin-Passwort." });
    }
    res.json({ ok: true });
  });

  app.post("/api/setup", (req, res) => {
    if (tooManyAttempts(req)) {
      return res
        .status(429)
        .json({ error: "Zu viele Anmeldeversuche. Bitte später erneut versuchen." });
    }
    if (!passwordMatches(req.body?.password)) {
      return res.status(401).json({ error: "Ungültiges Admin-Passwort." });
    }
    const apiKey =
      typeof req.body?.apiKey === "string" ? req.body.apiKey.trim() : "";
    if (apiKey.length < 8) {
      return res.status(400).json({
        error: "Bitte einen gültigen API-Key eingeben (mindestens 8 Zeichen).",
      });
    }
    // Sitzungsrotation: eine alte Sitzung dieses Browsers wird verworfen.
    const oldSid = parseCookies(req)[SESSION_COOKIE];
    if (oldSid) sessions.delete(oldSid);
    const sid = createSession(apiKey);
    res.setHeader("Set-Cookie", sessionCookieHeader(req, sid));
    res.json({ ok: true });
  });

  app.post("/api/logout", (req, res) => {
    const sid = parseCookies(req)[SESSION_COOKIE];
    if (sid) sessions.delete(sid);
    res.setHeader("Set-Cookie", clearCookieHeader());
    res.json({ ok: true });
  });

  app.get("/api/config", requireSession, (req, res) => {
    res.json({
      hasApiKey: true,
      baseUrl: req.session.baseUrl,
      baseUrlIsPlaceholder: req.session.baseUrl.includes("example.com"),
      baseUrlLocked,
    });
  });

  app.post("/api/config", requireSession, (req, res) => {
    if (tooManyAttempts(req)) {
      return res
        .status(429)
        .json({ error: "Zu viele Versuche. Bitte später erneut versuchen." });
    }
    if (!passwordMatches(req.body?.password)) {
      return res.status(401).json({ error: "Ungültiges Admin-Passwort." });
    }
    const { apiKey, baseUrl } = req.body || {};
    if (apiKey !== undefined) {
      const trimmed = typeof apiKey === "string" ? apiKey.trim() : "";
      if (trimmed.length < 8) {
        return res.status(400).json({
          error: "Bitte einen gültigen API-Key eingeben (mindestens 8 Zeichen).",
        });
      }
      req.session.apiKey = trimmed;
    }
    if (baseUrl !== undefined) {
      if (baseUrlLocked) {
        return res.status(400).json({
          error:
            "In Produktion ist nur der konfigurierte FhGenie-Endpunkt erlaubt.",
        });
      }
      if (typeof baseUrl !== "string" || !/^https?:\/\//i.test(baseUrl)) {
        return res
          .status(400)
          .json({ error: "Ungültige Basis-URL." });
      }
      req.session.baseUrl = baseUrl.replace(/\/+$/, "");
    }
    res.json({
      ok: true,
      baseUrl: req.session.baseUrl,
      baseUrlIsPlaceholder: req.session.baseUrl.includes("example.com"),
      baseUrlLocked,
    });
  });

  // Testet den FhGenie-Endpunkt mit dem Token der aktuellen Sitzung.
  // Nur auf Anfrage des Nutzers — kein automatisches Polling (keine
  // unbeabsichtigten Abrechnungen).
  app.post("/api/test", requireSession, async (req, res) => {
    const { apiKey, baseUrl } = req.session;
    if (baseUrl.includes("example.com")) {
      return res.json({ ok: false, reason: "placeholder-url" });
    }
    try {
      const upstream = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: UPSTREAM_MODEL,
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 1,
          stream: false,
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (upstream.status === 401 || upstream.status === 403) {
        return res.json({ ok: false, reason: "token-invalid", status: upstream.status });
      }
      if (!upstream.ok) {
        return res.json({ ok: false, reason: "upstream-error", status: upstream.status });
      }
      await upstream.arrayBuffer();
      return res.json({ ok: true });
    } catch {
      return res.json({ ok: false, reason: "connection-failed" });
    }
  });

  app.post("/api/chat", requireSession, async (req, res) => {
    const { apiKey, baseUrl } = req.session;
    const { messages, model, temperature } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res
        .status(400)
        .json({ error: "Ungültige Anfrage: 'messages' fehlt oder ist leer." });
    }
    try {
      const upstream = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: typeof model === "string" && model ? model : UPSTREAM_MODEL,
          messages,
          temperature: typeof temperature === "number" ? temperature : 0.7,
          stream: false,
        }),
        signal: AbortSignal.timeout(120000),
      });
      if (upstream.status === 401 || upstream.status === 403) {
        return res
          .status(502)
          .json({ error: "API-Token ungültig oder abgelaufen.", code: "token-invalid" });
      }
      if (!upstream.ok) {
        return res
          .status(502)
          .json({ error: "Der FhGenie-Endpunkt hat die Anfrage abgelehnt." });
      }
      const data = await upstream.json();
      return res.json(data);
    } catch {
      return res
        .status(502)
        .json({ error: "Verbindung zum FhGenie-Endpunkt fehlgeschlagen." });
    }
  });

  // Unbekannte API-Routen sauber mit JSON beantworten.
  app.use("/api", (req, res) => {
    res.status(404).json({ error: "Unbekannter API-Endpunkt." });
  });

  /* ── Statisches Frontend + SPA-Fallback ────────────────────────────── */

  const clientDist = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../client/dist"
  );
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get("*", (req, res) => {
      res.sendFile(resolve(clientDist, "index.html"));
    });
  }

  return app;
}
