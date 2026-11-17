// Stick-Skater – Spiel-Logik: Physik, Ollie, Tricks, Grinds mit Balance, Combo, Sturz mit Ragdoll,
// Dimensionsrisse und Parallelwelt, Sterne-Aufgaben. Kein Zeichnen hier, nur Zustand.
// Läuft mit festem Zeitschritt (1/120 s). Ereignisse (für Ton und Bild) landen in s.ev.
import { G, OLLIE, zufall, flaecheY, grindY, presseUnten, PRESSE_HUB, endlosWeiter, aufraeumen } from "./strecke.js";

export const DT = 1 / 120;
export const TRICKS = {
  kickflip: { name: "Kickflip", dauer: 0.42, punkte: 100, ruf: "FLIP!" },
  heelflip: { name: "Heelflip", dauer: 0.42, punkte: 100, ruf: "HEEL!" },
  shove360: { name: "360 Shove-it", dauer: 0.5, punkte: 200, ruf: "SHOVE!" },
  impossible: { name: "Impossible", dauer: 0.55, punkte: 300, ruf: "WRAP!" },
};
export const TRICK_TASTE = { hoch: "kickflip", runter: "heelflip", links: "shove360", rechts: "impossible" };
const PARALLEL_DAUER = 8;
const STURZ_DAUER = 1.7;
export const STILE = ["noir", "manga", "zine", "pixel"];
export const WELT_STILE = [["noir", "zine"], ["manga", "pixel"], ["zine", "noir"], ["pixel", "manga"], ["noir", "manga"], ["noir", "manga", "zine", "pixel"]];

export function neuesSpiel({ st, board, endlos = false, leben = 3 }) {
  for (const h of st.hind) h.x0 = h.x;
  const s = {
    st,
    welt: st.welt,
    endlos,
    board,
    t: 0,
    rnd: zufall(4242 + st.welt),
    p: { x: 60, y: st.cy, vx: st.tempo * 0.6, vy: 0, zustand: "boden", ref: st.boden[0], halt: 0, trick: null, grind: null, ignor: null, ignorT: 0, unverw: 0, luftT: 0, sturzT: 0, ragdoll: null, landT: 9 },
    punkte: 0,
    tropfen: 0,
    leben,
    combo: { sum: 0, n: 0, liste: [] },
    stat: { grinds: {}, grindsGesamt: 0, tricks: {}, risse: 0, sturz: 0, maxCombo: 0 },
    par: null, // { t, dauer, stil }
    ev: [],
    fertig: null, // "ziel" | "aus"
    meter: 0,
    tiefster: st.cy,
    basisTempo: st.tempo,
  };
  s.p.y = st.boden[0].y;
  return s;
}

export const mult = (s) => (s.par ? 2 : 1) * s.board.punkte;
const emit = (s, typ, d = {}) => s.ev.push({ typ, t: s.t, ...d });

// ---------- Abfragen auf der Strecke ----------
function bodenIdx(st, x) {
  const b = st.boden;
  let lo = 0;
  let hi = b.length - 1;
  let r = -1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1;
    if (b[m].x0 <= x) {
      r = m;
      lo = m + 1;
    } else hi = m - 1;
  }
  return r;
}
export function zugX(s, z, tz = 0) {
  const max = z.gx1 - 8 - z.len;
  if (z.aktiv) return Math.min(max, z.x + z.v * tz);
  const bis = s.p.vx > 1 ? (z.aktivAb - s.p.x) / s.p.vx : 99;
  return Math.min(max, z.start + z.v * Math.max(0, tz - Math.max(0, bis)));
}
// Alle Flächen an Stelle x: [{ y, ref }]
export function flaechenBei(s, x, tz = 0) {
  const st = s.st;
  const out = [];
  const i = bodenIdx(st, x);
  for (let k = i; k >= 0 && k >= i - 2; k--) {
    const b = st.boden[k];
    if (x >= b.x0 && x <= b.x1 && (b.dy || 0) < 500) out.push({ y: flaecheY(b, x), ref: b });
  }
  for (const z of st.zuege) {
    if (x < z.gx0 || x > z.gx1) continue;
    const zx = zugX(s, z, tz);
    if (x >= zx && x <= zx + z.len) out.push({ y: z.y, ref: z, zug: true });
  }
  return out;
}
function ratteX(s, h, tz) {
  if (h.typ !== "ratte") return h.x;
  if (h.aktiv) return h.x - 150 * tz;
  const bis = s.p.vx > 1 ? (h.x0 - 650 - s.p.x) / s.p.vx : 99;
  return h.x - 150 * Math.max(0, tz - Math.max(0, bis));
}
export function hindBox(s, h, tz = 0) {
  const par = !!s.par && h.alt;
  const w = par ? h.aw : h.w;
  const hh = par ? h.ah : h.h;
  const x = ratteX(s, h, tz);
  return [x, h.y - hh, x + w, h.y];
}
export function presseBox(s, p, tz = 0) {
  const d = presseUnten(p, s.t + tz);
  const yb = p.y - PRESSE_HUB * (1 - d);
  return [p.x, yb - 60, p.x + p.w, yb];
}
const ueberlappt = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
function spielerBox(x, y, luft) {
  return [x - 10, y - (luft ? 50 : 58), x + 10, y - 3];
}
// Trifft der Körper etwas Gefährliches?
function kollision(s, x, y, luft, tz = 0, rand = 0) {
  const b = spielerBox(x, y, luft);
  b[0] -= rand;
  b[1] -= rand;
  b[2] += rand;
  const st = s.st;
  for (const h of st.hind) {
    if (h.x0 > x + 260 || h.x0 + h.w < x - 400) continue;
    if (ueberlappt(b, hindBox(s, h, tz))) return h.typ === "kante" ? "kante" : h.art;
  }
  for (const p of st.pressen) {
    if (p.x > x + 60 || p.x + p.w < x - 60) continue;
    if (ueberlappt(b, presseBox(s, p, tz))) return "presse";
  }
  return null;
}
function schwerkraft(s, x) {
  for (const z of s.st.schwer) if (x >= z.x0 && x <= z.x1) return z.g;
  return 1;
}

// ---------- Ein Schritt ----------
// ein: { sprung, sprungNeu, trick, links, rechts }
export function schritt(s, ein) {
  const dt = DT;
  const p = s.p;
  const st = s.st;
  s.t += dt;

  // bewegliche Teile
  for (const z of st.zuege) {
    if (!z.aktiv && p.x >= z.aktivAb && p.x < z.gx1) z.aktiv = true;
    if (z.aktiv) z.x = Math.min(z.gx1 - 8 - z.len, z.x + z.v * dt);
  }
  for (const h of st.hind) {
    if (h.typ !== "ratte") continue;
    if (!h.aktiv && p.x > h.x0 - 650) h.aktiv = true;
    if (h.aktiv) h.x -= 150 * dt;
  }
  for (const b of st.boden) {
    if (b.kt == null) continue;
    b.kt += dt;
    if (b.kt > 0.45) {
      b.fv = (b.fv || 0) + G * 0.6 * dt;
      b.dy = (b.dy || 0) + b.fv * dt;
    }
  }
  if (s.par) {
    s.par.t += dt;
    if (s.par.t >= s.par.dauer) {
      s.par = null;
      emit(s, "zurueck");
    }
  }
  if (p.unverw > 0) p.unverw -= dt;
  if (p.ignorT > 0) p.ignorT -= dt;
  p.landT += dt;

  switch (p.zustand) {
    case "boden":
      bodenSchritt(s, ein, dt);
      break;
    case "luft":
      luftSchritt(s, ein, dt);
      break;
    case "grind":
      grindSchritt(s, ein, dt);
      break;
    case "sturz":
      sturzSchritt(s, dt);
      return;
    case "ziel":
      p.vx = Math.max(0, p.vx - 260 * dt);
      p.x += p.vx * dt;
      {
        const f = flaechenBei(s, p.x);
        if (f.length) p.y = Math.min(...f.map((q) => q.y));
      }
      return;
    default:
      return;
  }
  if (p.zustand === "sturz") return;

  // Hindernisse
  if (p.unverw <= 0) {
    const k = kollision(s, p.x, p.y, p.zustand === "luft");
    if (k) return sturz(s, k === "presse" ? "presse" : "hindernis");
  }
  // Tropfen
  const cy = p.y - 30;
  for (const t of st.tropfen) {
    if (t.weg || t.x < p.x - 30) continue;
    if (t.x > p.x + 30) break;
    if (t.dim === 1 && !s.par) continue;
    if (Math.abs(t.x - p.x) < 26 && Math.abs(t.y - cy) < 38) {
      t.weg = true;
      s.tropfen += t.dim === 1 ? 2 : 1;
      s.punkte += Math.round(10 * mult(s));
      emit(s, "tropfen", { x: t.x, y: t.y, bonus: t.dim === 1 });
    }
  }
  // Risse
  if (!s.par) {
    for (const r of st.risse) {
      if (r.weg || Math.abs(r.x - p.x) > 80) continue;
      if (Math.hypot(r.x - p.x, r.y - cy) < r.r + 12) {
        r.weg = true;
        const stile = WELT_STILE[s.welt];
        s.par = { t: 0, dauer: PARALLEL_DAUER * s.board.riss, stil: stile[r.nr % stile.length] };
        s.stat.risse++;
        emit(s, "riss", { stil: s.par.stil, x: r.x, y: r.y });
      }
    }
  }
  // Fortschritt
  s.meter = Math.max(s.meter, p.x);
  if (p.zustand === "boden" && p.ref && p.ref.gx0 == null) s.tiefster = p.y;
  if (!s.endlos && p.x >= st.ziel && p.zustand === "boden") {
    p.zustand = "ziel";
    s.fertig = "ziel";
    emit(s, "ziel");
  }
  if (s.endlos) {
    if (st.cx < p.x + 3000) endlosWeiter(st, p.x + 4200);
    if (st.boden.length && st.boden[0].x1 < p.x - 2500) aufraeumen(st, p.x - 1800);
    // Endlos wird langsam schneller
    st.tempo = s.basisTempo * Math.min(1.35, 1 + p.x / 60000);
  }
}

function zielTempo(s, ein) {
  const v = s.st.tempo * s.board.tempo;
  if (ein.rechts) return v * 1.42;
  if (ein.links) return v * 0.55;
  return v;
}

function bodenSchritt(s, ein, dt) {
  const p = s.p;
  const ziel = zielTempo(s, ein);
  p.vx += Math.sign(ziel - p.vx) * Math.min(Math.abs(ziel - p.vx), (ziel > p.vx ? 420 : 700) * dt);
  let extra = 0;
  if (p.ref && p.ref.art === "band") extra = p.ref.v;
  if (p.ref && p.ref.gx0 != null && p.ref.aktiv) extra = p.ref.v;
  const nx = p.x + (p.vx + extra) * dt;
  const f = flaechenBei(s, nx);
  // Wand: Fläche höher als die Füße
  let beste = null;
  for (const q of f) {
    if (q.y < p.y - 9) {
      if (!(q.ref.art === "treppe")) return sturz(s, "wand", nx);
      continue;
    }
    if (!beste || q.y < beste.y) beste = q;
  }
  p.x = nx;
  if (!beste || beste.y > p.y + 5) {
    // Kante runter oder Lücke: abheben
    p.zustand = "luft";
    p.vy = 0;
    p.halt = 1;
    p.luftT = 0;
    return;
  }
  p.y = beste.y;
  p.ref = beste.ref;
  if (p.ref.kruemel && p.ref.kt == null) {
    p.ref.kt = 0;
    emit(s, "knack", { x: p.x, y: p.y });
  }
  if (ein.sprungNeu) ollie(s, OLLIE);
}

function ollie(s, v) {
  const p = s.p;
  p.zustand = "luft";
  p.vy = -v;
  p.halt = 0;
  p.luftT = 0;
  emit(s, "ollie", { x: p.x, y: p.y });
}

function luftSchritt(s, ein, dt) {
  const p = s.p;
  p.luftT += dt;
  let g = G * schwerkraft(s, p.x);
  if (ein.sprung && p.halt < 0.2 && p.vy < 0) {
    g *= 0.5;
    p.halt += dt;
  } else p.halt = 1;
  p.vy += g * dt;
  const py = p.y;
  const px = p.x;
  p.y += p.vy * dt;
  p.x += p.vx * dt;

  // Tricks
  if (p.trick) {
    p.trick.t += dt;
    if (p.trick.t >= p.trick.dauer) {
      const T = TRICKS[p.trick.art];
      trickDazu(s, p.trick.art, T.punkte);
      emit(s, "trick", { art: p.trick.art, x: p.x, y: p.y });
      p.trick = null;
    }
  }
  if (ein.trick && !p.trick && p.luftT > 0.04) {
    p.trick = { art: ein.trick, t: 0, dauer: TRICKS[ein.trick].dauer * s.board.dreh };
    emit(s, "trickStart", { art: ein.trick });
  }

  if (p.vy > 0) {
    // Grind?
    for (const gseg of s.st.grinds) {
      if (p.x < gseg.x0 - 6 || p.x > gseg.x1) continue;
      if (p.ignor === gseg && p.ignorT > 0) continue;
      const ry = grindY(gseg, Math.max(gseg.x0, p.x));
      if (py <= ry + 3 && p.y >= ry) {
        if (offenerTrick(p)) return sturz(s, "trick");
        if (p.trick) fertigMachen(s);
        return grindStart(s, gseg, ry);
      }
    }
    // Landung?
    let land = null;
    for (const q of flaechenBei(s, p.x)) if (py <= q.y + 2 && p.y >= q.y && (!land || q.y < land.y)) land = q;
    if (land) {
      p.y = land.y;
      if (land.ref.art === "treppe") return sturz(s, "treppe");
      if (offenerTrick(p)) return sturz(s, "trick");
      if (p.trick) fertigMachen(s);
      p.zustand = "boden";
      p.ref = land.ref;
      p.vy = 0;
      p.landT = 0;
      emit(s, "land", { x: p.x, y: p.y, hart: p.luftT > 0.9 });
      combodBuchen(s);
      return;
    }
  }
  // in einen Block hinein (Wand von der Seite oder von unten)
  for (const q of flaechenBei(s, p.x)) {
    if (p.y > q.y + 8 && py > q.y + 2 && (px < (q.ref.x0 ?? -1e9) + 2 || q.zug)) return sturz(s, "wand");
  }
  if (p.y > s.tiefster + 320) return sturz(s, "fall");
}

const offenerTrick = (p) => p.trick && p.trick.t < p.trick.dauer * 0.82;
function fertigMachen(s) {
  // knapp gelandet: zählt noch
  const p = s.p;
  trickDazu(s, p.trick.art, TRICKS[p.trick.art].punkte);
  emit(s, "trick", { art: p.trick.art, x: p.x, y: p.y, knapp: true });
  p.trick = null;
}
function trickDazu(s, art, punkte) {
  s.combo.n++;
  s.combo.sum += punkte * mult(s);
  s.combo.liste.push(TRICKS[art]?.name || art);
  s.stat.tricks[art] = (s.stat.tricks[art] || 0) + 1;
}
function combodBuchen(s) {
  const c = s.combo;
  if (!c.n) return;
  const gewinn = Math.round(c.sum * c.n);
  s.punkte += gewinn;
  s.stat.maxCombo = Math.max(s.stat.maxCombo, c.n);
  emit(s, "combo", { n: c.n, gewinn, x: s.p.x, y: s.p.y });
  s.combo = { sum: 0, n: 0, liste: [] };
}

function grindStart(s, gseg, ry) {
  const p = s.p;
  p.zustand = "grind";
  p.y = ry;
  p.vy = 0;
  p.grind = { seg: gseg, bal: (s.rnd() - 0.5) * 0.3, bv: (s.rnd() - 0.5) * 0.4, zeit: 0, offen: 0 };
  s.combo.n++;
  s.combo.sum += 100 * mult(s);
  s.combo.liste.push("Grind");
  s.stat.grinds[gseg.art] = (s.stat.grinds[gseg.art] || 0) + 1;
  s.stat.grindsGesamt++;
  emit(s, "grind", { art: gseg.art, x: p.x, y: p.y });
}

function grindSchritt(s, ein, dt) {
  const p = s.p;
  const g = p.grind;
  const seg = g.seg;
  p.vx = Math.max(p.vx - 25 * dt, s.st.tempo * 0.8);
  p.x += p.vx * dt;
  g.zeit += dt;
  // Balance: kippt von selbst immer weiter, mit ← → ausgleichen
  const k = s.board.grind;
  g.bv += (g.bal * 2.2 + (s.rnd() - 0.5) * 3.2) * dt * k;
  if (ein.links) g.bv -= 4.2 * dt;
  if (ein.rechts) g.bv += 4.2 * dt;
  g.bv *= 1 - 0.6 * dt;
  g.bal += g.bv * dt;
  const plus = 60 * dt * mult(s);
  s.combo.sum += plus;
  if (Math.abs(g.bal) > 1) return sturz(s, "balance");
  if (p.x >= seg.x1) {
    p.zustand = "luft";
    p.vy = -260;
    p.halt = 1;
    p.luftT = 0.1;
    p.ignor = seg;
    p.ignorT = 0.25;
    p.grind = null;
    emit(s, "grindEnde");
    return;
  }
  p.y = grindY(seg, p.x);
  if (ein.sprungNeu) {
    p.ignor = seg;
    p.ignorT = 0.25;
    p.grind = null;
    ollie(s, OLLIE * 0.86);
  }
}

// ---------- Sturz mit Ragdoll ----------
function sturz(s, grund, x) {
  const p = s.p;
  if (p.zustand === "sturz") return;
  if (x != null) p.x = Math.min(p.x, x);
  p.zustand = "sturz";
  p.sturzT = 0;
  p.sturzGrund = grund;
  p.trick = null;
  p.grind = null;
  s.combo = { sum: 0, n: 0, liste: [] };
  s.stat.sturz++;
  s.leben--;
  p.ragdoll = macheRagdoll(p, s);
  emit(s, "sturz", { grund, x: p.x, y: p.y });
}

const RD_PUNKTE = ["kopf", "hals", "huefte", "ellL", "handL", "ellR", "handR", "knieL", "fussL", "knieR", "fussR"];
const RD_STAEBE = [["kopf", "hals", 14], ["hals", "huefte", 28], ["hals", "ellL", 16], ["ellL", "handL", 16], ["hals", "ellR", 16], ["ellR", "handR", 16], ["huefte", "knieL", 17], ["knieL", "fussL", 17], ["huefte", "knieR", 17], ["knieR", "fussR", 17], ["kopf", "huefte", 40]];
function macheRagdoll(p, s) {
  const x = p.x;
  const y = p.y;
  const pos = { kopf: [x, y - 70], hals: [x, y - 56], huefte: [x, y - 30], ellL: [x - 10, y - 46], handL: [x - 18, y - 36], ellR: [x + 10, y - 46], handR: [x + 18, y - 36], knieL: [x - 6, y - 16], fussL: [x - 8, y], knieR: [x + 6, y - 16], fussR: [x + 8, y] };
  const vx = p.vx * 0.9;
  const vy = Math.min(p.vy, 0) - 380;
  const pts = {};
  for (const k of RD_PUNKTE) {
    const [px, py] = pos[k];
    const wob = (s.rnd() - 0.5) * 6;
    // Kopf fliegt weiter nach vorn: lustiger Überschlag
    const f = k === "kopf" ? 1.25 : k.startsWith("fuss") ? 0.7 : 1;
    pts[k] = { x: px, y: py, ox: px - (vx * f) / 120 + wob * 0.02, oy: py - (vy * f) / 120 };
  }
  return { pts, brett: { x, y: y - 4, vx: vx * 1.2, vy: -520, rot: 0, vr: 14 + s.rnd() * 8 } };
}
function sturzSchritt(s, dt) {
  const p = s.p;
  p.sturzT += dt;
  const rd = p.ragdoll;
  const g = G * 0.8;
  for (const k of RD_PUNKTE) {
    const q = rd.pts[k];
    const vx = (q.x - q.ox) * 0.995;
    const vy = q.y - q.oy;
    q.ox = q.x;
    q.oy = q.y;
    q.x += vx;
    q.y += vy + g * dt * dt;
  }
  for (let it = 0; it < 4; it++) {
    for (const [a, b, l] of RD_STAEBE) {
      const A = rd.pts[a];
      const B = rd.pts[b];
      const dx = B.x - A.x;
      const dy = B.y - A.y;
      const d = Math.hypot(dx, dy) || 0.01;
      const k = ((d - l) / d) * 0.5;
      A.x += dx * k;
      A.y += dy * k;
      B.x -= dx * k;
      B.y -= dy * k;
    }
    for (const k of RD_PUNKTE) {
      const q = rd.pts[k];
      const f = flaechenBei(s, q.x);
      let boden = null;
      for (const o of f) if (o.y >= q.oy - 6 && (boden == null || o.y < boden)) boden = o.y;
      if (boden != null && q.y > boden - 3) {
        q.y = boden - 3;
        const vx = q.x - q.ox;
        q.ox = q.x - vx * 0.6; // Reibung
        q.oy = q.y + (q.y - q.oy) * 0.35;
      }
    }
  }
  const b = rd.brett;
  b.vy += g * dt;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  b.rot += b.vr * dt;
  const fb = flaechenBei(s, b.x);
  for (const o of fb) {
    if (b.y > o.y - 4 && b.y < o.y + 30 && b.vy > 0) {
      b.y = o.y - 4;
      b.vy *= -0.4;
      b.vx *= 0.7;
      b.vr *= 0.6;
    }
  }
  if (p.sturzT >= STURZ_DAUER) {
    if (s.leben > 0) wiederAuf(s);
    else if (!s.fertig) {
      s.fertig = "aus";
      emit(s, "aus");
    }
  }
}

function wiederAuf(s) {
  const p = s.p;
  const st = s.st;
  const sturzX = p.x;
  let cp = st.checkpoints[0];
  for (const c of st.checkpoints) if (c.x < sturzX - 40) cp = c;
  // bewegliche Dinge vor dem Checkpoint zurücksetzen
  for (const z of st.zuege) if (z.gx1 > cp.x) {
    z.aktiv = false;
    z.x = z.start;
  }
  for (const h of st.hind) if (h.typ === "ratte" && h.x0 > cp.x) {
    h.x = h.x0;
    h.aktiv = false;
  }
  for (const b of st.boden) if (b.kruemel && b.x0 > cp.x) {
    b.kt = null;
    b.dy = 0;
    b.fv = 0;
  }
  const f = flaechenBei(s, cp.x);
  p.x = cp.x;
  p.y = f.length ? Math.min(...f.map((q) => q.y)) : cp.y;
  p.ref = f[0]?.ref || p.ref;
  p.vx = st.tempo * 0.75;
  p.vy = 0;
  p.zustand = "boden";
  p.ragdoll = null;
  p.unverw = 1.6;
  s.tiefster = p.y;
  emit(s, "wiederAuf");
}

// ---------- Sterne-Aufgaben ----------
export function aufgabeErfuellt(s, a) {
  switch (a.typ) {
    case "punkte":
      return s.punkte >= a.n;
    case "combo":
      return s.stat.maxCombo >= a.n;
    case "grind":
      return (a.art ? s.stat.grinds[a.art] || 0 : s.stat.grindsGesamt) >= a.n;
    case "trick":
      return (s.stat.tricks[a.art] || 0) >= a.n;
    case "riss":
      return s.stat.risse >= a.n;
    case "tropfen":
      return s.tropfen >= a.n;
    case "ohneSturz":
      return s.fertig === "ziel" && s.stat.sturz === 0;
    default:
      return false;
  }
}
export function aufgabeStand(s, a) {
  switch (a.typ) {
    case "punkte":
      return s.punkte;
    case "combo":
      return Math.max(s.stat.maxCombo, s.combo.n);
    case "grind":
      return a.art ? s.stat.grinds[a.art] || 0 : s.stat.grindsGesamt;
    case "trick":
      return s.stat.tricks[a.art] || 0;
    case "riss":
      return s.stat.risse;
    case "tropfen":
      return s.tropfen;
    case "ohneSturz":
      return s.stat.sturz === 0 ? 1 : 0;
    default:
      return 0;
  }
}

// =====================================================================
// Autopilot: fährt selbst (Startbildschirm und Tests). Simuliert kurze Zukünfte
// mit derselben Geometrie und wählt einen Sprung, der heil ankommt.
// =====================================================================
function simuliere(s, plan, max = 1.5) {
  const p = s.p;
  let x = p.x;
  let y = p.y;
  let vx = p.vx;
  let vy = p.vy;
  let zust = p.zustand === "grind" ? "luft" : p.zustand;
  let ref = p.ref;
  let halt = plan.halt ?? (p.zustand === "luft" ? p.halt : 1);
  let tief = s.tiefster;
  const dt = 1 / 60;
  let gelandet = -1;
  let riss = false;
  let grind = false;
  if (p.zustand === "grind") vy = plan.sprungIn === 0 ? -OLLIE * 0.86 : 0;
  const vz = s.st.tempo * s.board.tempo * (plan.tempo === "schieben" ? 1.42 : plan.tempo === "bremsen" ? 0.55 : 1);
  for (let t = 0; t < max; t += dt) {
    if (zust === "boden") {
      if (plan.sprungIn != null && t >= plan.sprungIn && gelandet < 0) {
        zust = "luft";
        vy = -OLLIE;
        plan = { ...plan, sprungIn: null };
        continue;
      }
      vx += Math.sign(vz - vx) * Math.min(Math.abs(vz - vx), (vz > vx ? 420 : 700) * dt);
      const extra = ref && ref.art === "band" ? ref.v : ref && ref.gx0 != null ? ref.v : 0;
      const nx = x + (vx + extra) * dt;
      let beste = null;
      for (const q of flaechenBei(s, nx, t)) {
        if (q.y < y - 9) {
          if (q.ref.art !== "treppe") return { ok: false, t, landT: gelandet };
          continue;
        }
        if (!beste || q.y < beste.y) beste = q;
      }
      x = nx;
      if (!beste || beste.y > y + 5) {
        zust = "luft";
        vy = 0;
        halt = 1;
      } else {
        y = beste.y;
        ref = beste.ref;
        if (!ref.zuege && ref.gx0 == null) tief = y;
      }
    } else {
      let g = G * schwerkraft(s, x);
      if (halt < 0.2 && vy < 0) {
        g *= 0.5;
        halt += dt;
      }
      vy += g * dt;
      const py = y;
      const px = x;
      y += vy * dt;
      x += vx * dt;
      if (vy > 0) {
        if (plan.grind !== false) {
          for (const gs of s.st.grinds) {
            if (x < gs.x0 - 6 || x > gs.x1) continue;
            if (p.zustand === "grind" && gs === p.grind?.seg && t < 0.3) continue;
            const ry = grindY(gs, Math.max(gs.x0, x));
            if (py <= ry + 3 && y >= ry) {
              // auf dem Grind: Ende prüfen wir nicht weiter, der Bot balanciert
              grind = true;
              return { ok: !kollision(s, x, ry, false, t, 7), t, grind, riss, landT: t };
            }
          }
        }
        let land = null;
        for (const q of flaechenBei(s, x, t)) if (py <= q.y + 2 && y >= q.y && (!land || q.y < land.y)) land = q;
        if (land) {
          if (land.ref.art === "treppe") return { ok: false, t, landT: gelandet };
          y = land.y;
          zust = "boden";
          ref = land.ref;
          vy = 0;
          if (gelandet < 0) gelandet = t;
        }
      }
      for (const q of flaechenBei(s, x, t)) if (y > q.y + 8 && py > q.y + 2 && (px < (q.ref.x0 ?? -1e9) + 2 || q.zug)) return { ok: false, t, landT: gelandet };
      if (y > tief + 40 && !flaechenBei(s, x, t).length) return { ok: false, t, landT: gelandet };
    }
    const k = kollision(s, x, y, zust === "luft", t, 7);
    if (k) return { ok: false, t, landT: gelandet, grund: k };
    if (!riss && !s.par) for (const r of s.st.risse) if (!r.weg && Math.hypot(r.x - x, r.y - (y - 30)) < r.r + 8) riss = true;
    if (gelandet >= 0 && t > gelandet + 0.45) return { ok: true, t, landT: gelandet, riss, grind };
  }
  return { ok: zust === "boden" || plan.sprungIn == null, t: max, landT: gelandet, riss, grind, inLuft: zust !== "boden" };
}

export function autopilot(s, merk, wunschTrick) {
  const p = s.p;
  const ein = { sprung: false, sprungNeu: false, trick: null, links: false, rechts: false };
  merk.t = (merk.t || 0) + DT;
  if (p.zustand === "boden" || p.zustand === "ziel") {
    if (merk.halt > 0) {
      merk.halt -= DT;
      ein.sprung = true;
    }
    if (p.zustand === "ziel") return ein;
    if (merk.tempo) {
      ein.links = merk.tempo === "bremsen";
      ein.rechts = merk.tempo === "schieben";
    }
    if (merk.t < (merk.naechste || 0)) return ein;
    merk.naechste = merk.t + 1 / 40;
    const gerade = simuliere(s, { sprungIn: null, tempo: merk.tempo || null }, 0.75);
    if (!gerade.ok) {
      for (const halt of [0.2, 0.08, 0]) {
        const r = simuliere(s, { sprungIn: 0, halt: 0.2 - halt, tempo: merk.tempo || null }, 1.8);
        if (r.ok) {
          ein.sprungNeu = true;
          ein.sprung = true;
          merk.halt = halt;
          return ein;
        }
      }
      // Springen hilft nicht: bei Pressen das Tempo ändern, sonst auf den richtigen Absprung warten
      if (gerade.grund === "presse" || gerade.t < 0.2) for (const tempo of [null, "bremsen", "schieben"]) {
        const r = simuliere(s, { sprungIn: null, tempo }, 0.75);
        if (r.ok) {
          merk.tempo = tempo;
          return ein;
        }
      }
      if (gerade.t < 0.12) {
        ein.sprungNeu = true;
        ein.sprung = true;
        merk.halt = 0.2;
      }
      return ein;
    }
    merk.tempo = null;
    // Bonus: Grind-Stangen und Risse in der Luft mitnehmen
    const vorne = s.st.grinds.some((g) => g.x0 > p.x - 20 && g.x0 < p.x + 300) || s.st.risse.some((r) => !r.weg && r.x > p.x && r.x < p.x + 320);
    if (vorne) {
      for (const halt of [0.2, 0.1, 0]) {
        const r = simuliere(s, { sprungIn: 0, halt: 0.2 - halt }, 1.8);
        if (r.ok && (r.grind || (r.riss && !s.par))) {
          ein.sprungNeu = true;
          ein.sprung = true;
          merk.halt = halt;
          return ein;
        }
      }
    }
    return ein;
  }
  if (p.zustand === "luft") {
    if (merk.halt > 0) {
      merk.halt -= DT;
      ein.sprung = true;
    }
    if (!p.trick && p.luftT > 0.05) {
      const r = simuliere(s, { sprungIn: null }, 1.6);
      const rest = r.landT >= 0 ? r.landT : r.t;
      const art = wunschTrick || ["kickflip", "heelflip", "shove360", "impossible"][Math.floor(merk.t * 3) % 4];
      if (rest > TRICKS[art].dauer * s.board.dreh + 0.05) ein.trick = art;
      else if (rest > TRICKS.kickflip.dauer * s.board.dreh + 0.05) ein.trick = "kickflip";
    }
    return ein;
  }
  if (p.zustand === "grind") {
    const g = p.grind;
    if (merk.halt > 0) {
      merk.halt -= DT;
      ein.sprung = true;
    }
    if (g.bal + g.bv * 0.25 > 0.04) ein.links = true;
    else if (g.bal + g.bv * 0.25 < -0.04) ein.rechts = true;
    // Am Ende der Stange: abspringen, wenn der Sprung auf die nächste Stange führt (Combo!) oder sonst Gefahr droht
    const rest = g.seg.x1 - p.x;
    if (rest < 70 && !merk.grindSprung && merk.t >= (merk.naechste || 0)) {
      merk.naechste = merk.t + 1 / 40;
      const varianten = [0, 0.1, 0.2].map((h) => [h, simuliere(s, { sprungIn: 0, halt: h }, 1.6)]);
      const kette = varianten.find(([, j]) => j.ok && j.grind);
      let wahl = merk.combo && kette ? kette : null;
      if (!wahl && rest < 14) {
        const r = simuliere(s, { sprungIn: null }, 1.2);
        if (!r.ok || merk.combo) wahl = varianten.find(([, j]) => j.ok) || null;
      }
      if (wahl) {
        merk.grindSprung = true;
        ein.sprungNeu = true;
        ein.sprung = true;
        merk.halt = 0.2 - wahl[0];
      }
    }
    if (g.seg.x1 - p.x > 80) merk.grindSprung = false;
  }
  return ein;
}
