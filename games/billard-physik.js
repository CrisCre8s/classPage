// Billard-Physik und 8-Ball-Regeln, ohne Zeichnen. Wird vom Spiel und vom Computer-Gegner (zum Vorausrechnen) benutzt.
// Fester Zeittakt, damit eine vorausberechnete Stoß-Simulation genau so abläuft wie der echte Stoß.

export const W = 720;
export const H = 460;
export const X0 = 50;
export const X1 = 670;
export const Y0 = 90;
export const Y1 = 420;
export const R = 9;
export const MITTE_X = (X0 + X1) / 2;
export const MITTE_Y = (Y0 + Y1) / 2;
export const MAX_TEMPO = 1500;
export const DT = 1 / 240;

// Löcher: vier Ecken und zwei in der Mitte der langen Banden
export const LOECHER = [
  { x: X0 - 4, y: Y0 - 4, r: 17, ecke: true },
  { x: MITTE_X, y: Y0 - 8, r: 15, ecke: false },
  { x: X1 + 4, y: Y0 - 4, r: 17, ecke: true },
  { x: X0 - 4, y: Y1 + 4, r: 17, ecke: true },
  { x: MITTE_X, y: Y1 + 8, r: 15, ecke: false },
  { x: X1 + 4, y: Y1 + 4, r: 17, ecke: true },
];

const BREMSE = 45; // gleichmäßige Rollreibung (px/s²)
const ZAEH = 0.32; // geschwindigkeitsabhängige Reibung (1/s)
const BANDE = 0.78; // Abprall an der Bande
const KUGEL = 0.97; // Stoß Kugel an Kugel
const RUHE = 3;

export const gruppeVon = (n) => (n === 0 ? null : n === 8 ? "acht" : n < 8 ? "voll" : "halb");
export const andere = (g) => (g === "voll" ? "halb" : "voll");

export function aufbauen(zufall = Math.random) {
  const kugeln = [{ n: 0, x: X0 + (X1 - X0) * 0.25, y: MITTE_Y, vx: 0, vy: 0, drin: false }];
  // Dreieck: 8 in der Mitte, hinten links und rechts je eine Volle und eine Halbe
  const rest = [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15];
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(zufall() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  const voll = rest.find((n) => n < 8);
  const halb = rest.find((n) => n > 8);
  const sonst = rest.filter((n) => n !== voll && n !== halb);
  const spitze = X0 + (X1 - X0) * 0.73;
  const dx = R * 2 * Math.cos(Math.PI / 6) + 0.6;
  let i = 0;
  for (let reihe = 0; reihe < 5; reihe++) {
    for (let k = 0; k <= reihe; k++) {
      let n;
      if (reihe === 2 && k === 1) n = 8;
      else if (reihe === 4 && k === 0) n = voll;
      else if (reihe === 4 && k === 4) n = halb;
      else n = sonst[i++];
      kugeln.push({ n, x: spitze + reihe * dx, y: MITTE_Y + (k - reihe / 2) * (R * 2 + 0.6) + (zufall() - 0.5) * 0.4, vx: 0, vy: 0, drin: false });
    }
  }
  return kugeln;
}

export const kopie = (kugeln) => kugeln.map((k) => ({ ...k }));
export const rollt = (kugeln) => kugeln.some((k) => !k.drin && (k.vx || k.vy));

function inEckZone(x, y) {
  return (x < X0 + 24 || x > X1 - 24) && (y < Y0 + 24 || y > Y1 - 24);
}
const inMittelZone = (x) => Math.abs(x - MITTE_X) < 18;

// Ein fester Physik-Schritt. stoss sammelt, was passiert: erste berührte Kugel, versenkte Kugeln, Bandenkontakte.
// Schnelle Kugeln werden in kleinere Teilschritte zerlegt (höchstens 2 px pro Teilschritt), damit nichts durchtunnelt.
export function schritt(kugeln, stoss, dt = DT) {
  let max = 0;
  for (const k of kugeln) if (!k.drin && (k.vx || k.vy)) max = Math.max(max, Math.abs(k.vx) + Math.abs(k.vy));
  const teile = Math.max(1, Math.ceil((max * dt) / 2));
  for (let t = 0; t < teile; t++) teilschritt(kugeln, stoss, dt / teile);
}

function teilschritt(kugeln, stoss, dt) {
  const n = kugeln.length;
  for (let i = 0; i < n; i++) {
    const k = kugeln[i];
    if (k.drin || (!k.vx && !k.vy)) continue;
    k.x += k.vx * dt;
    k.y += k.vy * dt;
    const s = Math.hypot(k.vx, k.vy);
    const s2 = s - (BREMSE + ZAEH * s) * dt;
    if (s2 < RUHE) {
      k.vx = 0;
      k.vy = 0;
    } else {
      k.vx *= s2 / s;
      k.vy *= s2 / s;
    }
  }
  // Kugel an Kugel
  for (let i = 0; i < n; i++) {
    const a = kugeln[i];
    if (a.drin) continue;
    for (let j = i + 1; j < n; j++) {
      const b = kugeln[j];
      if (b.drin) continue;
      if (!a.vx && !a.vy && !b.vx && !b.vy) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d2 = dx * dx + dy * dy;
      if (d2 >= 4 * R * R || d2 === 0) continue;
      const d = Math.sqrt(d2);
      const nx = dx / d;
      const ny = dy / d;
      const naeher = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
      if (naeher > 0) {
        const imp = ((1 + KUGEL) / 2) * naeher;
        a.vx -= imp * nx;
        a.vy -= imp * ny;
        b.vx += imp * nx;
        b.vy += imp * ny;
        if (stoss) {
          if (stoss.erste == null && (a.n === 0 || b.n === 0)) stoss.erste = a.n === 0 ? b.n : a.n;
          stoss.klacks = (stoss.klacks || 0) + 1;
          stoss.lautKugel = Math.max(stoss.lautKugel || 0, naeher);
        }
      }
      const ueber = (2 * R - d) / 2;
      a.x -= nx * ueber;
      a.y -= ny * ueber;
      b.x += nx * ueber;
      b.y += ny * ueber;
    }
  }
  // Löcher und Banden
  for (let i = 0; i < n; i++) {
    const k = kugeln[i];
    if (k.drin) continue;
    for (const l of LOECHER) {
      if ((k.x - l.x) ** 2 + (k.y - l.y) ** 2 < l.r * l.r) {
        k.drin = true;
        k.loch = l;
        k.vx = 0;
        k.vy = 0;
        if (stoss) stoss.versenkt.push(k.n);
        break;
      }
    }
    if (k.drin) continue;
    const ecke = inEckZone(k.x, k.y);
    const tief = ecke ? 12 : 0;
    const links = X0 + R - tief;
    const rechts = X1 - R + tief;
    const oben = Y0 + R - (ecke || inMittelZone(k.x) ? 12 : 0);
    const unten = Y1 - R + (ecke || inMittelZone(k.x) ? 12 : 0);
    let bande = false;
    if (k.x < links && k.vx < 0) { k.x = links; k.vx = -k.vx * BANDE; k.vy *= 0.96; bande = true; }
    if (k.x > rechts && k.vx > 0) { k.x = rechts; k.vx = -k.vx * BANDE; k.vy *= 0.96; bande = true; }
    if (k.y < oben && k.vy < 0) { k.y = oben; k.vy = -k.vy * BANDE; k.vx *= 0.96; bande = true; }
    if (k.y > unten && k.vy > 0) { k.y = unten; k.vy = -k.vy * BANDE; k.vx *= 0.96; bande = true; }
    if (bande && stoss) stoss.banden = (stoss.banden || 0) + 1;
  }
}

export function neuerStoss() {
  return { erste: null, versenkt: [], banden: 0 };
}

// Ganzen Stoß bis zum Stillstand durchrechnen (für den Computer-Gegner)
export function simuliere(kugeln, winkel, tempo, maxSek = 14) {
  const k = kopie(kugeln);
  const weiss = k[0];
  weiss.vx = Math.cos(winkel) * tempo;
  weiss.vy = Math.sin(winkel) * tempo;
  const stoss = neuerStoss();
  const schritte = maxSek / DT;
  for (let i = 0; i < schritte && rollt(k); i++) schritt(k, stoss);
  return { kugeln: k, stoss };
}

// Welche Kugeln darf der Spieler als erste treffen?
export function ziele(kugeln, gruppe) {
  const da = kugeln.filter((k) => !k.drin && k.n !== 0);
  if (!gruppe) return da.filter((k) => k.n !== 8).map((k) => k.n);
  const eigene = da.filter((k) => gruppeVon(k.n) === gruppe).map((k) => k.n);
  return eigene.length ? eigene : [8];
}

// Regeln nach einem Stoß. gruppen: { 0: "voll"|"halb"|null, 1: ... }
export function bewerte({ spieler, gruppen, vorher, stoss, anstoss }) {
  const g = gruppen[spieler];
  const erlaubt = ziele(vorher, g);
  const weissWeg = stoss.versenkt.includes(0);
  const acht = stoss.versenkt.includes(8);
  let foul = null;
  if (weissWeg) foul = "Weiße versenkt";
  else if (stoss.erste == null) foul = "Keine Kugel getroffen";
  else if (!anstoss && !erlaubt.includes(stoss.erste)) foul = stoss.erste === 8 ? "Zuerst die 8 getroffen" : "Falsche Kugel zuerst getroffen";
  const neueGruppen = { ...gruppen };
  let zugewiesen = null;
  if (acht) {
    if (anstoss && !weissWeg) return { foul, achtZurueck: true, ...weiter(spieler, gruppen, stoss, foul, true) };
    const eigeneVorher = g ? vorher.filter((k) => !k.drin && gruppeVon(k.n) === g).length : 1;
    const gewinnt = !foul && g && eigeneVorher === 0;
    return { foul, ende: true, sieger: gewinnt ? spieler : 1 - spieler, grund: gewinnt ? "8 versenkt" : foul ? `8 versenkt mit Foul (${foul})` : "8 zu früh versenkt" };
  }
  if (!g && !foul && !anstoss) {
    const erste = stoss.versenkt.find((n) => n !== 0 && n !== 8);
    if (erste != null) {
      zugewiesen = gruppeVon(erste);
      neueGruppen[spieler] = zugewiesen;
      neueGruppen[1 - spieler] = andere(zugewiesen);
    }
  }
  return { foul, zugewiesen, gruppen: neueGruppen, ...weiter(spieler, neueGruppen, stoss, foul, anstoss) };
}

function weiter(spieler, gruppen, stoss, foul, anstoss) {
  if (foul) return { naechster: 1 - spieler, ballInHand: true };
  const g = gruppen[spieler];
  const getroffen = stoss.versenkt.some((n) => n !== 0 && n !== 8 && (!g || anstoss || gruppeVon(n) === g));
  return { naechster: getroffen ? spieler : 1 - spieler, ballInHand: false };
}

// Darf die Weiße hier liegen?
export function freierPlatz(kugeln, x, y) {
  if (x < X0 + R || x > X1 - R || y < Y0 + R || y > Y1 - R) return false;
  return kugeln.every((k) => k.n === 0 || k.drin || (k.x - x) ** 2 + (k.y - y) ** 2 >= (2 * R + 1) ** 2);
}

// Erste Kugel auf einem Strahl (für Ziellinie und Computer)
export function strahl(kugeln, x, y, winkel, ohne = 0) {
  const dx = Math.cos(winkel);
  const dy = Math.sin(winkel);
  let best = null;
  for (const k of kugeln) {
    if (k.drin || k.n === ohne) continue;
    const ox = k.x - x;
    const oy = k.y - y;
    const t = ox * dx + oy * dy;
    if (t <= 0) continue;
    const q = ox * ox + oy * oy - t * t;
    if (q > 4 * R * R) continue;
    const d = t - Math.sqrt(4 * R * R - q);
    if (!best || d < best.d) best = { d, kugel: k };
  }
  // Bande als Grenze
  const tx = dx > 0 ? (X1 - R - x) / dx : dx < 0 ? (X0 + R - x) / dx : Infinity;
  const ty = dy > 0 ? (Y1 - R - y) / dy : dy < 0 ? (Y0 + R - y) / dy : Infinity;
  const tb = Math.min(tx, ty);
  if (best && best.d < tb) return { ...best, x: x + dx * best.d, y: y + dy * best.d };
  return { d: tb, kugel: null, x: x + dx * tb, y: y + dy * tb };
}
