// Billardkugeln in 3D: jede Kugel hat eine Lage (Drehmatrix) und rollt wie in echt. Gezeichnet wird Pixel für Pixel in eine
// kleine Textur je Kugel: Normale der sichtbaren Halbkugel → Körperkoordinaten der Kugel → Farbe, Streifen, Zahl.
// Koordinaten: x nach rechts, y nach unten (wie der Bildschirm), z in den Tisch hinein. Der Betrachter schaut von oben (−z).

const FARBEN = { 0: [246, 243, 234], 1: [242, 194, 48], 2: [47, 111, 224], 3: [224, 57, 60], 4: [122, 75, 192], 5: [240, 127, 29], 6: [31, 154, 87], 7: [154, 42, 58], 8: [23, 22, 28] };
const WEISS = [250, 248, 240];
const SPOT = 0.8; // Zahlenfeld: cos des Winkelradius
const SPOT_SIN = Math.sqrt(1 - SPOT * SPOT);
const STREIFEN = 0.55; // Streifenball: |b_z| darüber ist weiß
const GLYPH = 48;

// Licht von oben links, leicht zum Betrachter
const LICHT = (() => {
  const v = [-0.45, -0.55, -0.7];
  const l = Math.hypot(...v);
  return v.map((x) => x / l);
})();
const HALB = (() => {
  const v = [LICHT[0], LICHT[1], LICHT[2] - 1];
  const l = Math.hypot(...v);
  return v.map((x) => x / l);
})();

// Lage: 3×3-Matrix (Zeilen zuerst), Spalten = Körperachsen in Weltkoordinaten.
// Start: Zahlenfeld (+X) zeigt nach oben zum Betrachter, dazu eine zufällige Drehung um die Blickachse.
export function startLage(zufall = Math.random) {
  const a = (zufall() - 0.5) * 1.2;
  const c = Math.cos(a);
  const s = Math.sin(a);
  // X_b → (0,0,−1); Y_b → (−s, c, 0); Z_b = X_b × Y_b = (c, s, 0)
  return [0, -s, c, 0, c, s, -1, 0, 0];
}

// Kugel ist um (dx, dy) gerollt: Drehung um die Achse (dy, −dx, 0) mit Winkel |d|/r
export function rolle(m, dx, dy, r) {
  const d = Math.hypot(dx, dy);
  if (d < 1e-6) return false;
  const ax = dy / d;
  const ay = -dx / d;
  const th = d / r;
  const c = Math.cos(th);
  const s = Math.sin(th);
  const t = 1 - c;
  // Rodrigues mit az = 0
  const r00 = t * ax * ax + c, r01 = t * ax * ay, r02 = s * ay;
  const r10 = t * ax * ay, r11 = t * ay * ay + c, r12 = -s * ax;
  const r20 = -s * ay, r21 = s * ax, r22 = c;
  const n = m.slice();
  for (let j = 0; j < 3; j++) {
    const a0 = n[j], a1 = n[3 + j], a2 = n[6 + j];
    m[j] = r00 * a0 + r01 * a1 + r02 * a2;
    m[3 + j] = r10 * a0 + r11 * a1 + r12 * a2;
    m[6 + j] = r20 * a0 + r21 * a1 + r22 * a2;
  }
  m.zaehler = (m.zaehler || 0) + 1;
  if (m.zaehler % 120 === 0) ortho(m);
  return true;
}
// Rundungsfehler gelegentlich wegnormieren (Gram-Schmidt auf den Spalten)
function ortho(m) {
  const sp = (j) => [m[j], m[3 + j], m[6 + j]];
  const setze = (j, v) => ([m[j], m[3 + j], m[6 + j]] = v);
  const norm = (v) => {
    const l = Math.hypot(...v);
    return v.map((x) => x / l);
  };
  const x = norm(sp(0));
  let y = sp(1);
  const d = x[0] * y[0] + x[1] * y[1] + x[2] * y[2];
  y = norm([y[0] - d * x[0], y[1] - d * x[1], y[2] - d * x[2]]);
  const z = [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]];
  setze(0, x);
  setze(1, y);
  setze(2, z);
}

// Zahlen als Maske, damit sie sich mit der Kugel mitdrehen und am Rand verzerren
const glyphen = {};
function glyph(n) {
  if (glyphen[n]) return glyphen[n];
  const c = document.createElement("canvas");
  c.width = c.height = GLYPH;
  const g = c.getContext("2d");
  g.fillStyle = "#000";
  g.font = `700 ${n > 9 ? 26 : 32}px system-ui, sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(String(n), GLYPH / 2, GLYPH / 2 + 2);
  const d = g.getImageData(0, 0, GLYPH, GLYPH).data;
  const a = new Float32Array(GLYPH * GLYPH);
  for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3] / 255;
  return (glyphen[n] = a);
}

// Je Texturgröße einmal: Normalen, Licht und Kantenglättung der sichtbaren Halbkugel
const geometrie = {};
function geo(px) {
  if (geometrie[px]) return geometrie[px];
  const n = px * px;
  const g = { nx: new Float32Array(n), ny: new Float32Array(n), nz: new Float32Array(n), licht: new Float32Array(n), glanz: new Float32Array(n), alpha: new Float32Array(n) };
  const rad = px / 2 - 1;
  for (let y = 0; y < px; y++)
    for (let x = 0; x < px; x++) {
      const i = y * px + x;
      const u = (x + 0.5 - px / 2) / rad;
      const v = (y + 0.5 - px / 2) / rad;
      const q = u * u + v * v;
      const kante = (1 - Math.sqrt(q)) * rad;
      g.alpha[i] = Math.max(0, Math.min(1, kante + 0.5));
      if (g.alpha[i] <= 0) continue;
      const w = -Math.sqrt(Math.max(0, 1 - Math.min(1, q)));
      g.nx[i] = u;
      g.ny[i] = v;
      g.nz[i] = w;
      const dif = Math.max(0, u * LICHT[0] + v * LICHT[1] + w * LICHT[2]);
      g.licht[i] = 0.32 + 0.78 * dif - 0.18 * q * q;
      const h = Math.max(0, u * HALB[0] + v * HALB[1] + w * HALB[2]);
      g.glanz[i] = Math.pow(h, 60) * 0.9 + Math.pow(h, 8) * 0.12;
    }
  return (geometrie[px] = g);
}

// Textur einer Kugel in ihrer aktuellen Lage zeichnen (px = Kantenlänge in Gerätepixeln)
export function kugelTextur(n, m, px, ziel) {
  let c = ziel;
  if (!c || c.width !== px) {
    c = document.createElement("canvas");
    c.width = c.height = px;
    c.bild = c.getContext("2d").createImageData(px, px);
  }
  const d = c.bild.data;
  const g = geo(px);
  const halb = n > 8;
  const grund = FARBEN[halb ? n - 8 : n];
  const maske = n > 0 ? glyph(n) : null;
  const m00 = m[0], m01 = m[1], m02 = m[2], m10 = m[3], m11 = m[4], m12 = m[5], m20 = m[6], m21 = m[7], m22 = m[8];
  for (let i = 0, len = px * px; i < len; i++) {
    const a = g.alpha[i];
    const o = i * 4;
    if (a <= 0) {
      d[o + 3] = 0;
      continue;
    }
    const nx = g.nx[i], ny = g.ny[i], nz = g.nz[i];
    // Körperkoordinaten b = Mᵀ n
    const bx = m00 * nx + m10 * ny + m20 * nz;
    const by = m01 * nx + m11 * ny + m21 * nz;
    const bz = m02 * nx + m12 * ny + m22 * nz;
    let f = halb && Math.abs(bz) > STREIFEN ? WEISS : grund;
    let dunkel = 0;
    if (Math.abs(bx) > SPOT) {
      if (n === 0) {
        // Weiße: kleiner roter Punkt auf beiden Seiten, damit man das Rollen sieht
        f = Math.abs(bx) > 0.97 ? [214, 60, 60] : f;
      } else {
        f = WEISS;
        const sx = bx > 0 ? bz : -bz;
        const u = Math.round(((sx / SPOT_SIN) * 0.95 + 1) * 0.5 * (GLYPH - 1));
        const v = Math.round(((by / SPOT_SIN) * 0.95 + 1) * 0.5 * (GLYPH - 1));
        if (u >= 0 && v >= 0 && u < GLYPH && v < GLYPH) dunkel = maske[v * GLYPH + u];
      }
    }
    const l = g.licht[i];
    const gl = g.glanz[i] * 255;
    const k = 1 - dunkel * 0.88;
    d[o] = Math.min(255, f[0] * k * l + gl);
    d[o + 1] = Math.min(255, f[1] * k * l + gl);
    d[o + 2] = Math.min(255, f[2] * k * l + gl);
    d[o + 3] = a * 255;
  }
  c.getContext("2d").putImageData(c.bild, 0, 0);
  return c;
}
