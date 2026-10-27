// Stick-Skater: Strichmännchen auf dem Skateboard über die Dächer einer Stadt bei Nacht.
// Unterschiedliche Höhen, Treppen (springen!), Geländer an Treppen und über Lücken zum Grinden,
// Rampen, Kisten, Kegel und Münzen. Wird in voller Bildschirmauflösung gezeichnet.
import { overlayKlick } from "./eingabe.js";
import { WELTEN, STADT_ZONEN, ZONEN, weltVonZone, PHYSIK, BODEN_STIL, RAIL_STIL, HINDERNISSE, zeichneHintergrund, zeichneWetter, bodenDetail, zeichneLuecke, dekoFuerWelt, VOGEL, zeichneWeltDeko, zeichneKleinWelt, zeichneKisteWelt, zeichneRailWelt, zeichneMover, zeichnePilz, zeichneGeysir, RING_FARBEN, zeichneWeltSymbol } from "./skate-welten.js";
import { BOARDS, boardVon, boardFaktoren, neueAufgabe, laden, speichern } from "./skate-fortschritt.js";

export const HILFE = "Karte: ← → Welt wählen · B Boards · Leertaste los · Im Spiel: → oder D anschieben · Leertaste/↑ springen (kurz = kleiner Hüpfer, halten = hoch) · auf der Stange: ↑ ↓ ← → Grind-Tricks · in der Luft: ↑ Kickflip · ↓ Shove-it · ← Backflip · Handy: tippen springt, wischen = Trick · P: Pause";

const W = 960; // logische Größe; gezeichnet wird in echter Bildschirmauflösung
const H = 480;
const SPIELER_X = 220;
const SCHWERKRAFT = 2300;
const SPRUNG = 740;
const STUFE_B = 32; // Treppenstufe: Breite
const STUFE_H = 21; //                Höhe

// Stufen unterscheiden sich in Länge der freien Strecken, Anzahl der Hindernisse und Sprünge
// flachLang: freie Strecke · nachSprung: Auslauf nach Treppe/Lücke · hindernis: Anteil der Strecken mit Hindernis
// show: Chance auf eine Show-Einlage pro Zone (Boost + Sprung über Autos oder durch den Feuerring)
const STUFEN = {
  leicht: { max: 430, schub: 105, reibung: 16, leben: 3, flachLang: [560, 820], nachSprung: [420, 560], hindernis: 0.5, muenzen: 0.45, show: 0.6, zone: [3400, 4400], treppe: [3, 4], luecke: [70, 100], gewichte: { flach: 6, treppe: 2, luecke: 1, hoch: 2, kicker: 1 }, railChance: 0.5, wand: false },
  mittel: { max: 510, schub: 100, reibung: 18, leben: 2, flachLang: [440, 660], nachSprung: [360, 470], hindernis: 0.7, muenzen: 0.4, show: 0.75, zone: [3200, 4200], treppe: [4, 6], luecke: [90, 140], gewichte: { flach: 4, treppe: 3, luecke: 2, hoch: 2, kicker: 1 }, railChance: 0.55, wand: true },
  schwer: { max: 590, schub: 95, reibung: 20, leben: 1, flachLang: [330, 500], nachSprung: [300, 400], hindernis: 0.88, muenzen: 0.35, show: 0.9, zone: [3000, 4000], treppe: [5, 8], luecke: [120, 180], gewichte: { flach: 3, treppe: 3, luecke: 3, hoch: 2, kicker: 2 }, railChance: 0.6, wand: true },
};
const GRIND_TRICKS = {
  nose: { name: "Nosegrind", muenzen: 1 },
  board: { name: "Boardslide", muenzen: 2 },
  tail: { name: "Tailslide", muenzen: 1 },
  crooked: { name: "Crooked", muenzen: 2 },
};
const BOOST_TEMPO = 720; // Tempo auf dem Boost-Streifen vor den großen Sprüngen
const WELT_PX = 450 * 40; // so lang ist eine Welt (450 m); danach kommt ein Portal in die nächste
const LAEDEN = ["KIOSK", "PIZZA", "CAFÉ", "BURGER", "24/7", "SNEAKER", "GAMES", "DÖNER", "BÄCKER", "COMICS"];
const KICKER_FARBE = {
  strand: ["#b07a44", "#fff0c8"],
  dschungel: ["#5a3a1e", "#8fd35a"],
  eis: ["#6f9ec8", "#ffffff"],
  hoelle: ["#3a1410", "#ff7a3a"],
  himmel: ["#dfe7f7", "#f5c842"],
  weltall: ["#4b4f63", "#5ff7ff"],
};
const AUTOFARBEN = ["#e5566f", "#5fc39c", "#7fb8ff", "#f0a35e", "#b48ef0", "#d9d6e2"];
const SCHUB_DAUER = 0.5; // so lange dauert ein Anschieben mit dem Fuß (aufsetzen, schieben, zurück)

const TRICKS = {
  kickflip: { name: "Kickflip", dauer: 0.42, muenzen: 1 },
  shove: { name: "Shove-it", dauer: 0.38, muenzen: 1 },
  backflip: { name: "Backflip", dauer: 0.72, muenzen: 3 },
};

const zufall = (a, b) => a + Math.random() * (b - a);
const ganz = (a, b) => Math.floor(zufall(a, b + 1));
const lerp = (a, b, k) => a + (b - a) * k;

export function start({ canvas, stufe, passeCanvas, status, nachricht, ergebnis }) {
  const S = STUFEN[stufe] || STUFEN.mittel;
  const ctx = passeCanvas(canvas, W, H);
  const grob = window.matchMedia("(pointer: coarse)").matches;

  // ---------- HD: Zeichenfläche so groß wie auf dem Bildschirm ----------
  let skala = 1;
  function passeAufloesung() {
    const breite = canvas.getBoundingClientRect().width;
    if (!breite) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const px = Math.max(W, Math.round(breite * dpr));
    if (canvas.width !== px) {
      canvas.width = px;
      canvas.height = Math.round((px * H) / W);
    }
    skala = canvas.width / W;
  }
  const ro = new ResizeObserver(passeAufloesung);
  ro.observe(canvas);

  // ---------- Zustand ----------
  let zustand, raf, zuletzt;
  let kamX, kamY, tempo, punkte, meter, leben, unverwundbar, muenzenZahl;
  let teile, objekte, muenzen, deko, cursor, ebene;
  let zone, zoneBis, showOffen, jubel;
  let sp; // Spieler
  let popups, teilchen;
  let weltIdx, naechsteWeltX, aktWelt, banner, abgerechnet, weltAnfangX;
  // Fortschritt (Münzkonto, Welten, Boards, Aufgaben)
  const fp = laden(WELTEN);
  let board = boardVon(fp.board);
  let bf = boardFaktoren(board);
  const maxT = () => S.max * bf.tempo;
  let wahlWelt = fp.startWelt;
  let wahlBoard = Math.max(0, BOARDS.findIndex((b) => b.id === fp.board));
  let knoepfe = []; // klickbare Flächen im Menü
  let bgAktuell = null;
  let bgAlt = null;
  let bgMix = 1;

  function neu() {
    kamX = 0;
    tempo = 0; // Tempo kommt nur vom Anschieben
    punkte = 0;
    meter = 0;
    leben = S.leben;
    unverwundbar = 0;
    muenzenZahl = 0;
    teile = [];
    objekte = [];
    muenzen = [];
    deko = [];
    ebene = 0;
    cursor = -400;
    zone = null;
    jubel = 0;
    weltIdx = fp.startWelt;
    aktWelt = weltIdx;
    weltAnfangX = 0;
    naechsteWeltX = WELT_PX;
    abgerechnet = false;
    neueZone();
    flach(1100, false);
    sp = { y: 0, vy: 0, amBoden: true, auf: null, halten: false, haltZeit: 0, trick: null, kombi: [], sturz: null, absprung: null, schub: null, boost: 0 };
    kamY = -H * 0.68;
    popups = [];
    teilchen = [];
    erzeuge();
    banner = { titel: WELTEN[weltIdx].name, unter: `Welt ${weltIdx + 1}`, t: 0, farbe: WELTEN[weltIdx].farbe };
    bgAktuell = null;
    zeigeStatus();
  }

  // ---------- Strecke erzeugen ----------
  // Die Strecke besteht aus Zonen (Dächer, Skatepark, Innenstadt) mit eigenen Hindernissen und Deko.
  // Gibt "welt" zurück, wenn ein Portal in die nächste Welt gesetzt wurde, "zone" bei neuer Zone
  function neueZone() {
    let wechsel = null;
    if (cursor >= naechsteWeltX) {
      weltIdx++;
      naechsteWeltX = cursor + WELT_PX;
      wechsel = "welt";
    }
    const welt = WELTEN[weltIdx % WELTEN.length];
    const vorher = zone;
    if (welt.id === "stadt") {
      const andere = STADT_ZONEN.filter((z) => z !== zone);
      zone = zone === null ? "dach" : andere[Math.floor(Math.random() * andere.length)];
    } else zone = welt.id;
    zoneBis = Math.min(cursor + ganz(...S.zone), naechsteWeltX);
    showOffen = Math.random() < S.show;
    if (wechsel) deko.push({ art: "portal", x: cursor + 220, y: ebene, name: welt.name, farbe: welt.farbe, idx: weltIdx, durch: false });
    else if (cursor > 0 && zone !== vorher) {
      deko.push({ art: "schild", x: cursor + 140, y: ebene, zone });
      wechsel = "zone";
    }
    return wechsel;
  }

  function muenzReihe(xa, ya, xb, yb, hoehe = 0, n = 3, sicher = false) {
    if (!sicher && Math.random() > S.muenzen) return;
    for (let i = 0; i < n; i++) {
      const k = n === 1 ? 0.5 : i / (n - 1);
      muenzen.push({ x: lerp(xa, xb, k), y: lerp(ya, yb, k) - Math.sin(k * Math.PI) * hoehe, weg: 0 });
    }
  }

  function flach(laenge, mitHindernis = true) {
    teile.push({ art: "flach", x0: cursor, x1: cursor + laenge, y: ebene, zone });
    dekoFuer(cursor, cursor + laenge);
    if (mitHindernis && laenge > 330 && Math.random() < S.hindernis) hindernis(cursor + laenge * zufall(0.42, 0.6), cursor, cursor + laenge);
    cursor += laenge;
  }

  // ein Hindernis passend zur Zone
  function hindernis(mitte, x0, x1) {
    const y = ebene;
    const auswahl = {
      dach: ["kegel", "klima", "rail", "kicker", "kegel"],
      park: ["ledge", "rail", "kicker", "pad", "brett", "scooter"],
      strasse: ["auto", "hydrant", "tonne", "kegel", "scooter", "brett", "bank"],
    }[zone] || HINDERNISSE[zone];
    const art = auswahl[Math.floor(Math.random() * auswahl.length)];
    const KLEIN = { sandburg: [44, 30], ball: [26, 26], stein: [34, 26], lavastein: [34, 26], fels: [38, 28], schneemann: [30, 46], gewitter: [40, 34] };
    const MOVER = { krabbe: [30, 24, 40, 90], pinguin: [28, 36, 30, 60], rover: [36, 34, 40, 80] };
    if (KLEIN[art]) {
      const [w, h] = KLEIN[art];
      objekte.push({ art: "klein", stil: art, x: mitte, y, w, h });
      muenzReihe(mitte - 70, y - 60 - h * 0.5, mitte + 90, y - 60 - h * 0.5, 70);
      return;
    }
    if (MOVER[art]) {
      const [w, h, v0, v1] = MOVER[art];
      objekte.push({ art: "scooter", stil: art, x: mitte, y, w, h, v: zufall(v0, v1), x0: x0 + 20, x1: x1 - 60, phase: Math.random() * 6 });
      return;
    }
    if (art === "eisblock" || art === "wolke") {
      const w = art === "wolke" ? zufall(110, 150) : zufall(70, 100);
      const h = art === "wolke" ? 30 : zufall(36, 48);
      objekte.push({ art: "kiste", stil: art, x: mitte - w / 2, y, w, h });
      muenzReihe(mitte - w / 3, y - h - 34, mitte + w / 3, y - h - 34);
      return;
    }
    if (art === "pilz") {
      objekte.push({ art: "pilz", x: mitte - 32, y, w: 64, h: 40, gedrueckt: 0 });
      muenzReihe(mitte - 10, y - 190, mitte + 150, y - 190, 0, 3, true);
      return;
    }
    if (art === "geysir") {
      objekte.push({ art: "geysir", x: mitte - 13, y, w: 26, phase: Math.random() * 2.8 });
      muenzReihe(mitte - 60, y - 70, mitte + 60, y - 70, 60);
      return;
    }
    if (art === "surf" || art === "liege" || art === "stamm") {
      const w = art === "surf" ? zufall(170, 230) : art === "liege" ? zufall(120, 150) : zufall(220, 340);
      const h = art === "surf" ? 34 : art === "liege" ? 24 : 22;
      objekte.push({ art: "rail", stil: art, x0: mitte - w / 2, x1: mitte + w / 2, y0: y - h, y1: y - h, boden: y, farbe: AUTOFARBEN[ganz(0, AUTOFARBEN.length - 1)] });
      muenzReihe(mitte - w / 3, y - h - 34, mitte + w / 3, y - h - 34);
      return;
    }
    if (art === "kegel") {
      objekte.push({ art: "klein", stil: "kegel", x: mitte, y, w: 24, h: 32 });
      muenzReihe(mitte - 70, y - 60, mitte + 90, y - 60, 70);
    } else if (art === "hydrant") objekte.push({ art: "klein", stil: "hydrant", x: mitte, y, w: 20, h: 32 });
    else if (art === "tonne") objekte.push({ art: "klein", stil: "tonne", x: mitte, y, w: 28, h: 42 });
    else if (art === "brett") objekte.push({ art: "klein", stil: "brett", x: mitte, y, w: 40, h: 10 });
    else if (art === "scooter") objekte.push({ art: "scooter", x: mitte, y, w: 30, h: 56, v: zufall(60, 120), x0: x0 + 20, x1: x1 - 60, phase: Math.random() * 6 });
    else if (art === "klima") {
      const w = zufall(70, 100);
      objekte.push({ art: "kiste", stil: "klima", x: mitte - w / 2, y, w, h: zufall(38, 50) });
    } else if (art === "pad") {
      objekte.push({ art: "kiste", stil: "pad", x: mitte - 90, y, w: 180, h: 18 });
      muenzReihe(mitte - 50, y - 52, mitte + 50, y - 52);
    } else if (art === "auto") {
      // Dach als Grind-Kante; vorbeifahren geht auch
      objekte.push({ art: "rail", stil: "auto", x0: mitte - 57, x1: mitte + 57, y0: y - 46, y1: y - 46, boden: y, farbe: AUTOFARBEN[ganz(0, AUTOFARBEN.length - 1)] });
      muenzReihe(mitte - 40, y - 84, mitte + 40, y - 84);
    } else if (art === "kicker") {
      objekte.push({ art: "kicker", x0: mitte - 45, x1: mitte + 45, y, h: 44 });
      muenzReihe(mitte + 80, y - 150, mitte + 260, y - 60, 40);
    } else {
      // Rail, Ledge oder Bank zum Grinden
      const w = art === "bank" ? zufall(120, 170) : Math.random() < 0.35 ? zufall(300, 400) : zufall(190, 290);
      const h = art === "ledge" ? 30 : art === "bank" ? 30 : 40;
      objekte.push({ art: "rail", stil: art, x0: mitte - w / 2, x1: mitte + w / 2, y0: y - h, y1: y - h });
      muenzReihe(mitte - w / 3, y - h - 34, mitte + w / 3, y - h - 34);
    }
  }

  // Deko je Zone (steht hinter der Fahrbahn bzw. am Rand)
  function dekoFuer(x0, x1) {
    const y = ebene;
    if (zone === "strasse") {
      for (let x = x0; x < x1 - 60; ) {
        const b = zufall(170, 260);
        deko.push({ art: "laden", x, b: Math.min(b, x1 - x), y, name: LAEDEN[ganz(0, LAEDEN.length - 1)], farbe: AUTOFARBEN[ganz(0, AUTOFARBEN.length - 1)], hoch: zufall(110, 170), seed: Math.random() });
        x += b + 6;
      }
      // Lichtkegel reicht von x-36 bis x+80: nur dort, wo darunter Boden ist
      for (let x = x0 + 60; x < x1 - 100; x += 320) deko.push({ art: "laterne", x, y });
    } else if (zone === "park") {
      deko.push({ art: "zaun", x0, x1, y });
      for (let x = x0 + 170; x < x1 - 170; x += 460) deko.push({ art: "strahler", x, y });
      if (Math.random() < 0.55) deko.push({ art: "graffiti", x: x0 + zufall(60, Math.max(70, x1 - x0 - 260)), y, b: zufall(160, 240), seed: Math.random() });
      if (Math.random() < 0.6) deko.push({ art: "publikum", x: x0 + zufall(40, Math.max(50, x1 - x0 - 280)), y, b: zufall(160, 260), seed: Math.random() });
    } else if (zone !== "dach") {
      dekoFuerWelt(zone, x0, x1, y, (d) => deko.push(d));
      return;
    } else {
      if (Math.random() < 0.35) deko.push({ art: "wasserturm", x: x0 + zufall(80, Math.max(90, x1 - x0 - 120)), y });
      for (let x = x0 + 60; x < x1 - 60; x += zufall(200, 380)) if (Math.random() < 0.4) deko.push({ art: "antenne", x, y, h: zufall(30, 60) });
    }
    if (zone !== "park" && Math.random() < 0.4) deko.push({ art: "tauben", x: x0 + zufall(120, Math.max(130, x1 - x0 - 80)), y, n: ganz(2, 4), auf: null, seed: Math.random() });
  }

  function treppe() {
    const n = zone === "park" ? ganz(3, Math.min(5, S.treppe[1])) : ganz(...S.treppe);
    const x0 = cursor;
    const t = { art: "treppe", x0, x1: x0 + n * STUFE_B, y0: ebene, y1: ebene + n * STUFE_H, n, zone };
    teile.push(t);
    if (Math.random() < S.railChance) {
      // Geländer die Treppe hinunter (zum Grinden)
      const steig = (t.y1 - t.y0) / (t.x1 - t.x0);
      objekte.push({ art: "rail", stil: RAIL_STIL[zone] || "rail", x0: x0 - 40, x1: t.x1 + 30, y0: ebene - 38 - steig * 40, y1: t.y1 - 38 + steig * 30, treppe: true });
      muenzReihe(x0 + 10, ebene - 70, t.x1 - 10, t.y1 - 70);
    } else muenzReihe(x0 - 40, ebene - 60, t.x1 + 70, t.y1 - 50, 70);
    cursor = t.x1;
    ebene = t.y1;
    flach(ganz(...S.nachSprung));
  }

  function luecke() {
    const mitRail = Math.random() < S.railChance * 0.8;
    const w = mitRail ? zufall(S.luecke[1], S.luecke[1] + 120) : zufall(...S.luecke);
    const tiefer = !mitRail && ebene < 160 && zone !== "hoelle" && Math.random() < 0.35 ? ganz(30, 80) : 0;
    teile.push({ art: "luecke", x0: cursor, x1: cursor + w, zone, y: ebene });
    if (mitRail) {
      objekte.push({ art: "rail", stil: RAIL_STIL[zone] || "rail", x0: cursor - 90, x1: cursor + w + 90, y0: ebene - 36, y1: ebene - 36, luecke: true });
      muenzReihe(cursor, ebene - 70, cursor + w, ebene - 70, 0, 3);
    } else muenzReihe(cursor - 40, ebene - 50, cursor + w + 40, ebene + tiefer - 50, 80);
    cursor += w;
    ebene += tiefer;
    flach(ganz(...S.nachSprung));
  }

  function hoch() {
    if (ebene < -180) return treppe();
    const h = ganz(36, 62);
    if (S.wand && Math.random() < 0.4) {
      ebene -= Math.min(h, 52); // Kante nach oben: nur mit Sprung
      flach(ganz(...S.nachSprung));
    } else {
      teile.push({ art: "rampe", x0: cursor, x1: cursor + 130, y0: ebene, y1: ebene - h, zone });
      cursor += 130;
      ebene -= h;
      flach(ganz(...S.nachSprung));
    }
  }

  // Funbox im Skatepark: Rampe hoch, oben flach (mit Rail), Rampe runter
  function funbox() {
    const h = ganz(40, 56);
    teile.push({ art: "rampe", x0: cursor, x1: cursor + 110, y0: ebene, y1: ebene - h, zone });
    cursor += 110;
    ebene -= h;
    const oben = ganz(180, 260);
    teile.push({ art: "flach", x0: cursor, x1: cursor + oben, y: ebene, zone, funbox: true });
    if (Math.random() < 0.6) objekte.push({ art: "rail", stil: "rail", x0: cursor + 30, x1: cursor + oben - 30, y0: ebene - 34, y1: ebene - 34 });
    muenzReihe(cursor + 50, ebene - 80, cursor + oben - 50, ebene - 80);
    cursor += oben;
    teile.push({ art: "rampe", x0: cursor, x1: cursor + 110, y0: ebene, y1: ebene + h, zone });
    cursor += 110;
    ebene += h;
    flach(ganz(...S.nachSprung));
  }

  function kicker() {
    const x0 = cursor + 160;
    teile.push({ art: "flach", x0: cursor, x1: x0 + 90, y: ebene, zone });
    objekte.push({ art: "kicker", x0, x1: x0 + 90, y: ebene, h: 46 });
    const w = zufall(...S.luecke) + 40;
    teile.push({ art: "luecke", x0: x0 + 90, x1: x0 + 130 + w, zone, y: ebene, kicker: true });
    muenzReihe(x0 + 120, ebene - 150, x0 + 140 + w, ebene - 60, 50);
    cursor = x0 + 130 + w;
    flach(ganz(...S.nachSprung));
  }

  // Show: Boost-Streifen, großer Kicker, dann über Autos oder durch einen Feuerring
  function show() {
    showOffen = false;
    const feuer = zone !== "strasse" && (zone !== "dach" || Math.random() < 0.5);
    const g = SCHWERKRAFT * (PHYSIK[zone]?.g ?? 1);
    const start = cursor;
    const kx = start + 420;
    const ende = kx + 110 + Math.max(1000, BOOST_TEMPO * (2 * (300 + BOOST_TEMPO * 0.95)) / (SCHWERKRAFT * (PHYSIK[zone]?.g ?? 1)) + 200);
    teile.push({ art: "flach", x0: start, x1: ende, y: ebene, zone });
    dekoFuer(start, ende);
    objekte.push({ art: "booster", x0: start + 140, x1: kx - 10, y: ebene });
    objekte.push({ art: "kicker", x0: kx, x1: kx + 110, y: ebene, h: 60, gross: true });
    // Flugbahn bei BOOST_TEMPO: Scheitel ca. 308 px hinter dem Kicker, 210 px über der Kante
    const vy = 300 + BOOST_TEMPO * 0.95;
    const tScheitel = vy / g;
    const scheitelX = kx + 110 + BOOST_TEMPO * tScheitel;
    const scheitelY = ebene - 60 - (vy * vy) / (2 * g);
    if (feuer) {
      objekte.push({ art: "ring", x: scheitelX, w: 4, y: scheitelY - 36, r: 56, boden: ebene, durch: false, zone });
      muenzReihe(scheitelX - 40, scheitelY - 36, scheitelX + 40, scheitelY - 36, 0, 3, true);
    } else {
      const n = 3;
      for (let i = 0; i < n; i++)
        objekte.push({ art: "kiste", stil: "auto", x: kx + 190 + i * 150, y: ebene, w: 130, h: 46, farbe: AUTOFARBEN[ganz(0, AUTOFARBEN.length - 1)], show: true });
      muenzReihe(kx + 200, scheitelY - 20, kx + 620, scheitelY + 30, 30, 5, true);
    }
    cursor = ende;
  }

  const SEGMENTE = {
    strand: { flach: 6, luecke: 2, kicker: 1, hoch: 1 },
    dschungel: { flach: 5, luecke: 2, hoch: 1.5, treppe: 1, kicker: 1 },
    eis: { flach: 5, luecke: 2, treppe: 1.5, hoch: 1, kicker: 1 },
    hoelle: { flach: 5, luecke: 3, kicker: 1.5, treppe: 1 },
    himmel: { flach: 4, luecke: 4, hoch: 1, kicker: 1 },
    weltall: { flach: 5, luecke: 3, kicker: 1.5, hoch: 1 },
  };
  function waehle() {
    if (SEGMENTE[zone]) {
      const g = { ...SEGMENTE[zone] };
      // schwerer = mehr Sprünge
      g.flach *= S.gewichte.flach / 4;
      if (ebene > 200) g.treppe = 0;
      if (ebene < -200) g.hoch = 0;
      const e = Object.entries(g).filter(([, v]) => v > 0);
      let r = Math.random() * e.reduce((a, [, v]) => a + v, 0);
      for (const [k, v] of e) if ((r -= v) <= 0) return k;
      return "flach";
    }
    if (zone === "park") {
      const r = Math.random();
      return r < 0.4 ? "flach" : r < 0.65 ? "funbox" : r < 0.85 ? "treppe" : "kicker";
    }
    if (zone === "strasse") {
      const r = Math.random();
      return r < 0.7 ? "flach" : r < 0.85 ? "luecke" : "kicker";
    }
    const g = { ...S.gewichte };
    if (ebene > 200) g.treppe = 0; // nicht endlos nach unten
    if (ebene < -200) g.hoch = 0;
    const eintraege = Object.entries(g).filter(([, v]) => v > 0);
    let r = Math.random() * eintraege.reduce((a, [, v]) => a + v, 0);
    for (const [k, v] of eintraege) if ((r -= v) <= 0) return k;
    return "flach";
  }

  function erzeuge() {
    while (cursor < kamX + W + 900) {
      // nach Zonenschild oder Portal erst ein Stück flach, damit nichts in der Luft steht
      if (cursor > zoneBis && neueZone()) {
        flach(Math.max(460, ganz(...S.flachLang)), false);
        continue;
      }
      // die Show kommt in der zweiten Hälfte der Zone
      if (showOffen && cursor > zoneBis - 2400) {
        show();
        continue;
      }
      const art = waehle();
      if (art === "flach") flach(ganz(...S.flachLang));
      else if (art === "treppe") treppe();
      else if (art === "luecke") luecke();
      else if (art === "hoch") hoch();
      else if (art === "funbox") funbox();
      else kicker();
    }
    const grenze = kamX - 300;
    teile = teile.filter((t) => t.x1 > grenze);
    objekte = objekte.filter((o) => (o.x1 ?? o.x + o.w) > grenze);
    muenzen = muenzen.filter((m) => m.x > grenze);
    deko = deko.filter((d) => (d.x1 ?? d.x + (d.b || 200)) > grenze);
  }

  // ---------- Flächen ----------
  // Treppe: Oberkante der Stufe an Stelle x
  const treppenY = (t, x) => t.y0 + Math.min(t.n, Math.floor((x - t.x0) / STUFE_B) + 1) * STUFE_H;

  function flaechenBei(x) {
    const l = [];
    for (const t of teile) {
      if (x < t.x0 || x > t.x1) continue;
      if (t.art === "flach") l.push({ y: t.y, art: "boden", f: t });
      else if (t.art === "rampe") l.push({ y: lerp(t.y0, t.y1, (x - t.x0) / (t.x1 - t.x0)), art: "rampe", f: t });
      else if (t.art === "treppe") l.push({ y: treppenY(t, x), art: "treppe", f: t });
    }
    for (const o of objekte) {
      if (o.art === "kiste" && x >= o.x && x <= o.x + o.w) l.push({ y: o.y - o.h, art: "kiste", f: o });
      else if (o.art === "rail" && x >= o.x0 && x <= o.x1) l.push({ y: lerp(o.y0, o.y1, (x - o.x0) / (o.x1 - o.x0)), art: "rail", f: o });
      else if (o.art === "kicker" && x >= o.x0 && x <= o.x1) l.push({ y: o.y - (o.h * (x - o.x0)) / (o.x1 - o.x0), art: "kicker", f: o });
      else if (o.art === "pilz" && x >= o.x - 12 && x <= o.x + o.w + 12) l.push({ y: o.y - o.h + 2, art: "pilz", f: o });
    }
    return l;
  }
  function yAuf(f, art, x) {
    if (art === "boden") return f.y;
    if (art === "rampe") return lerp(f.y0, f.y1, (x - f.x0) / (f.x1 - f.x0));
    if (art === "kiste") return f.y - f.h;
    if (art === "rail") return lerp(f.y0, f.y1, (x - f.x0) / (f.x1 - f.x0));
    if (art === "kicker") return f.y - (f.h * (x - f.x0)) / (f.x1 - f.x0);
    return null;
  }
  const imBereich = (f, x) => x >= (f.x0 ?? f.x) && x <= (f.x1 ?? f.x + f.w);

  // feste Körper, in die man nicht hineinfahren darf: Oberkante an Stelle x
  function festeOberkanten(x) {
    const l = [];
    for (const t of teile) {
      if (x < t.x0 || x > t.x1) continue;
      if (t.art === "flach") l.push(t.y);
      else if (t.art === "rampe") l.push(lerp(t.y0, t.y1, (x - t.x0) / (t.x1 - t.x0)));
      else if (t.art === "treppe") l.push(treppenY(t, x));
    }
    for (const o of objekte) {
      if (o.art === "klein" && x > o.x - 6 && x < o.x + o.w + 6) l.push(o.y - o.h + (o.stil === "brett" ? 2 : 6));
      if (o.art === "scooter" && x > o.x - 4 && x < o.x + o.w + 4) l.push(o.y - o.h + 8);
      if (o.art === "geysir" && x > o.x - 4 && x < o.x + o.w + 4) l.push(o.y - geysirHoehe(o) + 4);
      if (o.art === "pilz" && x > o.x + 6 && x < o.x + o.w - 6) l.push(o.y - o.h + 12);
    }
    return l;
  }

  // Lava-Geysir: blubbert, warnt, bricht aus (Zyklus 2,8 s)
  function geysirHoehe(o) {
    const k = o.phase % 2.8;
    if (k < 2) return 12;
    return 12 + 84 * Math.sin(((k - 2) / 0.8) * Math.PI);
  }
  // Physik am Spieler: Welt (Schwerkraft, Eis) und Board
  function physik() {
    const p = PHYSIK[zoneBeiSpieler()] || {};
    return { g: p.g ?? 1, sprung: (p.sprung ?? 1) * bf.sprung, reibung: p.reibung ?? 1 };
  }

  // ---------- Spiel ----------
  function zeigeStatus() {
    if (zustand === "karte" || zustand === "garage") {
      status(`● ${fp.muenzen} im Münzkonto · Board: ${board.name}`);
      return;
    }
    status(`● ${muenzenZahl} Münzen · ${Math.floor(meter)} m · ${ZONEN[zoneBeiSpieler()] || ""}  ${"♥".repeat(Math.max(0, leben))}`);
    aufgabeLauf("muenzenLauf", muenzenZahl);
    aufgabeLauf("meterLauf", Math.floor(meter));
  }

  // ---------- Aufgaben ----------
  function aufgabeFertig(a) {
    fp.muenzen += a.lohn;
    popup(`Aufgabe geschafft! +${a.lohn} ●`, "#5fc39c", true);
    fp.aufgaben = fp.aufgaben.filter((x) => x !== a);
    fp.aufgaben.push(neueAufgabe(fp, WELTEN));
    speichern(fp);
  }
  // zählt mit (z. B. Kickflips)
  function aufgabe(typ, n = 1) {
    for (const a of [...fp.aufgaben]) {
      if (a.typ !== typ || a.lauf) continue;
      a.stand += n;
      if (a.stand >= a.ziel) aufgabeFertig(a);
    }
  }
  // bester Wert in einem Lauf (z. B. Münzen in einem Lauf)
  function aufgabeLauf(typ, wert) {
    for (const a of [...fp.aufgaben]) {
      if (a.typ !== typ) continue;
      a.stand = Math.max(a.stand, wert);
      if (a.stand >= a.ziel) aufgabeFertig(a);
    }
  }
  function popup(text, farbe = "#f5d97a", gross = false) {
    popups.push({ text, x: kamX + SPIELER_X, y: sp.y - 110, t: 0, farbe, gross });
  }

  function springen() {
    if (zustand !== "laeuft" || sp.sturz || !sp.amBoden) return;
    if (sp.boost > 0) return; // auf dem Boost-Streifen trägt dich der Kicker
    grindEnde();
    sp.vy = -SPRUNG * physik().sprung + (sp.auf?.art === "rail" ? 60 : 0);
    sp.amBoden = false;
    sp.halten = true;
    sp.haltZeit = 0;
    sp.sprungSchnitt = true; // lässt man früh los, wird der Sprung abgeschnitten
    sp.kombi = [];
    sp.absprung = { x: kamX + SPIELER_X, von: sp.auf };
    sp.auf = null;
    staub(kamX + SPIELER_X, sp.y, 5);
  }
  // Grind-Trick starten (nur auf einer Stange) und beim Verlassen belohnen
  function grindTrick(art) {
    if (zustand !== "laeuft" || sp.sturz || !sp.amBoden || sp.auf?.art !== "rail") return;
    if (sp.grindTrick?.art === art) return;
    grindEnde();
    sp.grindTrick = { art, t: 0 };
    popup(GRIND_TRICKS[art].name + "!", "#9fd0ff");
  }
  function grindEnde() {
    const g = sp.grindTrick;
    sp.grindTrick = null;
    if (g && g.t > 0.3 && !sp.sturz) {
      belohnung(GRIND_TRICKS[g.art].muenzen, GRIND_TRICKS[g.art].name, "#9fd0ff");
      aufgabe("grindtrick");
    }
  }
  function trick(art) {
    if (zustand !== "laeuft" || sp.sturz || sp.amBoden || sp.trick) return;
    sp.trick = { art, t: 0 };
  }

  function sturz(grund) {
    if (sp.sturz || unverwundbar > 0) return;
    sp.sturz = { t: 0, vy: -420, dreh: 0, bx: 0 };
    sp.grindTrick = null;
    sp.boost = 0;
    sp.trick = null;
    sp.kombi = [];
    sp.amBoden = false;
    leben--;
    zeigeStatus();
    popup(grund, "#ff6b81", true);
  }

  function landen(fl, wx) {
    if (fl.art === "pilz") {
      // Pilz federt: hoch hinaus, Tricks laufen weiter
      sp.y = fl.y;
      sp.vy = -SPRUNG * 1.32 * physik().sprung;
      sp.halten = false;
      sp.sprungSchnitt = false;
      fl.f.gedrueckt = 0.5;
      staub(wx, fl.y, 6);
      belohnung(1, "Boing!", "#ff9fb0");
      aufgabe("pilz");
      return;
    }
    if (fl.art === "treppe") {
      if (unverwundbar > 0) {
        // nach dem Neustart: auf die unterste Stufe setzen statt Sturz
        sp.y = fl.f.y1;
        sp.amBoden = false;
        return;
      }
      sp.y = fl.y;
      sturz("Treppe!");
      return;
    }
    if (sp.trick) {
      if (sp.trick.t / TRICKS[sp.trick.art].dauer < 0.8 && unverwundbar <= 0) {
        sp.y = fl.y;
        sturz("Bail!");
        return;
      }
      if (sp.trick.t / TRICKS[sp.trick.art].dauer >= 0.8) sp.kombi.push(sp.trick.art);
      sp.trick = null;
    }
    sp.y = fl.y;
    sp.vy = 0;
    sp.amBoden = true;
    sp.auf = fl;
    if (tempo > maxT() * 1.05 && !sp.nachBoost) sp.nachBoost = 1.4; // nach Boost-Sprung noch kurz schnell
    sp.halten = false;
    sp.sprungSchnitt = false;
    staub(wx, fl.y, 8);
    let bonus = 0;
    const texte = [];
    if (sp.kombi.length) {
      for (const k of sp.kombi) aufgabe(k);
      aufgabeLauf("combo", sp.kombi.length);
      bonus += sp.kombi.reduce((a, k) => a + TRICKS[k].muenzen, 0) * sp.kombi.length;
      texte.push(sp.kombi.map((k) => TRICKS[k].name).join(" + ") + (sp.kombi.length > 1 ? ` ×${sp.kombi.length}` : ""));
      sp.kombi = [];
    }
    // über eine ganze Treppe oder Lücke gesprungen?
    const ab = sp.absprung;
    if (ab && fl.art !== "rail") {
      for (const t of teile) {
        if (t.art === "treppe" && ab.x <= t.x0 + 4 && wx >= t.x1) {
          bonus += t.n >= 7 ? 3 : t.n >= 5 ? 2 : 1;
          texte.push(`${t.n}-Stair`);
          if (t.n >= 5) aufgabe("treppe");
        }
        if (t.art === "luecke" && ab.x <= t.x0 + (t.kicker ? 14 : 0) && wx >= t.x1) {
          bonus += 1;
          texte.push("Gap");
          aufgabe("gap");
        }
      }
    }
    // über die Autos der Show gesprungen?
    if (ab) {
      const autos = objekte.filter((o) => o.show && o.x > ab.x && o.x + o.w < wx);
      if (autos.length >= 3) {
        bonus += 5;
        texte.push(`${autos.length} Autos`);
      }
    }
    sp.absprung = null;
    if (fl.art === "rail") {
      texte.push(fl.f.luecke ? "Gap-Grind" : fl.f.treppe ? "Handrail" : fl.f.stil === "ledge" ? "Ledge" : fl.f.stil === "bank" ? "Bank-Grind" : "Grind");
      bonus += fl.f.luecke ? 3 : fl.f.treppe ? 2 : 1;
      aufgabe("grind");
      if (fl.f.stil === "auto") aufgabe("auto");
    }
    if (texte.length) belohnung(bonus, texte.join(" + "), fl.art === "rail" ? "#9fd0ff" : "#f5d97a", texte.length > 1);
  }

  // Münzen gutschreiben (Tricks, Sprünge, Grinds); im Skatepark jubelt das Publikum
  function belohnung(n, text, farbe = "#f5d97a", gross = false) {
    if (n > 0) muenzenZahl += n;
    popup(n > 0 ? `${text} +${n} ●` : text, farbe, gross);
    if (zoneBeiSpieler() === "park") jubel = 1.6;
    zeigeStatus();
  }
  function zoneBeiSpieler() {
    const wx = kamX + SPIELER_X;
    return teile.find((t) => t.zone && wx >= t.x0 && wx <= t.x1)?.zone || zone;
  }

  function staub(x, y, n) {
    for (let i = 0; i < n; i++) teilchen.push({ art: "staub", x: x + zufall(-14, 14), y: y - 2, vx: zufall(-80, 40), vy: zufall(-60, -10), t: 0, leben: zufall(0.3, 0.5), r: zufall(3, 6) });
  }

  function schritt(dt) {
    // Anschieben: der hintere Fuß tritt kurz auf den Boden; in der Mitte gibt es Schwung
    if (sp.schub) {
      const vorher = sp.schub.t;
      sp.schub.t += dt;
      if (vorher < SCHUB_DAUER * 0.5 && sp.schub.t >= SCHUB_DAUER * 0.5 && sp.amBoden) {
        tempo = Math.max(tempo, Math.min(maxT(), tempo + S.schub * bf.schub * (1 - 0.65 * (tempo / maxT()))));
        staub(kamX + SPIELER_X - 22, sp.y, 2);
      }
      if (sp.schub.t >= SCHUB_DAUER || !sp.amBoden) sp.schub = null;
    }
    if (!sp.schub && schubHalten && sp.amBoden && !sp.sturz && sp.auf?.art !== "rail") sp.schub = { t: 0 };
    // Rollwiderstand am Boden, kaum in der Luft; bergauf langsamer, Geländer bergab schneller
    const P = physik();
    if (sp.amBoden && !sp.sturz) {
      tempo -= (S.reibung * P.reibung + tempo * 0.045 * (P.reibung < 1 ? 0.55 : 1)) * dt;
      const f = sp.auf?.f;
      if (sp.auf?.art === "rampe" || sp.auf?.art === "rail") {
        const sinus = Math.sin(Math.atan2(f.y1 - f.y0, f.x1 - f.x0));
        tempo += sinus * 520 * dt;
      } else if (sp.auf?.art === "kicker") tempo -= Math.sin(Math.atan2(f.h, f.x1 - f.x0)) * 360 * dt;
    } else tempo -= tempo * 0.02 * dt;
    // über dem Höchsttempo (nach Boost): erst kurz halten, dann sanft auslaufen
    if (sp.nachBoost > 0) sp.nachBoost = Math.max(0, sp.nachBoost - dt);
    else if (tempo > maxT() && sp.amBoden && !sp.boost) tempo -= (tempo - maxT()) * 1.4 * dt;
    if (sp.nachBoost > 0 && sp.amBoden) tempo += (S.reibung + tempo * 0.045) * dt * 0.85; // kaum Rollwiderstand
    tempo = Math.max(0, Math.min(BOOST_TEMPO, tempo));
    const vorherX = kamX;
    if (!sp.sturz) kamX += tempo * dt;
    else if (sp.sturz.t < 0.5) kamX += tempo * dt * (1 - sp.sturz.t * 2);
    meter += (kamX - vorherX) / 40;
    unverwundbar = Math.max(0, unverwundbar - dt);
    jubel = Math.max(0, jubel - dt);
    erzeuge();
    const wx = kamX + SPIELER_X;
    welt(dt, wx, vorherX + SPIELER_X);
    spur(wx);

    // Münzen einsammeln
    for (const m of muenzen) {
      if (m.weg) continue;
      if (Math.abs(m.x - wx) < 24 && Math.abs(m.y - (sp.y - 36)) < 44 && !sp.sturz) {
        m.weg = 0.001;
        muenzenZahl++;
        for (let i = 0; i < 6; i++) teilchen.push({ art: "funkel", x: m.x, y: m.y, vx: zufall(-120, 120), vy: zufall(-160, 40), t: 0, leben: 0.4, r: 2.5 });
      }
    }

    if (sp.sturz) {
      const s = sp.sturz;
      s.t += dt;
      s.vy += SCHWERKRAFT * dt;
      const vorher = sp.y;
      sp.y += s.vy * dt;
      const boden = flaechenBei(wx).filter((o) => o.art !== "rail" && vorher <= o.y + 4 && sp.y >= o.y).sort((a, b) => a.y - b.y)[0];
      if (boden && s.vy > 0) {
        sp.y = boden.y;
        s.vy *= -0.3;
      }
      s.dreh += dt * 7 * (s.t < 0.6 ? 1 : 0.2);
      if (s.t > 1.15) {
        if (leben <= 0) return ende();
        neustartNachSturz(wx);
      }
      return;
    }

    if (sp.trick) {
      sp.trick.t += dt;
      if (sp.trick.t >= TRICKS[sp.trick.art].dauer && !sp.amBoden) {
        sp.kombi.push(sp.trick.art);
        sp.trick = null;
      }
    }

    if (sp.amBoden) {
      const auf = sp.auf;
      let y = auf && imBereich(auf.f, wx) ? yAuf(auf.f, auf.art, wx) : null;
      if (y !== null && auf.art === "boden") {
        // auf flachem Boden: höher liegende erreichbare Fläche (Rampe, Kicker) übernimmt
        const besser = flaechenBei(wx).filter((o) => o.art !== "treppe" && o.y < y && o.y >= y - 10).sort((a, b) => a.y - b.y)[0];
        if (besser) {
          sp.auf = besser;
          y = besser.y;
        }
      }
      if (y === null) {
        // Ende der Fläche: nahtlos weiter auf etwa gleicher Höhe?
        const weiter = flaechenBei(wx).filter((o) => o.art !== "treppe" && o.y >= sp.y - 10 && o.y <= sp.y + 8).sort((a, b) => a.y - b.y)[0];
        if (weiter) {
          if (weiter.art !== "rail") grindEnde();
          sp.auf = weiter;
          y = weiter.y;
        }
      }
      if (y !== null) {
        sp.y = y;
        sp.letzterBoden = y;
        if (sp.grindTrick) sp.grindTrick.t += dt;
        if (sp.auf.art === "rail") {
          if (Math.random() < 0.8) teilchen.push({ art: "funke", x: wx - 10, y: sp.y + 2, vx: -zufall(80, 260), vy: -zufall(40, 240), t: 0, leben: 0.35, r: 2 });
        }
      } else if (auf?.art === "kicker") {
        sp.amBoden = false;
        if (sp.boost > 0) tempo = BOOST_TEMPO;
        sp.boost = 0;
        sp.vy = -(300 + tempo * 0.95);
        sp.absprung = { x: wx, von: auf };
        sp.auf = null;
        sp.kombi = [];
        popup(auf.f.gross ? "Abflug!" : "Air!", "#9fd0ff", auf.f.gross);
      } else {
        // Kante, Treppe oder Lücke: fallen
        grindEnde();
        sp.amBoden = false;
        sp.vy = auf?.art === "rail" && auf.f.y1 > auf.f.y0 ? 120 : 0;
        sp.absprung = { x: wx, von: auf };
        sp.auf = null;
      }
    } else {
      const vorherY = sp.y;
      sp.haltZeit += dt;
      const g = SCHWERKRAFT * P.g;
      sp.vy += g * dt;
      sp.y += sp.vy * dt;
      if (sp.vy > 0) {
        const kand = flaechenBei(wx)
          .filter((o) => vorherY <= o.y + 3 + Math.abs(sp.vy * dt) * 0.15 && sp.y >= o.y)
          .sort((a, b) => a.y - b.y);
        if (kand.length) landen(kand[0], wx);
      }
      if (sp.y > (sp.letzterBoden ?? 0) + 380) {
        sturz("Abgestürzt!");
        return;
      }
    }

    // in etwas Festes hineingefahren?
    if (!sp.sturz && unverwundbar <= 0) {
      const tief = festeOberkanten(wx + 6).some((oy) => sp.y > oy + 7 && !(sp.auf && sp.auf.art === "rail"));
      if (tief) sturz("Autsch!");
    }
  }

  // Lebendige Welt: Scooter-Kids fahren, Tauben fliegen auf, Boost-Streifen, Feuerring
  function welt(dt, wx, vorherWx) {
    for (const o of objekte) {
      if (o.art === "scooter") {
        o.x = Math.min(o.x1, o.x + o.v * dt);
        o.phase += dt * 6;
      }
      if (o.art === "ring" && !o.durch && !sp.sturz && vorherWx < o.x && wx >= o.x) {
        o.durch = true;
        const dy = Math.abs(sp.y - 36 - o.y);
        if (dy < o.r - 12) {
          for (let i = 0; i < 14; i++) teilchen.push({ art: "funke", x: o.x, y: o.y + zufall(-o.r, o.r), vx: zufall(-200, 200), vy: zufall(-200, 100), t: 0, leben: 0.6, r: 3 });
          belohnung(5, o.zone === "himmel" ? "Lichtring!" : o.zone === "weltall" ? "Plasmaring!" : o.zone === "eis" ? "Polarring!" : "Feuerring!", "#ff9f40", true);
          aufgabe("ring");
        } else if (dy < o.r + 16) sturz("Heiß!");
      }
      if (o.art === "geysir") {
        o.phase += dt;
        if (!sp.sturz && wx > o.x - 4 && wx < o.x + o.w + 4 && sp.y > o.y - geysirHoehe(o) + 4) sturz("Lava!");
      }
      if (o.art === "pilz" && o.gedrueckt > 0) o.gedrueckt = Math.max(0, o.gedrueckt - dt);
    }
    // durchs Portal in die nächste Welt
    for (const d of deko) {
      if (d.art === "portal" && !d.durch && wx >= d.x) {
        d.durch = true;
        betreteWelt(d.idx, d.x);
      }
    }
    // Boost-Streifen
    const b = objekte.find((o) => o.art === "booster" && wx >= o.x0 && wx <= o.x1);
    if (b && sp.amBoden && !sp.sturz) {
      if (!sp.boost) popup("BOOST!", "#5fc39c", true);
      sp.boost = 1.2;
      sp.schub = null;
    }
    if (sp.boost > 0) {
      if (sp.amBoden) tempo = BOOST_TEMPO;
      if (sp.amBoden) sp.boost = Math.max(sp.boost - dt * 0.2, 0.01);
      if (Math.random() < 0.6) teilchen.push({ art: "boost", x: wx - 26, y: sp.y - zufall(4, 60), vx: -zufall(150, 300), vy: 0, t: 0, leben: 0.3, r: 2 });
    }
    // Tauben fliegen auf, wenn man näher kommt
    for (const d of deko) if (d.art === "tauben" && !d.auf && d.x - wx < 230 && d.x - wx > -40) d.auf = 0.001;
    for (const d of deko) if (d.art === "tauben" && d.auf) d.auf += dt;
  }

  function betreteWelt(idx, x) {
    aktWelt = idx;
    weltAnfangX = x;
    const w = WELTEN[idx % WELTEN.length];
    const neu = idx < WELTEN.length && idx > fp.welten;
    if (neu) {
      fp.welten = idx;
      fp.muenzen += 10;
      speichern(fp);
    }
    banner = { titel: w.name, unter: neu ? "Neue Welt freigeschaltet! +10 ●" : `Welt ${(idx % WELTEN.length) + 1}`, t: 0, farbe: w.farbe };
    for (const a of [...fp.aufgaben]) if (a.typ === "welt" && idx >= a.ziel) aufgabeFertig(a);
  }

  // Spur hinter besonderen Boards
  function spur(wx) {
    if (!board.spur || sp.sturz || tempo < 60) return;
    const y = sp.y - 6;
    const a = board.spur;
    if (a === "regenbogen") teilchen.push({ art: "spur", form: "regenbogen", x: wx - 30, y: y - 6, vx: -40, vy: 0, t: 0, leben: 0.45, r: 2 });
    else if (a === "neon") teilchen.push({ art: "spur", form: "linie", farbe: Math.random() < 0.5 ? "#5ff7e4" : "#ff3ea5", x: wx - 30, y: y - zufall(0, 6), vx: -zufall(60, 120), vy: 0, t: 0, leben: 0.35, r: 2 });
    else if (a === "feuer") teilchen.push({ art: "spur", form: "flamme", x: wx - 28 + zufall(-4, 4), y, vx: -zufall(30, 90), vy: -zufall(40, 110), t: 0, leben: 0.4, r: zufall(3, 6) });
    else if (a === "schnee" && Math.random() < 0.6) teilchen.push({ art: "spur", form: "punkt", farbe: "#ffffff", x: wx - 26, y, vx: -zufall(40, 120), vy: zufall(-30, 30), t: 0, leben: 0.6, r: zufall(1.5, 3) });
    else if (a === "funkeln" && Math.random() < 0.5) teilchen.push({ art: "spur", form: "stern", farbe: "#ffe28a", x: wx - 26 + zufall(-8, 8), y: y - zufall(0, 14), vx: -zufall(20, 80), vy: zufall(-20, 20), t: 0, leben: 0.5, r: zufall(2, 4) });
    else if (a === "hover") teilchen.push({ art: "spur", form: "punkt", farbe: "#7fb8ff", x: wx + zufall(-24, 24), y: sp.y + 1, vx: -zufall(20, 60), vy: zufall(10, 40), t: 0, leben: 0.35, r: zufall(1.5, 3) });
  }

  function ebeneUnter(x) {
    const l = flaechenBei(x).map((o) => o.y);
    return l.length ? Math.max(...l) : ebene + 200;
  }

  function neustartNachSturz(wx) {
    // nächste sichere, flache Stelle suchen
    const ziel = teile.find((t) => t.art === "flach" && t.x1 > wx + 120 && t.x1 - Math.max(t.x0, wx) > 260);
    const x = ziel ? Math.max(ziel.x0 + 60, wx) : wx;
    kamX = x - SPIELER_X;
    objekte = objekte.filter((o) => (o.x0 ?? o.x) > x + 380 || (o.x1 ?? o.x + o.w) < x - 40);
    sp.sturz = null;
    sp.y = ziel ? ziel.y : sp.y;
    sp.letzterBoden = sp.y;
    sp.vy = 0;
    sp.amBoden = true;
    sp.auf = ziel ? { y: ziel.y, art: "boden", f: ziel } : null;
    sp.absprung = null;
    unverwundbar = 1.6;
    tempo *= 0.4;
  }

  // Münzen des Laufs aufs Konto (einmal pro Lauf)
  function abrechnen() {
    if (abgerechnet) return;
    abgerechnet = true;
    fp.muenzen += muenzenZahl;
    fp.weiteste = Math.max(fp.weiteste || 0, Math.floor(meter));
    speichern(fp);
  }
  function ende() {
    zustand = "ende";
    abrechnen();
    const neuer = ergebnis({ punkte: muenzenZahl });
    const w = WELTEN[aktWelt % WELTEN.length];
    nachricht(`<p class="big">Game Over</p><p>${muenzenZahl} Münzen · ${Math.floor(meter)} m · bis ${w.name}${neuer ? " · neuer Highscore!" : ""}</p><p>Münzkonto: <b>${fp.muenzen} ●</b></p><p><button type="button" class="btn" data-skate="karte">Zur Karte</button></p><p class="small">Leertaste oder Klick: nochmal fahren</p>`);
    kartenKnopf();
  }
  // Knopf „Zur Karte“ im Overlay
  function kartenKnopf() {
    document.querySelector('#stage-msg [data-skate="karte"]')?.addEventListener("click", (e) => {
      e.stopPropagation();
      zeigeKarte();
    });
  }
  function zeigeKarte() {
    if (zustand === "laeuft" || zustand === "pause") abrechnen();
    zustand = "karte";
    nachricht(null);
    wahlWelt = Math.min(fp.welten, wahlWelt);
    zeigeStatus();
  }
  function starteLauf() {
    if (wahlWelt > fp.welten) return;
    fp.startWelt = wahlWelt;
    speichern(fp);
    zustand = "laeuft";
    neu();
    nachricht(null);
  }

  // ---------- Zeichnen ----------
  // Welt: Dächer, Treppen, Rampen (in Weltkoordinaten)
  function zeichneWelt() {
    const unten = kamY + H + 60;
    for (const t of teile) {
      if (t.x1 < kamX - 20 || t.x0 > kamX + W + 20) continue;
      if (t.art === "luecke") {
        // Boden rechts der Lücke kann tiefer liegen: Bake dort auf den echten Boden stellen
        const rechts = teile.find((n) => n !== t && Math.abs(n.x0 - t.x1) < 1);
        const rechtsY = rechts ? (rechts.y ?? rechts.y0) : t.y;
        if (!STADT_ZONEN.includes(t.zone)) zeichneLuecke(ctx, t.zone, performance.now(), t.x0, t.x1, Math.max(t.y, rechtsY), unten);
        else if (t.zone !== "dach") {
          // Baustelle: Warnbaken mit Blinklicht an beiden Kanten
          for (const [bx, by] of t.kicker ? [[t.x1 + 4, rechtsY]] : [[t.x0 - 10, t.y], [t.x1 + 4, rechtsY]]) {
            for (let i = 0; i < 4; i++) {
              ctx.fillStyle = i % 2 ? "#ffffff" : "#e5566f";
              ctx.fillRect(bx, by - 40 + i * 9, 6, 9);
            }
            const an = Math.floor(performance.now() / 350) % 2;
            ctx.fillStyle = an ? "#ffb347" : "#6a4416";
            ctx.beginPath();
            ctx.arc(bx + 3, by - 44, 3.5, 0, Math.PI * 2);
            ctx.fill();
            if (an) {
              const g = ctx.createRadialGradient(bx + 3, by - 44, 1, bx + 3, by - 44, 22);
              g.addColorStop(0, "rgba(255, 179, 71, 0.45)");
              g.addColorStop(1, "rgba(255, 179, 71, 0)");
              ctx.fillStyle = g;
              ctx.fillRect(bx - 20, by - 66, 46, 44);
            }
          }
        }
        continue;
      }
      ctx.beginPath();
      if (t.art === "flach") {
        ctx.moveTo(t.x0, t.y);
        ctx.lineTo(t.x1, t.y);
      } else if (t.art === "rampe") {
        ctx.moveTo(t.x0, t.y0);
        ctx.lineTo(t.x1, t.y1);
      } else if (t.art === "treppe") {
        ctx.moveTo(t.x0, t.y0);
        for (let i = 0; i < t.n; i++) {
          ctx.lineTo(t.x0 + i * STUFE_B, t.y0 + (i + 1) * STUFE_H);
          ctx.lineTo(t.x0 + (i + 1) * STUFE_B, t.y0 + (i + 1) * STUFE_H);
        }
      }
      const xr = t.x1;
      ctx.lineTo(xr, unten);
      ctx.lineTo(t.x0, unten);
      ctx.closePath();
      const top = t.y ?? Math.min(t.y0, t.y1);
      const st = BODEN_STIL[t.zone] || BODEN_STIL.dach;
      const g = ctx.createLinearGradient(0, top, 0, top + 220);
      g.addColorStop(0, st.oben);
      g.addColorStop(0.08, st.mitte);
      g.addColorStop(1, st.unten);
      ctx.fillStyle = g;
      ctx.fill();
      // helle Oberkante
      ctx.strokeStyle = t.art === "rampe" ? (t.zone === "park" ? "#f5d97a" : t.zone === "dach" || t.zone === "strasse" ? "#d4b8ff" : st.kante) : st.kante;
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (t.art === "flach") {
        ctx.moveTo(t.x0, t.y + 1.5);
        ctx.lineTo(t.x1, t.y + 1.5);
      } else if (t.art === "rampe") {
        ctx.moveTo(t.x0, t.y0 + 1.5);
        ctx.lineTo(t.x1, t.y1 + 1.5);
      } else {
        for (let i = 0; i < t.n; i++) {
          ctx.moveTo(t.x0 + i * STUFE_B, t.y0 + (i + 1) * STUFE_H + 1.5);
          ctx.lineTo(t.x0 + (i + 1) * STUFE_B, t.y0 + (i + 1) * STUFE_H + 1.5);
        }
      }
      ctx.stroke();
      if (t.art === "flach" && t.zone === "strasse") {
        // Bordstein und Mittelstreifen
        ctx.fillStyle = "#6b6878";
        ctx.fillRect(t.x0, t.y + 3, t.x1 - t.x0, 6);
        ctx.fillStyle = "rgba(245, 217, 122, 0.55)";
        const start = Math.ceil(t.x0 / 90) * 90;
        for (let x = start; x < t.x1 - 40; x += 90) ctx.fillRect(x, t.y + 30, 44, 4);
      } else if (t.art === "flach" && t.zone === "park") {
        // Betonplatten mit Fugen und ein paar Rissen
        ctx.fillStyle = "rgba(0,0,0,0.18)";
        const start = Math.ceil(t.x0 / 120) * 120;
        for (let x = start; x < t.x1; x += 120) ctx.fillRect(x, t.y + 3, 2, 40);
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.fillRect(t.x0, t.y + 3, t.x1 - t.x0, 5);
      } else if (t.art === "flach" && t.zone !== "dach") {
        bodenDetail(ctx, t.zone, performance.now(), t.x0, t.x1, t.y);
      } else if (t.art === "flach") {
        // Fugen, Dachkante
        ctx.fillStyle = "rgba(0,0,0,0.22)";
        const start = Math.ceil(t.x0 / 70) * 70;
        for (let x = start; x < t.x1; x += 70) ctx.fillRect(x, t.y + 4, 2, 18);
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        ctx.fillRect(t.x0, t.y + 3, t.x1 - t.x0, 6);
      }
      if (t.art === "treppe") {
        // Stufen-Vorderseiten etwas dunkler
        for (let i = 0; i < t.n; i++) {
          const sx = t.x0 + i * STUFE_B;
          const sy = t.y0 + i * STUFE_H;
          ctx.fillStyle = "rgba(0,0,0,0.35)";
          ctx.fillRect(sx, sy + 3, 4, STUFE_H);
          ctx.fillStyle = "rgba(255,255,255,0.07)";
          ctx.fillRect(sx + 4, sy + STUFE_H + 3, STUFE_B - 4, 5);
        }
      }
      // Seitenwand nur an echten Kanten (Lücke oder tiefer weiter), nicht zwischen gleich hohen Stücken
      const endY = t.y ?? t.y1;
      const danach = teile.find((n) => n !== t && Math.abs(n.x0 - t.x1) < 1);
      const danachY = danach ? (danach.y ?? danach.y0) : null;
      if ((!danach || danach.art === "luecke" || danachY > endY + 1) && t.zone !== "himmel") {
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(t.x1 - 4, endY + 3, 4, unten - endY);
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(t.x1 - 6, endY + 3, 2, unten - endY);
      }
    }
  }

  function zeichneKlein(o) {
    const { x, y, w, h } = o;
    if (o.stil === "kegel") {
      const g = ctx.createLinearGradient(x, 0, x + w, 0);
      g.addColorStop(0, "#ffb070");
      g.addColorStop(1, "#e2611c");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x + 2, y);
      ctx.lineTo(x + w / 2, y - h);
      ctx.lineTo(x + w - 2, y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x + 7, y - 18, w - 14, 5);
      ctx.fillStyle = "#b44a14";
      ctx.fillRect(x - 4, y - 4, w + 8, 4);
    } else if (o.stil === "hydrant") {
      const g = ctx.createLinearGradient(x, 0, x + w, 0);
      g.addColorStop(0, "#ff6b6b");
      g.addColorStop(1, "#b3263a");
      ctx.fillStyle = g;
      ctx.fillRect(x + 3, y - h + 8, w - 6, h - 8);
      ctx.beginPath();
      ctx.arc(x + w / 2, y - h + 8, w / 2 - 3, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(x - 2, y - h + 14, w + 4, 5);
      ctx.fillStyle = "#e9e7f2";
      ctx.fillRect(x + w / 2 - 2, y - h - 1, 4, 4);
      ctx.fillStyle = "#7a1828";
      ctx.fillRect(x, y - 4, w, 4);
    } else if (o.stil === "tonne") {
      const g = ctx.createLinearGradient(x, 0, x + w, 0);
      g.addColorStop(0, "#5f8c6e");
      g.addColorStop(1, "#2f4a3a");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x + 2, y - h + 6);
      ctx.lineTo(x + w - 2, y - h + 6);
      ctx.lineTo(x + w - 4, y);
      ctx.lineTo(x + 4, y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#3d5f4a";
      ctx.fillRect(x - 1, y - h + 2, w + 2, 6);
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      for (let i = 1; i < 4; i++) ctx.fillRect(x + (w / 4) * i, y - h + 10, 1.5, h - 14);
    } else if (o.stil === "brett") {
      // herumliegendes Skateboard, Rollen nach oben
      ctx.fillStyle = "#1c1a22";
      ctx.beginPath();
      ctx.moveTo(x, y - 3);
      ctx.quadraticCurveTo(x - 3, y - 7, x + 3, y - 6);
      ctx.lineTo(x + w - 3, y - 6);
      ctx.quadraticCurveTo(x + w + 3, y - 7, x + w, y - 3);
      ctx.lineTo(x, y - 3);
      ctx.fill();
      ctx.fillStyle = "#e3c497";
      ctx.fillRect(x + 1, y - 3, w - 2, 2.4);
      ctx.fillStyle = "#ebe3d2";
      for (const wx of [x + 9, x + w - 9]) {
        ctx.beginPath();
        ctx.arc(wx, y - 10, 3.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function zeichneKiste(o, t) {
    const { x, y, w, h } = o;
    if (o.stil === "auto") {
      // geparktes Auto: Karosserie, Fenster, Räder, Licht
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y, w / 2 + 4, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      const g = ctx.createLinearGradient(0, y - h, 0, y);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(0.12, o.farbe);
      g.addColorStop(1, "#1d1a26");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x + 4, y - 10);
      ctx.lineTo(x + 2, y - 24);
      ctx.quadraticCurveTo(x + 4, y - 30, x + 18, y - 30);
      ctx.lineTo(x + 30, y - h);
      ctx.lineTo(x + w - 34, y - h);
      ctx.lineTo(x + w - 16, y - 30);
      ctx.quadraticCurveTo(x + w - 2, y - 30, x + w - 2, y - 22);
      ctx.lineTo(x + w - 2, y - 10);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(160, 200, 255, 0.55)";
      ctx.beginPath();
      ctx.moveTo(x + 34, y - h + 4);
      ctx.lineTo(x + w / 2 - 3, y - h + 4);
      ctx.lineTo(x + w / 2 - 3, y - 31);
      ctx.lineTo(x + 24, y - 31);
      ctx.closePath();
      ctx.moveTo(x + w / 2 + 3, y - h + 4);
      ctx.lineTo(x + w - 37, y - h + 4);
      ctx.lineTo(x + w - 22, y - 31);
      ctx.lineTo(x + w / 2 + 3, y - 31);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fff6c8";
      ctx.fillRect(x + w - 6, y - 26, 4, 5);
      ctx.fillStyle = "#e5566f";
      ctx.fillRect(x + 2, y - 26, 3, 5);
      for (const rx of [x + 26, x + w - 26]) {
        ctx.fillStyle = "#121016";
        ctx.beginPath();
        ctx.arc(rx, y - 6, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#9a97ad";
        ctx.beginPath();
        ctx.arc(rx, y - 6, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (o.stil === "klima") {
      // Klimagerät auf dem Dach mit drehendem Ventilator
      const g = ctx.createLinearGradient(0, y - h, 0, y);
      g.addColorStop(0, "#9da1b2");
      g.addColorStop(1, "#555869");
      ctx.fillStyle = g;
      ctx.fillRect(x, y - h, w, h);
      ctx.fillStyle = "#c9ccd8";
      ctx.fillRect(x, y - h, w, 3);
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      for (let i = 6; i < w - 30; i += 6) ctx.fillRect(x + i, y - h + 8, 2, h - 14);
      const cx = x + w - 18;
      const cy = y - h / 2;
      ctx.fillStyle = "#2b2d38";
      ctx.beginPath();
      ctx.arc(cx, cy, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#8d90a0";
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        const a = t / 60 + (i * Math.PI * 2) / 3;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * 9, cy + Math.sin(a) * 9);
        ctx.stroke();
      }
    } else if (o.stil === "pad") {
      // Manual-Pad im Skatepark
      ctx.fillStyle = "#7b8090";
      ctx.fillRect(x, y - h, w, h);
      ctx.fillStyle = "#e6e8ef";
      ctx.fillRect(x, y - h - 2, w, 4);
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.fillRect(x, y - 3, w, 3);
    } else {
      const g = ctx.createLinearGradient(0, y - h, 0, y);
      g.addColorStop(0, "#a8794a");
      g.addColorStop(1, "#6e4b28");
      ctx.fillStyle = g;
      ctx.fillRect(x, y - h, w, h);
      ctx.strokeStyle = "#4b3119";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y - h + 1, w - 2, h - 2);
    }
  }

  // Scooter-Kid: kleines Strichmännchen mit Helm auf einem Tretroller
  function zeichneScooter(o, t) {
    const x = o.x + 6;
    const y = o.y;
    const tritt = Math.sin(o.phase) * 6;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#7fb8ff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 4, y - 5);
    ctx.lineTo(x + 22, y - 5);
    ctx.moveTo(x + 20, y - 5);
    ctx.lineTo(x + 24, y - 40);
    ctx.moveTo(x + 18, y - 40);
    ctx.lineTo(x + 29, y - 40);
    ctx.stroke();
    ctx.fillStyle = "#1c1a22";
    for (const rx of [x - 3, x + 22]) {
      ctx.beginPath();
      ctx.arc(rx, y - 3, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
    const kid = () => {
      ctx.beginPath();
      ctx.moveTo(x + 6, y - 7);
      ctx.lineTo(x + 8, y - 20);
      ctx.lineTo(x + 2 + tritt, y - 8 + Math.abs(tritt) * 0.5);
      ctx.moveTo(x + 8, y - 20);
      ctx.lineTo(x + 12, y - 36);
      ctx.lineTo(x + 22, y - 39);
    };
    ctx.strokeStyle = "rgba(10,8,18,0.7)";
    ctx.lineWidth = 6;
    kid();
    ctx.stroke();
    ctx.strokeStyle = "#f4f1f8";
    ctx.lineWidth = 3;
    kid();
    ctx.stroke();
    ctx.fillStyle = "#14111c";
    ctx.beginPath();
    ctx.arc(x + 14, y - 44, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#f4f1f8";
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.fillStyle = "#f0a35e";
    ctx.beginPath();
    ctx.arc(x + 14, y - 46, 6.6, Math.PI, 0);
    ctx.fill();
    void t;
  }

  // Feuerring auf zwei Stangen, Flammen züngeln
  function zeichneRing(o, t) {
    const rf = RING_FARBEN[o.zone];
    ctx.fillStyle = rf ? rf[4] : "#4a4458";
    ctx.fillRect(o.x - 3, o.y + o.r, 6, o.boden - o.y - o.r);
    ctx.fillRect(o.x - 14, o.boden - 4, 28, 4);
    ctx.strokeStyle = "#8a6a3a";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(o.x, o.y, o.r * 0.42, o.r, 0, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      const fx = o.x + Math.cos(a) * o.r * 0.42;
      const fy = o.y + Math.sin(a) * o.r;
      const fl = 6 + 6 * Math.abs(Math.sin(t / 70 + i * 1.7));
      const g = ctx.createRadialGradient(fx, fy - fl * 0.4, 1, fx, fy - fl * 0.4, fl);
      g.addColorStop(0, rf ? rf[0] : "rgba(255, 245, 180, 0.95)");
      g.addColorStop(0.4, rf ? rf[1] : "rgba(255, 160, 60, 0.85)");
      g.addColorStop(1, rf ? rf[2] : "rgba(229, 60, 40, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(fx, fy - fl * 0.4, fl * 0.55, fl, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    const glow = ctx.createRadialGradient(o.x, o.y, o.r * 0.3, o.x, o.y, o.r * 1.8);
    glow.addColorStop(0, rf ? rf[3] : "rgba(255, 140, 50, 0.12)");
    glow.addColorStop(1, "rgba(255, 140, 50, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(o.x - o.r * 2, o.y - o.r * 2, o.r * 4, o.r * 4);
  }

  // Deko hinter der Fahrbahn (Läden, Zaun, Publikum …) und Tauben davor
  function zeichneDeko(t, vorn) {
    for (const d of deko) {
      const dx0 = d.x0 ?? d.x - 60;
      const dx1 = d.x1 ?? d.x + (d.b || 120);
      if (dx1 < kamX - 40 || dx0 > kamX + W + 40) continue;
      if (vorn !== (d.art === "tauben")) continue;
      if (zeichneWeltDeko(ctx, d, t)) continue;
      if (d.art === "laden") {
        const top = d.y - d.hoch;
        ctx.fillStyle = "#231f30";
        ctx.fillRect(d.x, top, d.b, d.hoch);
        ctx.fillStyle = "#2e2940";
        ctx.fillRect(d.x, top, d.b, 6);
        // Schaufenster mit warmem Licht
        const g = ctx.createLinearGradient(0, d.y - 70, 0, d.y);
        g.addColorStop(0, "rgba(245, 217, 122, 0.45)");
        g.addColorStop(1, "rgba(245, 217, 122, 0.12)");
        ctx.fillStyle = g;
        ctx.fillRect(d.x + 12, d.y - 66, d.b - 60, 56);
        ctx.fillStyle = "#3a3450";
        ctx.fillRect(d.x + d.b - 40, d.y - 70, 26, 70);
        // Leuchtschrift, flackert ab und zu
        const an = Math.sin(t / 900 + d.seed * 20) > -0.92 || Math.random() < 0.5;
        ctx.font = '13px "Press Start 2P", monospace';
        ctx.textAlign = "left";
        ctx.shadowColor = d.farbe;
        ctx.shadowBlur = an ? 12 : 0;
        ctx.fillStyle = an ? d.farbe : "#3a3450";
        ctx.fillText(d.name, d.x + 14, top + 30);
        ctx.shadowBlur = 0;
        // Markise
        ctx.fillStyle = d.farbe;
        ctx.globalAlpha = 0.65;
        for (let i = 0; i < d.b - 60; i += 16) ctx.fillRect(d.x + 12 + i, d.y - 78, 8, 8);
        ctx.globalAlpha = 1;
      } else if (d.art === "laterne") {
        ctx.fillStyle = "#3a3647";
        ctx.fillRect(d.x - 2, d.y - 150, 4, 150);
        ctx.fillRect(d.x - 2, d.y - 150, 26, 4);
        const lg = ctx.createRadialGradient(d.x + 22, d.y - 144, 2, d.x + 22, d.y - 100, 120);
        lg.addColorStop(0, "rgba(255, 236, 170, 0.35)");
        lg.addColorStop(1, "rgba(255, 236, 170, 0)");
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.moveTo(d.x + 14, d.y - 144);
        ctx.lineTo(d.x + 30, d.y - 144);
        ctx.lineTo(d.x + 80, d.y);
        ctx.lineTo(d.x - 36, d.y);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#fff4c8";
        ctx.fillRect(d.x + 16, d.y - 146, 12, 4);
      } else if (d.art === "zaun") {
        ctx.strokeStyle = "rgba(160, 165, 185, 0.35)";
        ctx.lineWidth = 1;
        const top = d.y - 110;
        ctx.beginPath();
        for (let x = Math.ceil(d.x0 / 14) * 14; x < d.x1; x += 14) {
          ctx.moveTo(x, top);
          ctx.lineTo(x + 14, d.y);
          ctx.moveTo(x + 14, top);
          ctx.lineTo(x, d.y);
        }
        ctx.stroke();
        ctx.fillStyle = "rgba(160, 165, 185, 0.5)";
        ctx.fillRect(d.x0, top, d.x1 - d.x0, 3);
        for (let x = Math.ceil(d.x0 / 140) * 140; x < d.x1; x += 140) ctx.fillRect(x, top, 3, 110);
      } else if (d.art === "strahler") {
        ctx.fillStyle = "#3a3647";
        ctx.fillRect(d.x - 3, d.y - 230, 6, 230);
        ctx.fillStyle = "#f4f1f8";
        ctx.fillRect(d.x - 14, d.y - 236, 28, 8);
        const lg = ctx.createRadialGradient(d.x, d.y - 230, 4, d.x, d.y - 120, 220);
        lg.addColorStop(0, "rgba(220, 235, 255, 0.28)");
        lg.addColorStop(1, "rgba(220, 235, 255, 0)");
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.moveTo(d.x - 12, d.y - 228);
        ctx.lineTo(d.x + 12, d.y - 228);
        ctx.lineTo(d.x + 150, d.y);
        ctx.lineTo(d.x - 150, d.y);
        ctx.closePath();
        ctx.fill();
      } else if (d.art === "graffiti") {
        // Betonwand mit bunten, abstrakten Graffiti
        ctx.fillStyle = "#4a4d5c";
        ctx.fillRect(d.x, d.y - 100, d.b, 100);
        let r = Math.floor(d.seed * 1e6);
        const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
        const farben = ["#e5566f", "#5fc39c", "#7fb8ff", "#f5d97a", "#b48ef0", "#f0a35e"];
        for (let i = 0; i < 7; i++) {
          ctx.fillStyle = farben[Math.floor(rnd() * farben.length)];
          ctx.globalAlpha = 0.85;
          ctx.beginPath();
          ctx.ellipse(d.x + 20 + rnd() * (d.b - 40), d.y - 30 - rnd() * 50, 10 + rnd() * 26, 8 + rnd() * 16, rnd() * 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "#14111c";
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          const sx = d.x + 25 + i * ((d.b - 50) / 4);
          ctx.moveTo(sx, d.y - 40 - rnd() * 20);
          ctx.quadraticCurveTo(sx + 14, d.y - 75, sx + 26, d.y - 40 - rnd() * 20);
        }
        ctx.stroke();
      } else if (d.art === "publikum") {
        // Zuschauer hinter dem Zaun, springen bei Tricks
        let r = Math.floor(d.seed * 1e6);
        const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
        for (let x = d.x; x < d.x + d.b; x += 22) {
          const hops = jubel > 0 ? Math.abs(Math.sin(t / 110 + x)) * 10 * Math.min(1, jubel) : Math.abs(Math.sin(t / 900 + x)) * 1.5;
          const yy = d.y - 4 - hops - rnd() * 6;
          ctx.fillStyle = ["#5a4d78", "#4a6a8a", "#7a4d5a", "#4d7a6a"][Math.floor(rnd() * 4)];
          ctx.fillRect(x, yy - 36, 14, 34);
          ctx.fillStyle = "#c9b8a8";
          ctx.beginPath();
          ctx.arc(x + 7, yy - 42, 6, 0, Math.PI * 2);
          ctx.fill();
          if (jubel > 0) {
            ctx.fillStyle = "#c9b8a8";
            ctx.fillRect(x - 2, yy - 56, 3, 16);
            ctx.fillRect(x + 13, yy - 56, 3, 16);
          }
        }
      } else if (d.art === "wasserturm") {
        ctx.fillStyle = "#2a2340";
        ctx.fillRect(d.x - 26, d.y - 70, 4, 70);
        ctx.fillRect(d.x + 22, d.y - 70, 4, 70);
        ctx.fillRect(d.x - 26, d.y - 40, 52, 3);
        const g = ctx.createLinearGradient(d.x - 30, 0, d.x + 30, 0);
        g.addColorStop(0, "#5a4a6e");
        g.addColorStop(1, "#2f2640");
        ctx.fillStyle = g;
        ctx.fillRect(d.x - 30, d.y - 130, 60, 62);
        ctx.beginPath();
        ctx.moveTo(d.x - 34, d.y - 130);
        ctx.lineTo(d.x, d.y - 152);
        ctx.lineTo(d.x + 34, d.y - 130);
        ctx.closePath();
        ctx.fill();
      } else if (d.art === "antenne") {
        ctx.strokeStyle = "#4a4466";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x, d.y - d.h);
        ctx.moveTo(d.x - 10, d.y - d.h + 10);
        ctx.lineTo(d.x + 10, d.y - d.h + 10);
        ctx.stroke();
        ctx.fillStyle = Math.sin(t / 500 + d.x) > 0 ? "#e5566f" : "#5a2030";
        ctx.fillRect(d.x - 2, d.y - d.h - 3, 4, 4);
      } else if (d.art === "schild") {
        // Zonen-Schild
        const text = (ZONEN[d.zone] || "").toUpperCase();
        ctx.font = '12px "Press Start 2P", monospace';
        const b = ctx.measureText(text).width + 30;
        ctx.fillStyle = "#3a3647";
        ctx.fillRect(d.x - 2, d.y - 120, 4, 120);
        ctx.fillRect(d.x + b - 6, d.y - 120, 4, 120);
        ctx.fillStyle = "#1a1726";
        ctx.fillRect(d.x - 8, d.y - 150, b + 8, 36);
        ctx.strokeStyle = "#f5d97a";
        ctx.lineWidth = 2;
        ctx.strokeRect(d.x - 8, d.y - 150, b + 8, 36);
        ctx.fillStyle = "#f5d97a";
        ctx.textAlign = "left";
        ctx.fillText(text, d.x + 8, d.y - 126);
      } else if (d.art === "tauben") {
        let r = Math.floor(d.seed * 1e6);
        const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
        for (let i = 0; i < d.n; i++) {
          let x = d.x + i * 16 + rnd() * 6;
          let y = d.y - 6;
          const flug = d.auf ? d.auf : 0;
          if (flug) {
            x += flug * (140 + i * 30);
            y -= flug * (180 + i * 40) - flug * flug * 20;
          }
          const vf = VOGEL[d.vogel || "taube"];
          ctx.fillStyle = vf.koerper;
          ctx.beginPath();
          ctx.ellipse(x, y, 7, 5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x + 6, y - 4, 3.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = vf.schnabel;
          ctx.fillRect(x + 9, y - 4, 3, 1.6);
          if (flug) {
            const fl = Math.sin(t / 40 + i) * 8;
            ctx.strokeStyle = vf.fluegel;
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            ctx.moveTo(x - 6, y - 2 - fl);
            ctx.lineTo(x, y - 1);
            ctx.lineTo(x + 6, y - 2 - fl);
            ctx.stroke();
          } else {
            // pickt ab und zu
            if (Math.sin(t / 300 + i * 2 + d.seed * 9) > 0.7) ctx.fillRect(x + 8, y + 1, 2, 3);
            ctx.fillStyle = "#f0a35e";
            ctx.fillRect(x - 2, y + 4, 1.4, 3);
            ctx.fillRect(x + 2, y + 4, 1.4, 3);
          }
        }
      }
    }
  }

  function zeichneObjekte(t) {
    for (const o of objekte) {
      const ox0 = o.x0 ?? o.x;
      const ox1 = o.x1 ?? o.x + o.w;
      if (ox1 < kamX - 20 || ox0 > kamX + W + 20) continue;
      if (o.art === "klein") zeichneKleinWelt(ctx, o, t) || zeichneKlein(o);
      else if (o.art === "kiste") zeichneKisteWelt(ctx, o, t) || zeichneKiste(o, t);
      else if (o.art === "scooter") zeichneMover(ctx, o, t) || zeichneScooter(o, t);
      else if (o.art === "pilz") zeichnePilz(ctx, o, t, o.gedrueckt);
      else if (o.art === "geysir") {
        const k = o.phase % 2.8;
        zeichneGeysir(ctx, o, t, geysirHoehe(o) - 12, k > 1.5 && k < 2 ? 1 : 0);
      }
      else if (o.art === "booster") {
        // leuchtende Pfeile auf dem Boden
        const g = ctx.createLinearGradient(o.x0, 0, o.x1, 0);
        g.addColorStop(0, "rgba(95, 195, 156, 0.2)");
        g.addColorStop(1, "rgba(95, 195, 156, 0.75)");
        ctx.fillStyle = g;
        ctx.fillRect(o.x0, o.y - 3, o.x1 - o.x0, 5);
        for (let x = o.x0 + 10; x < o.x1 - 10; x += 34) {
          const a = 0.35 + 0.65 * Math.max(0, Math.sin(t / 90 - x * 0.05));
          ctx.fillStyle = `rgba(160, 255, 210, ${a})`;
          ctx.beginPath();
          ctx.moveTo(x, o.y - 10);
          ctx.lineTo(x + 14, o.y - 4);
          ctx.lineTo(x, o.y + 2);
          ctx.lineTo(x + 5, o.y - 4);
          ctx.closePath();
          ctx.fill();
        }
      } else if (o.art === "ring") zeichneRing(o, t);
      else if (o.art === "kicker") {
        const kz = KICKER_FARBE[teile.find((tt) => o.x0 >= tt.x0 && o.x0 <= tt.x1)?.zone];
        ctx.fillStyle = kz ? kz[0] : o.gross ? "#2f3a55" : "#3a3355";
        ctx.beginPath();
        ctx.moveTo(o.x0, o.y);
        ctx.lineTo(o.x1, o.y - o.h);
        ctx.lineTo(o.x1, o.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = o.gross ? "#5fc39c" : kz ? kz[1] : "#f5d97a";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(o.x0, o.y);
        ctx.lineTo(o.x1, o.y - o.h);
        ctx.stroke();
        if (o.gross) {
          // Stützen
          ctx.fillStyle = "#1f2638";
          for (let x = o.x0 + 30; x < o.x1; x += 26) ctx.fillRect(x, o.y - (o.h * (x - o.x0)) / (o.x1 - o.x0) + 4, 3, (o.h * (x - o.x0)) / (o.x1 - o.x0) - 4);
        }
      } else if (o.art === "rail" && o.stil === "auto") {
        zeichneKiste({ stil: "auto", x: o.x0 - 8, y: o.boden, w: o.x1 - o.x0 + 16, h: o.boden - o.y0, farbe: o.farbe }, t);
      } else if (o.art === "rail" && o.stil === "ledge") {
        const g = ctx.createLinearGradient(0, o.y0, 0, o.y0 + 30);
        g.addColorStop(0, "#b8bcc8");
        g.addColorStop(1, "#6f7383");
        ctx.fillStyle = g;
        ctx.fillRect(o.x0, o.y0, o.x1 - o.x0, 30);
        ctx.fillStyle = "#e6e8ef";
        ctx.fillRect(o.x0, o.y0 - 2, o.x1 - o.x0, 4);
        ctx.fillStyle = "rgba(0,0,0,0.15)";
        ctx.fillRect(o.x0 + (o.x1 - o.x0) / 2, o.y0 + 4, 2, 26);
      } else if (o.art === "rail" && o.stil === "bank") {
        ctx.fillStyle = "#3a3542";
        for (const px of [o.x0 + 10, o.x1 - 14]) ctx.fillRect(px, o.y0, 4, 30);
        ctx.fillStyle = "#a8794a";
        ctx.fillRect(o.x0, o.y0 - 3, o.x1 - o.x0, 6);
        ctx.fillRect(o.x0 + 4, o.y0 - 24, o.x1 - o.x0 - 8, 5);
        ctx.fillRect(o.x0 + 4, o.y0 - 15, o.x1 - o.x0 - 8, 5);
        ctx.fillStyle = "#3a3542";
        for (const px of [o.x0 + 12, o.x1 - 16]) ctx.fillRect(px, o.y0 - 24, 3, 22);
      } else if (o.art === "rail" && o.stil !== "rail") {
        const posten = [o.x0 + 12, o.x1 - 12];
        if (!o.luecke) posten.push((o.x0 + o.x1) / 2);
        const pf = [];
        for (const px of posten) {
          const ry = lerp(o.y0, o.y1, (px - o.x0) / (o.x1 - o.x0));
          const fl = flaechenBei(px).filter((f) => f.art !== "rail" && f.y > ry).sort((a, b) => a.y - b.y)[0];
          if (fl) pf.push([px, ry, fl.y]);
        }
        zeichneRailWelt(ctx, o, t, pf);
      } else if (o.art === "rail") {
        // Pfosten bis zur Fläche darunter
        ctx.fillStyle = "#5d5974";
        const posten = [o.x0 + 12, o.x1 - 12];
        if (!o.luecke) posten.push((o.x0 + o.x1) / 2);
        for (const px of posten) {
          const ry = lerp(o.y0, o.y1, (px - o.x0) / (o.x1 - o.x0));
          const fl = flaechenBei(px).filter((f) => f.art !== "rail" && f.y > ry).sort((a, b) => a.y - b.y)[0];
          if (fl) ctx.fillRect(px - 2, ry, 4, fl.y - ry);
        }
        const g = ctx.createLinearGradient(0, o.y0 - 4, 0, o.y0 + 4);
        ctx.lineCap = "round";
        ctx.strokeStyle = "#8f8ba6";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(o.x0, o.y0);
        ctx.lineTo(o.x1, o.y1);
        ctx.stroke();
        ctx.strokeStyle = "#e9e7f2";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(o.x0, o.y0 - 1.5);
        ctx.lineTo(o.x1, o.y1 - 1.5);
        ctx.stroke();
        void g;
      }
    }
    // Münzen: drehen sich, glänzen
    for (const m of muenzen) {
      if (m.x < kamX - 30 || m.x > kamX + W + 30) continue;
      if (m.weg) {
        m.weg += 0.016;
        if (m.weg > 0.35) continue;
        ctx.globalAlpha = 1 - m.weg / 0.35;
      }
      const dreh = Math.abs(Math.cos(t / 260 + m.x * 0.02));
      const y = m.y - (m.weg ? m.weg * 120 : Math.sin(t / 400 + m.x) * 2);
      const glow = ctx.createRadialGradient(m.x, y, 2, m.x, y, 18);
      glow.addColorStop(0, "rgba(255, 214, 90, 0.4)");
      glow.addColorStop(1, "rgba(255, 214, 90, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(m.x - 18, y - 18, 36, 36);
      const g = ctx.createLinearGradient(m.x - 9, y - 9, m.x + 9, y + 9);
      g.addColorStop(0, "#fff3a8");
      g.addColorStop(0.5, "#ffc93a");
      g.addColorStop(1, "#c48a12");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(m.x, y, 9 * Math.max(0.15, dreh), 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#a06d0a";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      if (dreh > 0.4) {
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.fillRect(m.x - 2 * dreh, y - 5, 2 * dreh, 7);
      }
      ctx.globalAlpha = 1;
    }
  }

  // Skateboard in echten Proportionen von der Seite: dünnes Ahorn-Deck mit Griptape und
  // hochgezogenen Kicktails, Achsen (Grundplatte, Lenkgummis, Hänger), Rollen aus Urethan mit Kugellager.
  // winkel = Drehung um die Längsachse (Kickflip); 0 = normal. Ursprung = Boden unter der Brettmitte.
  const ROLLE_R = 3.6;
  const ACHSE_Y = -ROLLE_R; // Achsmitte über dem Boden
  const DECK_Y = -10.4; // Unterkante Deck (Mitte)
  const DECK_DICKE = 2.2;
  const DECK_BREITE = 13; // so hoch wirkt das Deck, wenn es senkrecht steht
  const SPUR = 10; // Abstand der beiden Rollen einer Achse (von vorn gesehen)
  function deckProfil(y0) {
    // Mittelteil flach, Kicktails mit ca. 20° nach oben
    const pts = [];
    for (let i = 0; i <= 28; i++) {
      const x = -35 + (70 * i) / 28;
      const k = Math.max(0, Math.abs(x) - 22) / 13;
      pts.push([x, y0 - 6.2 * (k * k * 0.55 + k * 0.45)]);
    }
    return pts;
  }
  function zeichneBrett(winkel = 0, b = board) {
    const sk = b.skin;
    const c = Math.cos(winkel);
    const s = Math.sin(winkel);
    const mitte = DECK_Y - DECK_DICKE / 2; // Drehachse = Deckmitte
    // Hilfsfunktion: Punkt (Höhe über Deckmitte h, Seitenversatz q) nach der Drehung
    const proj = (h, q) => mitte - h * c - q * s; // h > 0 = über der Deckmitte
    const unterseiteSichtbar = s > 0.05;
    const flaeche = Math.abs(s) * DECK_BREITE; // sichtbare Breite der Deckfläche

    const achsen = () => {
      if (b.hover) {
        // Hoverboard: statt Rollen zwei leuchtende Schwebe-Düsen
        const puls = 0.6 + 0.3 * Math.sin(performance.now() / 120);
        for (const ax of [-17, 17]) {
          const y = proj(-(DECK_DICKE / 2 + 1.6), 0);
          ctx.fillStyle = "#3a4058";
          ctx.fillRect(ax - 6, Math.min(y, proj(-DECK_DICKE / 2, 0)), 12, 2.4);
          const g = ctx.createRadialGradient(ax, y + 4, 0.5, ax, y + 4, 9);
          g.addColorStop(0, `rgba(190, 225, 255, ${puls})`);
          g.addColorStop(1, "rgba(127, 184, 255, 0)");
          ctx.fillStyle = g;
          ctx.fillRect(ax - 10, y - 4, 20, 16);
        }
        return;
      }
      for (const ax of [-17, 17]) {
        // Höhe unter der Deckmitte: Grundplatte, Hänger, Achse
        const hB = -(DECK_DICKE / 2 + 1.4);
        const yB = proj(hB, 0);
        const yA = proj(-(-mitte + ACHSE_Y), 0);
        // Grundplatte
        ctx.fillStyle = "#6f6c7c";
        ctx.fillRect(ax - 5.5, Math.min(proj(-DECK_DICKE / 2, 0), yB), 11, Math.abs(yB - proj(-DECK_DICKE / 2, 0)) + 0.6);
        // Lenkgummi (rot) und Hänger (Alu)
        const yG = lerp(yB, yA, 0.35);
        ctx.fillStyle = sk.gummi;
        ctx.beginPath();
        ctx.ellipse(ax, yG, 2.4, 1.3, 0, 0, Math.PI * 2);
        ctx.fill();
        const g = ctx.createLinearGradient(ax - 6, 0, ax + 6, 0);
        g.addColorStop(0, "#8d8a99");
        g.addColorStop(0.45, "#e8e6ef");
        g.addColorStop(1, "#7b788a");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(ax - 2.2, yG);
        ctx.lineTo(ax + 2.2, yG);
        ctx.lineTo(ax + 4.6, yA + (yA > yG ? -0.6 : 0.6));
        ctx.lineTo(ax - 4.6, yA + (yA > yG ? -0.6 : 0.6));
        ctx.closePath();
        ctx.fill();
        // Rollen: zwei pro Achse; von der Seite liegen sie hintereinander, beim Drehen gehen sie auseinander
        const rollen = [proj(-(-mitte + ACHSE_Y), SPUR / 2), proj(-(-mitte + ACHSE_Y), -SPUR / 2)];
        rollen.sort((a, b) => a - b);
        rollen.forEach((ry, i) => {
          const hinten = i === 0 && Math.abs(rollen[1] - rollen[0]) < 0.5 ? false : i === 0;
          const rx = ax + (i === 0 ? 0.6 : 0);
          if (hinten) ctx.globalAlpha = 0.8;
          const gr = ctx.createRadialGradient(rx - 1.2, ry - 1.2, 0.3, rx, ry, ROLLE_R);
          gr.addColorStop(0, sk.rolle[0]);
          gr.addColorStop(0.75, sk.rolle[1]);
          gr.addColorStop(1, sk.rolle[2]);
          ctx.fillStyle = gr;
          ctx.beginPath();
          ctx.arc(rx, ry, ROLLE_R, 0, Math.PI * 2);
          ctx.fill();
          // Kugellager
          ctx.fillStyle = "#3c3b46";
          ctx.beginPath();
          ctx.arc(rx, ry, 1.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#c9c7d3";
          ctx.beginPath();
          ctx.arc(rx, ry, 0.7, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        });
      }
    };

    const deck = () => {
      const oben = deckProfil(0);
      // Fläche (Griptape oder Unterseite), sichtbar beim Drehen
      if (flaeche > 0.6) {
        ctx.beginPath();
        oben.forEach(([x, y], i) => {
          const yy = mitte + y * c + flaeche / 2;
          i ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy);
        });
        for (let i = oben.length - 1; i >= 0; i--) ctx.lineTo(oben[i][0], mitte + oben[i][1] * c - flaeche / 2);
        ctx.closePath();
        if (unterseiteSichtbar) {
          const g = ctx.createLinearGradient(-35, 0, 35, 0);
          sk.unten.forEach((f, i) => g.addColorStop(i / (sk.unten.length - 1), f));
          ctx.fillStyle = g;
        } else ctx.fillStyle = sk.grip;
        ctx.fill();
        if (!unterseiteSichtbar) {
          ctx.fillStyle = "rgba(255,255,255,0.07)";
          for (let i = 0; i < 18; i++) ctx.fillRect(-28 + ((i * 41) % 56), mitte - flaeche / 2 + (((i * 7) % 10) / 10) * flaeche, 0.8, 0.8);
        }
      }
      // Holzkante: helles Ahorn mit Schichtlinien, oben ein dünner Streifen Griptape
      const dicke = DECK_DICKE * Math.max(0.35, Math.abs(c));
      const kante = (dy) => oben.map(([x, y]) => [x, mitte + y * c + dy]);
      const o = kante(-dicke / 2 + (s >= 0 ? -flaeche / 2 : flaeche / 2) * 0);
      const u = kante(dicke / 2);
      ctx.beginPath();
      o.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      for (let i = u.length - 1; i >= 0; i--) ctx.lineTo(u[i][0], u[i][1]);
      ctx.closePath();
      if (sk.leuchten) {
        ctx.shadowColor = sk.leuchten;
        ctx.shadowBlur = 8;
      }
      ctx.fillStyle = sk.kante;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = sk.schicht;
      ctx.lineWidth = 0.35;
      for (const f of [0.35, 0.65]) {
        ctx.beginPath();
        o.forEach(([x, y], i) => {
          const yy = lerp(y, u[i][1], f);
          i ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy);
        });
        ctx.stroke();
      }
      // Griptape-Kante auf der Oberseite (zeigt nach oben, solange das Brett richtig herum ist)
      if (c > 0.2) {
        ctx.strokeStyle = "#141218";
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        o.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
      } else if (c < -0.2) {
        ctx.strokeStyle = "#141218";
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        u.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
      }
    };

    // Reihenfolge: liegt die Unterseite (mit den Achsen) zur Kamera, kommen die Achsen nach vorn
    if (unterseiteSichtbar) {
      deck();
      achsen();
    } else {
      achsen();
      deck();
    }
  }

  function zeichneFahrer(t) {
    const x = kamX + SPIELER_X;
    const y = sp.y;
    if (unverwundbar > 0 && Math.floor(t / 90) % 2) return;
    const inLuft = !sp.amBoden && !sp.sturz;
    const grind = sp.amBoden && sp.auf?.art === "rail";
    let hocke = inLuft ? 13 : sp.halten ? 7 : grind ? 6 : 2;
    let drehen = 0;
    let boardX = 1;
    let brettWinkel = 0;
    if (sp.trick) {
      const k = Math.min(1, sp.trick.t / TRICKS[sp.trick.art].dauer);
      if (sp.trick.art === "kickflip") brettWinkel = k * Math.PI * 2;
      if (sp.trick.art === "shove") boardX = Math.cos(k * Math.PI * 2);
      if (sp.trick.art === "backflip") drehen = -k * Math.PI * 2;
    }
    // Grind-Trick: Brett kippt (Nose/Tail), steht quer (Boardslide) oder schräg (Crooked)
    let grindKipp = 0;
    if (sp.grindTrick && grind) {
      const ein = Math.min(1, sp.grindTrick.t / 0.12);
      const a = sp.grindTrick.art;
      if (a === "nose") grindKipp = 0.22 * ein;
      if (a === "tail") grindKipp = -0.22 * ein;
      if (a === "board") boardX = lerp(1, 0.32, ein);
      if (a === "crooked") {
        grindKipp = 0.14 * ein;
        boardX = lerp(1, 0.7, ein);
      }
    }
    let neigung = 0;
    if (sp.amBoden && sp.auf) {
      const f = sp.auf.f;
      if (sp.auf.art === "rampe" || sp.auf.art === "rail") neigung = Math.atan2(f.y1 - f.y0, f.x1 - f.x0);
      if (sp.auf.art === "kicker") neigung = -Math.atan2(f.h, f.x1 - f.x0);
    } else if (inLuft) neigung = Math.max(-0.35, Math.min(0.4, sp.vy / 2200));

    // Schatten auf dem Boden
    if (!sp.sturz) {
      const bodenY = flaechenBei(x).filter((o) => o.y >= y - 2).sort((a, b) => a.y - b.y)[0]?.y;
      if (bodenY !== undefined) {
        const abst = Math.min(1, (bodenY - y) / 200);
        ctx.fillStyle = `rgba(0,0,0,${0.35 * (1 - abst)})`;
        ctx.beginPath();
        ctx.ellipse(x, bodenY + 1, 28 * (1 - abst * 0.5), 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.save();
    ctx.translate(x, y);
    if (sp.sturz) {
      const s = sp.sturz;
      ctx.save();
      ctx.translate(70 * s.t + 20, -40 * Math.sin(Math.min(1, s.t * 2) * Math.PI));
      ctx.rotate(s.t * 9);
      zeichneBrett(0);
      ctx.restore();
      ctx.translate(-14 * s.t, -20);
      ctx.rotate(-s.dreh);
      ctx.translate(0, 20);
      hocke = 9;
    } else {
      ctx.rotate(neigung);
      ctx.translate(0, -38);
      ctx.rotate(drehen);
      ctx.translate(0, 38);
      ctx.save();
      ctx.rotate(grindKipp);
      ctx.scale(boardX, 1);
      zeichneBrett(brettWinkel);
      ctx.restore();
    }

    ctx.translate(0, -7); // Füße stehen auf dem Griptape
    const wedeln = grind ? Math.sin(t / 80) * 9 : Math.sin(t / 260) * 2;
    const hy = -42 + hocke * 1.4;
    const sy = -68 + hocke * 1.5;
    // beim Anschieben geht der hintere Fuß vom Brett nach unten-hinten auf den Boden
    let fussX = -10;
    let fussY = -6;
    let knieX = -9;
    let knieY = -24 + hocke;
    if (sp.schub && !sp.sturz) {
      // echte Push-Bewegung: Fuß vom Brett nach vorne-unten auf den Boden setzen,
      // am Boden nach hinten durchziehen, dann anheben und zurück aufs Tail
      const k = sp.schub.t / SCHUB_DAUER;
      const BODEN_Y = 6; // Bodenhöhe in Figur-Koordinaten
      if (k < 0.22) {
        const a = k / 0.22;
        fussX = lerp(-10, 15, a);
        fussY = lerp(-6, BODEN_Y, a) - Math.sin(a * Math.PI) * 5;
      } else if (k < 0.72) {
        const a = (k - 0.22) / 0.5;
        fussX = lerp(15, -32, a);
        fussY = BODEN_Y;
      } else {
        const a = (k - 0.72) / 0.28;
        fussX = lerp(-32, -10, a);
        fussY = lerp(BODEN_Y, -6, a) - Math.sin(a * Math.PI) * 9;
      }
      // Knie liegt zwischen Hüfte und Fuß, leicht nach vorn gebeugt
      knieX = (0 + fussX) / 2 + 5;
      knieY = (hy + fussY) / 2 + 2;
    }
    const koerper = () => {
      ctx.beginPath();
      ctx.moveTo(fussX, fussY);
      ctx.lineTo(knieX, knieY);
      ctx.lineTo(0, hy);
      ctx.lineTo(10, -24 + hocke * 0.8);
      ctx.lineTo(11, -6);
      ctx.moveTo(0, hy);
      ctx.lineTo(4, sy);
      ctx.moveTo(3, sy + 5);
      ctx.lineTo(-11, sy + 15 - wedeln * 0.6);
      ctx.lineTo(-24, sy + 19 - wedeln);
      ctx.moveTo(4, sy + 5);
      ctx.lineTo(17, sy + 13 + wedeln * 0.6);
      ctx.lineTo(30, sy + 11 + wedeln);
    };
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    // dunkler Rand für Kontrast, dann weißer Strich
    ctx.strokeStyle = "rgba(10, 8, 18, 0.7)";
    ctx.lineWidth = 8;
    koerper();
    ctx.stroke();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4.2;
    koerper();
    ctx.stroke();
    // Schuhe
    ctx.fillStyle = "#e5566f";
    ctx.fillRect(fussX - 5, fussY - 3, 10, 4);
    ctx.fillRect(7, -9, 10, 4);
    // Kopf mit Kappe
    ctx.fillStyle = "#14111c";
    ctx.beginPath();
    ctx.arc(7, sy - 12, 9.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(10, 8, 18, 0.7)";
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3.6;
    ctx.stroke();
    ctx.fillStyle = "#b48ef0";
    ctx.beginPath();
    ctx.arc(7, sy - 14, 10, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(7, sy - 15.5, 15, 3.4);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(11, sy - 11, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function zeichneTeilchen(dt) {
    teilchen = teilchen.filter((p) => (p.t += dt) < p.leben);
    for (const p of teilchen) {
      const k = p.t / p.leben;
      if (p.art === "spur") {
        const x = p.x + p.vx * p.t;
        const y = p.y + p.vy * p.t;
        ctx.globalAlpha = 1 - k;
        if (p.form === "regenbogen") {
          ["#ff6b6b", "#ffb347", "#ffe066", "#7be07b", "#6ab8ff", "#b48ef0"].forEach((f, i) => {
            ctx.fillStyle = f;
            ctx.fillRect(x, y + i * 2, 9, 2);
          });
        } else if (p.form === "linie") {
          ctx.strokeStyle = p.farbe;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + 20, y);
          ctx.stroke();
        } else if (p.form === "flamme") {
          const g = ctx.createRadialGradient(x, y, 0, x, y, p.r * (1.4 - k));
          g.addColorStop(0, "rgba(255, 240, 160, 0.95)");
          g.addColorStop(0.5, "rgba(255, 120, 40, 0.8)");
          g.addColorStop(1, "rgba(200, 40, 20, 0)");
          ctx.fillStyle = g;
          ctx.fillRect(x - p.r * 1.5, y - p.r * 1.5, p.r * 3, p.r * 3);
        } else if (p.form === "stern") {
          ctx.fillStyle = p.farbe;
          ctx.fillRect(x - p.r, y - 0.6, p.r * 2, 1.2);
          ctx.fillRect(x - 0.6, y - p.r, 1.2, p.r * 2);
        } else {
          ctx.fillStyle = p.farbe;
          ctx.beginPath();
          ctx.arc(x, y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
        continue;
      }
      const x = p.x + p.vx * p.t;
      const y = p.y + p.vy * p.t + (p.art === "staub" || p.art === "boost" ? 0 : 700 * p.t * p.t);
      ctx.globalAlpha = 1 - k;
      if (p.art === "boost") {
        ctx.strokeStyle = "rgba(120, 255, 200, 0.8)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 26, y);
        ctx.stroke();
      } else if (p.art === "staub") {
        ctx.fillStyle = "#8e86a6";
        ctx.beginPath();
        ctx.arc(x, y, p.r * (1 + k), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = p.art === "funkel" ? "#fff3a8" : `rgb(255, ${200 + Math.random() * 55}, 140)`;
        ctx.fillRect(x - p.r / 2, y - p.r / 2, p.r, p.r);
      }
    }
    ctx.globalAlpha = 1;
  }

  function zeichnePopups(dt) {
    popups = popups.filter((p) => (p.t += dt) < 1.2);
    ctx.textAlign = "center";
    for (const p of popups) {
      ctx.font = `${p.gross ? 15 : 12}px "Press Start 2P", monospace`;
      ctx.globalAlpha = 1 - Math.max(0, p.t - 0.8) / 0.4;
      const y = p.y - p.t * 46;
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#0b0a10";
      ctx.strokeText(p.text, p.x, y);
      ctx.fillStyle = p.farbe;
      ctx.fillText(p.text, p.x, y);
    }
    ctx.globalAlpha = 1;
  }

  function zeichne(t, dt) {
    ctx.setTransform(skala, 0, 0, skala, 0, 0);
    ctx.imageSmoothingEnabled = true;
    if (zustand === "karte") return zeichneKarte(t);
    if (zustand === "garage") return zeichneGarage(t);
    const bw = weltVonZone(zoneBeiSpieler());
    if (bgAktuell === null) bgAktuell = bw;
    if (bw !== bgAktuell) {
      bgAlt = bgAktuell;
      bgAktuell = bw;
      bgMix = 0;
    }
    bgMix = Math.min(1, bgMix + dt / 1.4);
    if (bgMix < 1 && bgAlt) {
      zeichneHintergrund(ctx, bgAlt, t, kamX, kamY, W, H);
      ctx.globalAlpha = bgMix;
    }
    zeichneHintergrund(ctx, bgAktuell, t, kamX, kamY, W, H);
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.translate(-kamX, -kamY);
    zeichneDeko(t, false);
    zeichneWelt();
    zeichneObjekte(t);
    zeichneDeko(t, true);
    zeichneFahrer(t);
    zeichneTeilchen(dt);
    zeichnePopups(dt);
    ctx.restore();
    zeichneWetter(ctx, bgAktuell, t, kamX, W, H);
    zeichneHud(t, dt);
    // Hinweis, solange man (fast) steht
    if (zustand === "laeuft" && tempo < 90 && !sp.sturz) {
      ctx.globalAlpha = 0.55 + 0.45 * Math.sin(t / 260);
      ctx.font = '13px "Press Start 2P", monospace';
      ctx.textAlign = "center";
      ctx.fillStyle = "#f5d97a";
      ctx.fillText(grob ? "Links tippen: anschieben" : "→ oder D: anschieben", W / 2, H - 28);
      ctx.globalAlpha = 1;
    }
    // Tempo-Linien bei hoher Geschwindigkeit
    if (zustand === "laeuft" && tempo > maxT() * 0.85) {
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 6; i++) {
        const yy = ((i * 97 + t * 0.05) % H);
        const xx = W - ((t * 1.4 + i * 211) % (W + 200));
        ctx.beginPath();
        ctx.moveTo(xx, yy);
        ctx.lineTo(xx + 80, yy);
        ctx.stroke();
      }
    }
  }


  // ---------- Anzeige im Spiel: Weg bis zur nächsten Welt, Welt-Banner ----------
  function zeichneHud(t, dt) {
    if (zustand !== "laeuft" && zustand !== "pause") return;
    const w = WELTEN[aktWelt % WELTEN.length];
    const n = WELTEN[(aktWelt + 1) % WELTEN.length];
    const portal = deko.find((d) => d.art === "portal" && d.idx === aktWelt + 1);
    const zielX = portal ? portal.x : weltAnfangX + WELT_PX + 220;
    const wx = kamX + SPIELER_X;
    const k = Math.max(0, Math.min(1, (wx - weltAnfangX) / Math.max(1, zielX - weltAnfangX)));
    const bx = 350;
    const bb = 260;
    ctx.fillStyle = "rgba(10, 8, 18, 0.55)";
    rund(bx - 44, 6, bb + 88, 40, 12);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    rund(bx, 16, bb, 8, 4);
    ctx.fill();
    ctx.fillStyle = w.farbe;
    rund(bx, 16, Math.max(8, bb * k), 8, 4);
    ctx.fill();
    zeichneWeltSymbol(ctx, w.id, bx - 22, 20, 11, t);
    zeichneWeltSymbol(ctx, n.id, bx + bb + 22, 20, 11, t);
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = "center";
    ctx.fillStyle = "#e9e6f4";
    ctx.fillText(`noch ${Math.max(0, Math.ceil((zielX - wx) / 40))} m bis ${n.name}`, bx + bb / 2, 39);
    if (banner) {
      banner.t += dt;
      const a = Math.min(1, banner.t / 0.3, Math.max(0, (3 - banner.t) / 0.6));
      if (banner.t > 3) banner = null;
      else {
        ctx.globalAlpha = a;
        ctx.textAlign = "center";
        ctx.font = '22px "Press Start 2P", monospace';
        ctx.lineWidth = 6;
        ctx.strokeStyle = "#0b0a10";
        ctx.strokeText(banner.titel.toUpperCase(), W / 2, 112);
        ctx.fillStyle = banner.farbe;
        ctx.fillText(banner.titel.toUpperCase(), W / 2, 112);
        ctx.font = '11px "Press Start 2P", monospace';
        ctx.lineWidth = 4;
        ctx.strokeText(banner.unter, W / 2, 140);
        ctx.fillStyle = "#f4f1f8";
        ctx.fillText(banner.unter, W / 2, 140);
        ctx.globalAlpha = 1;
      }
    }
  }

  // ---------- Menüs (im Canvas gezeichnet): Weltkarte und Garage ----------
  const SANS = "system-ui, -apple-system, Segoe UI, sans-serif";
  function rund(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function panel(x, y, w, h) {
    ctx.fillStyle = "rgba(14, 12, 24, 0.82)";
    rund(x, y, w, h, 14);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  const ueber = (x, y, w, h) => maus && maus.x >= x && maus.x <= x + w && maus.y >= y && maus.y <= y + h;
  function knopf(x, y, w, h, text, aktion, an, farbe, unter) {
    const hov = an && ueber(x, y, w, h);
    if (hov) {
      // Hover: leicht anheben, heller, mit Leuchtrand
      y -= 2;
      ctx.shadowColor = farbe;
      ctx.shadowBlur = 18;
    }
    ctx.fillStyle = an ? farbe : "rgba(90, 86, 110, 0.6)";
    rund(x, y, w, h, 12);
    ctx.fill();
    ctx.shadowBlur = 0;
    if (hov) {
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.fillStyle = an ? "#0f0e13" : "#c8c4d6";
    ctx.textAlign = "center";
    ctx.font = `${h > 50 ? 15 : 11}px "Press Start 2P", monospace`;
    ctx.fillText(text, x + w / 2, y + h / 2 + (unter ? -2 : 5));
    if (unter) {
      ctx.font = `12px ${SANS}`;
      ctx.fillText(unter, x + w / 2, y + h / 2 + 18);
    }
    if (an) knoepfe.push({ x, y, w, h, aktion });
  }
  function umbrechen(text, x, y, breite, zeile) {
    const woerter = text.split(" ");
    let z = "";
    for (const w of woerter) {
      const test = z ? z + " " + w : w;
      if (ctx.measureText(test).width > breite && z) {
        ctx.fillText(z, x, y);
        y += zeile;
        z = w;
      } else z = test;
    }
    if (z) ctx.fillText(z, x, y);
    return y;
  }
  function schloss(x, y, s = 1) {
    ctx.fillStyle = "#c8c4d6";
    ctx.strokeStyle = "#c8c4d6";
    ctx.lineWidth = 2.4 * s;
    ctx.beginPath();
    ctx.arc(x, y - 3 * s, 5 * s, Math.PI, 0);
    ctx.stroke();
    ctx.fillRect(x - 7 * s, y - 3 * s, 14 * s, 11 * s);
    ctx.fillStyle = "#14111c";
    ctx.fillRect(x - 1 * s, y, 2 * s, 4 * s);
  }
  function kopfzeile(titel, unter) {
    ctx.textAlign = "left";
    ctx.font = '18px "Press Start 2P", monospace';
    ctx.fillStyle = "#f5d97a";
    ctx.fillText(titel, 28, 46);
    ctx.font = `13px ${SANS}`;
    ctx.fillStyle = "#c9c3e0";
    ctx.fillText(unter, 28, 68);
    ctx.textAlign = "right";
    ctx.font = '15px "Press Start 2P", monospace';
    ctx.fillStyle = "#ffd65a";
    ctx.fillText(`${fp.muenzen}`, W - 28, 46);
    const mx = W - 28 - ctx.measureText(`${fp.muenzen}`).width - 16;
    const mg = ctx.createLinearGradient(mx - 8, 32, mx + 8, 48);
    mg.addColorStop(0, "#fff3a8");
    mg.addColorStop(0.5, "#ffc93a");
    mg.addColorStop(1, "#c48a12");
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.arc(mx, 40, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#a06d0a";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.font = `13px ${SANS}`;
    ctx.fillStyle = "#c9c3e0";
    ctx.fillText(`Board: ${board.name}`, W - 28, 68);
  }
  const KNOTEN = WELTEN.map((_, i) => ({ x: 96 + i * 128, y: 182 + (i % 2 ? 34 : -26) }));

  function zeichneKarte(t) {
    knoepfe = [];
    const w = WELTEN[wahlWelt];
    zeichneHintergrund(ctx, w.id, t, t * 0.05, -H * 0.68, W, H);
    ctx.fillStyle = "rgba(8, 6, 16, 0.5)";
    ctx.fillRect(0, 0, W, H);
    kopfzeile("STICK-SKATER", "Weltkarte · je weiter du fährst, desto mehr Welten");
    // Weg zwischen den Welten
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    for (let i = 0; i < KNOTEN.length - 1; i++) {
      const a = KNOTEN[i];
      const b = KNOTEN[i + 1];
      const frei = i + 1 <= fp.welten;
      ctx.strokeStyle = frei ? "#f5d97a" : "rgba(255,255,255,0.25)";
      ctx.setLineDash([10, 9]);
      ctx.lineDashOffset = frei ? -t / 40 : 0;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 + (i % 2 ? -30 : 30), b.x, b.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    WELTEN.forEach((welt, i) => {
      const { x, y } = KNOTEN[i];
      const frei = i <= fp.welten;
      const gew = i === wahlWelt;
      const hov = ueber(x - 44, y - 44, 88, 100);
      const r = (gew ? 34 + Math.sin(t / 300) * 1.5 : 27) + (hov ? 3 : 0);
      if (gew) {
        const g = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 2);
        g.addColorStop(0, welt.farbe + "88");
        g.addColorStop(1, welt.farbe + "00");
        ctx.fillStyle = g;
        ctx.fillRect(x - r * 2, y - r * 2, r * 4, r * 4);
      }
      ctx.fillStyle = "rgba(20, 17, 28, 0.92)";
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = frei ? welt.farbe : "#5a566a";
      ctx.lineWidth = gew ? 4 : 3;
      ctx.stroke();
      if (hov && !gew) {
        ctx.strokeStyle = "rgba(255,255,255,0.7)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, r + 6, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = frei ? 1 : 0.3;
      zeichneWeltSymbol(ctx, welt.id, x, y, r * 0.62, t);
      ctx.globalAlpha = 1;
      if (!frei) schloss(x + r * 0.62, y + r * 0.5, 1);
      ctx.textAlign = "center";
      ctx.font = `${gew ? "bold " : ""}13px ${SANS}`;
      ctx.fillStyle = frei || hov ? "#f4f1f8" : "#8a8698";
      ctx.fillText(welt.name, x, y + r + 20);
      knoepfe.push({ x: x - 44, y: y - 44, w: 88, h: 100, aktion: () => (wahlWelt = i) });
    });
    // Infos zur gewählten Welt
    const frei = wahlWelt <= fp.welten;
    panel(24, 300, 400, 156);
    ctx.textAlign = "left";
    ctx.font = '13px "Press Start 2P", monospace';
    ctx.fillStyle = w.farbe;
    ctx.fillText(`${wahlWelt + 1}. ${w.name.toUpperCase()}`, 44, 332);
    ctx.font = `15px ${SANS}`;
    ctx.fillStyle = "#e9e6f4";
    umbrechen(w.kurz, 44, 360, 360, 21);
    ctx.font = `13px ${SANS}`;
    ctx.fillStyle = "#c9c3e0";
    ctx.fillText(`Weiteste Fahrt: ${fp.weiteste || 0} m · ${fp.welten + 1} von ${WELTEN.length} Welten offen`, 44, 414);
    ctx.fillStyle = frei ? "#5fc39c" : "#c8c4d6";
    ctx.fillText(frei ? (wahlWelt === 0 ? "Startwelt · hier beginnt alles" : "Freigeschaltet ✓ · hier kannst du starten") : `Gesperrt: fahr in einem Lauf durch ${WELTEN[wahlWelt - 1].name} bis hierher`, 44, 438);
    // Aufgaben
    panel(436, 300, 316, 156);
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillStyle = "#f5d97a";
    ctx.fillText("AUFGABEN", 454, 326);
    fp.aufgaben.slice(0, 3).forEach((a, j) => {
      const y0 = 352 + j * 36;
      ctx.textAlign = "left";
      ctx.font = `13px ${SANS}`;
      ctx.fillStyle = "#e9e6f4";
      let text = a.text;
      while (ctx.measureText(text).width > 230 && text.length > 8) text = text.slice(0, -2);
      if (text !== a.text) text = text.trimEnd() + "…";
      ctx.fillText(text, 454, y0);
      ctx.textAlign = "right";
      ctx.fillStyle = "#ffd65a";
      ctx.fillText(`+${a.lohn} ●`, 736, y0);
      ctx.fillStyle = "rgba(255,255,255,0.14)";
      rund(454, y0 + 7, 220, 6, 3);
      ctx.fill();
      ctx.fillStyle = "#5fc39c";
      const anteil = a.typ === "welt" ? (a.stand >= a.ziel ? 1 : 0) : Math.min(1, a.stand / a.ziel);
      rund(454, y0 + 7, Math.max(6, 220 * anteil), 6, 3);
      ctx.fill();
      ctx.font = `11px ${SANS}`;
      ctx.fillStyle = "#c9c3e0";
      ctx.fillText(a.typ === "welt" ? "" : `${Math.min(a.stand, a.ziel)}/${a.ziel}`, 736, y0 + 14);
    });
    knopf(766, 300, 170, 72, "▶ LOS", starteLauf, frei, "#5fc39c", "Leertaste");
    knopf(766, 384, 170, 40, "BOARDS", () => (zustand = "garage"), true, "#b48ef0");
    ctx.textAlign = "center";
    ctx.font = `12px ${SANS}`;
    ctx.fillStyle = "#c9c3e0";
    ctx.fillText(grob ? "Welt antippen" : "← → Welt · B Boards", 851, 448);
  }

  function boardAktion() {
    const b = BOARDS[wahlBoard];
    if (fp.board === b.id) return;
    if (!fp.boards.includes(b.id)) {
      if (fp.muenzen < b.preis) return;
      fp.muenzen -= b.preis;
      fp.boards.push(b.id);
    }
    fp.board = b.id;
    board = b;
    bf = boardFaktoren(b);
    speichern(fp);
    zeigeStatus();
  }

  // Board von unten gesehen (wie an der Wand im Skateshop)
  function deckUnterseite(cx, cy, l, br, b, t) {
    const sk = b.skin;
    const x0 = cx - l / 2;
    const r = br / 2;
    const form = () => {
      ctx.beginPath();
      ctx.moveTo(x0 + r, cy - r);
      ctx.lineTo(x0 + l - r, cy - r);
      ctx.arc(x0 + l - r, cy, r, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(x0 + r, cy + r);
      ctx.arc(x0 + r, cy, r, Math.PI / 2, Math.PI * 1.5);
      ctx.closePath();
    };
    if (sk.leuchten) {
      ctx.shadowColor = sk.leuchten;
      ctx.shadowBlur = 22 + 6 * Math.sin(t / 400);
    }
    form();
    ctx.fillStyle = sk.kante;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.save();
    form();
    ctx.clip();
    const g = ctx.createLinearGradient(x0, 0, x0 + l, 0);
    sk.unten.forEach((f, i) => g.addColorStop(i / (sk.unten.length - 1), f));
    ctx.fillStyle = g;
    ctx.fillRect(x0 + 4, cy - r + 4, l - 8, br - 8);
    // Grafik: Streifen und Stern
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    for (let i = 0; i < 5; i++) ctx.fillRect(x0 + l * 0.18 + i * 14, cy - r, 6, br);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const rr = i % 2 ? 9 : 22;
      ctx.lineTo(cx + 40 + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    ctx.fill();
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(20, 17, 28, 0.75)";
    ctx.fillText(b.name.toUpperCase(), cx - 50, cy + 5);
    ctx.restore();
    // Achsen von unten
    for (const ax of [x0 + l * 0.2, x0 + l * 0.8]) {
      if (b.hover) {
        const g2 = ctx.createRadialGradient(ax, cy, 2, ax, cy, 30);
        g2.addColorStop(0, "rgba(190, 225, 255, 0.9)");
        g2.addColorStop(1, "rgba(127, 184, 255, 0)");
        ctx.fillStyle = g2;
        ctx.fillRect(ax - 30, cy - 30, 60, 60);
        continue;
      }
      ctx.fillStyle = "#8d8a99";
      ctx.fillRect(ax - 9, cy - r - 6, 18, br + 12);
      ctx.fillStyle = sk.rolle[1];
      for (const wy of [cy - r - 10, cy + r - 2]) {
        rund(ax - 12, wy, 24, 12, 4);
        ctx.fill();
      }
    }
  }
  const SPUR_NAME = { neon: "Neon-Streifen", feuer: "Flammen", schnee: "Schneeflocken", funkeln: "Goldfunkeln", regenbogen: "Regenbogen", hover: "Schwebeglühen" };
  function zeichneGarage(t) {
    knoepfe = [];
    zeichneHintergrund(ctx, WELTEN[Math.min(wahlWelt, fp.welten)].id, t, t * 0.05, -H * 0.68, W, H);
    ctx.fillStyle = "rgba(8, 6, 16, 0.62)";
    ctx.fillRect(0, 0, W, H);
    kopfzeile("GARAGE", "Boards kaufen mit Münzen aus deinen Läufen");
    const b = BOARDS[wahlBoard];
    const hat = fp.boards.includes(b.id);
    const aktiv = fp.board === b.id;
    // Vorschau auf einem Podest
    const sp0 = ctx.createRadialGradient(360, 200, 10, 360, 200, 230);
    sp0.addColorStop(0, "rgba(255, 245, 210, 0.2)");
    sp0.addColorStop(1, "rgba(255, 245, 210, 0)");
    ctx.fillStyle = sp0;
    ctx.fillRect(120, 70, 480, 250);
    deckUnterseite(360, 165, 330, 78, b, t);
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.beginPath();
    ctx.ellipse(360, 292, 130, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(360, 290 + (b.hover ? Math.sin(t / 400) * 3 - 5 : 0));
    ctx.scale(3, 3);
    zeichneBrett(0, b);
    ctx.restore();
    // Name, Werte, Kaufen
    ctx.textAlign = "left";
    ctx.font = '16px "Press Start 2P", monospace';
    ctx.fillStyle = "#f4f1f8";
    ctx.fillText(b.name.toUpperCase(), 600, 122);
    [["Tempo", "tempo"], ["Sprung", "sprung"], ["Schub", "schub"]].forEach(([l, k], i) => {
      ctx.font = `14px ${SANS}`;
      ctx.fillStyle = "#c9c3e0";
      ctx.fillText(l, 600, 158 + i * 28);
      for (let j = 0; j < 5; j++) {
        ctx.fillStyle = j < b.werte[k] ? "#f5d97a" : "rgba(255,255,255,0.15)";
        rund(680 + j * 40, 148 + i * 28, 34, 11, 4);
        ctx.fill();
      }
    });
    ctx.font = `13px ${SANS}`;
    ctx.fillStyle = "#c9c3e0";
    ctx.fillText(b.hover ? "Schwebt statt zu rollen · Spur: Schwebeglühen" : b.spur ? `Spur: ${SPUR_NAME[b.spur]}` : "Ohne Spur", 600, 248);
    if (aktiv) knopf(600, 264, 300, 48, "AUSGEWÄHLT ✓", null, false, "#5fc39c");
    else if (hat) knopf(600, 264, 300, 48, "AUSWÄHLEN", boardAktion, true, "#5fc39c");
    else if (fp.muenzen >= b.preis) knopf(600, 264, 300, 48, `KAUFEN · ${b.preis} ●`, boardAktion, true, "#ffd65a");
    else knopf(600, 264, 300, 48, `NOCH ${b.preis - fp.muenzen} ● NÖTIG`, null, false, "#ffd65a");
    // alle Boards
    BOARDS.forEach((bo, i) => {
      const x = 24 + i * 114;
      const y = 330;
      const gew = i === wahlBoard;
      const hov = ueber(x, y, 104, 112);
      ctx.fillStyle = gew ? "rgba(40, 34, 64, 0.95)" : hov ? "rgba(32, 28, 50, 0.92)" : "rgba(14, 12, 24, 0.82)";
      rund(x, y - (hov ? 3 : 0), 104, 112, 12);
      ctx.fill();
      ctx.strokeStyle = gew ? "#f5d97a" : hov ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.1)";
      ctx.lineWidth = gew ? 2.5 : hov ? 1.5 : 1;
      ctx.stroke();
      ctx.save();
      ctx.translate(x + 52, y + 50);
      ctx.scale(1.25, 1.25);
      zeichneBrett(0, bo);
      ctx.restore();
      ctx.textAlign = "center";
      ctx.font = `13px ${SANS}`;
      ctx.fillStyle = "#f4f1f8";
      ctx.fillText(bo.name, x + 52, y + 78);
      ctx.font = `12px ${SANS}`;
      const besitzt = fp.boards.includes(bo.id);
      ctx.fillStyle = fp.board === bo.id ? "#5fc39c" : besitzt ? "#c9c3e0" : "#ffd65a";
      ctx.fillText(fp.board === bo.id ? "✓ aktiv" : besitzt ? "gekauft" : `${bo.preis} ●`, x + 52, y + 98);
      knoepfe.push({ x, y, w: 104, h: 112, aktion: () => (wahlBoard = i) });
    });
    knopf(24, 88, 150, 36, "← KARTE", zeigeKarte, true, "#9fd0ff");
    ctx.textAlign = "center";
    ctx.font = `12px ${SANS}`;
    ctx.fillStyle = "#c9c3e0";
    ctx.fillText(grob ? "Board antippen, dann kaufen oder auswählen" : "← → wählen · Enter kaufen/auswählen · Esc zurück zur Karte", W / 2, 466);
  }

  function kameraNachfuehren(dt) {
    // Spieler bleibt bei ca. 68 % der Höhe; in der Luft folgt die Kamera ruhiger
    let ziel = (sp.amBoden || sp.sturz ? sp.y : Math.max(sp.y, ebeneUnter(kamX + SPIELER_X) - 60)) - H * 0.68;
    // beim Fallen in eine Lücke nicht ins Leere hinterherschauen
    ziel = Math.min(ziel, (sp.letzterBoden ?? 0) + 140 - H * 0.68);
    // bei hohen Sprüngen (Feuerring) mit nach oben schauen
    if (!sp.amBoden && !sp.sturz) ziel = Math.min(ziel, sp.y - H * 0.5);
    kamY = lerp(kamY, ziel, Math.min(1, dt * (sp.amBoden ? 5 : 2.2)));
  }

  function loop(t) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.033, (t - (zuletzt || t)) / 1000);
    zuletzt = t;
    if (zustand === "laeuft") {
      schritt(dt);
      kameraNachfuehren(dt);
      if (zustand === "laeuft" && t - statusZeit > 150) {
        statusZeit = t;
        zeigeStatus();
      }
    }
    zeichne(t, zustand === "laeuft" ? dt : 0);
  }
  let statusZeit = 0;

  function los() {
    if (zustand === "ende") return starteLauf();
    if (zustand === "karte") return starteLauf();
    if (zustand === "pause") {
      zustand = "laeuft";
      nachricht(null);
    }
  }
  function pause() {
    if (zustand !== "laeuft") return;
    zustand = "pause";
    nachricht(`<p class="big">Pause</p><p><button type="button" class="btn" data-skate="karte">Zur Karte</button></p><p class="small">Leertaste oder Klick zum Weiterfahren</p>`);
    kartenKnopf();
  }

  // ---------- Eingabe ----------
  const onKeyDown = (e) => {
    if (e.target.closest?.("input, select, textarea")) return;
    const k = e.key;
    if ([" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "W", "s", "S", "a", "A", "d", "D"].includes(k)) e.preventDefault();
    if (e.repeat) return;
    const links = k === "ArrowLeft" || k === "a" || k === "A";
    const rechts = k === "ArrowRight" || k === "d" || k === "D";
    if (zustand === "karte") {
      if (links) wahlWelt = Math.max(0, wahlWelt - 1);
      else if (rechts) wahlWelt = Math.min(WELTEN.length - 1, wahlWelt + 1);
      else if (k === " " || k === "Enter" || k === "ArrowUp") starteLauf();
      else if (k === "b" || k === "B") zustand = "garage";
      return;
    }
    if (zustand === "garage") {
      if (links) wahlBoard = Math.max(0, wahlBoard - 1);
      else if (rechts) wahlBoard = Math.min(BOARDS.length - 1, wahlBoard + 1);
      else if (k === " " || k === "Enter") boardAktion();
      else if (k === "Escape" || k === "b" || k === "B" || k === "k" || k === "K") zeigeKarte();
      return;
    }
    if ((k === "k" || k === "K") && (zustand === "pause" || zustand === "ende")) return zeigeKarte();
    if (k === "p" || k === "P" || k === "Escape") return zustand === "laeuft" ? pause() : null;
    if (zustand !== "laeuft") {
      if (k === " " || k === "Enter" || k === "ArrowUp") los();
      return;
    }
    const aufStange = sp.amBoden && sp.auf?.art === "rail" && !sp.sturz;
    if (aufStange && k !== " ") {
      // auf der Stange: Pfeile = Grind-Tricks, Leertaste = abspringen
      const art = { ArrowUp: "nose", w: "nose", W: "nose", ArrowDown: "board", s: "board", S: "board", ArrowLeft: "tail", a: "tail", A: "tail", ArrowRight: "crooked", d: "crooked", D: "crooked" }[k];
      if (art === "crooked") schubHalten = true;
      if (art) return grindTrick(art);
    }
    if (k === "ArrowRight" || k === "d" || k === "D") {
      schubHalten = true;
      anschieben();
    } else if (k === " " || k === "ArrowUp" || k === "w" || k === "W") {
      if (sp.amBoden) springen();
      else trick("kickflip");
    } else if (k === "ArrowDown" || k === "s" || k === "S") trick("shove");
    else if (k === "ArrowLeft" || k === "a" || k === "A") trick("backflip");
  };
  // Sprungtaste früh losgelassen: kleiner Hüpfer statt voller Ollie
  function sprungLoslassen() {
    sp.halten = false;
    if (sp.sprungSchnitt && !sp.amBoden && sp.vy < -160) sp.vy *= 0.42;
    sp.sprungSchnitt = false;
  }
  const onKeyUp = (e) => {
    if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") sprungLoslassen();
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") schubHalten = false;
  };
  let schubHalten = false;
  function anschieben() {
    if (zustand !== "laeuft" || sp.sturz || !sp.amBoden || sp.schub || sp.auf?.art === "rail") return;
    sp.schub = { t: 0 };
  }
  let zeiger = null; // Finger für Sprung/Wischen
  let schubFinger = null; // Finger, der links gedrückt hält
  let maus = null; // Mausposition im Menü (für Hover)
  const logisch = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };
  const knopfBei = (pt) => pt && [...knoepfe].reverse().find((b) => b.aktion && pt.x >= b.x && pt.x <= b.x + b.w && pt.y >= b.y && pt.y <= b.y + b.h);
  const onDown = (e) => {
    const r = canvas.getBoundingClientRect();
    if (zustand === "karte" || zustand === "garage") {
      knopfBei(logisch(e))?.aktion();
      return;
    }
    if (zustand !== "laeuft") return los();
    const links = e.clientX - r.left < r.width * 0.4;
    if (links) {
      // linke Seite: anschieben (gedrückt halten = weiter schieben, auch über Sprünge hinweg)
      schubFinger = e.pointerId;
      schubHalten = true;
      anschieben();
      return;
    }
    zeiger = { id: e.pointerId, x: e.clientX, y: e.clientY, warAmBoden: sp.amBoden, gewischt: false };
    if (sp.amBoden) springen();
  };
  const onMove = (e) => {
    if (zustand === "karte" || zustand === "garage") {
      maus = logisch(e);
      canvas.style.cursor = knopfBei(maus) ? "pointer" : "default";
      return;
    }
    if (!zeiger || zeiger.gewischt || e.pointerId !== zeiger.id) return;
    const dx = e.clientX - zeiger.x;
    const dy = e.clientY - zeiger.y;
    if (Math.hypot(dx, dy) < 26) return;
    zeiger.gewischt = true;
    if (sp.amBoden && sp.auf?.art === "rail") {
      // auf der Stange wischen = Grind-Trick
      grindTrick(Math.abs(dy) > Math.abs(dx) ? (dy < 0 ? "nose" : "board") : dx < 0 ? "tail" : "crooked");
      return;
    }
    if (Math.abs(dy) > Math.abs(dx)) trick(dy < 0 ? "kickflip" : "shove");
    else trick(dx < 0 ? "backflip" : "kickflip");
  };
  const onUp = (e) => {
    if (e.pointerId === schubFinger) {
      schubFinger = null;
      schubHalten = false;
      return;
    }
    if (!zeiger || e.pointerId !== zeiger.id) return;
    if (!zeiger.gewischt && !zeiger.warAmBoden) trick("kickflip");
    zeiger = null;
    sprungLoslassen();
  };
  const onLeave = () => {
    maus = null;
    canvas.style.cursor = "";
  };
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("pointerleave", onLeave);
  const ausOverlay = overlayKlick(() => zustand !== "laeuft" && los());

  zustand = "karte";
  neu();
  passeAufloesung();
  zeigeStatus();
  raf = requestAnimationFrame(loop);
  document.fonts?.load('12px "Press Start 2P"');

  return {
    pause,
    stop() {
      if (zustand === "laeuft" || zustand === "pause") abrechnen();
      speichern(fp);
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.style.cursor = "";
      ausOverlay();
    },
  };
}
