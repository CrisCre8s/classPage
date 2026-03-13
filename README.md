# 🎓 H-FI24-1B Klassen-Hub

Minimalistischer Dark-Mode Hub fuer die Berufsschulklasse H-FI24-1B am SBSZ Hermsdorf.

## Features

- **Link-Hub** – Schnellzugriff auf Stundenplan, Klassenbuch & Schulwebseite
- **KI-Chatbot** – Integrierter Assistent ueber Vercel AI Gateway

---

## Projektstruktur

```
klassen-hub/
├── public/
│   ├── index.html      ← Hauptseite
│   ├── style.css       ← Stylesheet (Dark Mode)
│   └── main.js         ← Link-Rendering & Chat-Logik
├── api/
│   └── chat.js         ← Serverless Function (AI Gateway)
├── .env.local          ← Lokale Umgebungsvariablen
├── vercel.json         ← Vercel-Konfiguration
└── README.md
```

---

## Setup-Anleitung

### 1. GitHub-Repository anlegen

```bash
# Neues Verzeichnis oder dieses Repo klonen
git init klassen-hub
cd klassen-hub

# Dateien hinzufuegen
git add .
git commit -m "Initial commit: Klassen-Hub"

# Remote hinzufuegen (eigenes GitHub-Repo erstellen)
git remote add origin https://github.com/DEIN-USERNAME/klassen-hub.git
git push -u origin main
```

### 2. Vercel-Projekt erstellen

1. Gehe zu [vercel.com](https://vercel.com) und melde dich an.
2. Klicke auf **"Add New Project"**.
3. Importiere dein GitHub-Repository **klassen-hub**.
4. Vercel erkennt die `vercel.json` automatisch.
5. Klicke auf **Deploy**.

### 3. Umgebungsvariablen setzen

1. Oeffne dein Projekt auf Vercel.
2. Gehe zu **Settings → Environment Variables**.
3. Erstelle eine neue Variable:
   - **Name:** `AI_GATEWAY_KEY`
   - **Value:** Dein Vercel AI Gateway API-Key
   - **Environments:** Production, Preview, Development
4. Klicke auf **Save**.
5. Starte ein neues Deployment (oder pushe einen neuen Commit).

### 4. Vercel AI Gateway konfigurieren

1. Gehe in deinem Vercel-Dashboard zu **AI → Gateway**.
2. Erstelle einen neuen Gateway und verbinde einen AI-Provider (z. B. OpenAI).
3. Kopiere den API-Key und trage ihn als `AI_GATEWAY_KEY` ein (siehe Schritt 3).

---

## Links anpassen

Oeffne `public/main.js` und ergaenze das `links`-Array:

```js
const links = [
  { title: "Neuer Link", url: "https://...", desc: "Beschreibung", emoji: "🔗" },
  // ...
];
```

---

## Lizenz

MIT
