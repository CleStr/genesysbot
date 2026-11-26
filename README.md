# gEneSysBot — Persona Chatbot für Messen

Ein auf Personas basierender Chatbot für Messe-Besucher. Besucher können mit
verschiedenen Personas chatten, die auf Fraunhofer-Umfragedaten basieren.

## Tech-Stack

- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS
- **Icons:** lucide-react
- **Routing:** react-router-dom
- **Backend:** Node.js + Express (Proxy für die FhG-API; hält Tokens nur in
  kurzlebigen Server-Sessions, niemals dauerhaft)

## Struktur

```
client/   # Frontend (Vite React App)
server/   # Backend Proxy (Express)
scripts/  # Bias-Harness für Persona-Prompts
docs/     # Bias-Bewertungsraster
```

## Setup-Workflow (nutzerspezifische Tokens, P0)

1. Beim Start erscheint ein Setup-Screen zur Eingabe des persönlichen
   Fraunhofer-API-Tokens.
2. Die Eingabe ist durch das serverseitig konfigurierte Admin-Passwort
   (`ADMIN_PASSWORD`) geschützt; der Server erzwingt Brute-Force-Schutz
   (max. 10 Versuche / 10 Minuten pro IP).
3. Nach erfolgreicher Prüfung erstellt der Server eine **kurzlebige
   Session** (HttpOnly-Cookie, 2 h gleitend / 12 h absolut, Rotation bei
   jeder Neu-Anmeldung) und speichert das Token **nur im
   Prozessspeicher** dieser Session.
4. Alle Chat-Anfragen laufen über die Session; der Server setzt das Token
   nur für den jeweiligen Upstream-Aufruf ein. Es gibt **keinen globalen
   API-Key** und keinen Fallback.
5. Danach gelangt der Besucher zum Chat, wo er eine Persona auswählt und
   chattet.

### Sicherheits-Eigenschaften

- Tokens werden **niemals** im Browser (localStorage/Bundle/URL), in Logs
  oder dauerhaft gespeichert — nur im Server-Speicher der Session.
- Sessions sind pro Besucher isoliert (keine Token-Nutzung über Nutzer
  hinweg); jede Neu-Anmeldung verwirft die alte Session.
- Cookies: `HttpOnly`, `SameSite=Strict`, `Secure` (in Produktion bzw. bei
  HTTPS), 32-Byte-Zufalls-ID, CSRF-Origin-Prüfung auf allen
  Schreib-Endpunkten.
- Alle `/api/*`-Endpunkte außer `/api/health` erfordern eine gültige
  Session (401 ohne, 403 bei ungültiger Session).
- Läuft ein Token beim Upstream ab oder ist ungültig (401/403), antwortet
  der Proxy mit `502 token-invalid` — der Besucher wird zur Neu-Anmeldung
  geleitet, ohne dass andere Sessions betroffen sind.

## Installation & Start

### Öffentliche Bereitstellung auf Render

Das Repository enthält eine `render.yaml` für einen einzelnen Webdienst, der
Backend und Frontend unter derselben öffentlichen URL bereitstellt. In Render
ein Blueprint aus diesem Repository anlegen und beim Setup ein eigenes,
starkes `ADMIN_PASSWORD` setzen (Pflicht — der Server startet ohne diese
Variable nicht). Optional `FHG_BASE_URL` als Umgebungsvariable setzen.
Hinter Proxies (wie Render) zusätzlich `TRUST_PROXY=1` setzen, damit das
Rate-Limiting die echte Client-IP aus `X-Forwarded-For` verwendet.
Anschließend gibt jeder Besucher sein persönliches FhG-Token im Setup-Screen
ein. Tokens leben nur im Server-Speicher und müssen nach einem Neustart des
kostenlosen Render-Dienstes erneut eingegeben werden.

### Schnellstart mit VS Code Tasks

Im Workspace-Ordner liegt `.vscode/tasks.json` mit vorkonfigurierten Tasks
(über **Terminal → Run Task…** erreichbar):

- **Dev: Start Everything** — startet Backend + Frontend parallel (Standard-Task)
- **Dev: Backend Server** — startet nur den Express-Proxy
- **Dev: Frontend (Vite)** — startet nur den Vite-Dev-Server
- **Install: Backend Dependencies** / **Install: Frontend Dependencies** — `npm install`
- **Build: Frontend (Production)** — erzeugt den Production-Build

### Manuelles Setup

### 1. Backend (Proxy)

```bash
cd server
npm install
npm run dev
```

Der Proxy läuft auf `http://localhost:3001`.

Optional kann eine `.env`-Datei (siehe `.env.example`) angelegt werden, um
Admin-Passwort und FhG-Base-URL vorzukonfigurieren.

### 2. Frontend

```bash
cd client
npm install
npm run dev
```

Das Frontend läuft auf `http://localhost:5173` und leitet `/api`-Anfragen
automatisch an das Backend weiter.

## Tests (P8)

```bash
# Server: 34 Integrationstests (Session-Auth, Token-Isolation, Rotation,
# Cookie-Flags, Rate-Limit, Chat-Payload-Validierung, Concurrency-Limits,
# Security-Header, Upstream-Fehler)
cd server && npm test

# Client: 20 Unit-/Component-Tests (Markdown-Rendering + XSS-Schutz,
# Energieversorgungs-Mapping)
cd client && npm test
```

### Bias-Harness für Persona-Prompts (P7)

```bash
$env:BIAS_ADMIN_PASSWORD="<ADMIN_PASSWORD>"; $env:FHG_TOKEN="<FHG_TOKEN>"
npx tsx scripts/bias-harness.mjs
```

Secrets werden als Umgebungsvariablen übergeben (nie als
Kommandozeilen-Argumente); fehlt eine Variable, fragt das Skript interaktiv.

Prüft alle 6 Persona-System-Prompts gegen das Bewertungsraster in
`docs/bias-rating-grid.md` (Stereotyp-Risiken, Sprachqualität,
Qualitätsregeln). Siehe `docs/bias-rating-grid.md` für Details.

## Konventionen

- Komponenten in `client/src/components/`, Seiten in `client/src/pages/`.
- Tailwind für Styling, keine separaten CSS-Dateien pro Komponente.
- Typen in `client/src/types/`.
- Persona-Daten in `client/src/data/personas.ts` — 8 Personas:
  - **2 Durchschnitts-Personas** (Lukas = EU-Durchschnitt, Kwame = Sub-Sahara-Afrika-Durchschnitt)
  - **6 vulnerable Gruppen** (Maria, Aisha, Elena, Amina, Zainab, Fatuma)
  - Jede Persona hat ECI-Subdimensionen, weitere Indizes, Demografie- &
    Energie-Daten, Fakten und ein System-Prompt für den Chat.
  - Tags ermöglichen das Filtern nach Lebenssituation.

## Hinweise

- Persönliche API-Tokens werden **nur im Server-Speicher der jeweiligen
  Session** gehalten und nie an den Browser gesendet.
- In Produktion muss `ADMIN_PASSWORD` als Umgebungsvariable gesetzt werden;
  der Server startet ohne diese Einstellung nicht. Für lokale Entwicklung
  ohne Passwort stattdessen `ALLOW_INSECURE_LOCAL_DEV=true` setzen (nur
  außerhalb der Produktion; der Server bindet dann ausschließlich an
  127.0.0.1).
- Die FhG-API-Endpunkt-URL kann über `FHG_BASE_URL` konfiguriert werden
  (Standard ist ein Platzhalter).
