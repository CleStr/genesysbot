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
const CHAT_RATE_WINDOW_MS =
  Number.parseInt(process.env.CHAT_RATE_WINDOW_MS || "", 10) || 60 * 1000;
const CHAT_RATE_MAX_REQUESTS =
  Number.parseInt(process.env.CHAT_RATE_MAX_REQUESTS || "", 10) || 20;
const CHAT_MAX_CONCURRENT =
  Number.parseInt(process.env.CHAT_MAX_CONCURRENT || "", 10) || 3;
const CHAT_MAX_MESSAGES =
  Number.parseInt(process.env.CHAT_MAX_MESSAGES || "", 10) || 64;
const CHAT_MAX_MESSAGE_CHARS =
  Number.parseInt(process.env.CHAT_MAX_MESSAGE_CHARS || "", 10) || 8000;
const CHAT_MAX_TOKENS_LIMIT =
  Number.parseInt(process.env.CHAT_MAX_TOKENS_LIMIT || "", 10) || 2048;
const UPSTREAM_MAX_RESPONSE_BYTES =
  Number.parseInt(process.env.UPSTREAM_MAX_RESPONSE_BYTES || "", 10) ||
  512 * 1024;
const UPSTREAM_MODEL = "nvidia/GLM-5.2-NVFP4";

export function createApp() {
  // Fail-closed: Ohne ADMIN_PASSWORD startet der Server grundsätzlich nicht.
  // Einzige Ausnahme: explizites Opt-in für die lokale Entwicklung — dann
  // lauscht index.js ausschließlich auf 127.0.0.1.
  if (!process.env.ADMIN_PASSWORD) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ADMIN_PASSWORD must be set in production.");
    }
    if (process.env.ALLOW_INSECURE_LOCAL_DEV !== "true") {
      throw new Error(
        "ADMIN_PASSWORD must be set. For local development set ALLOW_INSECURE_LOCAL_DEV=true (server binds to 127.0.0.1 only)."
      );
    }
  }
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "local-development-only";
  const DEFAULT_BASE_URL = (
    process.env.FHG_BASE_URL || "https://fhgenie.fraunhofer.de/v1"
  ).replace(/\/+$/, "");
  const isProduction = process.env.NODE_ENV === "production";
  const baseUrlLocked = isProduction;

  const app = express();
  // Proxy-Vertrauen nur nach expliziter Konfiguration (z. B. Render). Ohne
  // TRUST_PROXY bleibt req.ip die Socket-Adresse; ein rotierender
  // X-Forwarded-For-Header kann dann keine Rate-Limits umgehen.
  const trustProxy =
    process.env.TRUST_PROXY === "true" || process.env.TRUST_PROXY === "1";
  app.set("trust proxy", trustProxy ? 1 : false);
  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));

  // Grundlegende Security-Header
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self'",
        "font-src 'self'",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
      ].join("; ")
    );
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
    );
    if (isProduction) {
      res.setHeader(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains"
      );
    }
    next();
  });

  /* ── Sitzungs-Store (nur im Speicher, nie persistiert) ─────────────── */

  /** @type {Map<string, {apiKey: string, baseUrl: string, createdAt: number, expiresAt: number}>} */
  const sessions = new Map();

  /* ── Missbrauchsschutz für den LLM-Proxy (pro Sitzung) ────────────── */

  /** @type {Map<string, number[]>} */
  const chatRequests = new Map();
  /** @type {Map<string, number>} */
  const chatInFlight = new Map();

  const purgeTimer = setInterval(() => {
    const now = Date.now();
    for (const [id, s] of sessions) {
      if (now >= s.expiresAt || now - s.createdAt >= SESSION_ABSOLUTE_TTL_MS) {
        sessions.delete(id);
      }
    }
    const chatCutoff = now - CHAT_RATE_WINDOW_MS;
    for (const [id, times] of chatRequests) {
      const recent = times.filter((t) => t >= chatCutoff);
      if (recent.length > 0) chatRequests.set(id, recent);
      else chatRequests.delete(id);
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
  // Zählt ausschließlich fehlgeschlagene Versuche; ein erfolgreicher Login
  // setzt den Zähler zurück. Die Map ist größenbegrenzt und wird beim
  // Eintragen von abgelaufenen Einträgen befreit.

  /** @type {Map<string, number[]>} */
  const authAttempts = new Map();
  const AUTH_TRACKER_MAX_IPS = 10000;

  function clientKey(req) {
    return req.ip || req.socket?.remoteAddress || "unknown";
  }

  function recordFailedAttempt(ip) {
    const now = Date.now();
    const recent = (authAttempts.get(ip) || []).filter(
      (t) => now - t < RATE_WINDOW_MS
    );
    recent.push(now);
    authAttempts.set(ip, recent);
    if (authAttempts.size > AUTH_TRACKER_MAX_IPS) {
      const cutoff = now - RATE_WINDOW_MS;
      for (const [key, times] of authAttempts) {
        if (!times.some((t) => t >= cutoff)) authAttempts.delete(key);
      }
      let excess = authAttempts.size - AUTH_TRACKER_MAX_IPS;
      if (excess > 0) {
        for (const key of authAttempts.keys()) {
          authAttempts.delete(key);
          if (--excess <= 0) break;
        }
      }
    }
  }

  function tooManyAttempts(req) {
    const ip = clientKey(req);
    const now = Date.now();
    const recent = (authAttempts.get(ip) || []).filter(
      (t) => now - t < RATE_WINDOW_MS
    );
    authAttempts.set(ip, recent);
    return recent.length >= RATE_MAX_ATTEMPTS;
  }

  function clearFailedAttempts(req) {
    authAttempts.delete(clientKey(req));
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

  /* ── SSRF-Schutz für nutzergelieferte Basis-URLs ──────────────────── */
  // Gilt ausschließlich für URLs, die per POST /api/config gesetzt werden.
  // Die über FHG_BASE_URL konfigurierte Umgebung gilt als vertrauenswürdig.

  function isPrivateHost(hostname) {
    if (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal") ||
      hostname.endsWith(".home.arpa")
    ) {
      return true;
    }
    const v4 = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (v4) {
      const oct = [Number(v4[1]), Number(v4[2]), Number(v4[3]), Number(v4[4])];
      if (oct.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
      const [a, b] = oct;
      return (
        a === 0 ||
        a === 10 ||
        a === 127 ||
        (a === 100 && b >= 64 && b <= 127) ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        (a === 198 && (b === 18 || b === 19)) ||
        a >= 224
      );
    }
    if (hostname.startsWith("[") && hostname.endsWith("]")) {
      const v6 = hostname.slice(1, -1).toLowerCase();
      return (
        v6 === "::1" ||
        v6 === "::" ||
        v6.startsWith("fe80") ||
        v6.startsWith("fc") ||
        v6.startsWith("fd")
      );
    }
    return false;
  }

  function isAcceptableBaseUrl(raw) {
    if (typeof raw !== "string") return false;
    let parsed;
    try {
      parsed = new URL(raw);
    } catch {
      return false;
    }
    if (parsed.protocol !== "https:") return false;
    if (parsed.username || parsed.password) return false;
    if (isPrivateHost(parsed.hostname)) return false;
    return true;
  }

  /* ── Rate-/Concurrency-Limits für den LLM-Proxy (pro Sitzung) ─────── */

  function chatRateLimited(sessionId) {
    const now = Date.now();
    const recent = (chatRequests.get(sessionId) || []).filter(
      (t) => now - t < CHAT_RATE_WINDOW_MS
    );
    if (recent.length >= CHAT_RATE_MAX_REQUESTS) {
      chatRequests.set(sessionId, recent);
      return true;
    }
    recent.push(now);
    chatRequests.set(sessionId, recent);
    return false;
  }

  function chatConcurrencyLimited(sessionId) {
    const n = chatInFlight.get(sessionId) || 0;
    if (n >= CHAT_MAX_CONCURRENT) return true;
    chatInFlight.set(sessionId, n + 1);
    return false;
  }

  function chatDone(sessionId) {
    const n = chatInFlight.get(sessionId) || 0;
    if (n <= 1) chatInFlight.delete(sessionId);
    else chatInFlight.set(sessionId, n - 1);
  }

  function retryAfterSeconds() {
    return Math.max(1, Math.ceil(CHAT_RATE_WINDOW_MS / 1000));
  }

  /* ── Validierung der Chat-Anfragen ────────────────────────────────── */

  function validateChatPayload(body) {
    const { messages, model, temperature, max_tokens: maxTokens } = body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return "Ungültige Anfrage: 'messages' fehlt oder ist leer.";
    }
    if (messages.length > CHAT_MAX_MESSAGES) {
      return `Zu viele Nachrichten im Verlauf (maximal ${CHAT_MAX_MESSAGES}).`;
    }
    for (const m of messages) {
      if (!m || typeof m !== "object" || Array.isArray(m)) {
        return "Ungültige Nachricht im Verlauf.";
      }
      if (m.role !== "system" && m.role !== "user" && m.role !== "assistant") {
        return "Ungültige Rolle im Nachrichtenverlauf.";
      }
      if (typeof m.content !== "string" || m.content.length === 0) {
        return "Ungültiger Nachrichteninhalt.";
      }
      if (m.content.length > CHAT_MAX_MESSAGE_CHARS) {
        return `Nachricht zu lang (maximal ${CHAT_MAX_MESSAGE_CHARS} Zeichen).`;
      }
    }
    if (model !== undefined && model !== UPSTREAM_MODEL) {
      return "Modell nicht erlaubt.";
    }
    if (
      temperature !== undefined &&
      (typeof temperature !== "number" ||
        !Number.isFinite(temperature) ||
        temperature < 0 ||
        temperature > 2)
    ) {
      return "Ungültiger Temperaturwert (0 bis 2).";
    }
    if (
      maxTokens !== undefined &&
      (typeof maxTokens !== "number" ||
        !Number.isInteger(maxTokens) ||
        maxTokens < 1 ||
        maxTokens > CHAT_MAX_TOKENS_LIMIT)
    ) {
      return `Ungültiger Wert für max_tokens (1 bis ${CHAT_MAX_TOKENS_LIMIT}).`;
    }
    return null;
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
      recordFailedAttempt(clientKey(req));
      return res.status(401).json({ error: "Ungültiges Admin-Passwort." });
    }
    clearFailedAttempts(req);
    res.json({ ok: true });
  });

  app.post("/api/setup", (req, res) => {
    if (tooManyAttempts(req)) {
      return res
        .status(429)
        .json({ error: "Zu viele Anmeldeversuche. Bitte später erneut versuchen." });
    }
    if (!passwordMatches(req.body?.password)) {
      recordFailedAttempt(clientKey(req));
      return res.status(401).json({ error: "Ungültiges Admin-Passwort." });
    }
    clearFailedAttempts(req);
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
      recordFailedAttempt(clientKey(req));
      return res.status(401).json({ error: "Ungültiges Admin-Passwort." });
    }
    clearFailedAttempts(req);
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
      if (!isAcceptableBaseUrl(baseUrl)) {
        return res.status(400).json({
          error:
            "Ungültige Basis-URL: nur öffentliche HTTPS-Endpunkte sind erlaubt.",
        });
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
    if (chatRateLimited(req.sessionId)) {
      res.setHeader("Retry-After", retryAfterSeconds());
      return res
        .status(429)
        .json({ error: "Zu viele Anfragen. Bitte kurz warten." });
    }
    if (chatConcurrencyLimited(req.sessionId)) {
      res.setHeader("Retry-After", "5");
      return res
        .status(503)
        .json({ error: "Zu viele gleichzeitige Anfragen. Bitte kurz warten." });
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
    } finally {
      chatDone(req.sessionId);
    }
  });

  app.post("/api/chat", requireSession, async (req, res) => {
    const { apiKey, baseUrl } = req.session;
    const validationError = validateChatPayload(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }
    if (chatRateLimited(req.sessionId)) {
      res.setHeader("Retry-After", retryAfterSeconds());
      return res
        .status(429)
        .json({ error: "Zu viele Anfragen. Bitte kurz warten." });
    }
    if (chatConcurrencyLimited(req.sessionId)) {
      res.setHeader("Retry-After", "5");
      return res
        .status(503)
        .json({ error: "Zu viele gleichzeitige Anfragen. Bitte kurz warten." });
    }
    const { messages, model, temperature, max_tokens: maxTokens } = req.body;
    try {
      const upstream = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model === UPSTREAM_MODEL ? model : UPSTREAM_MODEL,
          messages,
          temperature: typeof temperature === "number" ? temperature : 0.7,
          ...(typeof maxTokens === "number" ? { max_tokens: maxTokens } : {}),
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
      const contentLength = Number(upstream.headers.get("content-length") || "");
      if (
        Number.isFinite(contentLength) &&
        contentLength > UPSTREAM_MAX_RESPONSE_BYTES
      ) {
        return res
          .status(502)
          .json({ error: "Antwort des FhGenie-Endpunkts ist zu groß." });
      }
      const text = await upstream.text();
      if (text.length > UPSTREAM_MAX_RESPONSE_BYTES) {
        return res
          .status(502)
          .json({ error: "Antwort des FhGenie-Endpunkts ist zu groß." });
      }
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        return res
          .status(502)
          .json({ error: "Ungültige Antwort des FhGenie-Endpunkts." });
      }
      return res.json(data);
    } catch {
      return res
        .status(502)
        .json({ error: "Verbindung zum FhGenie-Endpunkt fehlgeschlagen." });
    } finally {
      chatDone(req.sessionId);
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
