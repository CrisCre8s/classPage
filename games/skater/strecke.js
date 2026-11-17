// Stick-Skater – baut aus den Bausteinen eines Levels (level.js) die echte Strecke:
// Böden, Lücken, Treppen, Grind-Stangen, Hindernisse, Züge, Pressen, Risse und Tinten-Tropfen.
// Der Endlos-Modus hängt laufend neue Bausteine an.
import { WELTEN } from "./level.js";

export const BODEN_Y = 400; // Starthöhe des Bodens (logische Pixel, y nach unten)
export const TEMPO = 380; // Grundtempo (px/s)
export const OLLIE = 820; // Absprung (px/s)
export const G = 2400; // Schwerkraft (px/s²)

// Kleiner, fester Zufall: gleiche Strecke bei jedem Versuch
export function zufall(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Größe der Hindernisse (Breite, Höhe)
export const HINDERNIS = {
  hydrant: [30, 40], tonne: [36, 46], kegel: [28, 36], fass: [38, 48], kiste: [46, 44], koffer: [46, 34],
  schild: [14, 56], luefter: [54, 44], antenne: [16, 58], ratte: [36, 18], schrott: [44, 30], block: [40, 40],
};
// Parallelwelt: an derselben Stelle steht etwas anderes (gleiche Gefahr, anderes Aussehen und etwas andere Größe)
const ALT = { hydrant: "block", tonne: "schrott", kegel: "schild", fass: "kiste", kiste: "fass", koffer: "schrott", schild: "kegel", luefter: "block", antenne: "schild", schrott: "tonne", block: "hydrant", ratte: "ratte" };

// Grind-Objekte: Höhe über dem Boden (Start, Ende), fest = man kann dagegenfahren
const GRIND = {
  gelaender: { h0: 46, h1: 46, fest: false },
  kante: { h0: 30, h1: 30, fest: true },
  bahnsteig: { h0: 32, h1: 32, fest: true },
  rohr: { h0: 58, h1: 58, fest: false },
  kette: { h0: 70, h1: 52, fest: false },
  traeger: { h0: 70, h1: 70, fest: false },
  kran: { h0: 80, h1: 108, fest: false },
  tafel: { h0: 88, h1: 88, fest: false },
};

// Flugbahn eines normalen Ollies (für die Tropfen-Bögen, die zeigen, wo man springen muss)
function bogen(st, x0, y0, v, anzahl, dim = 0, von = 0.12, bis = 0.88) {
  const T = (2 * OLLIE) / G;
  for (let i = 0; i < anzahl; i++) {
    const f = von + ((bis - von) * i) / Math.max(1, anzahl - 1);
    const t = T * f;
    st.tropfen.push({ x: x0 + v * t, y: y0 - (OLLIE * t - (G / 2) * t * t) - 34, dim, weg: false });
  }
}

export function baueStrecke({ bausteine, welt, seed = 1, endlos = false }) {
  const W = WELTEN[welt];
  const st = {
    welt,
    boden: [], // { x0, x1, y, art, v?, kruemel?, y1? (Treppe) }
    grinds: [], // { x0, y0, x1, y1, art }
    hind: [], // { x, y, w, h, art, alt, typ: "fest" | "ratte" }
    pressen: [], // { x, y, w, periode, phase }
    zuege: [], // { gx0, gx1, x, len, y, v, start, aktivAb, aktiv }
    risse: [], // { x, y, r, weg, nr }
    tropfen: [], // { x, y, dim, weg }
    schwer: [], // { x0, x1, g }
    deko: [], // { x, y, art }
    checkpoints: [], // { x, y }
    ziel: Infinity,
    cx: 0,
    cy: BODEN_Y,
    rnd: zufall(seed * 7919 + welt * 131),
    nr: 0,
    tempo: TEMPO * W.tempo,
    endlos,
  };
  // Anlauf
  flach(st, 520, true);
  st.checkpoints.push({ x: 60, y: st.cy });
  for (const b of bausteine) baustein(st, b);
  if (!endlos) {
    flach(st, 260, true);
    st.ziel = st.cx;
    flach(st, 1400, true);
  }
  return st;
}

export function bodenArt(st) {
  return st.welt === 4 ? "dach" : "boden";
}

function flach(st, len, checkpoint = false, art = bodenArt(st)) {
  const letzter = st.boden[st.boden.length - 1];
  if (letzter && letzter.x1 === st.cx && letzter.y === st.cy && letzter.art === art && !letzter.v && !letzter.kruemel && letzter.y1 == null) letzter.x1 += len;
  else st.boden.push({ x0: st.cx, x1: st.cx + len, y: st.cy, art });
  if (checkpoint) st.checkpoints.push({ x: st.cx + 30, y: st.cy });
  st.cx += len;
}

function hindernis(st, x, art) {
  const [w, h] = HINDERNIS[art] || HINDERNIS.block;
  const alt = ALT[art] || "block";
  const [aw, ah] = HINDERNIS[alt];
  st.hind.push({ x, y: st.cy, w, h, art, alt, aw, ah, typ: art === "ratte" ? "ratte" : "fest" });
  // Tropfen-Bogen: zeigt, wo man abspringen muss
  const T = (2 * OLLIE) / G;
  bogen(st, x + w / 2 - (st.tempo * T) / 2, st.cy, st.tempo, 5);
}

function grind(st, x0, x1, art, yBasis0 = st.cy, yBasis1 = st.cy) {
  const g = GRIND[art] || GRIND.gelaender;
  const seg = { x0, y0: yBasis0 - g.h0, x1, y1: yBasis1 - g.h1, art };
  st.grinds.push(seg);
  if (g.fest) st.hind.push({ x: x0, y: yBasis0, w: x1 - x0, h: g.h0, art, typ: "kante" });
  // Bogen, der auf die Stange führt
  const T = (2 * OLLIE) / G;
  const v = st.tempo;
  for (let i = 0; i < 4; i++) {
    const t = T * (0.15 + i * 0.12);
    const yy = yBasis0 - (OLLIE * t - (G / 2) * t * t);
    if (yBasis0 - yy < g.h0 * 0.6 && i > 1) break;
    st.tropfen.push({ x: x0 - v * 0.42 + v * t, y: yy - 34, dim: 0, weg: false });
  }
  for (let x = x0 + 50; x < x1 - 20; x += 70) {
    const f = (x - x0) / (x1 - x0);
    st.tropfen.push({ x, y: seg.y0 + (seg.y1 - seg.y0) * f - 36, dim: 0, weg: false });
  }
}

function riss(st, x, y) {
  st.risse.push({ x, y, r: 46, weg: false, nr: st.nr++ });
  // In der Parallelwelt gibt es Bonus-Tropfen hinter dem Riss
  for (let i = 0; i < 10; i++) st.tropfen.push({ x: x + 220 + i * 56, y: st.cy - 40 - Math.sin(i * 0.7) * 30, dim: 1, weg: false });
}

// Bausteine, an deren Anfang man springen muss, bekommen genug Anlauf (auch nach einem Grind)
const MIT_ANLAUF = new Set(["l", "l+", "lg", "t", "t-", "h", "dach", "zug", "panels"]);
function baustein(st, token) {
  const [b, arg] = token.split(":");
  if (MIT_ANLAUF.has(b)) flach(st, b === "dach" || b === "lg" ? 220 : 180);
  const W = WELTEN[st.welt];
  const r = st.rnd;
  const v = st.tempo;
  const T = (2 * OLLIE) / G;
  const railArt = W.rail;
  switch (b) {
    case "f": {
      const art = arg || W.pool[Math.floor(r() * W.pool.length)];
      const x = st.cx;
      flach(st, 460, true);
      hindernis(st, x + 250, art);
      if (art === "ratte") st.hind[st.hind.length - 1].x = x + 420;
      break;
    }
    case "f-":
      flach(st, 320, true);
      break;
    case "f$": {
      const x = st.cx;
      flach(st, 380, true);
      for (let i = 0; i < 5; i++) st.tropfen.push({ x: x + 90 + i * 50, y: st.cy - 36, dim: 0, weg: false });
      break;
    }
    case "fl":
      flach(st, 700, true);
      break;
    case "l":
    case "l+":
    case "lg": {
      const len = b === "l" ? 150 : b === "l+" ? 210 : 250;
      if (b === "l+") grind(st, st.cx - 110, st.cx + len + 90, railArt === "bahnsteig" || railArt === "kante" ? "gelaender" : railArt);
      else bogen(st, st.cx - 10 - v * T * 0.08, st.cy, v, 5);
      st.cx += len;
      flach(st, b === "l+" ? 300 : 260, true);
      break;
    }
    case "t":
    case "t-": {
      // Treppe: 6 Stufen runter. Draufrollen oder draufspringen = Sturz. Drüberspringen oder Geländer grinden.
      const len = 240;
      const tief = 96;
      if (b === "t") {
        const g = GRIND.gelaender;
        st.grinds.push({ x0: st.cx - 40, y0: st.cy - g.h0 - 16, x1: st.cx + len + 30, y1: st.cy + tief - g.h0 + 12, art: "gelaender", treppe: true });
      }
      st.boden.push({ x0: st.cx, x1: st.cx + len, y: st.cy, y1: st.cy + tief, art: "treppe", stufen: 6 });
      bogen(st, st.cx - 30, st.cy, v, 6, 0, 0.1, 0.95);
      st.cx += len;
      st.cy += tief;
      flach(st, 320, true);
      break;
    }
    case "h": {
      // Kante hoch: gegen die Wand fahren = Sturz
      bogen(st, st.cx - v * 0.2, st.cy, v, 4, 0, 0.12, 0.5);
      st.cy -= 56;
      flach(st, 400, true);
      break;
    }
    case "hd":
      st.cy += 64;
      flach(st, 340, true);
      break;
    case "g": {
      const x = st.cx;
      const art = arg || railArt;
      flach(st, 660, true);
      grind(st, x + 160, x + 540, art);
      break;
    }
    case "riss":
    case "riss0": {
      const x = st.cx;
      flach(st, 460, true);
      if (b === "riss") {
        riss(st, x + 260, st.cy - 150);
        bogen(st, x + 260 - v * 0.34, st.cy, v, 3, 0, 0.12, 0.35);
      } else riss(st, x + 260, st.cy - 46);
      break;
    }
    case "band+":
    case "band-": {
      st.boden.push({ x0: st.cx, x1: st.cx + 540, y: st.cy, art: "band", v: b === "band+" ? 210 : -150 });
      st.checkpoints.push({ x: st.cx + 30, y: st.cy });
      st.cx += 540;
      flach(st, 120);
      break;
    }
    case "presse":
    case "presse2": {
      const x = st.cx;
      flach(st, b === "presse" ? 520 : 640, true);
      const periode = 2.4;
      st.pressen.push({ x: x + 250, y: st.cy, w: 84, periode, phase: r() * periode });
      if (b === "presse2") st.pressen.push({ x: x + 420, y: st.cy, w: 84, periode, phase: (st.pressen[st.pressen.length - 1].phase + periode * 0.5) % periode });
      break;
    }
    case "zug": {
      // Gleisbett mit Zug: draufspringen, mitfahren, vorne wieder runter
      const len = 820;
      const L = 1260;
      const gx0 = st.cx;
      st.zuege.push({ gx0, gx1: gx0 + L, len, y: st.cy - 46, v: 60, start: gx0 + 40, x: gx0 + 40, aktivAb: gx0 - 700, aktiv: false, boden: st.cy });
      for (let i = 0; i < 9; i++) st.tropfen.push({ x: gx0 + 260 + i * 80, y: st.cy - 46 - 36, dim: 0, weg: false });
      st.cx += L;
      flach(st, 360, true);
      break;
    }
    case "ratte": {
      const x = st.cx;
      flach(st, 540, true);
      hindernis(st, x + 470, "ratte");
      st.tropfen.splice(st.tropfen.length - 5, 5); // die Ratte läuft, der Bogen stimmt nicht
      break;
    }
    case "dach": {
      // Häuserlücke mit neuer Dachhöhe
      let dh = [-60, -30, 0, 30, 50][Math.floor(r() * 5)];
      // nicht endlos nach unten oder oben wandern
      if (st.cy - BODEN_Y > 160) dh = -Math.abs(dh);
      if (BODEN_Y - st.cy > 160) dh = Math.abs(dh);
      const len = 180;
      bogen(st, st.cx - 12, st.cy, v, 5, 0, 0.1, 0.9);
      st.cx += len;
      st.cy += dh;
      flach(st, 460, true);
      if (r() < 0.5) st.deko.push({ x: st.cx - 260, y: st.cy, art: "wassertank" });
      break;
    }
    case "panels": {
      // zerbrechender Boden: kurze Comic-Panels, die nach dem Berühren wegbrechen
      for (let i = 0; i < 4; i++) {
        st.boden.push({ x0: st.cx, x1: st.cx + 150, y: st.cy, art: "panel", kruemel: true });
        st.cx += 150 + (i < 3 ? 46 : 0);
        if (i < 3) st.tropfen.push({ x: st.cx - 23, y: st.cy - 70, dim: 0, weg: false });
      }
      flach(st, 260, true);
      break;
    }
    case "schwer": {
      const x = st.cx;
      flach(st, 900, true);
      st.schwer.push({ x0: x + 60, x1: x + 860, g: 0.42 });
      for (let i = 0; i < 8; i++) st.tropfen.push({ x: x + 200 + i * 70, y: st.cy - 140 - Math.sin(i * 0.8) * 60, dim: 0, weg: false });
      break;
    }
    default:
      flach(st, 300, true);
  }
}

// ---------- Endlos-Modus: immer neue Bausteine aus der Welt ----------
const ENDLOS_POOL = [
  ["f", "f", "g:gelaender", "g:kante", "t", "l", "l+", "h", "hd", "f$", "riss", "riss0"],
  ["f", "ratte", "l", "l+", "g:rohr", "f$", "hd", "riss", "riss0", "l"],
  ["f", "presse", "band+", "band-", "g:kette", "g:traeger", "l+", "riss", "presse2", "f$"],
  ["f", "zug", "g:bahnsteig", "l+", "t", "riss", "zug", "f$", "riss0"],
  ["f", "dach", "dach", "lg", "g:kran", "g:tafel", "riss", "f$", "dach"],
  ["f", "panels", "schwer", "zug", "presse", "ratte", "l+", "dach", "riss", "riss0", "band+", "g:traeger", "t"],
];
export function endlosWeiter(st, bisX) {
  const pool = ENDLOS_POOL[st.welt];
  while (st.cx < bisX) {
    const b = pool[Math.floor(st.rnd() * pool.length)];
    baustein(st, b);
    if (st.rnd() < 0.35) baustein(st, "f-");
  }
}
// Alles weit hinter der Kamera wegwerfen (Endlos-Modus)
export function aufraeumen(st, abX) {
  const weg = (a, f) => {
    let i = 0;
    while (i < a.length && f(a[i]) < abX) i++;
    if (i > 0) a.splice(0, i);
  };
  weg(st.boden, (b) => b.x1);
  weg(st.grinds, (g) => g.x1);
  st.hind = st.hind.filter((h) => h.x + h.w > abX - 400);
  weg(st.pressen, (p) => p.x + p.w);
  weg(st.zuege, (z) => z.gx1);
  weg(st.risse, (r) => r.x + 100);
  st.tropfen = st.tropfen.filter((t) => t.x > abX);
  weg(st.schwer, (s) => s.x1);
  weg(st.deko, (d) => d.x + 200);
  st.checkpoints = st.checkpoints.filter((c, i, a) => c.x > abX || i === a.length - 1 || a[i + 1].x > abX);
}

// ---------- Abfragen ----------
// Höhe einer Fläche an Stelle x (Treppen sind schräg)
export function flaecheY(b, x) {
  if (b.y1 == null) return b.y + (b.dy || 0);
  const f = Math.max(0, Math.min(1, (x - b.x0) / (b.x1 - b.x0)));
  // Stufen: die Kante liegt treppenförmig
  const n = b.stufen || 6;
  return b.y + (b.dy || 0) + (b.y1 - b.y) * (Math.ceil(f * n - 1e-6) / n);
}
export function grindY(g, x) {
  return g.y0 + ((g.y1 - g.y0) * (x - g.x0)) / (g.x1 - g.x0);
}
export function presseUnten(p, t) {
  // 0 = ganz oben, 1 = ganz unten. Knallt schnell runter, bleibt kurz unten, fährt langsam wieder hoch
  const ph = ((t + p.phase) % p.periode) / p.periode;
  if (ph < 0.06) return ph / 0.06;
  if (ph < 0.2) return 1;
  if (ph < 0.4) return 1 - (ph - 0.2) / 0.2;
  return 0;
}
export const PRESSE_HUB = 150;
