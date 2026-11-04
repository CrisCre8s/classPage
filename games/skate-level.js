// Stick-Skater: Training + 21 feste Level (7 Welten × 3). Jede Strecke ist von Hand zusammengesetzt und wird
// mit einem festen Startwert gebaut – sie sieht bei jedem Versuch gleich aus, damit man sie lernen kann.
// Aufbau jedes Levels: ruhiger Einstieg → Thema der Welt → Höhepunkt (Show, Einschläge, Pilz-Kette …) → Finale.
//
// Sterne: ★1 Münzziel in einer Fahrt (schaltet das nächste Level frei) · ★2 Level-Aufgabe · ★3 ohne Sturz ins Ziel
//
// Strecke (Bausteine, von links nach rechts):
//   f    flaches Stück mit Hindernis aus dem Pool       f:auto  mit genau diesem Hindernis      f-  ohne Hindernis
//   f$   flaches Stück mit Münzbogen                    fl      langes flaches Stück
//   t    Treppe (Geländer zufällig)   t+ mit Geländer    t- ohne
//   l    Lücke (Rail zufällig)        l+ mit Rail        l-  ohne
//   h    Stufe/Rampe nach oben        k  Kicker über eine Lücke         fb  Funbox (Skatepark)
//   show Boost + großer Sprung (Feuerring oder Autos)   pilze  drei Pilze hintereinander (Dschungel)
//   regen Einschläge von oben (Meteore, Feuerbälle, Blitze, Eiszapfen) auf einem langen Stück
//   zone:park  Wechsel der Stadt-Zone (mit Schild)      tipp:name  Hinweis im Training

export const LEVEL = [
  // ---------------- Training ----------------
  {
    welt: 0, v: 0, zone: "dach", tutorial: true, name: "Training", text: "Schieben, Ollie, Tricks, Grinden – Schritt für Schritt. Stürze kosten hier kein Leben.",
    ziel: 0, aufgabe: { typ: "kickflip", n: 1, text: "1 Kickflip" },
    pool: ["kegel"], muenzen: 1,
    strecke: ["tipp:schieben", "f-", "f$", "tipp:ollie", "f:kegel", "f-", "f:kegel", "tipp:kickflip", "f$", "f:kegel", "tipp:grind", "f:rail", "f-", "tipp:treppe", "t+", "tipp:luecke", "l-", "f$", "tipp:kicker", "k", "f$", "tipp:ziel", "f$"],
  },

  // ---------------- Welt 1: Stadt ----------------
  {
    welt: 0, v: 0, zone: "dach", name: "Dächer bei Dämmerung", text: "Über die Dächer: Kanten, Treppen und die ersten Geländer.",
    ziel: 62, aufgabe: { typ: "kickflip", n: 3, text: "3 Kickflips" },
    pool: ["kegel", "klima", "rail"], muenzen: 0.85,
    strecke: [
      "f$", "f:kegel", "f-", "f:klima",
      "t-", "f$", "f:rail", "h", "f:kegel", "t+", "f$", "l-", "f:klima", "f:rail",
      "k", "f$", "h", "f:kegel", "t", "f:rail", "l+", "f$",
      "f:klima", "l-", "f:kegel", "k", "t+", "f$", "f:rail",
    ],
  },
  {
    welt: 0, v: 1, zone: "park", name: "Skatepark bei Nacht", text: "Flutlicht an: Funboxen, Ledges, Rails – grinden, was geht.",
    ziel: 74, aufgabe: { typ: "grind", n: 6, text: "6-mal grinden" },
    pool: ["ledge", "rail", "pad", "brett"], muenzen: 0.85,
    strecke: [
      "f$", "f:ledge", "fb",
      "f:rail", "f:brett", "fb", "f$", "t+", "f:ledge", "k", "f:pad", "fb", "f:rail",
      "f:scooter", "f$", "t+", "fb", "f:ledge", "k", "f:rail", "fb", "f$",
      "f:ledge", "fb", "f:rail", "t+", "k", "f$", "f:ledge", "fb",
    ],
  },
  {
    welt: 0, v: 2, zone: "strasse", name: "Innenstadt im Regen", text: "Neon im Regen: Autos grinden, Scootern ausweichen, Show über die Autos.",
    ziel: 72, aufgabe: { typ: "auto", n: 2, text: "2 Autos grinden" },
    pool: ["auto", "hydrant", "tonne", "scooter", "bank"], muenzen: 0.85,
    strecke: [
      "f$", "f:hydrant", "f:auto",
      "f:bank", "l-", "f:tonne", "f:auto", "f$", "f:scooter", "k", "f:hydrant", "l+", "f:auto",
      "show:autos", "f$", "f:scooter", "f:bank", "l", "f:auto", "f:tonne",
      "k", "f$", "f:auto", "l-", "f:scooter", "f:hydrant", "f:auto", "l+", "f$",
    ],
  },

  // ---------------- Welt 2: Strand ----------------
  {
    welt: 1, v: 0, name: "Sonnenuntergang", text: "Sandburgen, Surfbretter und Krabben im Abendlicht.",
    ziel: 68, aufgabe: { typ: "shove", n: 3, text: "3 Shove-its" },
    pool: ["sandburg", "surf", "liege", "krabbe", "ball"], muenzen: 0.85,
    strecke: [
      "f$", "f:sandburg", "f-",
      "f:surf", "l-", "f:krabbe", "f$", "h", "f:liege", "k", "f:ball", "l+", "f:surf",
      "f$", "f:sandburg", "l", "f:krabbe", "k", "f:surf", "f:ball", "f$",
      "l-", "f:liege", "f:krabbe", "l+", "f:sandburg", "k", "f$",
    ],
  },
  {
    welt: 1, v: 1, name: "Steg am Leuchtturm", text: "Mittagssonne: Sprünge über das Wasser, Holz-Rails am Steg.",
    ziel: 90, aufgabe: { typ: "gap", n: 6, text: "Über 6 Lücken springen" },
    pool: ["surf", "liege", "krabbe", "ball"], muenzen: 0.85,
    strecke: [
      "f$", "f:ball", "l-",
      "f:surf", "l+", "f$", "l-", "f:krabbe", "l+", "k", "f:liege", "l-", "f$", "l+",
      "f:surf", "l", "f:ball", "l+", "l-", "k", "f$", "f:krabbe",
      "l+", "l-", "f:surf", "l+", "k", "f$",
    ],
  },
  {
    welt: 1, v: 2, name: "Strandparty bei Nacht", text: "Lampions, Lagerfeuer, leuchtende Wellen – und drei Feuerringe.",
    ziel: 62, aufgabe: { typ: "ring", n: 2, text: "Durch 2 Feuerringe" },
    pool: ["sandburg", "surf", "krabbe", "liege"], muenzen: 0.85,
    strecke: [
      "f$", "f:surf", "l-",
      "f:krabbe", "show:ring", "f:sandburg", "l+", "f$", "k", "f:liege",
      "show:ring", "f:surf", "l", "f:krabbe", "f$", "l+", "f:sandburg",
      "k", "f:surf", "show:ring", "f$", "l-", "f:krabbe", "f$",
    ],
  },

  // ---------------- Welt 3: Dschungel ----------------
  {
    welt: 2, v: 0, name: "Urwaldpfad", text: "Baumstämme grinden, über Steine und Flüsse springen.",
    ziel: 76, aufgabe: { typ: "grind", n: 5, text: "5-mal grinden" },
    pool: ["stamm", "stein"], muenzen: 0.85,
    strecke: [
      "f$", "f:stein", "f:stamm",
      "l-", "f:stamm", "h", "f$", "t", "f:stein", "k", "f:stamm", "l+", "f:stein",
      "f$", "t+", "f:stamm", "l", "f:stein", "h", "f:stamm", "k",
      "f$", "l+", "f:stamm", "f:stein", "t+", "f$",
    ],
  },
  {
    welt: 2, v: 1, name: "Pilztempel", text: "Uralte Ruinen und ein Wasserfall. Hüpf von Pilz zu Pilz!",
    ziel: 66, aufgabe: { typ: "pilz", n: 5, text: "5-mal auf Pilzen hüpfen" },
    pool: ["pilz", "stein", "stamm"], muenzen: 0.85,
    strecke: [
      "f$", "f:pilz", "f-",
      "f:stamm", "pilze", "f:stein", "l-", "f$", "f:pilz", "t+", "f:stamm",
      "pilze", "f$", "k", "f:stein", "l+", "f:pilz", "h",
      "pilze", "f$", "f:stamm", "l-", "f:pilz", "f$",
    ],
  },
  {
    welt: 2, v: 2, name: "Glühwürmchen-Nacht", text: "Nachts im Dschungel: Flüsse, Treppen und ein Ring über dem Wasser.",
    ziel: 74, aufgabe: { typ: "combo", n: 2, text: "2er-Combo in einem Sprung" },
    pool: ["stamm", "stein", "pilz"], muenzen: 0.85,
    strecke: [
      "f$", "f:stamm", "l-",
      "t+", "f:pilz", "l+", "k", "f$", "t", "l-", "f:stein", "h", "k", "f:stamm",
      "l+", "show:ring", "f$", "f:pilz", "t+", "l", "f:stein",
      "pilze", "k", "l-", "f:stamm", "f$",
    ],
  },

  // ---------------- Welt 4: Eiswelt ----------------
  {
    welt: 3, v: 0, name: "Polarlicht", text: "Glattes Eis: du rollst weiter, als du denkst. Iglus leuchten am Weg.",
    ziel: 66, aufgabe: { typ: "kickflip", n: 4, text: "4 Kickflips" },
    pool: ["schneemann", "eisblock", "eisrail"], muenzen: 0.85,
    strecke: [
      "f$", "f:schneemann", "f-",
      "l-", "f:eisrail", "t", "f$", "f:eisblock", "k", "f:schneemann", "l+",
      "f$", "t+", "f:eisrail", "l", "f:eisblock", "h", "f:schneemann",
      "k", "f$", "l-", "f:eisrail", "f:schneemann", "f$",
    ],
  },
  {
    welt: 3, v: 1, name: "Gletscher am Mittag", text: "Eisberge, Pinguinkolonie und blaue Spalten.",
    ziel: 64, aufgabe: { typ: "backflip", n: 2, text: "2 Backflips" },
    pool: ["pinguin", "eisblock", "schneemann", "eisrail"], muenzen: 0.85,
    strecke: [
      "f$", "f:pinguin", "f-",
      "f:eisblock", "l-", "f:pinguin", "k", "f$", "t+", "f:eisrail", "l+", "f:pinguin",
      "h", "f:eisblock", "k", "f$", "f:pinguin", "l", "f:schneemann",
      "t+", "f:pinguin", "l-", "k", "f$",
    ],
  },
  {
    welt: 3, v: 2, name: "Schneesturm", text: "Kaum Sicht, Eiszapfen fallen von den Felsen. Augen auf!",
    ziel: 64, aufgabe: { typ: "gap", n: 6, text: "Über 6 Lücken springen" },
    pool: ["schneemann", "eisblock", "pinguin"], muenzen: 0.85,
    strecke: [
      "f$", "f:eisblock", "l-",
      "regen", "l+", "f$", "k", "f:pinguin", "l-", "t+",
      "regen", "f:schneemann", "l", "k", "f$", "l+", "f:eisblock",
      "l-", "regen", "l+", "f$",
    ],
  },

  // ---------------- Welt 5: Hölle ----------------
  {
    welt: 4, v: 0, name: "Lavahöhle", text: "Lava-Geysire blubbern, warnen und brechen aus. Fledermäuse unter der Decke.",
    ziel: 70, aufgabe: { typ: "combo", n: 2, text: "2er-Combo in einem Sprung" },
    pool: ["geysir", "lavastein", "kette"], muenzen: 0.85,
    strecke: [
      "f$", "f:lavastein", "f:geysir",
      "l-", "f:kette", "f:geysir", "k", "f$", "t+", "f:geysir", "l+", "f:lavastein",
      "f:geysir", "f$", "k", "f:kette", "l", "f:geysir",
      "t+", "f$", "f:lavastein", "f:geysir", "k", "f$",
    ],
  },
  {
    welt: 4, v: 1, name: "Kettenbrücken", text: "Lavafälle, eine finstere Burg und glühende Ketten über dem Abgrund.",
    ziel: 92, aufgabe: { typ: "grind", n: 6, text: "6-mal grinden" },
    pool: ["kette", "geysir", "lavastein"], muenzen: 0.85,
    strecke: [
      "f$", "f:kette", "l+",
      "f:geysir", "l+", "t+", "f$", "l+", "f:kette", "k", "l+", "f:lavastein",
      "t+", "f:kette", "l+", "f$", "f:geysir", "l+", "k",
      "f:kette", "l+", "t+", "f$",
    ],
  },
  {
    welt: 4, v: 2, name: "Feuerregen", text: "Feuerbälle stürzen herab – spring durch die Ringe und über die Brocken.",
    ziel: 66, aufgabe: { typ: "ring", n: 2, text: "Durch 2 Feuerringe" },
    pool: ["geysir", "lavastein", "kette"], muenzen: 0.85,
    strecke: [
      "f$", "f:geysir", "l-",
      "regen", "show:ring", "l+", "f:lavastein", "f$", "regen", "k", "f:geysir",
      "show:ring", "l-", "f$", "regen", "f:kette", "l+",
      "show:ring", "f$",
    ],
  },

  // ---------------- Welt 6: Himmel ----------------
  {
    welt: 5, v: 0, name: "Wolkeninseln", text: "Du schwebst länger. Wolken, goldene Rails, schwebende Tempel.",
    ziel: 84, aufgabe: { typ: "heelflip", n: 3, text: "3 Heelflips" },
    pool: ["wolke", "gold", "regenbogen"], muenzen: 0.85,
    strecke: [
      "f$", "f:wolke", "l-",
      "f:gold", "l+", "f$", "h", "f:regenbogen", "k", "l-", "f:wolke", "l+",
      "f:gold", "f$", "l", "f:regenbogen", "k", "f:wolke",
      "l-", "f$", "l+", "f:gold", "f$",
    ],
  },
  {
    welt: 5, v: 1, name: "Abendrot", text: "Sonnenuntergang über den Wolken, ein Schloss in der Ferne, Regenbogen-Rails.",
    ziel: 78, aufgabe: { typ: "grindtrick", n: 3, text: "3 Grind-Tricks halten" },
    pool: ["regenbogen", "gold", "wolke"], muenzen: 0.85,
    strecke: [
      "f$", "f:regenbogen", "l+",
      "f:gold", "f:regenbogen", "k", "f$", "l+", "f:wolke", "f:regenbogen", "l-",
      "show:ring", "f$", "l+", "f:gold", "f:regenbogen", "k",
      "l+", "f:regenbogen", "f$",
    ],
  },
  {
    welt: 5, v: 2, name: "Gewitter", text: "Dunkle Wolken – wo es blitzt, liegt danach eine Gewitterwolke im Weg.",
    ziel: 78, aufgabe: { typ: "backflip", n: 2, text: "2 Backflips" },
    pool: ["gewitter", "wolke", "gold"], muenzen: 0.85,
    strecke: [
      "f$", "f:gewitter", "l-",
      "regen", "l+", "f:wolke", "k", "f$", "regen", "l-", "f:gold",
      "l+", "f:gewitter", "regen", "f$", "k", "l-",
      "f:gewitter", "l+", "f$",
    ],
  },

  // ---------------- Welt 7: Mond ----------------
  {
    welt: 6, v: 0, name: "Mondoberfläche", text: "Wenig Schwerkraft: riesige Sprünge über Krater und Rover.",
    ziel: 76, aufgabe: { typ: "backflip", n: 3, text: "3 Backflips" },
    pool: ["fels", "rover", "laser"], muenzen: 0.85,
    strecke: [
      "f$", "f:fels", "l-",
      "f:rover", "k", "f$", "l+", "f:laser", "h", "f:fels", "l-", "k", "f:rover",
      "f$", "l", "f:laser", "f:fels", "k", "l+",
      "f$", "f:rover", "l-", "f$",
    ],
  },
  {
    welt: 6, v: 1, name: "Mondbasis", text: "Kuppeln, Antennen, eine Landefähre – und Laser-Rails.",
    ziel: 84, aufgabe: { typ: "grind", n: 6, text: "6-mal grinden" },
    pool: ["laser", "rover", "fels"], muenzen: 0.85,
    strecke: [
      "f$", "f:laser", "l+",
      "f:rover", "t+", "f:laser", "k", "f$", "l+", "f:fels", "f:laser",
      "show:ring", "l+", "f:rover", "f:laser", "f$", "t+", "k",
      "f:laser", "l+", "f$",
    ],
  },
  {
    welt: 6, v: 2, name: "Meteoritenschauer", text: "Das Finale: Meteore schlagen ein. Wer hier durchkommt, ist Legende.",
    ziel: 80, aufgabe: { typ: "shove360", n: 2, text: "2× 360 Shove-it" },
    pool: ["fels", "rover", "laser"], muenzen: 0.85,
    strecke: [
      "f$", "f:fels", "l-",
      "regen", "l+", "f:rover", "k", "regen", "f:laser", "f$",
      "show:ring", "l-", "regen", "l+", "f:fels", "k",
      "regen", "f$", "show:ring", "f$",
    ],
  },
];

export const levelId = (i) => (LEVEL[i].tutorial ? "Training" : `${LEVEL[i].welt + 1}-${LEVEL[i].v + 1}`);
export const ersterVonWelt = (w) => LEVEL.findIndex((l) => l.welt === w && !l.tutorial);
export const STERNE_MAX = LEVEL.filter((l) => !l.tutorial).length * 3;

// Hinweise im Training (Tastatur / Touch)
export const TIPPS = {
  schieben: ["→ gedrückt halten: anschieben", "Links gedrückt halten: anschieben"],
  ollie: ["Leertaste: Ollie über den Kegel – folge den Münzen!", "Rechts wischen ↓ dann ↑: Ollie über den Kegel"],
  kickflip: ["In der Luft ↑ drücken: Kickflip", "Wisch ↓ dann ↗: Kickflip"],
  grind: ["Spring auf die Stange – du grindest von selbst", "Ollie auf die Stange – du grindest von selbst"],
  treppe: ["Treppe: aufs Geländer springen oder ganz drüber", "Treppe: aufs Geländer springen oder ganz drüber"],
  luecke: ["Lücke: an den gelben Pfeilen abspringen", "Lücke: an den gelben Pfeilen abspringen"],
  kicker: ["Kicker: einfach drüberfahren und fliegen", "Kicker: einfach drüberfahren und fliegen"],
  ziel: ["Gleich im Ziel! Danach geht's los mit Level 1-1", "Gleich im Ziel! Danach geht's los mit Level 1-1"],
};
