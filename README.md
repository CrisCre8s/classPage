# H-FI24-1B Klassen-Hub

Minimalistischer Dark-Mode Link-Hub für die Berufsschulklasse **H-FI24-1B** an der SBSZ Hermsdorf.

## Tech-Stack

| Bereich      | Technologie                            |
|--------------|----------------------------------------|
| Frontend     | Vanilla HTML + Vite                    |
| Styling      | Vanilla CSS (Custom Properties)        |
| Icons        | Ionicons                               |
| AI-Chatbot   | Vercel Serverless Function (/api/chat) |
| Hosting      | Vercel                                 |

## Projektstruktur

```
klassen-hub/
├── public/
│   ├── index.css       # Alle Styles
│   └── script.js       # Feedback-Form & Chatbot-Logik
├── index.html          # Haupt-HTML
├── vite.config.js
├── vercel.json
└── package.json
```

## Schnellstart (lokal)

```bash
# 1. Repository klonen
git clone https://github.com/DEIN-USER/klassen-hub.git
cd klassen-hub

# 2. Abhaengigkeiten installieren
npm install

# 3. Entwicklungsserver starten
npm run dev
```

> **Hinweis:** Der Chatbot funktioniert lokal nur mit `npx vercel dev`, da die Serverless Function unter `/api/chat` über die Vercel CLI bereitgestellt wird.

## Deployment auf Vercel

### 1. GitHub-Repository erstellen

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/DEIN-USER/klassen-hub.git
git push -u origin main
```

### 2. Vercel-Projekt anlegen

1. [vercel.com/new](https://vercel.com/new) aufrufen
2. GitHub-Repository importieren
3. Framework Preset: **Vite**
4. **Deploy** klicken

### 3. Umgebungsvariable setzen (für Chatbot)

1. Vercel Dashboard > Projekt > **Settings** > **Environment Variables**
2. `AI_GATEWAY_KEY` = dein Vercel AI Gateway API-Key
3. **Redeploy** ausloesen

### 4. AI Gateway aktivieren

1. Vercel Dashboard > **AI** > **Gateway**
2. Gateway erstellen, API-Key generieren
3. Key als `AI_GATEWAY_KEY` eintragen (Schritt 3)

## Links bearbeiten

Öffne `index.html` und füge eine neue Link-Card im `.link-grid` hinzu:

```html
<a class="link-card" href="https://example.com" target="_blank" rel="noopener">
  <ion-icon name="globe-outline"></ion-icon>
  <span class="card-title">Mein neuer Link</span>
  <span class="card-desc">Kurze Beschreibung</span>
</a>
```

Icons: [Ionicons](https://ionic.io/ionicons)

## Features

- 🔗 Schnellzugriff auf alle wichtigen Schullinks
- 🏪 Globus Hermsdorf Info-Block (Öffnungszeiten, Kontakt, Rabatte)
- 💬 AI-Chatbot (via Vercel Serverless Function)
- 📝 Feedback-Formular
- 📱 Responsives Layout (Mobile & Desktop)
