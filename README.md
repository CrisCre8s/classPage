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

### Wochenverlauf

Tankerkönig liefert nur die aktuellen Preise. Den Verlauf der letzten 7 Tage
schreibt die Seite deshalb selbst mit: Jeder Abruf von `/api/sprit` (höchstens
alle 10 Minuten) legt den Preis pro Stunde in einer Redis-Datenbank ab (9 Tage lang),
dazu kommt ein täglicher Cron-Job (`vercel.json` → `/api/sprit-speichern`), damit
auch Tage ohne Besucher einen Wert haben. `/api/sprit-verlauf` liefert je Tag
Schnitt, Tiefst- und Höchstpreis; die Seite zeigt daraus den Verlauf und ob es
gerade teurer oder billiger ist als an den Vortagen.

Einrichtung, einmalig:

1. Vercel → Projekt → **Storage** → **Create Database** → „Upstash for Redis“
   (Gratis-Tarif) anlegen und mit dem Projekt verbinden. Vercel setzt dabei
   `KV_REST_API_URL` und `KV_REST_API_TOKEN` automatisch.
2. Optional: `CRON_SECRET` als Umgebungsvariable setzen (beliebiger langer Text),
   dann darf nur Vercels Cron-Job `/api/sprit-speichern` aufrufen.
3. **Redeploy** auslösen.

Ohne Datenbank bleibt der Verlauf einfach ausgeblendet. Die ersten Vergleiche
erscheinen ab dem zweiten Tag, die volle Woche nach 7 Tagen.

## Projektstruktur

```
├── index.html      # Seite
├── style.css       # Alle Styles
├── main.js         # Einstieg Hub
├── spiele.html     # Spiele-Seite
├── spiele.js       # Einstieg Spiele
├── games/          # die 14 Spiele (Liste in games/katalog.js)
├── shell.js        # gemeinsam: Sterne, POWER, Void
├── vite.config.js  # baut beide Seiten
├── lks.js          # Leistungskontrollen aus lks.json
├── lks.json        # ← LKs hier eintragen
├── berichte.js     # Berichte automatisch aus berichte/
├── berichte/       # ← PDFs hier ablegen
├── sprit.js        # Spritpreise im Globus-Fenster
├── api/sprit.js    # Vercel-Funktion → Tankerkönig-API (merkt sich nebenbei den Preis)
├── api/sprit-verlauf.js / sprit-speichern.js  # Wochenverlauf (Redis) und täglicher Cron-Job
├── vercel.json     # Cron-Job für den Wochenverlauf
├── canvas.js       # Sternenfeld im Hintergrund
├── void.js         # Void-Funktion (Easter Egg)
└── public/         # Bilder, Favicon, Schriften (fonts/, selbst gehostet, OFL-Lizenz)
```

## Spiele

Unter `/spiele.html` (Gamepad-Icon in der Leiste) gibt es 14 Spiele, jeweils in
**Leicht, Mittel und Schwer**. Name, Beschreibung und Kategorie stehen zentral in
`games/katalog.js`. Auf der Spieleseite stehen die Lernspiele oben, die Klassiker
darunter. Der Hub zeigt nur drei Lernspiele als Vorschau, die ganze Fläche führt zur
Spieleseite.

**Klassiker**

- **Ping-Pong** (`games/pong.js`): erster bei 7 Punkten gewinnt
- **Schach** (`games/schach.js`, Regeln + KI in `games/schach-engine.js`): eigene
  Zuggenerierung inkl. Rochade, en passant, Umwandlung; der Computer rechnet je nach
  Stufe 1, 2 oder 4 Halbzüge voraus, im Hintergrund (`games/schach-worker.js`).
  Die Elo-Angaben (ca. 400 / 900 / 1400) sind grobe Schätzungen.
  Premoves (schon ziehen, während der Computer denkt), Nachspielen mit den Pfeiltasten
  und sechs Figurenstile: „Pixel“ ist selbst gezeichnet, die übrigen Sätze stammen von
  Lichess und liegen mit Lizenzangaben in `public/pieces/` (siehe `public/pieces/LICENSE.md`).
  Effekte beim Schlagen (`games/schach-effekte.js`): Explosion oder passend zur Figur
  (Bauer sticht, Springer stampft, Läufer schneidet, Turm rammt, Dame blitzt, König drückt platt)
- **Bits & Bugs** (`games/bits.js`): eigenes Labyrinth, Bits sammeln, Bugs ausweichen
- **Snake** (`games/snake.js`): Leicht ohne Wände, Schwer mit Hindernissen
- **Bug-Sucher** (`games/minen.js`): Minesweeper-Prinzip, 9×9 / 16×16 / 30×16, erster Klick ist sicher
- **2048** (`games/z2048.js`): 5×5, 4×4 oder 3×3 Felder
- **Vier in einer Reihe** (`games/vier.js`, KI in `games/vier-engine.js` im Worker)
- **Mauerbrecher** (`games/mauer.js`): Ball und Schläger, jede Mauer wird schneller
- **Stick-Skater** (`games/skate.js`, `skate-welten.js`, `skate-fortschritt.js`): Weltkarte mit 7 Welten (Stadt, Sonnenstrand, Dschungel, Eiswelt, Hölle, Himmel, Mond), die man durch Weiterfahren freischaltet (alle 450 m ein Portal); je Welt eigene Hindernisse und Physik (Eis rutscht, Himmel und Mond mit weniger Schwerkraft, Pilze federn, Lava-Geysire); Garage mit 8 Boards (Werte Tempo/Sprung/Schub, Spuren), gekauft mit dem Münzkonto; 3 Aufgaben mit Bonus-Münzen; Fortschritt im localStorage (Schlüssel `skate-fortschritt-v1`). In der Stadt die Zonen „Über den Dächern“, „Skatepark“ (Funboxen, Ledges, Publikum) und „Innenstadt“ (Läden, Autos, Scooter-Kids, Baustellen); Boost-Sprünge über Autos und durch den Feuerring; Highscore = Münzen (Tricks und Sprünge geben Bonus-Münzen); Tempo nur durch Anschieben
- **Schlagzeug** (`games/schlagzeug.js`, `schlagzeug-klang.js`): Bass, Snare, drei Toms, Hi-Hat (zu/offen), Crash und Ride mit Tastatur, Maus oder Finger; vier Kits: „Black Pearl“ und „Red Zeppelin“ mit echten Aufnahmen (je drei Anschlagstärken, `public/drums/`), „Elektro“ und „8-Bit“ per Web Audio erzeugt; Tasten frei belegbar (wird im Browser gespeichert); frei spielen mit Metronom (60–180 BPM) oder Rhythmus-Challenge mit Notenband (Leicht 80, Mittel 96, Schwer 112 BPM), Highscore = Punkte. Samples: [AVL-Drumkits](http://www.bandshed.net/avldrumkits/) von Glen MacArthur, CC BY-SA 3.0 (Details in `public/drums/LIZENZ.txt`)

**Lernen** (Prüfungsstoff, auf Zeit, mit Lösung bei Fehlern; gemeinsame Oberfläche in `games/quiz-ui.js`).
Jede Karte hat „So geht's“ zum Aufklappen: Erklärungen, Beispiele und Tabellen aus
`games/lernhilfe.js` (Befehle und Ports kommen direkt aus den Spieldaten).

- **Binär-Blitz** (`games/binaer.js`): Binär, Dezimal und Hex umrechnen
- **Subnetz-Sprint** (`games/subnetz.js`): Netz, Broadcast, Maske, Hosts berechnen
- **Befehl gesucht** (`games/befehle.js`): Aufgabe + System (Linux, Windows CMD/PowerShell, Git, Docker), den Befehl selbst eintippen; aufdeckbarer Hinweis kostet die halben Punkte
- **Port-Quiz** (`games/ports.js`): Standard-Ports und Dienste

Neues Spiel: Eintrag in `games/katalog.js`, Modul mit `start()` in `games/`,
Lader in `spiele.js` und eine Vorschau in `games/vorschau.js`.

Siege, Highscores bzw. Bestzeiten speichert jeder Browser für sich (localStorage).

## Design

Dunkler „Data terminal“-Stil: Icon-Leiste links (auf dem Handy unten), oben die
nächste Leistungskontrolle als Countdown, daneben die Spritpreise, darunter
Schnellzugriff und Berichtsheft. Zahlen in JetBrains Mono, Text in Public Sans,
der Titel in Press Start 2P. Alle drei Schriften liegen in `public/fonts/` und
werden nicht von Google geladen. Icons sind als SVG direkt in `index.html`.

POWER (unten in der Leiste) schaltet die Seite aus, nur die Sterne bleiben.

## Lokal starten

```bash
npm install
npm run dev
```

## Deployment

Vercel-Projekt mit dem Repo verbinden, Framework Preset **Vite**. Jeder Push
auf `main` wird automatisch deployt.
