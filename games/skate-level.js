// Stick-Skater: 21 feste Level (7 Welten × 3). Jede Strecke ist von Hand zusammengesetzt und wird mit einem
// festen Startwert gebaut – sie sieht bei jedem Versuch gleich aus, damit man sie lernen kann.
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
//   zone:park  Wechsel der Stadt-Zone (mit Schild)

export const LEVEL = [
  // ---------------- Welt 1: Stadt ----------------
  {
    welt: 0, v: 0, zone: "dach", name: "Dächer bei Dämmerung", text: "Treppen runter, über Kanten springen, erste Rails.",
    ziel: 36, aufgabe: { typ: "kickflip", n: 3, text: "3 Kickflips" },
    pool: ["kegel", "klima", "rail", "kegel"], muenzen: 0.85,
    strecke: ["f$", "f:kegel", "t-", "f$", "f:rail", "h", "f:klima", "t+", "f$", "l-", "f:kegel", "k", "f$", "f:rail", "t", "f", "h", "f$", "l+", "f", "f$", "h", "f:rail", "t", "f$", "f:kegel", "l-", "f$", "f:rail", "f", "k", "h", "f", "f:kegel"],
  },
  {
    welt: 0, v: 1, zone: "park", name: "Skatepark bei Nacht", text: "Funboxen, Ledges und Rails – grinden, was geht.",
    ziel: 46, aufgabe: { typ: "grind", n: 6, text: "6-mal grinden" },
    pool: ["ledge", "rail", "pad", "brett", "rail"], muenzen: 0.85,
    strecke: ["f$", "f:ledge", "fb", "f:rail", "fb", "f$", "t+", "f:pad", "k", "f:ledge", "fb", "f:scooter", "f:rail", "t+", "fb", "f$", "k", "f:rail", "fb", "f:ledge", "f$", "f$", "f$", "k", "t+", "f:ledge", "f:rail", "k", "f$", "f:ledge", "fb", "fb", "t+", "f:pad", "fb", "f:rail"],
  },
  {
    welt: 0, v: 2, zone: "strasse", name: "Innenstadt im Regen", text: "Autos grinden, Scootern ausweichen, Show über die Autos.",
    ziel: 36, aufgabe: { typ: "auto", n: 2, text: "2 Autos grinden" },
    pool: ["auto", "hydrant", "tonne", "scooter", "bank", "auto"], muenzen: 0.85,
    strecke: ["f$", "f:auto", "f:hydrant", "l-", "f:bank", "f:auto", "k", "f:scooter", "f$", "f:tonne", "l+", "f:auto", "show:autos", "f:hydrant", "f:auto", "l", "f:scooter", "f:bank", "k", "f:auto", "f$", "f$", "l", "f:auto", "f:bank", "f:bank", "k", "f:hydrant", "f:scooter", "k", "f:auto", "l-", "f:auto", "f:auto", "f:auto", "l+"],
  },

  // ---------------- Welt 2: Strand ----------------
  {
    welt: 1, v: 0, name: "Sonnenuntergang", text: "Sandburgen, Surfbretter und Krabben im Abendlicht.",
    ziel: 36, aufgabe: { typ: "shove", n: 3, text: "3 Shove-its" },
    pool: ["sandburg", "surf", "liege", "krabbe", "ball"], muenzen: 0.85,
    strecke: ["f$", "f:sandburg", "f:surf", "l-", "f:krabbe", "f$", "h", "f:liege", "k", "f:ball", "l+", "f:surf", "f$", "f:sandburg", "l", "f:krabbe", "k", "f:surf", "f$", "f$", "h", "f:ball", "f:surf", "l+", "f:surf", "f$", "l-", "f:krabbe", "l", "f:liege", "f:krabbe", "f$"],
  },
  {
    welt: 1, v: 1, name: "Steg am Leuchtturm", text: "Mittagssonne: viele Sprünge über das Wasser, Holz-Rails am Steg.",
    ziel: 54, aufgabe: { typ: "gap", n: 6, text: "Über 6 Lücken springen" },
    pool: ["surf", "liege", "krabbe", "ball"], muenzen: 0.85,
    strecke: ["f$", "l+", "f:surf", "l-", "f$", "l+", "f:krabbe", "k", "l-", "f:liege", "l+", "f$", "l", "f:ball", "l+", "k", "f:surf", "l-", "l+", "f$", "f$", "f:surf", "f:surf", "l-", "l+", "l-", "l+", "f$", "l+", "k", "f$", "k", "f$", "l"],
  },
  {
    welt: 1, v: 2, name: "Strandparty bei Nacht", text: "Lampions, Lagerfeuer, leuchtende Wellen – und Feuerringe.",
    ziel: 36, aufgabe: { typ: "ring", n: 2, text: "Durch 2 Feuerringe" },
    pool: ["sandburg", "surf", "krabbe", "liege"], muenzen: 0.85,
    strecke: ["f$", "f:surf", "l-", "f:krabbe", "show:ring", "f:sandburg", "l+", "f$", "k", "f:liege", "show:ring", "f:surf", "l", "f:krabbe", "f$", "show:ring", "f-", "f$", "f:liege", "f$", "l-", "f:surf", "f:krabbe", "show:ring", "f-", "f:krabbe", "l+", "f:sandburg", "k"],
  },

  // ---------------- Welt 3: Dschungel ----------------
  {
    welt: 2, v: 0, name: "Urwaldpfad", text: "Baumstämme grinden, über Steine und Flüsse springen.",
    ziel: 52, aufgabe: { typ: "grind", n: 5, text: "5-mal grinden" },
    pool: ["stamm", "stein", "stamm"], muenzen: 0.85,
    strecke: ["f$", "f:stamm", "f:stein", "l-", "f:stamm", "h", "f$", "t", "f:stamm", "k", "f:stein", "l+", "f:stamm", "f$", "t+", "f:stein", "l", "f:stamm", "f$", "f$", "l+", "f$", "f$", "k", "f:stein", "f:stamm", "l", "f$", "f:stein", "f:stamm", "f:stein", "t+"],
  },
  {
    welt: 2, v: 1, name: "Pilztempel", text: "Uralte Ruinen und ein Wasserfall. Hüpf von Pilz zu Pilz!",
    ziel: 58, aufgabe: { typ: "pilz", n: 5, text: "5-mal auf Pilzen hüpfen" },
    pool: ["pilz", "stein", "stamm"], muenzen: 0.85,
    strecke: ["f$", "f:pilz", "f:stamm", "pilze", "f:stein", "l-", "f:pilz", "t+", "pilze", "f$", "k", "f:stamm", "pilze", "l+", "f:pilz", "f$", "f$", "l+", "pilze", "f:stamm", "l-", "k", "f:stein", "f:pilz", "pilze", "f:stamm", "f$"],
  },
  {
    welt: 2, v: 2, name: "Glühwürmchen-Nacht", text: "Nachts im Dschungel: Flüsse, Treppen und lange Sprünge.",
    ziel: 56, aufgabe: { typ: "combo", n: 2, text: "2er-Combo in einem Sprung" },
    pool: ["stamm", "stein", "pilz"], muenzen: 0.85,
    strecke: ["f$", "l-", "f:stamm", "t+", "f:pilz", "l+", "k", "f$", "t", "l-", "f:stein", "h", "k", "f:stamm", "l+", "show:ring", "f:pilz", "t+", "l", "f$", "f$", "f:pilz", "t+", "l", "k", "f:stein", "t", "l-", "k", "h", "l-", "f$", "t+", "l+"],
  },

  // ---------------- Welt 4: Eiswelt ----------------
  {
    welt: 3, v: 0, name: "Polarlicht", text: "Glattes Eis: du rollst weiter, als du denkst.",
    ziel: 48, aufgabe: { typ: "kickflip", n: 4, text: "4 Kickflips" },
    pool: ["schneemann", "eisblock", "eisrail"], muenzen: 0.85,
    strecke: ["f$", "f:schneemann", "l-", "f:eisrail", "t", "f$", "f:eisblock", "k", "f:schneemann", "l+", "f$", "t+", "f:eisrail", "l", "f:eisblock", "f$", "f$", "f$", "f$", "l", "l+", "f:eisblock", "f:eisrail", "t+", "f:schneemann", "t", "f:eisrail"],
  },
  {
    welt: 3, v: 1, name: "Gletscher am Mittag", text: "Eisberge, Pinguinkolonie und blaue Spalten.",
    ziel: 38, aufgabe: { typ: "backflip", n: 2, text: "2 Backflips" },
    pool: ["pinguin", "eisblock", "schneemann", "eisrail"], muenzen: 0.85,
    strecke: ["f$", "f:pinguin", "f:eisblock", "l-", "f:pinguin", "k", "f$", "t+", "f:eisrail", "l+", "f:pinguin", "h", "f:eisblock", "k", "f:pinguin", "l", "f$", "f$", "f:eisblock", "f:pinguin", "f$", "k", "l", "f$", "l+", "f:pinguin", "h", "f:pinguin", "t+"],
  },
  {
    welt: 3, v: 2, name: "Schneesturm", text: "Kaum Sicht, Eiszapfen fallen von den Felsen. Augen auf!",
    ziel: 60, aufgabe: { typ: "gap", n: 6, text: "Über 6 Lücken springen" },
    pool: ["schneemann", "eisblock", "pinguin"], muenzen: 0.85,
    strecke: ["f$", "l-", "f:eisblock", "regen", "l+", "f$", "k", "f:pinguin", "l-", "t+", "regen", "f:schneemann", "l", "k", "f$", "l+", "f-", "f$", "regen", "t+", "k", "f-", "f:eisblock", "f$", "k", "f:pinguin", "l-", "l+", "regen"],
  },

  // ---------------- Welt 5: Hölle ----------------
  {
    welt: 4, v: 0, name: "Lavahöhle", text: "Lava-Geysire blubbern, warnen und brechen aus.",
    ziel: 50, aufgabe: { typ: "combo", n: 2, text: "2er-Combo in einem Sprung" },
    pool: ["geysir", "lavastein", "kette"], muenzen: 0.85,
    strecke: ["f$", "f:geysir", "f:lavastein", "l-", "f:kette", "f:geysir", "k", "f$", "t+", "f:geysir", "l+", "f:lavastein", "f:geysir", "f$", "k", "f:kette", "f$", "f$", "k", "f$", "f:geysir", "f$", "f:lavastein", "f:kette", "f:lavastein", "l+", "f:geysir", "f:geysir", "f$"],
  },
  {
    welt: 4, v: 1, name: "Kettenbrücken", text: "Lavafälle, eine finstere Burg und glühende Ketten über dem Abgrund.",
    ziel: 58, aufgabe: { typ: "grind", n: 6, text: "6-mal grinden" },
    pool: ["kette", "geysir", "kette", "lavastein"], muenzen: 0.85,
    strecke: ["f$", "l+", "f:kette", "l+", "f:geysir", "t+", "f$", "l+", "f:kette", "k", "l+", "f:lavastein", "t+", "f:kette", "l+", "f$", "f$", "l+", "f$", "t+", "f:kette", "t+", "l+", "f:kette", "l+", "k", "l+"],
  },
  {
    welt: 4, v: 2, name: "Feuerregen", text: "Feuerbälle stürzen herab – spring durch die Ringe und über die Brocken.",
    ziel: 60, aufgabe: { typ: "ring", n: 2, text: "Durch 2 Feuerringe" },
    pool: ["geysir", "lavastein", "kette"], muenzen: 0.85,
    strecke: ["f$", "regen", "f:geysir", "show:ring", "l+", "f:lavastein", "regen", "k", "f:geysir", "show:ring", "l-", "regen", "f$", "f$", "f:geysir", "regen", "regen", "show:ring", "regen", "f$", "f:lavastein", "k"],
  },

  // ---------------- Welt 6: Himmel ----------------
  {
    welt: 5, v: 0, name: "Wolkeninseln", text: "Du schwebst länger. Wolken, goldene Rails, schwebende Tempel.",
    ziel: 60, aufgabe: { typ: "heelflip", n: 3, text: "3 Heelflips" },
    pool: ["wolke", "gold", "regenbogen"], muenzen: 0.85,
    strecke: ["f$", "f:wolke", "l-", "f:gold", "l+", "f$", "h", "f:regenbogen", "k", "l-", "f:wolke", "l+", "f:gold", "f$", "l", "f:regenbogen", "f$", "f$", "f$", "h", "l+", "f$", "l+", "k", "l-", "f:regenbogen", "f:wolke", "l-", "f:gold"],
  },
  {
    welt: 5, v: 1, name: "Abendrot", text: "Sonnenuntergang über den Wolken, ein Schloss in der Ferne, Regenbogen-Rails.",
    ziel: 44, aufgabe: { typ: "grindtrick", n: 3, text: "3 Grind-Tricks halten" },
    pool: ["regenbogen", "gold", "wolke", "regenbogen"], muenzen: 0.85,
    strecke: ["f$", "f:regenbogen", "l+", "f:gold", "f:regenbogen", "k", "f$", "l+", "f:wolke", "f:regenbogen", "show:ring", "l+", "f:gold", "f$", "f$", "l+", "f:gold", "f$", "k", "f:regenbogen", "f:gold", "f$", "f:wolke", "l+"],
  },
  {
    welt: 5, v: 2, name: "Gewitter", text: "Dunkle Wolken – wo es blitzt, liegt danach eine Gewitterwolke im Weg.",
    ziel: 70, aufgabe: { typ: "backflip", n: 2, text: "2 Backflips" },
    pool: ["gewitter", "wolke", "gold"], muenzen: 0.85,
    strecke: ["f$", "f:gewitter", "l-", "regen", "l+", "f:wolke", "k", "regen", "f$", "l-", "f:gold", "regen", "l+", "f:gewitter", "f$", "f$", "regen", "f$", "l-", "l+", "f:gold", "f:wolke", "regen", "k", "f:gewitter"],
  },

  // ---------------- Welt 7: Mond ----------------
  {
    welt: 6, v: 0, name: "Mondoberfläche", text: "Wenig Schwerkraft: riesige Sprünge über Krater und Rover.",
    ziel: 58, aufgabe: { typ: "backflip", n: 3, text: "3 Backflips" },
    pool: ["fels", "rover", "laser"], muenzen: 0.85,
    strecke: ["f$", "f:fels", "l-", "f:rover", "k", "f$", "l+", "f:laser", "h", "f:fels", "l-", "k", "f:rover", "f$", "l", "f:laser", "f$", "f$", "f:fels", "f:rover", "f$", "l", "f:rover", "l+", "f$", "f:fels", "h", "l-", "f$"],
  },
  {
    welt: 6, v: 1, name: "Mondbasis", text: "Kuppeln, Antennen, eine Landefähre – und Laser-Rails.",
    ziel: 46, aufgabe: { typ: "grind", n: 6, text: "6-mal grinden" },
    pool: ["laser", "rover", "fels", "laser"], muenzen: 0.85,
    strecke: ["f$", "f:laser", "l+", "f:rover", "t+", "f:laser", "k", "f$", "l+", "f:fels", "f:laser", "show:ring", "l+", "f:rover", "f:laser", "f$", "f$", "l+", "t+", "f:rover", "k", "f:fels", "l+", "f:laser", "show:ring", "f$", "f:laser"],
  },
  {
    welt: 6, v: 2, name: "Meteoritenschauer", text: "Das Finale: Meteore schlagen ein. Wer hier durchkommt, ist Legende.",
    ziel: 76, aufgabe: { typ: "shove360", n: 2, text: "2× 360 Shove-it" },
    pool: ["fels", "rover", "laser"], muenzen: 0.85,
    strecke: ["f$", "regen", "l+", "f:rover", "k", "regen", "f:laser", "show:ring", "l-", "regen", "l+", "f:fels", "k", "regen", "f$", "f$", "regen", "k", "l+", "l+", "regen", "f:rover", "regen", "f:laser", "k"],
  },
];

export const levelId = (i) => `${LEVEL[i].welt + 1}-${LEVEL[i].v + 1}`;
export const ersterVonWelt = (w) => LEVEL.findIndex((l) => l.welt === w);
