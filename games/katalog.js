// Alle Spiele an einer Stelle. Spieleseite und Hub bauen ihre Karten daraus.
// wertung: "siege" (zählt Siege), "punkte" (Highscore), "zeit" (schnellste Zeit, weniger ist besser)
// stufen: false → keine Schwierigkeitsgrade (Highscore ohne Stufe)

export const KATEGORIEN = [
  { id: "lernen", name: "Lernen", text: "Prüfungsstoff für Fachinformatiker. Unter „So geht's“ steht erst alles zum Nachlesen, dann wird gespielt." },
  { id: "klassiker", name: "Klassiker", text: "Gegen den Computer oder auf Highscore" },
];

export const KATALOG = [
  { id: "pong", kat: "klassiker", name: "Ping-Pong", kurz: "Schläger gegen Schläger, bis 7", text: "Der Klassiker: Schläger gegen Schläger. Wer zuerst 7 Punkte hat, gewinnt.", tasten: "Maus, Finger, W/S oder ↑/↓", wertung: "siege" },
  { id: "schach", kat: "klassiker", name: "Schach", kurz: "Du spielst Weiß gegen den Computer", text: "Du spielst Weiß gegen den Computer. Rochade, en passant und Umwandlung inklusive. Neu: Stufe „Lernen“ mit 10 Eröffnungen, Erklärungen und Tipps.", tasten: "Figur ziehen oder antippen · Premove · ← → nachspielen", wertung: "siege",
    // grobe Schätzung der Spielstärke je Stufe (nicht gegen gewertete Spieler gemessen)
    lernStufe: true,
    stufenInfo: { lernen: "Eröffnungen", leicht: "ca. 400 Elo", mittel: "ca. 900 Elo", schwer: "ca. 1400 Elo" } },
  { id: "bits", kat: "klassiker", name: "Bits & Bugs", kurz: "Bits sammeln, Bugs ausweichen", text: "Sammle als Pixel-Computer alle Bits ein. Mit dem Debugger jagst du die Bugs.", tasten: "Pfeiltasten, WASD oder Wischen", wertung: "punkte" },
  { id: "snake", kat: "klassiker", name: "Snake", kurz: "Bits fressen, länger werden", text: "Friss Bits und werde länger. Nicht in dich selbst beißen. Seltene Power-ups: Zeitlupe, Geist (kurz durch dich selbst) und auf Mittel/Schwer das Portal (kurz durch die Wände).", tasten: "Pfeiltasten, WASD oder Wischen", wertung: "punkte" },
  { id: "minen", kat: "klassiker", name: "Bug-Sucher", kurz: "Alle Felder ohne Bug aufdecken", text: "Decke alle Felder auf, unter denen kein Bug steckt. Die Zahlen verraten, wie viele Bugs angrenzen.", tasten: "Tippen: aufdecken · Rechtsklick/lange drücken: Flagge", wertung: "zeit" },
  { id: "z2048", kat: "klassiker", name: "2048", kurz: "Zweierpotenzen zusammenschieben", text: "Schiebe gleiche Zahlen zusammen, bis du 2048 erreichst. Zweierpotenzen, wie im Speicher.", tasten: "Pfeiltasten, WASD oder Wischen", wertung: "punkte" },
  { id: "vier", kat: "klassiker", name: "Vier in einer Reihe", kurz: "Vier Steine in eine Reihe bringen", text: "Lass deine Steine fallen und bring vier in eine Reihe, waagerecht, senkrecht oder diagonal.", tasten: "Spalte antippen · Tastatur: ← → und Enter", wertung: "siege" },
  { id: "skate", kat: "klassiker", name: "Stick-Skater", kurz: "7 Welten, Boards, Aufgaben", text: "Ein Strichmännchen skatet durch 7 Welten: Stadt, Strand, Dschungel, Eiswelt, Hölle, Himmel und Mond. Je weiter du fährst, desto mehr Welten schaltest du auf der Karte frei. Mit den Münzen kaufst du neue Boards, Aufgaben bringen Bonus-Münzen.", tasten: "Karte: ← → Welt, B Boards · → anschieben · Leertaste springen · ↑ ↓ ← Tricks · Handy: links schieben, rechts springen", wertung: "punkte" },
  { id: "schlagzeug", kat: "klassiker", name: "Schlagzeug", kurz: "Trommeln mit der Tastatur spielen", text: "Ein ganzes Schlagzeug mit vier Kits: zwei echte Akustik-Aufnahmen, Elektro und 8-Bit. Tasten frei belegbar. Frei spielen mit Metronom oder in der Rhythmus-Challenge die Noten im Takt treffen.", tasten: "Q Crash · A/W Hi-Hat · S Snare · D F G Toms · R Ride · Leertaste Bass (änderbar) · antippen geht auch", wertung: "punkte",
    // nur spielen: keine Schwierigkeitsgrade; der Highscore gilt für die Rhythmus-Challenge
    stufen: false },
  { id: "mauer", kat: "klassiker", name: "Mauerbrecher", kurz: "Mit dem Ball die Mauer abräumen", text: "Halte den Ball im Spiel und räume mit ihm die Mauer ab. Jede Mauer wird schneller.", tasten: "Maus, Finger oder ←/→ · Leertaste: Start", wertung: "punkte" },
  { id: "bloecke", kat: "klassiker", name: "Block-Stapler", kurz: "Fallende Steine zu vollen Reihen", text: "Fallende Steine drehen und so stapeln, dass volle Reihen entstehen. Vier Reihen auf einmal geben die meisten Punkte. Mit Vorschau, Halten und Geisterstein.", tasten: "← → schieben · ↑ drehen · Leertaste fallen lassen · C halten · Handy: tippen, wischen", wertung: "punkte",
    stufenInfo: { leicht: "Start Level 1", mittel: "Start Level 4", schwer: "Start Level 8" } },
  { id: "flatter", kat: "klassiker", name: "Flatter-PC", kurz: "Durch die Serverschränke fliegen", text: "Ein kleiner Pixel-Computer flattert durch die Lücken zwischen Serverschränken. Ein Knopf, ein Ziel: nicht anstoßen. Gut fürs Handy.", tasten: "Leertaste, Klick oder Tippen", wertung: "punkte" },
  { id: "invasion", kat: "klassiker", name: "Bug-Invasion", kurz: "Bugs mit dem Debugger abschießen", text: "Bugs rücken in Reihen an und werden schneller, je weniger übrig sind. Schieß sie mit dem Debugger ab, die Firewalls schützen dich eine Weile.", tasten: "← → bewegen · Leertaste schießen · Handy: Finger aufs Feld", wertung: "punkte" },
  { id: "sudoku", kat: "klassiker", name: "Sudoku", kurz: "Jede Zahl einmal pro Zeile, Spalte, Block", text: "Immer ein neues Sudoku mit genau einer Lösung. Leicht mit 40, Mittel mit 32, Schwer mit 26 vorgegebenen Zahlen. Notizen helfen beim Knobeln.", tasten: "Feld antippen, Zahl wählen · Pfeile, 1–9, N für Notizen", wertung: "zeit",
    stufenInfo: { leicht: "40 Vorgaben", mittel: "32 Vorgaben", schwer: "26 Vorgaben" } },
  { id: "ttt", kat: "klassiker", name: "Tic-Tac-Toe", kurz: "Drei in einer Reihe gegen den Computer", text: "Drei Zeichen in eine Reihe. Wer anfängt, wechselt jede Runde. Auf Schwer rechnet der Computer jeden Zug durch und ist nicht zu schlagen.", tasten: "Feld antippen oder Ziffern 1–9", wertung: "siege",
    stufenInfo: { leicht: "macht Fehler", mittel: "blockt immer", schwer: "unschlagbar" } },
  { id: "binaer", kat: "lernen", name: "Binär-Blitz", kurz: "Binär, Dezimal und Hex umrechnen", text: "Rechne Zahlen zwischen Binär, Dezimal und Hexadezimal um, so viele wie möglich in 60 Sekunden.", tasten: "Tastatur oder Ziffernfeld · Enter: prüfen", wertung: "punkte" },
  { id: "subnetz", kat: "lernen", name: "Subnetz-Sprint", kurz: "Netz, Broadcast, Hosts berechnen", text: "IP-Adresse mit CIDR: Netzadresse, Broadcast, Maske oder Hostanzahl berechnen. 90 Sekunden.", tasten: "Tastatur oder Ziffernfeld · Enter: prüfen", wertung: "punkte" },
  { id: "befehle", kat: "lernen", name: "Befehl gesucht", kurz: "Welcher Befehl, unter welchem System?", text: "Aufgabe und System stehen da, den Befehl tippst du selbst: Linux, Windows, Git oder Docker. Ein Hinweis hilft, kostet aber Punkte. 90 Sekunden.", tasten: "Tastatur · Enter: prüfen", wertung: "punkte" },
  { id: "ports", kat: "lernen", name: "Port-Quiz", kurz: "Welcher Dienst, welcher Port?", text: "Welcher Dienst läuft auf welchem Port? Wähle die richtige Antwort, bevor die Zeit abläuft.", tasten: "Antippen oder Tasten 1–4", wertung: "punkte" },
  { id: "csharp", kat: "lernen", name: "C#-Code", kurz: "Was gibt der Code aus? Was fehlt?", text: "C#-Grundlagen als Quiz: Datentypen, Variablen, Konstruktoren, static, Properties mit get; set; und mehr. Oft steht ein Stück Code dabei. 120 Sekunden.", tasten: "Antippen oder Tasten 1–4", wertung: "punkte" },
  { id: "osi", kat: "lernen", name: "OSI-Sortierer", kurz: "Protokolle und Geräte einsortieren", text: "HTTP, TCP, Switch, Router und viele mehr: Zieh jeden Begriff auf die richtige Schicht des OSI-Modells. 90 Sekunden.", tasten: "Karte ziehen, Schicht antippen oder Tasten 1–7", wertung: "punkte" },
  { id: "sql", kat: "lernen", name: "SQL-Sprint", kurz: "Abfrage schreiben, Seite prüft", text: "Eine kleine Datenbank mit Kunden, Bestellungen und Mitarbeitern. Du schreibst die SELECT-Abfrage, die Seite führt sie aus und vergleicht das Ergebnis. 6 Aufgaben pro Runde.", tasten: "Tastatur · Strg+Enter: ausführen", wertung: "punkte" },
  { id: "gatter", kat: "lernen", name: "Logikgatter-Puzzle", kurz: "AND, OR, XOR, NOT richtig setzen", text: "Setz die passenden Gatter in die Schaltung, bis am Ausgang für jede Eingabe das Richtige herauskommt. Die Wahrheitstabelle zeigt live, was noch fehlt. 120 Sekunden.", tasten: "Gatter antippen zum Wechseln", wertung: "punkte" },
  { id: "memory", kat: "lernen", name: "Fachbegriff-Memory", kurz: "Begriff und Erklärung finden", text: "Deck Begriffspaare auf: „RAID 1“ gehört zu „Spiegelung“, „DHCP“ zu „IP automatisch vergeben“. Je schneller, desto besser.", tasten: "Karten antippen", wertung: "zeit" },
];

export const NACH_ID = Object.fromEntries(KATALOG.map((s) => [s.id, s]));
