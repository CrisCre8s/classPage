# H-FI24-1B Klassen-Hub

Dark-Mode Link-Hub für die Berufsschulklasse **H-FI24-1B** an der SBSZ Hermsdorf.
Vanilla HTML/CSS/JS mit Vite, gehostet auf Vercel.

## Inhalte pflegen (ohne Code anzufassen)

### Berichtsheft hinzufügen

PDF in den Ordner **`berichte/`** legen und pushen. Fertig.

Der Dateiname muss `KW<Woche>_<Jahr>` enthalten, z. B. `KW43_26.pdf` oder
`SchoolBH_KW43_26.pdf`. Daraus werden Titel und Sortierung erzeugt, der
neueste Bericht steht automatisch vorne und bekommt ein „NEU“.

Geht auch direkt auf GitHub im Browser: Ordner `berichte/` öffnen →
**Add file → Upload files** → PDF reinziehen → **Commit changes**.
Vercel deployt danach automatisch.

### Leistungskontrolle eintragen

Datei **`lks.json`** bearbeiten (auf GitHub: Datei öffnen → Stift-Symbol):

```json
[
  { "datum": "2026-11-04", "fach": "Englisch", "art": "Klassenarbeit", "thema": "Business English" },
  { "datum": "2026-11-12", "fach": "LF8", "art": "Kurztest" }
]
```

- `datum` im Format `JJJJ-MM-TT`, `fach` ist Pflicht, `art` und `thema` optional
- Einträge mit Komma trennen, nach dem letzten kein Komma
- Der Status wird automatisch berechnet: **HEUTE**, **BALD** (≤ 3 Tage),
  **OFFEN**, **ERLEDIGT** (Datum vorbei, wird 14 Tage ausgegraut angezeigt)
- Die nächste LK erscheint groß oben auf der Seite

## Spritpreise (Globus-Tankstelle)

Die aktuellen Preise für Super E5, E10 und Diesel kommen live von der
Markttransparenzstelle für Kraftstoffe (MTS-K) über die
[Tankerkönig-API](https://creativecommons.tankerkoenig.de) (Lizenz CC BY 4.0,
deshalb steht klein die Quelle darunter).

Einrichtung, einmalig:

1. Auf [creativecommons.tankerkoenig.de](https://creativecommons.tankerkoenig.de)
   unter „API-Key“ kostenlos einen Key anfordern
2. Vercel → Projekt → **Settings → Environment Variables**:
   `TANKERKOENIG_API_KEY` = dein Key
3. **Redeploy** auslösen

Die Funktion `api/sprit.js` findet die Globus-Tankstelle in Hermsdorf automatisch
und speichert die Antwort 10 Minuten zwischen. Falls die falsche Tankstelle
erscheint, kann man mit `TANKERKOENIG_STATION_ID` eine feste ID setzen.
Lokal funktioniert `/api/sprit` nur mit `npx vercel dev`, bei `npm run dev`
steht dort „gerade nicht verfügbar“.

## Projektstruktur

```
├── index.html      # Seite
├── style.css       # Alle Styles
├── main.js         # Einstieg: Datum, Power-Button, Init
├── lks.js          # Leistungskontrollen aus lks.json
├── lks.json        # ← LKs hier eintragen
├── berichte.js     # Berichte automatisch aus berichte/
├── berichte/       # ← PDFs hier ablegen
├── sprit.js        # Spritpreise im Globus-Fenster
├── api/sprit.js    # Vercel-Funktion → Tankerkönig-API
├── canvas.js       # Sternenfeld im Hintergrund
├── void.js         # Void-Funktion (Easter Egg)
└── public/         # Bilder, Favicon
```

## Lokal starten

```bash
npm install
npm run dev
```

## Deployment

Vercel-Projekt mit dem Repo verbinden, Framework Preset **Vite**. Jeder Push
auf `main` wird automatisch deployt.
