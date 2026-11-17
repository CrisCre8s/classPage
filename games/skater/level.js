// Stick-Skater – Welten und Level. Jede Strecke ist aus Bausteinen gebaut (siehe strecke.js) und wird mit
// festem Startwert erzeugt: Ein Level sieht bei jedem Versuch gleich aus und lässt sich lernen.
//
// Bausteine:
//   f / f:typ / f- / f$ / fl    flaches Stück: mit Hindernis aus dem Pool / mit genau diesem / leer / mit Tropfen / lang
//   l / l+ / lg                 Lücke ohne / mit Grind-Stange / große Lücke (Dächer)
//   t / t-                      Treppe runter mit / ohne Geländer
//   h / hd                      Kante hoch (springen!) / Kante runter
//   g:typ                       Grind-Objekt auf flachem Stück (gelaender, kante, rohr, kette, traeger, bahnsteig, kran, tafel)
//   riss / riss0                Dimensionsriss in der Luft / am Boden
//   band+ / band-               Fließband schneller / langsamer      presse / presse2   Stampfpresse(n)
//   zug                         fahrender Zug zum Draufspringen       ratte              huschende Ratte
//   dach                        Gebäudesprung (Lücke + neue Höhe)      panels             zerbrechender Boden
//   schwer                      kurz andere Schwerkraft

export const WELTEN = [
  { id: "downtown", name: "Neon-Downtown", kurz: "Graffiti, Treppen, Geländer", box: "Neon-Downtown. Eine Stadt, die nie schläft – und nie aufhört zu sprühen …", rail: "gelaender", pool: ["hydrant", "tonne", "kegel"], tempo: 1 },
  { id: "kanal", name: "Kanalisation", kurz: "Rohre, Lücken, Ratten", box: "Währenddessen, tief unter der Stadt …", rail: "rohr", pool: ["fass", "ratte", "fass"], tempo: 1 },
  { id: "fabrik", name: "Verlassene Fabrik", kurz: "Fließbänder, Pressen, Ketten", box: "Die alte Fabrik. Die Maschinen laufen noch. Niemand weiß, warum.", rail: "kette", pool: ["kiste", "kiste", "fass"], tempo: 1.02 },
  { id: "ubahn", name: "U-Bahn-Tunnel", kurz: "Züge, Bahnsteige, Flackerlicht", box: "Letzte Bahn. Nächster Halt: irgendwo zwischen den Dimensionen.", rail: "bahnsteig", pool: ["koffer", "schild", "koffer"], tempo: 1.04 },
  { id: "daecher", name: "Dächer & Skyline", kurz: "Kräne, Werbetafeln, große Lücken", box: "Über den Dächern geht die Sonne unter. Zeit für den großen Sprung.", rail: "kran", pool: ["luefter", "antenne", "luefter"], tempo: 1.06 },
  { id: "glitch", name: "Glitch-Dimension", kurz: "Alles zerfällt – das Finale", box: "Die Risse sind zu groß geworden. Die Welten fallen ineinander …", rail: "gelaender", pool: ["hydrant", "fass", "kiste", "koffer", "luefter"], tempo: 1.08 },
];
// Sterne, die man insgesamt braucht, um eine Welt zu öffnen (max. 90)
export const STERNE_FUER_WELT = [0, 7, 16, 27, 39, 52];

const A = {
  punkte: (n) => ({ typ: "punkte", n, text: `Erreiche ${n.toLocaleString("de-DE")} Punkte` }),
  combo: (n) => ({ typ: "combo", n, text: `Mach eine ${n}er-Combo` }),
  grind: (n, art, name) => ({ typ: "grind", n, art, text: `Grinde ${n} ${name}` }),
  trick: (n, art, name) => ({ typ: "trick", n, art, text: `${n}× ${name}` }),
  riss: (n) => ({ typ: "riss", n, text: n === 1 ? "Spring durch einen Riss" : `Spring durch ${n} Risse` }),
  tropfen: (n) => ({ typ: "tropfen", n, text: `Sammle ${n} Tinten-Tropfen` }),
  ohneSturz: () => ({ typ: "ohneSturz", n: 1, text: "Ohne Sturz ins Ziel" }),
};

export const LEVEL = [
  // ================= 1 Neon-Downtown =================
  { welt: 0, name: "Erste Schritte", box: "Neon-Downtown, 23:41 Uhr. Ein Strichmännchen. Ein Board. Los geht's …",
    strecke: ["f$", "f:hydrant", "f-", "g:gelaender", "f$", "f:tonne", "t", "f$", "f:kegel", "riss0", "f$", "g:kante", "f:hydrant", "f$"],
    aufgaben: [A.punkte(6000), A.grind(2, "gelaender", "Geländer"), A.combo(2)] },
  { welt: 0, name: "Treppenhaus", strecke: ["f$", "t", "f:tonne", "t", "f$", "g:gelaender", "t-", "f:hydrant", "riss", "f$", "t", "g:kante", "f:kegel", "t", "f$"],
    aufgaben: [A.punkte(18500), A.trick(3, "kickflip", "Kickflip"), A.ohneSturz()] },
  { welt: 0, name: "Graffiti-Gasse", strecke: ["f$", "g:kante", "f:hydrant", "g:kante", "h", "f:tonne", "riss", "f$", "g:gelaender", "hd", "f:kegel", "g:kante", "t", "f$", "f:hydrant", "g:gelaender", "f$"],
    aufgaben: [A.punkte(23000), A.grind(3, "kante", "Kanten"), A.combo(3)] },
  { welt: 0, name: "Hydranten-Slalom", strecke: ["f$", "f:hydrant", "f:hydrant", "l", "f:tonne", "g:gelaender", "riss", "f:hydrant", "t", "f:kegel", "f:hydrant", "h", "g:kante", "f$", "l+", "f:tonne", "t", "f$"],
    aufgaben: [A.punkte(19000), A.riss(1), A.tropfen(40)] },
  { welt: 0, name: "Downtown-Finale", strecke: ["f$", "t", "g:gelaender", "f:hydrant", "l+", "riss", "f:tonne", "t", "g:kante", "h", "f:kegel", "l", "g:gelaender", "l+", "riss0", "t", "f:hydrant", "g:kante", "l+", "f$"],
    aufgaben: [A.punkte(40500), A.combo(4), A.ohneSturz()] },

  // ================= 2 Kanalisation =================
  { welt: 1, name: "Abwärts", box: "Währenddessen, tief unter der Stadt …",
    strecke: ["f$", "f:fass", "l", "f$", "g:rohr", "l", "ratte", "f$", "riss", "l+", "f:fass", "g:rohr", "f$"],
    aufgaben: [A.punkte(11000), A.grind(3, "rohr", "Rohre"), A.combo(3)] },
  { welt: 1, name: "Rattenrennen", strecke: ["f$", "ratte", "f:fass", "ratte", "l", "g:rohr", "ratte", "riss", "f$", "l+", "ratte", "f:fass", "l", "f$"],
    aufgaben: [A.punkte(9000), A.trick(3, "heelflip", "Heelflip"), A.ohneSturz()] },
  { welt: 1, name: "Giftgrüner Fluss", strecke: ["f$", "l", "f:fass", "l+", "l", "riss0", "g:rohr", "l", "ratte", "l+", "f$", "l", "g:rohr", "f$"],
    aufgaben: [A.punkte(13000), A.riss(1), A.tropfen(50)] },
  { welt: 1, name: "Rohrpost", strecke: ["f$", "g:rohr", "l+", "g:rohr", "f:fass", "l+", "riss", "g:rohr", "ratte", "l+", "g:rohr", "h", "l+", "f$"],
    aufgaben: [A.punkte(17000), A.grind(6, "rohr", "Rohre"), A.combo(5)] },
  { welt: 1, name: "Der große Abfluss", strecke: ["f$", "l", "ratte", "l+", "riss", "f:fass", "l", "g:rohr", "hd", "ratte", "l+", "riss0", "l", "f:fass", "g:rohr", "l+", "f$"],
    aufgaben: [A.punkte(24500), A.riss(2), A.ohneSturz()] },

  // ================= 3 Verlassene Fabrik =================
  { welt: 2, name: "Schichtbeginn", box: "Die alte Fabrik. Die Maschinen laufen noch. Niemand weiß, warum.",
    strecke: ["f$", "band+", "f:kiste", "presse", "f$", "g:kette", "riss", "band-", "f:kiste", "g:traeger", "f$"],
    aufgaben: [A.punkte(7000), A.grind(2, "", "Ketten oder Träger"), A.combo(3)] },
  { welt: 2, name: "Stampfwerk", strecke: ["f$", "presse", "f:kiste", "presse2", "band+", "riss", "presse", "g:traeger", "f:fass", "presse2", "f$"],
    aufgaben: [A.punkte(6000), A.trick(2, "shove360", "360 Shove-it"), A.ohneSturz()] },
  { welt: 2, name: "Laufband-Chaos", strecke: ["f$", "band+", "band-", "g:kette", "band+", "f:kiste", "riss0", "band-", "presse", "band+", "l+", "g:traeger", "f$"],
    aufgaben: [A.punkte(8000), A.riss(1), A.tropfen(60)] },
  { welt: 2, name: "Stahlträger", strecke: ["f$", "g:traeger", "l+", "g:kette", "presse", "riss", "g:traeger", "h", "l+", "f:kiste", "g:kette", "t", "f$"],
    aufgaben: [A.punkte(20000), A.grind(4, "kette", "Ketten"), A.combo(5)] },
  { welt: 2, name: "Funkenregen", strecke: ["f$", "presse2", "band+", "l+", "riss", "g:kette", "presse", "f:kiste", "band-", "g:traeger", "presse2", "l", "riss0", "f:fass", "f$"],
    aufgaben: [A.punkte(8500), A.riss(2), A.ohneSturz()] },

  // ================= 4 U-Bahn-Tunnel =================
  { welt: 3, name: "Letzte Bahn", box: "Letzte Bahn. Nächster Halt: irgendwo zwischen den Dimensionen.",
    strecke: ["f$", "g:bahnsteig", "zug", "f$", "f:koffer", "riss", "g:bahnsteig", "zug", "f$"],
    aufgaben: [A.punkte(14000), A.grind(2, "bahnsteig", "Bahnsteigkanten"), A.combo(3)] },
  { welt: 3, name: "Zugdach-Ritt", strecke: ["f$", "zug", "f:schild", "zug", "riss", "g:gelaender", "zug", "f:koffer", "f$"],
    aufgaben: [A.punkte(16500), A.trick(3, "impossible", "Impossible"), A.ohneSturz()] },
  { welt: 3, name: "Stroboskop", strecke: ["f$", "g:bahnsteig", "f:koffer", "l+", "zug", "riss0", "t", "g:bahnsteig", "f:schild", "zug", "f$"],
    aufgaben: [A.punkte(12500), A.riss(1), A.tropfen(70)] },
  { welt: 3, name: "Gleiswechsel", strecke: ["f$", "zug", "l+", "g:bahnsteig", "zug", "riss", "f:koffer", "h", "g:gelaender", "zug", "f$"],
    aufgaben: [A.punkte(11500), A.combo(4), A.grind(3, "", "Kanten oder Geländer")] },
  { welt: 3, name: "Endstation", strecke: ["f$", "zug", "riss", "zug", "f:schild", "l+", "g:bahnsteig", "zug", "riss0", "t", "f:koffer", "zug", "f$"],
    aufgaben: [A.punkte(17500), A.riss(2), A.ohneSturz()] },

  // ================= 5 Dächer & Skyline =================
  { welt: 4, name: "Sonnenuntergang", box: "Über den Dächern geht die Sonne unter. Zeit für den großen Sprung.",
    strecke: ["f$", "f:luefter", "dach", "g:tafel", "riss", "dach", "g:kran", "f:antenne", "dach", "f$"],
    aufgaben: [A.punkte(8500), A.grind(2, "", "Kräne oder Tafeln"), A.combo(3)] },
  { welt: 4, name: "Kranfahrt", strecke: ["f$", "g:kran", "dach", "g:kran", "f:luefter", "riss", "dach", "g:tafel", "dach", "f$"],
    aufgaben: [A.punkte(10000), A.grind(3, "", "Kräne oder Tafeln"), A.ohneSturz()] },
  { welt: 4, name: "Werbetafeln", strecke: ["f$", "g:tafel", "dach", "f:antenne", "g:tafel", "riss0", "lg", "g:tafel", "dach", "f:luefter", "f$"],
    aufgaben: [A.punkte(11500), A.riss(1), A.tropfen(80)] },
  { welt: 4, name: "Höhenrausch", strecke: ["f$", "dach", "lg", "g:kran", "g:tafel", "dach", "riss", "f:luefter", "dach", "g:tafel", "g:kran", "lg", "dach", "f$"],
    aufgaben: [A.punkte(17500), A.combo(5), A.trick(4, "shove360", "360 Shove-it")] },
  { welt: 4, name: "Skyline-Finale", strecke: ["f$", "dach", "g:kran", "riss", "lg", "f:antenne", "dach", "g:tafel", "riss0", "dach", "g:kran", "lg", "f$"],
    aufgaben: [A.punkte(13000), A.riss(2), A.ohneSturz()] },

  // ================= 6 Glitch-Dimension =================
  { welt: 5, name: "Risse überall", box: "Die Risse sind zu groß geworden. Die Welten fallen ineinander …",
    strecke: ["f$", "riss0", "panels", "g:rohr", "f:hydrant", "riss", "band+", "zug", "f$"],
    aufgaben: [A.punkte(9500), A.riss(2), A.combo(4)] },
  { welt: 5, name: "Zerbrochene Panels", strecke: ["f$", "panels", "l+", "panels", "riss", "g:kette", "panels", "f:fass", "panels", "f$"],
    aufgaben: [A.punkte(14000), A.grind(2, "", "Stangen"), A.ohneSturz()] },
  { welt: 5, name: "Schwerelos", strecke: ["f$", "schwer", "lg", "riss", "schwer", "g:kran", "presse", "schwer", "dach", "f$"],
    aufgaben: [A.punkte(8000), A.trick(4, "impossible", "Impossible"), A.tropfen(50)] },
  { welt: 5, name: "Alles auf einmal", strecke: ["f$", "zug", "riss0", "panels", "presse", "ratte", "g:traeger", "l+", "schwer", "riss", "dach", "g:kette", "g:traeger", "band-", "f$"],
    aufgaben: [A.punkte(27000), A.combo(5), A.riss(2)] },
  { welt: 5, name: "Realität neu laden", box: "Ein letzter Sprung. Dann ist die Welt wieder ganz – oder für immer zerbrochen.",
    strecke: ["f$", "riss", "panels", "zug", "schwer", "riss0", "presse2", "l+", "dach", "g:kran", "panels", "riss", "lg", "f$"],
    aufgaben: [A.punkte(13000), A.riss(3), A.ohneSturz()] },
];

// Jede Strecke bekommt zusätzliche Abschnitte aus dem Baukasten ihrer Welt (fest gewürfelt pro Level),
// damit die Level länger werden, ohne dass die Sterne-Aufgaben ihren Sinn verlieren (keine Extra-Risse).
const EXTRA = [
  ["f", "g:gelaender", "t", "f$", "l", "g:kante", "h", "f", "l+", "hd", "f"],
  ["f", "l", "g:rohr", "ratte", "l+", "f$", "l", "f:fass", "g:rohr", "hd"],
  ["f", "band+", "g:kette", "presse", "f$", "g:traeger", "band-", "l+", "f:kiste"],
  ["f", "zug", "g:bahnsteig", "f$", "l+", "f:koffer", "t", "g:gelaender"],
  ["f", "dach", "g:kran", "g:tafel", "dach", "f$", "lg", "f:luefter", "dach"],
  ["f", "panels", "schwer", "l+", "zug", "presse", "ratte", "dach", "g:traeger", "band+"],
];
function verlaengern(l, i) {
  let a = (i + 1) * 2654435761;
  const rnd = () => {
    a = (a ^ (a >>> 13)) * 1274126177;
    a ^= a >>> 16;
    return (a >>> 0) / 4294967296;
  };
  const pool = EXTRA[l.welt];
  const ziehe = (n) => Array.from({ length: n }, () => pool[Math.floor(rnd() * pool.length)]);
  const mitte = Math.ceil(l.strecke.length / 2);
  const ende = l.strecke.length - 1; // das letzte Stück (Tropfen vor dem Ziel) bleibt am Schluss
  return [...l.strecke.slice(0, mitte), ...ziehe(5), ...l.strecke.slice(mitte, ende), ...ziehe(l.welt >= 3 ? 4 : 3), ...l.strecke.slice(ende)];
}
LEVEL.forEach((l, i) => {
  l.strecke = verlaengern(l, i);
});

export const levelName = (i) => `${LEVEL[i].welt + 1}-${LEVEL.slice(0, i + 1).filter((l) => l.welt === LEVEL[i].welt).length}`;
export const levelDerWelt = (w) => LEVEL.map((l, i) => (l.welt === w ? i : -1)).filter((i) => i >= 0);
