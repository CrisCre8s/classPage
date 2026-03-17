# H-FI24-1B \u2013 Klassen-Hub

Minimalistischer Dark-Mode Link-Hub mit integriertem AI-Chatbot f\u00fcr die Berufsschulklasse **H-FI24-1B** an der SBSZ Hermsdorf.

## Tech-Stack

| Bereich | Technologie |
|---------|------------|
| Frontend | React 18 + Vite |
| Styling | Vanilla CSS (Custom Properties) |
| AI-Backend | Vercel Serverless Function + AI Gateway |
| Icons | Ionicons v4 |
| Hosting | Vercel |

## Schnellstart (lokal)

```bash
# 1. Repository klonen
git clone https://github.com/DEIN-USER/klassen-hub.git
cd klassen-hub

# 2. Abhaengigkeiten installieren
npm install

# 3. Umgebungsvariable anlegen
cp .env.local.example .env.local
# AI_GATEWAY_KEY eintragen

# 4. Entwicklungsserver starten
npm run dev
```

> **Hinweis:** Der Chatbot funktioniert lokal nur mit `npx vercel dev`, da die Serverless Function unter /api/chat ueber die Vercel CLI bereitgestellt wird.

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

### 3. Umgebungsvariable setzen

1. Vercel Dashboard > Projekt > **Settings** > **Environment Variables**
2. `AI_GATEWAY_KEY` = dein Vercel AI Gateway API-Key
3. **Redeploy** ausloesen

### 4. AI Gateway aktivieren

1. Vercel Dashboard > **AI** > **Gateway**
2. Gateway erstellen, API-Key generieren
3. Key als `AI_GATEWAY_KEY` eintragen (Schritt 3)

## Links bearbeiten

`src/data/links.js` oeffnen und neues Objekt anfuegen:

```js
{
  title: "Mein neuer Link",
  url: "https://example.com",
  description: "Kurze Beschreibung",
  icon: "globe-outline"
}
```

Icons: [Ionicons v4](https://ionic.io/ionicons/v4)
