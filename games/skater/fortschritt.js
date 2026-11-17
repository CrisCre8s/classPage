// Stick-Skater – Fortschritt, Shop und Erfolge. Alles bleibt im localStorage dieses Browsers.
import { LEVEL, WELTEN, STERNE_FUER_WELT } from "./level.js";

const KEY = "skater2-v1";
const ALT_KEY = "skate-fortschritt-v1"; // alter Stick-Skater: Münzen werden als Tinten-Tropfen übernommen

// ---------- Kostüme (Kleidung/Accessoires für das Strichmännchen) ----------
export const KOSTUEME = [
  { id: "basic", name: "Strichmännchen", text: "Pur. Tinte auf Papier.", preis: 0 },
  { id: "hoodie", name: "Hoodie-Punk", text: "Kapuze und Kopfhörer.", preis: 250 },
  { id: "noir", name: "Noir-Detektiv", text: "Hut und Trenchcoat.", preis: 500 },
  { id: "robo", name: "Roboter", text: "Kantiger Kopf mit Antenne.", preis: 800 },
  { id: "ninja", name: "Graffiti-Ninja", text: "Maske und Spraydose am Gürtel.", erfolg: "riss10" },
  { id: "glitch", name: "Glitch-Wesen", text: "Flackert und verschiebt Farben.", erfolg: "welt6" },
];

// ---------- Skateboards mit kleinen Werte-Unterschieden ----------
// tempo: Höchsttempo · dreh: Trickdauer (kleiner = schneller) · punkte: Trickpunkte · grind: Balance-Drift · riss: Dauer der Parallelwelt
export const BOARDS = [
  { id: "standard", name: "Standard-Deck", text: "Ausgewogen.", preis: 0, werte: { tempo: 1, dreh: 1, punkte: 1, grind: 1, riss: 1 } },
  { id: "neon", name: "Neon-Board", text: "Leuchtet. +25 % Trickpunkte.", preis: 400, werte: { tempo: 1, dreh: 1, punkte: 1.25, grind: 1, riss: 1 } },
  { id: "stahl", name: "Fabrik-Board", text: "Aus Stahl: schneller, dreht sich aber träger.", preis: 600, werte: { tempo: 1.12, dreh: 1.18, punkte: 1, grind: 1, riss: 1 } },
  { id: "schleim", name: "Kanal-Board", text: "Schleim-Rollen: ruhigere Grinds.", erfolg: "kanal_alle", werte: { tempo: 1, dreh: 1, punkte: 1, grind: 0.55, riss: 1 } },
  { id: "riss", name: "Riss-Board", text: "Parallelwelt hält 50 % länger.", erfolg: "riss10", alternativ: 900, werte: { tempo: 1, dreh: 1, punkte: 1, grind: 1, riss: 1.5 } },
];

// ---------- Erfolge ----------
const sterneIn = (f, w) => LEVEL.reduce((a, l, i) => a + (l.welt === w ? (f.sterne[i] || []).filter(Boolean).length : 0), 0);
export const sterneGesamt = (f) => Object.values(f.sterne).reduce((a, s) => a + (s || []).filter(Boolean).length, 0);
export const ERFOLGE = [
  { id: "erstes", name: "Erste Ziellinie", text: "Schaff dein erstes Level", pruef: (f) => (f.stat.geschafft || 0) >= 1 },
  { id: "combo5", name: "Combo x5", text: "5 Tricks in einer Combo", pruef: (f) => (f.stat.maxCombo || 0) >= 5 },
  { id: "combo10", name: "Combo x10", text: "10 Tricks in einer Combo", pruef: (f) => (f.stat.maxCombo || 0) >= 10 },
  { id: "riss1", name: "Durch den Riss", text: "Dein erster Dimensionssprung", pruef: (f) => (f.stat.risse || 0) >= 1 },
  { id: "riss10", name: "10 Dimensionssprünge", text: "Schaltet Graffiti-Ninja und Riss-Board frei", pruef: (f) => (f.stat.risse || 0) >= 10 },
  { id: "grind50", name: "Grind-Maschine", text: "50 Grinds", pruef: (f) => (f.stat.grinds || 0) >= 50 },
  { id: "punkte20k", name: "20.000 in einem Lauf", text: "Mindestens 20.000 Punkte in einem Level", pruef: (f) => (f.stat.bestLauf || 0) >= 20000 },
  { id: "kanal_alle", name: "Kanalratte", text: "Alle Sterne in der Kanalisation (schaltet Kanal-Board frei)", pruef: (f) => sterneIn(f, 1) >= 15 },
  { id: "fabrik", name: "Schichtende", text: "Alle Level der Fabrik geschafft", pruef: (f) => LEVEL.every((l, i) => l.welt !== 2 || f.geschafft[i]) },
  { id: "welt6", name: "Realität repariert", text: "Glitch-Dimension abgeschlossen (schaltet Glitch-Wesen frei)", pruef: (f) => LEVEL.every((l, i) => l.welt !== 5 || f.geschafft[i]) },
  { id: "endlos", name: "Ohne Ende", text: "10.000 Punkte in einem Endlos-Lauf", pruef: (f) => Object.values(f.endlos).some((p) => p >= 10000) },
  { id: "tropfen", name: "Tintenfass", text: "1.000 Tinten-Tropfen gesammelt", pruef: (f) => (f.stat.tropfenGesamt || 0) >= 1000 },
  { id: "sterne", name: "Sternensammler", text: "Alle 90 Sterne", pruef: (f) => sterneGesamt(f) >= LEVEL.length * 3 },
];

const STANDARD_EINSTELLUNGEN = { musik: 0.6, effekte: 0.8, effektStaerke: 1, blitzeReduziert: false };

export function laden() {
  let f = null;
  try {
    f = JSON.parse(localStorage.getItem(KEY) || "null");
  } catch {
    f = null;
  }
  const neu = !f;
  f = {
    tropfen: 0,
    sterne: {}, // Levelindex → [bool, bool, bool]
    geschafft: {}, // Levelindex → true
    best: {}, // Levelindex → Punkte
    endlos: {}, // Weltindex → Highscore
    kostueme: ["basic"],
    boards: ["standard"],
    kostuem: "basic",
    board: "standard",
    erfolge: [],
    stat: {},
    einstellungen: {},
    ...(f || {}),
  };
  for (const k of ["sterne", "geschafft", "best", "endlos", "stat", "einstellungen"]) if (!f[k] || typeof f[k] !== "object") f[k] = {};
  for (const k of ["kostueme", "boards", "erfolge"]) if (!Array.isArray(f[k])) f[k] = [];
  if (!f.kostueme.includes("basic")) f.kostueme.unshift("basic");
  if (!f.boards.includes("standard")) f.boards.unshift("standard");
  if (!KOSTUEME.some((k) => k.id === f.kostuem)) f.kostuem = "basic";
  if (!BOARDS.some((b) => b.id === f.board)) f.board = "standard";
  f.einstellungen = { ...STANDARD_EINSTELLUNGEN, ...f.einstellungen };
  f.tropfen = Math.max(0, Math.floor(Number(f.tropfen) || 0));
  // Übernahme aus dem alten Stick-Skater (einmalig)
  if (neu && !localStorage.getItem(KEY + "-alt")) {
    try {
      localStorage.setItem(KEY + "-alt", "1");
      const alt = JSON.parse(localStorage.getItem(ALT_KEY) || "null");
      if (alt && Number(alt.muenzen) > 0) {
        f.tropfen += Math.floor(Number(alt.muenzen));
        f.uebernommen = Math.floor(Number(alt.muenzen));
      }
    } catch {
      /* nichts zu übernehmen */
    }
  }
  return f;
}

export function speichern(f) {
  try {
    localStorage.setItem(KEY, JSON.stringify(f));
  } catch {
    /* privat: ohne Speichern */
  }
}

export function loeschen() {
  try {
    localStorage.removeItem(KEY);
    localStorage.setItem(KEY + "-alt", "1");
  } catch {
    /* egal */
  }
}

export const sterneVonLevel = (f, i) => f.sterne[i] || [false, false, false];
export function weltFrei(f, w) {
  return sterneGesamt(f) >= STERNE_FUER_WELT[w];
}
// Level einer Welt nacheinander: das erste ist frei, wenn die Welt frei ist; danach muss das vorige geschafft sein
export function levelFrei(f, i) {
  const l = LEVEL[i];
  if (!weltFrei(f, l.welt)) return false;
  const erstes = LEVEL.findIndex((x) => x.welt === l.welt);
  return i === erstes || !!f.geschafft[i - 1];
}

export function itemBesessen(f, art, id) {
  return (art === "kostuem" ? f.kostueme : f.boards).includes(id);
}
// Kann das Item jetzt freigeschaltet werden? Rückgabe: { geht, grund }
export function itemKaufbar(f, art, item) {
  if (itemBesessen(f, art, item.id)) return { geht: false, grund: "besessen" };
  if (item.erfolg && f.erfolge.includes(item.erfolg)) return { geht: true, kosten: 0 };
  const preis = item.preis ?? item.alternativ;
  if (preis == null) return { geht: false, grund: "erfolg" };
  return { geht: f.tropfen >= preis, kosten: preis, grund: f.tropfen >= preis ? "" : "tropfen" };
}
export function kaufen(f, art, item) {
  const k = itemKaufbar(f, art, item);
  if (!k.geht) return false;
  f.tropfen -= k.kosten;
  (art === "kostuem" ? f.kostueme : f.boards).push(item.id);
  if (art === "kostuem") f.kostuem = item.id;
  else f.board = item.id;
  speichern(f);
  return true;
}

// Neue Erfolge prüfen. Rückgabe: Liste der neu erreichten
export function pruefeErfolge(f) {
  const neu = [];
  for (const e of ERFOLGE) {
    if (f.erfolge.includes(e.id) || !e.pruef(f)) continue;
    f.erfolge.push(e.id);
    neu.push(e);
  }
  // Erfolgs-Belohnungen: Items werden mit dem Erfolg verfügbar (im Shop gratis abholbar)
  if (neu.length) speichern(f);
  return neu;
}

export const boardWerte = (f) => (BOARDS.find((b) => b.id === f.board) || BOARDS[0]).werte;
export { LEVEL, WELTEN };
