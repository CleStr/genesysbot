# gEneSysBot — Persona Chatbot für Messen

Ein auf Personas basierender Chatbot für Messe-Besucher. Besucher können mit
verschiedenen Personas chatten, die auf Fraunhofer-Umfragedaten basieren.

## Tech-Stack

- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS
- **Icons:** lucide-react
- **Routing:** react-router-dom
- **Backend:** Node.js + Express (Proxy für die FhG-API, hält den API-Key serverseitig)

## Struktur

```
client/   # Frontend (Vite React App)
server/   # Backend Proxy (Express)
```

## Setup-Workflow

1. Beim Start erscheint ein Setup-Screen zur Eingabe der FhG-API.
2. Die API-Eingabe ist durch das serverseitig konfigurierte Admin-Passwort geschützt.
3. Nach erfolgreicher Eingabe wird der API-Key an den Backend-Proxy gesendet
   und dort gespeichert.
4. Danach gelangt der Besucher zum Chat, wo er eine Persona auswählt und chattet.

## Installation & Start

### Öffentliche Bereitstellung auf Render

Das Repository enthält eine `render.yaml` für einen einzelnen Webdienst, der
Backend und Frontend unter derselben öffentlichen URL bereitstellt. In Render
ein Blueprint aus diesem Repository anlegen und beim Setup ein eigenes,
starkes `ADMIN_PASSWORD` setzen. Anschließend den API-Key im Setup-Screen
eingeben. Der API-Key liegt nur im Backend-Prozessspeicher und muss nach einem
Neustart des kostenlosen Render-Dienstes erneut eingegeben werden.

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
Admin-Passwort, API-Key und FhG-Base-URL vorzukonfigurieren.

### 2. Frontend

```bash
cd client
npm install
npm run dev
```

Das Frontend läuft auf `http://localhost:5173` und leitet `/api`-Anfragen
automatisch an das Backend weiter.

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

- Der API-Key wird **nur im Backend** gespeichert und nie an den Browser
  gesendet.
- In Produktion muss `ADMIN_PASSWORD` als Umgebungsvariable gesetzt werden;
  der Server startet ohne diese Einstellung nicht.
- Die FhG-API-Endpunkt-URL kann über `FHG_BASE_URL` konfiguriert werden
  (Standard ist ein Platzhalter).
