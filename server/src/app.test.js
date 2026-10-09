/* P0-Integrationstests: sitzungsbasierte Token-Isolation.
 *
 * Testet die 12 Pflichtszenarien aus der Spezifikation mit einem lokalen
 * Mock-Upstream (node:http) — es werden KEINE produktiven FhGenie-Tokens
 * verwendet und keine echten API-Calls ausgeführt.
 *
 * Szenarien:
 *  1. Nutzer A mit tokenA kann chatten (Upstream sieht tokenA)
 *  2. Anfrage ohne Sitzung → 401
 *  3. Nutzer B mit tokenB → Upstream sieht nur tokenB
 *  4. B liest nie tokenA (keine Antwort enthält tokenA)
 *  5. A und B parallel → getrennte Tokens
 *  6. Logout/Reload → Neu-Anmeldung nötig
 *  7. API ohne Auth → verweigert
 *  8. Manipulierte Session-ID → kein Zugriff
 *  9. Sitzungsablauf (TTL) → 401
 * 10. Kein Token in Antworten oder Cookies
 * 11. Brute-Force-Schutz (429 nach 10 Versuchen)
 * 12. CSRF: fremde Origin → 403; Produktion: ADMIN_PASSWORD Pflicht,
 *     baseUrl gesperrt
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import request from "supertest";
import http from "node:http";
import crypto from "node:crypto";

const PASSWORD = "test-admin-password";
const TOKEN_A = "token-AAAA-nur-nutzer-A-1234567890";
const TOKEN_B = "token-BBBB-nur-nutzer-B-0987654321";

/* ── Mock-Upstream (statt echtem FhGenie) ────────────────────────────── */

let upstreamServer;
let upstreamPort;
let upstreamRequests = [];
let upstreamStatus = 0; // 0 = Erfolg; sonst HTTP-Status, den der Mock liefert

function resetUpstream(status = 0) {
  upstreamRequests = [];
  upstreamStatus = status;
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
      const status = upstreamStatus || 200;
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(
        status === 200
          ? JSON.stringify({
              choices: [{ message: { role: "assistant", content: "Mock-Antwort." } }],
            })
          : JSON.stringify({ error: "mock-error" })
      );
    });
  });
  await new Promise((r) => upstreamServer.listen(0, "127.0.0.1", r));
  upstreamPort = upstreamServer.address().port;
});

afterAll(async () => {
  await new Promise((r) => upstreamServer.close(r));
});

/* ── App-Factory mit frischem Modul (Env pro Test steuerbar) ─────────── */

const createdApps = [];

async function makeApp(env = {}) {
  vi.resetModules();
  const saved = {};
  for (const k of Object.keys(env)) saved[k] = process.env[k];
  Object.assign(process.env, env);
  try {
    const mod = await import("./app.js");
    // createApp() liest die Env-Variablen zum Aufrufzeitpunkt — daher
    // innerhalb des gesetzten Env-Kontexts instanziieren.
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

function cookieFrom(res) {
  const set = res.headers["set-cookie"];
  if (!set || set.length === 0) return null;
  return set[0].split(";")[0];
}

async function setupUser(app, token) {
  const res = await request(app)
    .post("/api/setup")
    .send({ password: PASSWORD, apiKey: token });
  expect(res.status).toBe(200);
  const cookie = cookieFrom(res);
  expect(cookie).toBeTruthy();
  return cookie;
}

async function chat(app, cookie, messages = [{ role: "user", content: "Hallo" }]) {
  return request(app).post("/api/chat").set("Cookie", cookie).send({ messages });
}

/* ── Tests ───────────────────────────────────────────────────────────── */

describe("P0: Sitzungs- und Token-Isolation", () => {
  it("1: Nutzer A mit tokenA kann chatten; Upstream sieht tokenA", async () => {
    const app = await makeApp({
      ADMIN_PASSWORD: PASSWORD,
      FHG_BASE_URL: `http://127.0.0.1:${upstreamPort}`,
    });
    const cookieA = await setupUser(app, TOKEN_A);
    const res = await chat(app, cookieA);
    expect(res.status).toBe(200);
    expect(res.body.choices[0].message.content).toBe("Mock-Antwort.");
    expect(upstreamRequests.length).toBe(1);
    expect(upstreamRequests[0].auth).toBe(`Bearer ${TOKEN_A}`);
  });

  it("2 + 7: Anfrage ohne Sitzung wird verweigert (401)", async () => {
    const app = await makeApp({
      ADMIN_PASSWORD: PASSWORD,
      FHG_BASE_URL: `http://127.0.0.1:${upstreamPort}`,
    });
    const res = await chat(app, "");
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("session-invalid");
    expect(upstreamRequests.length).toBe(0);

    const cfg = await request(app).get("/api/config");
    expect(cfg.status).toBe(401);
  });

  it("3: Nutzer B mit tokenB nutzt nur tokenB", async () => {
    const app = await makeApp({
      ADMIN_PASSWORD: PASSWORD,
      FHG_BASE_URL: `http://127.0.0.1:${upstreamPort}`,
    });
    const cookieA = await setupUser(app, TOKEN_A);
    const cookieB = await setupUser(app, TOKEN_B);
    expect(cookieA).not.toBe(cookieB);

    await chat(app, cookieA);
    await chat(app, cookieB);
    await chat(app, cookieB);

    const auths = upstreamRequests.map((r) => r.auth);
    expect(auths[0]).toBe(`Bearer ${TOKEN_A}`);
    expect(auths[1]).toBe(`Bearer ${TOKEN_B}`);
    expect(auths[2]).toBe(`Bearer ${TOKEN_B}`);
    expect(auths.filter((a) => a === `Bearer ${TOKEN_B}`).length).toBe(2);
  });

  it("4 + 10: Keine Antwort enthält einen fremden (oder eigenen) Token", async () => {
    const app = await makeApp({
      ADMIN_PASSWORD: PASSWORD,
      FHG_BASE_URL: `http://127.0.0.1:${upstreamPort}`,
    });
    const cookieA = await setupUser(app, TOKEN_A);
    const cookieB = await setupUser(app, TOKEN_B);

    const responses = [
      await chat(app, cookieB),
      await request(app).get("/api/config").set("Cookie", cookieB),
      await request(app).post("/api/test").set("Cookie", cookieB),
      await request(app).get("/api/health"),
    ];

    for (const res of responses) {
      const raw = JSON.stringify(res.body) + JSON.stringify(res.headers);
      expect(raw).not.toContain(TOKEN_A);
      expect(raw).not.toContain(TOKEN_B);
    }

    // Cookie enthält nur die opake Session-ID, nie den Token
    expect(cookieB.startsWith("gsb_session=")).toBe(true);
    expect(cookieB).not.toContain(TOKEN_B);
  });

  it("5: A und B parallel bleiben getrennt (interleaved)", async () => {
    const app = await makeApp({
      ADMIN_PASSWORD: PASSWORD,
      FHG_BASE_URL: `http://127.0.0.1:${upstreamPort}`,
    });
    const cookieA = await setupUser(app, TOKEN_A);
    const cookieB = await setupUser(app, TOKEN_B);

    // Abwechselnd A, B, A, B, A, B — jede Anfrage muss das eigene Token nutzen
    for (let i = 0; i < 3; i++) {
      const resA = await chat(app, cookieA);
      const resB = await chat(app, cookieB);
      expect(resA.status).toBe(200);
      expect(resB.status).toBe(200);
    }
    const auths = upstreamRequests.map((r) => r.auth);
    expect(auths).toHaveLength(6);
    for (let i = 0; i < 6; i++) {
      const expected = i % 2 === 0 ? TOKEN_A : TOKEN_B;
      expect(auths[i]).toBe(`Bearer ${expected}`);
    }
  });

  it("6: Logout beendet die Sitzung — Neu-Anmeldung erforderlich", async () => {
    const app = await makeApp({
      ADMIN_PASSWORD: PASSWORD,
      FHG_BASE_URL: `http://127.0.0.1:${upstreamPort}`,
    });
    const cookieA = await setupUser(app, TOKEN_A);

    const out = await request(app).post("/api/logout").set("Cookie", cookieA);
    expect(out.status).toBe(200);

    // Alte Sitzung ist ungültig → UI zeigt Setup-Screen (getConfig → 401)
    const cfg = await request(app).get("/api/config").set("Cookie", cookieA);
    expect(cfg.status).toBe(401);
    const res = await chat(app, cookieA);
    expect(res.status).toBe(401);
  });

  it("6b: Setup rotiert die Sitzung — alte Session-ID wird verworfen", async () => {
    const app = await makeApp({
      ADMIN_PASSWORD: PASSWORD,
      FHG_BASE_URL: `http://127.0.0.1:${upstreamPort}`,
    });
    const cookieOld = await setupUser(app, TOKEN_A);
    // Neu-Anmeldung: der Browser schickt seinen (alten) Session-Cookie mit —
    // nur dann verwirft der Server die alte Sitzung.
    const resNew = await request(app)
      .post("/api/setup")
      .set("Cookie", cookieOld)
      .send({ password: PASSWORD, apiKey: TOKEN_B });
    expect(resNew.status).toBe(200);
    const cookieNew = cookieFrom(resNew);
    expect(cookieNew).toBeTruthy();
    expect(cookieNew).not.toBe(cookieOld);

    // Die alte Sitzung wurde bei der Neu-Anmeldung verworfen
    const resOld = await chat(app, cookieOld);
    expect(resOld.status).toBe(401);

    const resChat = await chat(app, cookieNew);
    expect(resChat.status).toBe(200);
    expect(upstreamRequests[0].auth).toBe(`Bearer ${TOKEN_B}`);
  });

  it("8: Manipulierte/erratene Session-ID erhält keinen Zugriff", async () => {
    const app = await makeApp({
      ADMIN_PASSWORD: PASSWORD,
      FHG_BASE_URL: `http://127.0.0.1:${upstreamPort}`,
    });
    await setupUser(app, TOKEN_A); // echte Sitzung existiert

    const forged = `gsb_session=${crypto.randomBytes(32).toString("hex")}`;
    const res = await chat(app, forged);
    expect(res.status).toBe(401);
    expect(upstreamRequests.length).toBe(0);

    // Auch gekürzte/verfälschte Varianten
    const tampered = `gsb_session=x`;
    const res2 = await chat(app, tampered);
    expect(res2.status).toBe(401);
  });

  it("9: Sitzung läuft nach TTL ab → 401", async () => {
    const app = await makeApp({
      ADMIN_PASSWORD: PASSWORD,
      FHG_BASE_URL: `http://127.0.0.1:${upstreamPort}`,
      SESSION_TTL_MS: "120",
    });
    const cookie = await setupUser(app, TOKEN_A);
    const ok = await chat(app, cookie);
    expect(ok.status).toBe(200);

    await new Promise((r) => setTimeout(r, 200));
    const expired = await chat(app, cookie);
    expect(expired.status).toBe(401);
  });

  it("11: Brute-Force-Schutz — nach 10 Versuchen 429", async () => {
    const app = await makeApp({
      ADMIN_PASSWORD: PASSWORD,
      FHG_BASE_URL: `http://127.0.0.1:${upstreamPort}`,
      RATE_MAX_ATTEMPTS: "3",
      RATE_WINDOW_MS: "60000",
    });
    for (let i = 0; i < 3; i++) {
      const res = await request(app)
        .post("/api/setup/verify")
        .send({ password: "falsch" });
      expect(res.status).toBe(401);
    }
    const blocked = await request(app)
      .post("/api/setup/verify")
      .send({ password: PASSWORD });
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toContain("Zu viele");
  });

  it("12a: CSRF — POST mit fremder Origin wird abgewiesen", async () => {
    const app = await makeApp({
      ADMIN_PASSWORD: PASSWORD,
      FHG_BASE_URL: `http://127.0.0.1:${upstreamPort}`,
    });
    const res = await request(app)
      .post("/api/setup")
      .set("Origin", "https://evil.example")
      .send({ password: PASSWORD, apiKey: TOKEN_A });
    expect(res.status).toBe(403);
    expect(upstreamRequests.length).toBe(0);
  });

  it("12b: Produktion ohne ADMIN_PASSWORD verweigert den Start", async () => {
    vi.resetModules();
    const savedNodeEnv = process.env.NODE_ENV;
    const savedPw = process.env.ADMIN_PASSWORD;
    delete process.env.ADMIN_PASSWORD;
    process.env.NODE_ENV = "production";
    try {
      const mod = await import("./app.js");
      expect(() => mod.createApp()).toThrow(/ADMIN_PASSWORD/);
    } finally {
      if (savedPw === undefined) delete process.env.ADMIN_PASSWORD;
      else process.env.ADMIN_PASSWORD = savedPw;
      if (savedNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = savedNodeEnv;
    }
  });

  it("12c: Produktion sperrt baseUrl-Änderungen", async () => {
    const app = await makeApp({
      ADMIN_PASSWORD: PASSWORD,
      FHG_BASE_URL: `http://127.0.0.1:${upstreamPort}`,
      NODE_ENV: "production",
    });
    const cookie = await setupUser(app, TOKEN_A);
    const res = await request(app)
      .post("/api/config")
      .set("Cookie", cookie)
      .send({ password: PASSWORD, baseUrl: "https://evil.example/v1" });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Produktion");
  });

  it("Cookie-Flags: HttpOnly, SameSite=Strict (in Produktion Secure)", async () => {
    const app = await makeApp({
      ADMIN_PASSWORD: PASSWORD,
      FHG_BASE_URL: `http://127.0.0.1:${upstreamPort}`,
      NODE_ENV: "production",
    });
    const res = await request(app)
      .post("/api/setup")
      .send({ password: PASSWORD, apiKey: TOKEN_A });
    const setCookie = res.headers["set-cookie"][0];
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Strict");
    expect(setCookie).toContain("Secure");
  });

  it("Chat-Fehler: Upstream 401 → 502 token-invalid (deutsche Meldung)", async () => {
    const app = await makeApp({
      ADMIN_PASSWORD: PASSWORD,
      FHG_BASE_URL: `http://127.0.0.1:${upstreamPort}`,
    });
    const cookie = await setupUser(app, TOKEN_A);
    resetUpstream(401);
    const res = await chat(app, cookie);
    expect(res.status).toBe(502);
    expect(res.body.code).toBe("token-invalid");
    expect(res.body.error).toBe("API-Token ungültig oder abgelaufen.");
  });

  it("Health-Check ist ohne Auth erreichbar (Render healthCheckPath)", async () => {
    const app = await makeApp({
      ADMIN_PASSWORD: PASSWORD,
      FHG_BASE_URL: `http://127.0.0.1:${upstreamPort}`,
    });
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("Falsches Passwort → 401; kurzer Token → 400", async () => {
    const app = await makeApp({
      ADMIN_PASSWORD: PASSWORD,
      FHG_BASE_URL: `http://127.0.0.1:${upstreamPort}`,
    });
    const wrong = await request(app)
      .post("/api/setup")
      .send({ password: "falsch", apiKey: TOKEN_A });
    expect(wrong.status).toBe(401);

    const short = await request(app)
      .post("/api/setup")
      .send({ password: PASSWORD, apiKey: "kurz" });
    expect(short.status).toBe(400);
  });
});
