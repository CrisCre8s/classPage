// Alle Spiele an einer Stelle. Spieleseite und Hub bauen ihre Karten daraus.
// wertung: "siege" (zählt Siege), "punkte" (Highscore), "zeit" (schnellste Zeit, weniger ist besser)

export const KATEGORIEN = [
  { id: "lernen", name: "Lernen", text: "Prüfungsstoff für Fachinformatiker. Unter „So geht's“ steht erst alles zum Nachlesen, dann wird gespielt." },
  { id: "klassiker", name: "Klassiker", text: "Gegen den Computer oder auf Highscore" },
];

export const KATALOG = [
  { id: "pong", kat: "klassiker", name: "Ping-Pong", kurz: "Schläger gegen Schläger, bis 7", text: "Der Klassiker: Schläger gegen Schläger. Wer zuerst 7 Punkte hat, gewinnt.", tasten: "Maus, Finger, W/S oder ↑/↓", wertung: "siege" },
  { id: "schach", kat: "klassiker", name: "Schach", kurz: "Du spielst Weiß gegen den Computer", text: "Du spielst Weiß gegen den Computer. Rochade, en passant und Umwandlung inklusive.", tasten: "Figur ziehen oder antippen · Premove · ← → nachspielen", wertung: "siege",
    // grobe Schätzung der Spielstärke je Stufe (nicht gegen gewertete Spieler gemessen)
    stufenInfo: { leicht: "ca. 400 Elo", mittel: "ca. 900 Elo", schwer: "ca. 1400 Elo" } },
  { id: "bits", kat: "klassiker", name: "Bits & Bugs", kurz: "Bits sammeln, Bugs ausweichen", text: "Sammle als Pixel-Computer alle Bits ein. Mit dem Debugger jagst du die Bugs.", tasten: "Pfeiltasten, WASD oder Wischen", wertung: "punkte" },
  { id: "snake", kat: "klassiker", name: "Snake", kurz: "Bits fressen, länger werden", text: "Friss Bits und werde länger. Nicht in dich selbst beißen. Seltene Power-ups: Zeitlupe und Geist (kurz durch dich selbst).", tasten: "Pfeiltasten, WASD oder Wischen", wertung: "punkte" },
  { id: "minen", kat: "klassiker", name: "Bug-Sucher", kurz: "Alle Felder ohne Bug aufdecken", text: "Decke alle Felder auf, unter denen kein Bug steckt. Die Zahlen verraten, wie viele Bugs angrenzen.", tasten: "Tippen: aufdecken · Rechtsklick/lange drücken: Flagge", wertung: "zeit" },
  { id: "z2048", kat: "klassiker", name: "2048", kurz: "Zweierpotenzen zusammenschieben", text: "Schiebe gleiche Zahlen zusammen, bis du 2048 erreichst. Zweierpotenzen, wie im Speicher.", tasten: "Pfeiltasten, WASD oder Wischen", wertung: "punkte" },
  { id: "vier", kat: "klassiker", name: "Vier in einer Reihe", kurz: "Vier Steine in eine Reihe bringen", text: "Lass deine Steine fallen und bring vier in eine Reihe, waagerecht, senkrecht oder diagonal.", tasten: "Spalte antippen · Tastatur: ← → und Enter", wertung: "siege" },
  { id: "skate", kat: "klassiker", name: "Stick-Skater", kurz: "7 Welten, Boards, Aufgaben", text: "Ein Strichmännchen skatet durch 7 Welten: Stadt, Strand, Dschungel, Eiswelt, Hölle, Himmel und Mond. Je weiter du fährst, desto mehr Welten schaltest du auf der Karte frei. Mit den Münzen kaufst du neue Boards, Aufgaben bringen Bonus-Münzen.", tasten: "Karte: ← → Welt, B Boards · → anschieben · Leertaste springen · ↑ ↓ ← Tricks · Handy: links schieben, rechts springen", wertung: "punkte" },
  { id: "schlagzeug", kat: "klassiker", name: "Schlagzeug", kurz: "Trommeln mit der Tastatur spielen", text: "Ein ganzes Schlagzeug: Bass, Snare, drei Toms, Hi-Hat, Crash und Ride. Frei spielen mit Metronom oder in der Rhythmus-Challenge die Noten im Takt treffen.", tasten: "Q Crash · A/W Hi-Hat · S Snare · D F G Toms · R Ride · Leertaste Bass · antippen geht auch", wertung: "punkte" },
  { id: "mauer", kat: "klassiker", name: "Mauerbrecher", kurz: "Mit dem Ball die Mauer abräumen", text: "Halte den Ball im Spiel und räume mit ihm die Mauer ab. Jede Mauer wird schneller.", tasten: "Maus, Finger oder ←/→ · Leertaste: Start", wertung: "punkte" },
  { id: "binaer", kat: "lernen", name: "Binär-Blitz", kurz: "Binär, Dezimal und Hex umrechnen", text: "Rechne Zahlen zwischen Binär, Dezimal und Hexadezimal um, so viele wie möglich in 60 Sekunden.", tasten: "Tastatur oder Ziffernfeld · Enter: prüfen", wertung: "punkte" },
  { id: "subnetz", kat: "lernen", name: "Subnetz-Sprint", kurz: "Netz, Broadcast, Hosts berechnen", text: "IP-Adresse mit CIDR: Netzadresse, Broadcast, Maske oder Hostanzahl berechnen. 90 Sekunden.", tasten: "Tastatur oder Ziffernfeld · Enter: prüfen", wertung: "punkte" },
  { id: "befehle", kat: "lernen", name: "Befehl gesucht", kurz: "Welcher Befehl, unter welchem System?", text: "Aufgabe und System stehen da, den Befehl tippst du selbst: Linux, Windows, Git oder Docker. Ein Hinweis hilft, kostet aber Punkte. 90 Sekunden.", tasten: "Tastatur · Enter: prüfen", wertung: "punkte" },
  { id: "ports", kat: "lernen", name: "Port-Quiz", kurz: "Welcher Dienst, welcher Port?", text: "Welcher Dienst läuft auf welchem Port? Wähle die richtige Antwort, bevor die Zeit abläuft.", tasten: "Antippen oder Tasten 1–4", wertung: "punkte" },
];

export const NACH_ID = Object.fromEntries(KATALOG.map((s) => [s.id, s]));
