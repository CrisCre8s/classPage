// Eröffnungen zum Lernen. Züge in englischer Kurznotation (SAN: K Q R B N, O-O),
// die Anzeige übersetzt sie ins Deutsche (K D T L S). seite = die Farbe, die man lernt.
// Zu jedem Halbzug eine kurze Erklärung, was er bezweckt.

export const EROEFFNUNGEN = [
  {
    id: "italienisch",
    name: "Italienische Partie",
    seite: "w",
    idee: "Schnelle Entwicklung, der Läufer zielt auf f7, dem schwächsten Punkt von Schwarz.",
    zuege: [
      ["e4", "Weiß besetzt das Zentrum und öffnet Wege für Dame und Läufer."],
      ["e5", "Schwarz hält im Zentrum dagegen."],
      ["Nf3", "Der Springer entwickelt sich und greift den Bauern e5 an."],
      ["Nc6", "Schwarz deckt e5 mit dem Springer."],
      ["Bc4", "Der Läufer zielt auf f7, das nur der König schützt."],
      ["Bc5", "Schwarz stellt seinen Läufer spiegelbildlich auf und zielt auf f2."],
      ["c3", "Bereitet d4 vor, um das Zentrum mit zwei Bauern zu besetzen."],
      ["Nf6", "Entwickelt den zweiten Springer und greift e4 an."],
      ["d3", "Ruhige Variante: e4 ist gedeckt, die Stellung bleibt stabil."],
      ["d6", "Schwarz stützt e5 und öffnet den Läufer c8."],
      ["O-O", "Rochade: König in Sicherheit, Turm kommt ins Spiel."],
      ["O-O", "Auch Schwarz bringt den König in Sicherheit."],
    ],
  },
  {
    id: "spanisch",
    name: "Spanische Partie",
    seite: "w",
    idee: "Druck auf den Springer c6, der e5 verteidigt. Eine der ältesten und wichtigsten Eröffnungen.",
    zuege: [
      ["e4", "Weiß besetzt das Zentrum."],
      ["e5", "Schwarz antwortet symmetrisch."],
      ["Nf3", "Angriff auf e5."],
      ["Nc6", "Schwarz deckt e5."],
      ["Bb5", "Der Läufer fesselt nicht, greift aber den Verteidiger von e5 an."],
      ["a6", "Schwarz fragt den Läufer, wohin er will (Morphy-Verteidigung)."],
      ["Ba4", "Der Läufer weicht aus und hält den Druck auf c6."],
      ["Nf6", "Entwicklung mit Angriff auf e4."],
      ["O-O", "Weiß rochiert; e4 ist indirekt gedeckt."],
      ["Be7", "Schwarz entwickelt sich ruhig und bereitet die Rochade vor."],
      ["Re1", "Der Turm deckt e4 und steht auf der e-Linie."],
      ["b5", "Schwarz vertreibt den Läufer und gewinnt Raum am Damenflügel."],
      ["Bb3", "Der Läufer zielt jetzt weiter auf f7."],
      ["d6", "Stützt e5 und öffnet den Läufer c8."],
      ["c3", "Bereitet d4 vor und schafft dem Läufer ein Rückzugsfeld."],
      ["O-O", "Schwarz rochiert. Das ist die Grundstellung der geschlossenen Spanischen Partie."],
    ],
  },
  {
    id: "sizilianisch",
    name: "Sizilianische Verteidigung (Najdorf)",
    seite: "b",
    idee: "Schwarz kämpft mit dem c-Bauern um d4 und spielt auf Gegenangriff statt Symmetrie.",
    zuege: [
      ["e4", "Weiß besetzt das Zentrum."],
      ["c5", "Sizilianisch: Schwarz kontrolliert d4 von der Seite."],
      ["Nf3", "Weiß entwickelt und bereitet d4 vor."],
      ["d6", "Schwarz kontrolliert e5 und öffnet den Läufer c8."],
      ["d4", "Weiß öffnet das Zentrum."],
      ["cxd4", "Schwarz tauscht einen Flügelbauern gegen einen Zentrumsbauern."],
      ["Nxd4", "Der Springer schlägt zurück und steht zentral."],
      ["Nf6", "Entwicklung mit Angriff auf e4."],
      ["Nc3", "Weiß deckt e4 und entwickelt sich."],
      ["a6", "Najdorf: hält Springer und Läufer von b5 fern und bereitet b5 oder e5 vor."],
    ],
  },
  {
    id: "franzoesisch",
    name: "Französische Verteidigung",
    seite: "b",
    idee: "Schwarz baut eine feste Bauernkette e6–d5 und greift die weiße Kette später mit c5 an.",
    zuege: [
      ["e4", "Weiß besetzt das Zentrum."],
      ["e6", "Französisch: bereitet d5 vor, um e4 anzugreifen."],
      ["d4", "Weiß baut ein großes Zentrum."],
      ["d5", "Schwarz greift e4 direkt an."],
      ["e5", "Vorstoß-Variante: Weiß schiebt vorbei und gewinnt Raum."],
      ["c5", "Typisch Französisch: Angriff auf die Basis der weißen Kette (d4)."],
      ["c3", "Weiß stützt d4 mit einem weiteren Bauern."],
      ["Nc6", "Mehr Druck auf d4."],
      ["Nf3", "Weiß deckt d4 ein drittes Mal."],
      ["Qb6", "Die Dame greift d4 und b2 an."],
      ["a3", "Bereitet b4 vor und gewinnt Raum am Damenflügel."],
      ["c4", "Schwarz schließt den Damenflügel und verhindert b4 mit Gewinn von Raum."],
    ],
  },
  {
    id: "carokann",
    name: "Caro-Kann-Verteidigung",
    seite: "b",
    idee: "Wie Französisch, aber der helle Läufer kommt vor e6 heraus und bleibt nicht eingesperrt.",
    zuege: [
      ["e4", "Weiß besetzt das Zentrum."],
      ["c6", "Caro-Kann: bereitet d5 vor, ohne den Läufer c8 einzusperren."],
      ["d4", "Weiß baut ein großes Zentrum."],
      ["d5", "Schwarz greift e4 an."],
      ["Nc3", "Weiß deckt e4."],
      ["dxe4", "Schwarz tauscht im Zentrum."],
      ["Nxe4", "Der Springer schlägt zurück."],
      ["Bf5", "Der Läufer kommt mit Tempo heraus und greift den Springer an."],
      ["Ng3", "Der Springer weicht aus und greift den Läufer an."],
      ["Bg6", "Der Läufer bleibt auf der guten Diagonale."],
      ["h4", "Weiß droht h5 und will den Läufer einfangen."],
      ["h6", "Schafft dem Läufer ein Rückzugsfeld auf h7."],
      ["Nf3", "Weiß entwickelt sich."],
      ["Nd7", "Verhindert Se5 und bereitet Sgf6 vor."],
    ],
  },
  {
    id: "damengambit",
    name: "Damengambit (abgelehnt)",
    seite: "w",
    idee: "Weiß bietet den c-Bauern an, um Schwarz vom Zentrum wegzulocken. Schwarz lehnt ab und hält d5.",
    zuege: [
      ["d4", "Weiß besetzt das Zentrum mit dem Damenbauern."],
      ["d5", "Schwarz hält dagegen."],
      ["c4", "Das Gambit: Weiß greift d5 an und bietet den c-Bauern an."],
      ["e6", "Abgelehnt: Schwarz stützt d5 und öffnet den Läufer f8."],
      ["Nc3", "Mehr Druck auf d5."],
      ["Nf6", "Schwarz deckt d5 noch einmal."],
      ["Bg5", "Der Läufer fesselt den Springer an die Dame."],
      ["Be7", "Schwarz löst die Fesselung."],
      ["e3", "Weiß öffnet den Läufer f1."],
      ["O-O", "Schwarz bringt den König in Sicherheit."],
      ["Nf3", "Weiß entwickelt den letzten Springer."],
      ["Nbd7", "Schwarz entwickelt sich und bereitet c5 oder e5 vor."],
    ],
  },
  {
    id: "slawisch",
    name: "Slawische Verteidigung",
    seite: "b",
    idee: "Gegen das Damengambit stützt Schwarz d5 mit c6 und hält dem Läufer c8 den Weg frei.",
    zuege: [
      ["d4", "Weiß besetzt das Zentrum."],
      ["d5", "Schwarz hält dagegen."],
      ["c4", "Das Damengambit."],
      ["c6", "Slawisch: d5 wird gestützt, der Läufer c8 bleibt frei."],
      ["Nf3", "Weiß entwickelt sich."],
      ["Nf6", "Schwarz auch."],
      ["Nc3", "Mehr Druck auf d5."],
      ["dxc4", "Schwarz nimmt den Bauern und will ihn mit b5 halten."],
      ["a4", "Verhindert b5, Weiß holt den Bauern später zurück."],
      ["Bf5", "Der Läufer kommt aktiv heraus, bevor e6 ihn einsperrt."],
    ],
  },
  {
    id: "koenigsindisch",
    name: "Königsindische Verteidigung",
    seite: "b",
    idee: "Schwarz überlässt Weiß zuerst das Zentrum und greift es dann mit e5 oder c5 an.",
    zuege: [
      ["d4", "Weiß besetzt das Zentrum."],
      ["Nf6", "Schwarz kontrolliert e4, ohne gleich einen Bauern zu ziehen."],
      ["c4", "Weiß gewinnt Raum."],
      ["g6", "Bereitet das Fianchetto des Läufers vor."],
      ["Nc3", "Weiß bereitet e4 vor."],
      ["Bg7", "Der Läufer zielt auf das Zentrum und den Damenflügel."],
      ["e4", "Weiß baut ein großes Bauernzentrum."],
      ["d6", "Schwarz bereitet e5 vor."],
      ["Nf3", "Weiß entwickelt sich."],
      ["O-O", "Schwarz rochiert früh, der König steht hinter dem Läufer sicher."],
      ["Be2", "Weiß entwickelt sich und bereitet die Rochade vor."],
      ["e5", "Der Gegenstoß im Zentrum, typisch für Königsindisch."],
    ],
  },
  {
    id: "london",
    name: "Londoner System",
    seite: "w",
    idee: "Ein festes System: Weiß stellt fast immer gleich auf (d4, Lf4, e3, c3), egal was Schwarz macht.",
    zuege: [
      ["d4", "Weiß besetzt das Zentrum."],
      ["d5", "Schwarz hält dagegen."],
      ["Bf4", "Das Markenzeichen: Der Läufer kommt vor e3 heraus."],
      ["Nf6", "Schwarz entwickelt sich."],
      ["e3", "Stützt d4 und öffnet den Läufer f1."],
      ["e6", "Schwarz öffnet seinen Läufer f8."],
      ["Nf3", "Weiß entwickelt sich."],
      ["c5", "Schwarz greift d4 an."],
      ["c3", "Die typische Pyramide c3–d4–e3."],
      ["Nc6", "Mehr Druck auf d4."],
      ["Nbd2", "Der Springer stützt e4 und c4, ohne den c-Bauern zu blockieren."],
      ["Bd6", "Schwarz bietet den Tausch der Läufer an."],
      ["Bg3", "Weiß weicht aus und behält den guten Läufer."],
      ["O-O", "Schwarz rochiert."],
    ],
  },
  {
    id: "englisch",
    name: "Englische Eröffnung",
    seite: "w",
    idee: "Weiß kontrolliert d5 vom Flügel aus, oft wie ein Sizilianisch mit vertauschten Farben.",
    zuege: [
      ["c4", "Englisch: Weiß kontrolliert d5 von der Seite."],
      ["e5", "Schwarz besetzt das Zentrum."],
      ["Nc3", "Weiß kontrolliert d5 und e4."],
      ["Nf6", "Schwarz entwickelt sich."],
      ["Nf3", "Greift e5 an."],
      ["Nc6", "Deckt e5."],
      ["g3", "Bereitet das Fianchetto vor: Der Läufer zielt über die lange Diagonale."],
      ["d5", "Schwarz öffnet das Zentrum."],
      ["cxd5", "Weiß tauscht."],
      ["Nxd5", "Der Springer schlägt zurück und steht zentral."],
      ["Bg2", "Der Läufer übt Druck auf d5 und die lange Diagonale aus."],
      ["Nb6", "Der Springer zieht sich aus dem Angriff zurück."],
    ],
  },
];

// Englische Kurznotation → deutsche Anzeige (Springer S, Läufer L, Turm T, Dame D)
export function sanDeutsch(san) {
  if (san.startsWith("O-O")) return san.replace(/O/g, "0");
  return san.replace(/^[NBRQ]/, (b) => ({ N: "S", B: "L", R: "T", Q: "D" })[b]).replace(/=([NBRQ])/, (_, b) => "=" + { N: "S", B: "L", R: "T", Q: "D" }[b]);
}

// Zug in SAN in der Stellung finden. zuege = Liste der legalen Züge der Engine, feldName = Index → "e4"
export function sanZuZug(pos, san, zuege, feldName) {
  const s = san.replace(/[+#!?]/g, "");
  const liste = zuege(pos);
  if (s === "O-O" || s === "O-O-O") return liste.find((m) => m.rochade && (s === "O-O") === (m.to % 8 === 6)) || null;
  const m = s.match(/^([KQRBN])?([a-h])?([1-8])?x?([a-h][1-8])(?:=([QRBN]))?$/);
  if (!m) return null;
  const [, figur = "P", vonLinie, vonReihe, ziel, umw] = m;
  return (
    liste.find((z) => {
      const p = pos.b[z.from].toUpperCase();
      if (p !== figur || feldName(z.to) !== ziel) return false;
      const von = feldName(z.from);
      if (vonLinie && von[0] !== vonLinie) return false;
      if (vonReihe && von[1] !== vonReihe) return false;
      if (umw && z.umw !== umw) return false;
      return true;
    }) || null
  );
}
