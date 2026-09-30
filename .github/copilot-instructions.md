# gEneSysBot — Persona Chatbot für Messen

## Projektübersicht
Ein auf Personas basierender Chatbot für Messe-Besucher. Besucher können mit verschiedenen Personas chatten, die auf Fraunhofer-Umfragedaten basieren.

## Tech-Stack
- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS
- **Icons:** lucide-react
- **Routing:** react-router-dom
- **Backend:** Node.js + Express (Proxy für FhG-API, hält den API-Key serverseitig)

## Struktur
```
client/   # Frontend (Vite React App)
server/   # Backend Proxy (Express)
```

## Setup-Workflow
1. Beim Start erscheint ein Setup-Screen zur Eingabe der FhG-API.
2. Die API-Eingabe ist durch das Passwort `FhG2026#!` geschützt.
3. Nach erfolgreicher Eingabe wird der API-Key an den Backend-Proxy gesendet und dort gespeichert.
4. Danach gelangt der Besucher zum Chat, wo er eine Persona auswählt und chattet.

## Build & Run
- Frontend: `cd client && npm install && npm run dev`
- Backend: `cd server && npm install && npm run dev`
- Frontend läuft auf Port 5173, Backend auf Port 3001.

## Konventionen
- Komponenten in `client/src/components/`, Seiten in `client/src/pages/`.
- Tailwind für Styling, keine separaten CSS-Dateien pro Komponente.
- Typen in `client/src/types/`.
- Persona-Daten in `client/src/data/personas.ts` (Platzhalter, wird im nächsten Schritt befüllt).
