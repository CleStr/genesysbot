/* Sicherheits-Regressionstests (Findings GSB-01 bis GSB-06 des
 * Sicherheitsberichts). Ergänzt app.test.js um die 2026 umgesetzten
 * Härtungen:
 *  - GSB-01: Fail-closed ohne ADMIN_PASSWORD; SSRF-Schutz für baseUrl
 *  - GSB-02: X-Forwarded-For-Spoofing ohne TRUST_PROXY; Login-Reset
 *  - GSB-03: Chat-Rate-Limit, Concurrency-Cap, Payload-Validierung,
 *            Antwortgrößen-Deckel, JSON-Parsing-Fallback
 *  - GSB-06: CSP, Permissions-Policy, HSTS (nur Produktion)
 *
 * Wie app.test.js: lokaler Mock-Upstream (node:http), keine echten
 * FhGenie-Tokens, keine externen API-Calls.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import request from "supertest";
import http from "node:http";

const PASSWORD = "test-admin-password";
const TOKEN_A = "token-AAAA-nur-nutzer-A-1234567890";
const UPSTREAM_MODEL = "nvidia/GLM-5.2-NVFP4";

/* ── Mock-Upstream mit verstellbarem Verhalten ───────────────────────── */

let upstreamServer;
let upstreamPort;
let upstreamRequests = [];
let upstreamMode = "ok"; // ok | slow | huge | invalid-json

function resetUpstream(mode = "ok") {
  upstreamRequests = [];
  upstreamMode = mode;
}

beforeAll(async () => {
  upstreamServer = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      upstreamRequests.push({
        url: req.url,
        auth: req.headers.authorization || "",
        body,
      });
      if (upstreamMode === "slow") {
        setTimeout(() => {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              choices: [{ message: { role: "assistant", content: "Mock-Antwort." } }],
            })
          );
        }, 400);
        return;
      }
      if (upstreamMode === "huge") {
        const payload = JSON.stringify({
          choices: [{ message: { role: "assistant", content: "x".repeat(600 * 1024) } }],
        });
        res.writeHead(200, {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        });
        res.end(payload);
        return;
      }
      if (upstreamMode === "invalid-json") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end("<p>kein json</p>");
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          choices: [{ message: { role: "assistant", content: "Mock-Antwort." } }],
        })
      );
    });
  });
  await new Promise((r) => upstreamServer.listen(0, "127.0.0.1", r));
  upstreamPort = upstreamServer.address().port;
});

afterAll(async () => {
  await new Promise((r) => upstreamServer.close(r));
});

/* ── App-Factory (Env pro Test, wie app.test.js) ─────────────────────── */

const createdApps = [];

async function makeApp(env = {}) {
  vi.resetModules();
  const saved = {};
  for (const k of Object.keys(env)) saved[k] = process.env[k];
  Object.assign(process.env, env);
  try {
    const mod = await import("./app.js");
    const app = mod.createApp();
    createdApps.push(app);
    return app;
  } finally {
    for (const k of Object.keys(env)) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}

afterEach(() => {
  for (const app of createdApps.splice(0)) {
    app.locals.stopPurgeTimer?.();
  }
  resetUpstream();
});

/* ── Helfer ──────────────────────────────────────────────────────────── */

function env(extra = {}) {
  return {
    ADMIN_PASSWORD: PASSWORD,
    FHG_BASE_URL: `http://127.0.0.1:${upstreamPort}`,
    ...extra,
  };
}

function cookieFrom(res) {
  const set = res.headers["set-cookie"];
  if (!set || set.length === 0) return null;
  return set[0].split(";")[0];
}

async function setupUser(app, token, password = PASSWORD) {
  const res = await request(app)
    .post("/api/setup")
    .send({ password, apiKey: token });
  expect(res.status).toBe(200);
  const cookie = cookieFrom(res);
  expect(cookie).toBeTruthy();
  return cookie;
}

function chat(app, cookie, body) {
  const payload = body ?? { messages: [{ role: "user", content: "Hallo" }] };
  return request(app).post("/api/chat").set("Cookie", cookie).send(payload);
}

/* ── GSB-01: Fail-closed & SSRF-Schutz ───────────────────────────────── */

describe("GSB-01: Fail-closed & SSRF-Schutz", () => {
  it("startet nicht ohne ADMIN_PASSWORD (auch außerhalb der Produktion)", async () => {
    await expect(makeApp(env({ ADMIN_PASSWORD: "" }))).rejects.toThrow(
      /ADMIN_PASSWORD/
    );
  });

  it("startet mit ALLOW_INSECURE_LOCAL_DEV=true und Fallback-Passwort", async () => {
    const app = await makeApp(
      env({ ADMIN_PASSWORD: "", ALLOW_INSECURE_LOCAL_DEV: "true" })
    );
    const cookie = await setupUser(app, TOKEN_A, "local-development-only");
    const res = await chat(app, cookie);
    expect(res.status).toBe(200);
  });

  it("ALLOW_INSECURE_LOCAL_DEV gilt nicht in der Produktion", async () => {
    await expect(
      makeApp(
        env({
          ADMIN_PASSWORD: "",
          ALLOW_INSECURE_LOCAL_DEV: "true",
          NODE_ENV: "production",
        })
      )
    ).rejects.toThrow(/ADMIN_PASSWORD/);
  });

  it("lehnt unsichere baseUrl-Werte ab (http, private Hosts, Credentials)", async () => {
    const app = await makeApp(env());
    const cookie = await setupUser(app, TOKEN_A);
    const badUrls = [
      "http://example.com/v1",
      "https://127.0.0.1/v1",
      "https://localhost/v1",
      "https://192.168.1.5/v1",
      "https://10.0.0.1:8443/v1",
      "https://[::1]/v1",
      "https://user:pass@example.com/v1",
      "not-a-url",
    ];
    for (const baseUrl of badUrls) {
      const res = await request(app)
        .post("/api/config")
        .set("Cookie", cookie)
        .send({ password: PASSWORD, baseUrl });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Basis-URL");
    }
  });

  it("akzeptiert öffentliche HTTPS-URLs außerhalb der Produktion", async () => {
    const app = await makeApp(env());
    const cookie = await setupUser(app, TOKEN_A);
    const res = await request(app)
      .post("/api/config")
      .set("Cookie", cookie)
      .send({ password: PASSWORD, baseUrl: "https://public.example.com/v1" });
    expect(res.status).toBe(200);
    expect(res.body.baseUrl).toBe("https://public.example.com/v1");
  });
});

/* ── GSB-02: Proxy-Vertrauen & Brute-Force-Zähler ─────────────────────── */

describe("GSB-02: Proxy-Vertrauen & Brute-Force-Zähler", () => {
  it("rotierender X-Forwarded-For umgeht den Limiter nicht (ohne TRUST_PROXY)", async () => {
    const app = await makeApp(
      env({ RATE_MAX_ATTEMPTS: "3", RATE_WINDOW_MS: "60000" })
    );
    for (let i = 0; i < 3; i++) {
      const res = await request(app)
        .post("/api/setup/verify")
        .set("X-Forwarded-For", `9.9.9.${i}`)
        .send({ password: "falsch" });
      expect(res.status).toBe(401);
    }
    const blocked = await request(app)
      .post("/api/setup/verify")
      .set("X-Forwarded-For", "9.9.9.99")
      .send({ password: "falsch" });
    expect(blocked.status).toBe(429);
  });

  it("erfolgreicher Login setzt den Fehlversuchs-Zähler zurück", async () => {
    const app = await makeApp(
      env({ RATE_MAX_ATTEMPTS: "3", RATE_WINDOW_MS: "60000" })
    );
    for (let i = 0; i < 2; i++) {
      const res = await request(app)
        .post("/api/setup/verify")
        .send({ password: "falsch" });
      expect(res.status).toBe(401);
    }
    const ok = await request(app)
      .post("/api/setup/verify")
      .send({ password: PASSWORD });
    expect(ok.status).toBe(200);
    // Ohne Reset stünde der Zähler bereits auf 3 und der nächste Versuch
    // müsste 429 liefern. Mit Reset sind wieder 3 Fehlversuche frei.
    for (let i = 0; i < 3; i++) {
      const res = await request(app)
        .post("/api/setup/verify")
        .send({ password: "falsch" });
      expect(res.status).toBe(401);
    }
    const blocked = await request(app)
      .post("/api/setup/verify")
      .send({ password: "falsch" });
    expect(blocked.status).toBe(429);
  });

  it("mit TRUST_PROXY=1 wird X-Forwarded-For vertraut (Render-Szenario)", async () => {
    const app = await makeApp(
      env({ RATE_MAX_ATTEMPTS: "3", RATE_WINDOW_MS: "60000", TRUST_PROXY: "1" })
    );
    for (let i = 0; i < 4; i++) {
      const res = await request(app)
        .post("/api/setup/verify")
        .set("X-Forwarded-For", `9.9.9.${i}`)
        .send({ password: "falsch" });
      // Jede XFF-Adresse hat einen eigenen Zähler → nie blockiert
      expect(res.status).toBe(401);
    }
  });
});

/* ── GSB-03: Chat-Limits & Validierung ───────────────────────────────── */

describe("GSB-03: Chat-Limits & Validierung", () => {
  it("Chat-Rate-Limit: nach CHAT_RATE_MAX_REQUESTS folgt 429 mit Retry-After", async () => {
    const app = await makeApp(env({ CHAT_RATE_MAX_REQUESTS: "2" }));
    const cookie = await setupUser(app, TOKEN_A);
    expect((await chat(app, cookie)).status).toBe(200);
    expect((await chat(app, cookie)).status).toBe(200);
    const blocked = await chat(app, cookie);
    expect(blocked.status).toBe(429);
    expect(blocked.headers["retry-after"]).toBeTruthy();
    expect(blocked.body.error).toContain("Zu viele");
  });

  it("/api/test unterliegt demselben Rate-Limit", async () => {
    const app = await makeApp(env({ CHAT_RATE_MAX_REQUESTS: "2" }));
    const cookie = await setupUser(app, TOKEN_A);
    const first = await request(app).post("/api/test").set("Cookie", cookie);
    const second = await request(app).post("/api/test").set("Cookie", cookie);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const blocked = await request(app).post("/api/test").set("Cookie", cookie);
    expect(blocked.status).toBe(429);
  });

  it("Concurrency-Cap: parallele Anfragen über CHAT_MAX_CONCURRENT → 503", async () => {
    const app = await makeApp(env({ CHAT_MAX_CONCURRENT: "1" }));
    const cookie = await setupUser(app, TOKEN_A);
    resetUpstream("slow");
    const first = chat(app, cookie);
    const firstPromise = first.then((res) => res); // sofort absenden
    await new Promise((r) => setTimeout(r, 100));
    const second = await chat(app, cookie);
    expect(second.status).toBe(503);
    expect(second.headers["retry-after"]).toBe("5");
    const firstRes = await firstPromise;
    expect(firstRes.status).toBe(200);
  });

  it("validiert Rollen, Anzahl, Länge und Inhalt der Nachrichten", async () => {
    const app = await makeApp(env());
    const cookie = await setupUser(app, TOKEN_A);

    const badRole = await chat(app, cookie, {
      messages: [{ role: "admin", content: "hi" }],
    });
    expect(badRole.status).toBe(400);

    const tooMany = await chat(app, cookie, {
      messages: Array.from({ length: 65 }, () => ({ role: "user", content: "hi" })),
    });
    expect(tooMany.status).toBe(400);
    expect(tooMany.body.error).toContain("Nachrichten");

    const tooLong = await chat(app, cookie, {
      messages: [{ role: "user", content: "x".repeat(8001) }],
    });
    expect(tooLong.status).toBe(400);

    const empty = await chat(app, cookie, {
      messages: [{ role: "user", content: "" }],
    });
    expect(empty.status).toBe(400);

    const noMessages = await chat(app, cookie, { messages: "kein array" });
    expect(noMessages.status).toBe(400);
  });

  it("erlaubt nur das konfigurierte Modell und gültige Temperatur", async () => {
    const app = await makeApp(env());
    const cookie = await setupUser(app, TOKEN_A);

    const badModel = await chat(app, cookie, {
      messages: [{ role: "user", content: "hi" }],
      model: "gpt-4",
    });
    expect(badModel.status).toBe(400);
    expect(badModel.body.error).toContain("Modell");

    const badTemp = await chat(app, cookie, {
      messages: [{ role: "user", content: "hi" }],
      temperature: 5,
    });
    expect(badTemp.status).toBe(400);
  });

  it("begrenzt max_tokens auf 1..2048 und reicht den Wert durch", async () => {
    const app = await makeApp(env());
    const cookie = await setupUser(app, TOKEN_A);
    const msg = [{ role: "user", content: "hi" }];

    expect((await chat(app, cookie, { messages: msg, max_tokens: 0 })).status).toBe(400);
    expect((await chat(app, cookie, { messages: msg, max_tokens: 5000 })).status).toBe(400);

    const ok = await chat(app, cookie, { messages: msg, max_tokens: 400 });
    expect(ok.status).toBe(200);
    const sent = JSON.parse(upstreamRequests[upstreamRequests.length - 1].body);
    expect(sent.max_tokens).toBe(400);
    expect(sent.model).toBe(UPSTREAM_MODEL);
  });

  it("lehnt übergroße Upstream-Antworten ab (Content-Length)", async () => {
    const app = await makeApp(env());
    const cookie = await setupUser(app, TOKEN_A);
    resetUpstream("huge");
    const res = await chat(app, cookie);
    expect(res.status).toBe(502);
    expect(res.body.error).toContain("zu groß");
  });

  it("lehnt nicht-JSON-Upstream-Antworten mit 502 ab", async () => {
    const app = await makeApp(env());
    const cookie = await setupUser(app, TOKEN_A);
    resetUpstream("invalid-json");
    const res = await chat(app, cookie);
    expect(res.status).toBe(502);
    expect(res.body.error).toContain("Ungültige Antwort");
  });
});

/* ── GSB-06: Security-Header ─────────────────────────────────────────── */

describe("GSB-06: Security-Header", () => {
  it("setzt CSP und Permissions-Policy; HSTS nur in Produktion", async () => {
    const devApp = await makeApp(env());
    const devRes = await request(devApp).get("/api/health");
    expect(devRes.headers["content-security-policy"]).toContain(
      "default-src 'self'"
    );
    expect(devRes.headers["content-security-policy"]).toContain(
      "frame-ancestors 'none'"
    );
    expect(devRes.headers["permissions-policy"]).toContain("camera=()");
    expect(devRes.headers["strict-transport-security"]).toBeUndefined();

    const prodApp = await makeApp(env({ NODE_ENV: "production" }));
    const prodRes = await request(prodApp).get("/api/health");
    expect(prodRes.headers["strict-transport-security"]).toContain(
      "max-age=31536000"
    );
  });
});
