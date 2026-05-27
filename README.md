# Narratives Diagnose-System

KI-gestütztes narratives Interview-System mit Diagnostiker-Dashboard.

## Architektur

- **Backend**: Node.js / Express — Interview-API, Claude-Integration, PostgreSQL
- **Frontend**: React / Vite — Interview-Simulation, Dashboard mit Kreisdiagramm
- **Deploy**: Railway (wie Wandersteine)

## Lokale Entwicklung

```bash
# Backend
cd backend
cp .env.example .env
# .env ausfüllen (ANTHROPIC_API_KEY + DATABASE_URL)
npm install
npm run dev

# Frontend (neues Terminal)
cd frontend
npm install
npm run dev
```

Frontend läuft auf http://localhost:5173, Backend auf http://localhost:3001.

## Railway Deployment

1. Neues Railway-Projekt erstellen
2. PostgreSQL-Datenbank hinzufügen (Add Service → Database → PostgreSQL)
3. GitHub-Repo verbinden (diesen Ordner pushen)
4. Environment Variables setzen:
   - `ANTHROPIC_API_KEY` = dein Anthropic API Key
   - `DATABASE_URL` = wird von Railway automatisch gesetzt
5. Deploy — Railway erkennt `railway.toml` automatisch

## Funktionen

### Interview-Tab
- 4-Phasen-Gesprächsführung nach System-Prompt (Begrüssung → Erlebniskurve → Haupterzählung → Abschluss)
- Echtes Claude-Backend (kein Sandbox-Problem)
- Narrativ-Klassifikation nach Abschluss (6 Kommunikationsklassen)
- Anonyme Speicherung mit Label A, B, C...

### Dashboard-Tab
- Aggregiertes Kreisdiagramm aller Interviews
- Balkendiagramm der 6 Kommunikationsklassen
- Einzelinterview-Drill-Down mit Kreisdiagramm, Key Phrases, Zusammenfassung
- Hierarchie-Ebene und Dauer pro Interview

## Kommunikationsklassen

1. Erklärungsnarrative
2. Identitätsnarrative
3. Machtnarrative
4. Veränderungsnarrative
5. Beziehungsnarrative
6. Erfolgs-/Scheiternsnarrative
