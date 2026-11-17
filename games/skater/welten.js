// Stick-Skater – Aussehen der Welten: Farbpaletten, Muster (Halftone, Schraffur) und die gemalten
// Hintergrund-Ebenen (Parallax). Jede Welt gibt es im normalen Comic-Stil und in vier Parallel-Stilen
// (Noir, Manga, Punk-Zine, Pixel) – dieselben Formen, andere Palette und andere Textur.
import { zufall } from "./strecke.js";

// ---------- Paletten ----------
// himmel: Verlauf oben → unten · fern/mitte: Gebäude · wand: Bodenblock · boden: Oberfläche · kante: Kantenstreifen
// a1–a3: Akzente · grube: Lücken · licht: Fenster/Lampen
export const PALETTEN = {
  downtown: { himmel: ["#12072b", "#3a1162", "#a3236f"], fern: "#2a1650", fernLicht: "#ffe600", mitte: "#3d1f66", wand: "#241a3a", boden: "#3a2c58", kante: "#ff2bd6", tinte: "#0b0a10", papier: "#fff3e6", licht: "#ffe600", a1: "#ff2bd6", a2: "#00e5ff", a3: "#9b5cff", grube: "#06030d", nebel: "#ff2bd6" },
  kanal: { himmel: ["#020b12", "#05212b", "#0a3b3d"], fern: "#0a2733", fernLicht: "#39ff88", mitte: "#123a47", wand: "#14303a", boden: "#20444c", kante: "#39ff88", tinte: "#03080a", papier: "#e8fff4", licht: "#39ff88", a1: "#39ff88", a2: "#1de9d0", a3: "#1d3f99", grube: "#2dff7a", nebel: "#1de9d0" },
  fabrik: { himmel: ["#1a0a05", "#4a1a0c", "#a8461a"], fern: "#3a1a10", fernLicht: "#ffb21a", mitte: "#55241a", wand: "#2e1a12", boden: "#4a2f20", kante: "#ffd31a", tinte: "#0d0705", papier: "#fff1dc", licht: "#ffd31a", a1: "#ff8a1f", a2: "#c4361b", a3: "#ffd31a", grube: "#ff6a00", nebel: "#ff8a1f" },
  ubahn: { himmel: ["#05070f", "#0d1426", "#1a2440"], fern: "#121a30", fernLicht: "#f2f6ff", mitte: "#e8eef7", wand: "#1b2233", boden: "#2c3446", kante: "#ffd400", tinte: "#05070c", papier: "#f2f6ff", licht: "#f2f6ff", a1: "#ffd400", a2: "#2f6bff", a3: "#f2f6ff", grube: "#03050a", nebel: "#2f6bff" },
  daecher: { himmel: ["#3b1d6e", "#d9468f", "#ffa54a"], fern: "#5a2a78", fernLicht: "#ffd6a0", mitte: "#3a1d55", wand: "#2b1a3d", boden: "#4a2c5c", kante: "#ff8a3c", tinte: "#140a1c", papier: "#fff0e6", licht: "#ffd6a0", a1: "#ff4fa0", a2: "#ff8a3c", a3: "#8a4fd0", grube: "#1a0f2a", nebel: "#ff8a3c" },
  glitch: { himmel: ["#0a0014", "#220040", "#00303a"], fern: "#1c0a33", fernLicht: "#00ffd0", mitte: "#2a0a4a", wand: "#140a24", boden: "#24123c", kante: "#00ffd0", tinte: "#05000a", papier: "#f5f0ff", licht: "#00ffd0", a1: "#ff00a8", a2: "#00ffd0", a3: "#ffe600", grube: "#000000", nebel: "#ff00a8" },
};
export const STIL_PALETTEN = {
  noir: { himmel: ["#0c0c0c", "#1e1e1e", "#3a3a3a"], fern: "#191919", fernLicht: "#d8d8d8", mitte: "#262626", wand: "#161616", boden: "#2c2c2c", kante: "#f2f2f2", tinte: "#000000", papier: "#f2f2f2", licht: "#f2f2f2", a1: "#e01b24", a2: "#bdbdbd", a3: "#7a7a7a", grube: "#000000", nebel: "#e01b24" },
  manga: { himmel: ["#fbfbf7", "#efefea", "#dcdcd6"], fern: "#c8c8c2", fernLicht: "#ffffff", mitte: "#a9a9a3", wand: "#e9e9e4", boden: "#ffffff", kante: "#111111", tinte: "#000000", papier: "#ffffff", licht: "#ffffff", a1: "#111111", a2: "#7a7a7a", a3: "#4a4a4a", grube: "#1a1a1a", nebel: "#555555" },
  zine: { himmel: ["#efe6d2", "#e6dbc2", "#d8cbab"], fern: "#b2a68f", fernLicht: "#ff3d8b", mitte: "#8a8170", wand: "#cfc4aa", boden: "#e9dfc8", kante: "#1a1a1a", tinte: "#141414", papier: "#f7f0df", licht: "#ff3d8b", a1: "#ff3d8b", a2: "#2b2b2b", a3: "#6b6b6b", grube: "#1a1a1a", nebel: "#ff3d8b" },
  pixel: { himmel: ["#1a1c2c", "#29366f", "#3b5dc9"], fern: "#333c57", fernLicht: "#ffcd75", mitte: "#566c86", wand: "#333c57", boden: "#566c86", kante: "#73eff7", tinte: "#1a1c2c", papier: "#f4f4f4", licht: "#ffcd75", a1: "#b13e53", a2: "#41a6f6", a3: "#a7f070", grube: "#257179", nebel: "#73eff7" },
};
export const STIL_NAME = { noir: "NOIR", manga: "MANGA", zine: "PUNK-ZINE", pixel: "PIXEL" };
export const WELT_IDS = ["downtown", "kanal", "fabrik", "ubahn", "daecher", "glitch"];

// Glitch-Welt: Palette wechselt alle paar Sekunden zwischen den anderen Welten
export function palette(welt, stil, zeit = 0) {
  if (stil) return STIL_PALETTEN[stil];
  if (welt === 5) {
    const reihe = ["glitch", "downtown", "glitch", "kanal", "glitch", "fabrik", "glitch", "ubahn", "glitch", "daecher"];
    const p = PALETTEN[reihe[Math.floor(zeit / 2.5) % reihe.length]];
    return { ...PALETTEN.glitch, a1: p.a1, a2: p.a2, kante: p.kante, licht: p.licht };
  }
  return PALETTEN[WELT_IDS[welt]];
}

// ---------- Muster ----------
const musterCache = new Map();
export function muster(ctx, art, farbe = "#000", groesse = 8, k = 1) {
  k = Math.max(1, Math.round(k * 4) / 4);
  const key = `${art}|${farbe}|${groesse}|${k}`;
  if (musterCache.has(key)) return musterCache.get(key);
  const c = document.createElement("canvas");
  c.width = c.height = Math.round(groesse * k);
  const g = c.getContext("2d");
  g.scale(c.width / groesse, c.width / groesse);
  g.fillStyle = farbe;
  g.strokeStyle = farbe;
  if (art === "punkte") {
    // versetztes Halftone-Raster
    const r = groesse * 0.2;
    for (const [x, y] of [[0, 0], [groesse, 0], [0, groesse], [groesse, groesse], [groesse / 2, groesse / 2]]) {
      g.beginPath();
      g.arc(x, y, r, 0, 7);
      g.fill();
    }
  } else if (art === "grobpunkte") {
    const r = groesse * 0.32;
    for (const [x, y] of [[0, 0], [groesse, 0], [0, groesse], [groesse, groesse], [groesse / 2, groesse / 2]]) {
      g.beginPath();
      g.arc(x, y, r, 0, 7);
      g.fill();
    }
  } else if (art === "schraffur" || art === "kreuz") {
    g.lineWidth = Math.max(1, groesse / 7);
    g.beginPath();
    for (let i = -1; i <= 1; i++) {
      g.moveTo(i * groesse, groesse);
      g.lineTo(i * groesse + groesse, 0);
    }
    if (art === "kreuz")
      for (let i = -1; i <= 1; i++) {
        g.moveTo(i * groesse, 0);
        g.lineTo(i * groesse + groesse, groesse);
      }
    g.stroke();
  } else if (art === "linien") {
    g.fillRect(0, 0, groesse, Math.max(1, groesse / 5));
  } else if (art === "rauschen") {
    g.setTransform(1, 0, 0, 1, 0, 0);
    const d = g.createImageData(c.width, c.height);
    const r = zufall(99);
    for (let i = 0; i < d.data.length; i += 4) {
      const v = r() < 0.5 ? 0 : 255;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
      d.data[i + 3] = r() < 0.18 ? 90 : 0;
    }
    g.putImageData(d, 0, 0);
  }
  const m = ctx.createPattern(c, "repeat");
  if (k !== 1 && m.setTransform && typeof DOMMatrix !== "undefined") m.setTransform(new DOMMatrix().scale(groesse / c.width));
  musterCache.set(key, m);
  return m;
}
export function fuelleMuster(ctx, art, farbe, groesse, alpha, x, y, w, h, versatzX = 0, versatzY = 0, k = 1) {
  const m = muster(ctx, art, farbe, groesse, k);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(versatzX, versatzY);
  ctx.fillStyle = m;
  ctx.fillRect(x - versatzX, y - versatzY, w, h);
  ctx.restore();
}

// ---------- Pinsel ----------
// Zitternde Tuschelinie (Handzeichnung)
export function tuschLinie(ctx, pts, rnd, zitter = 1.2) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0] + (rnd() - 0.5) * zitter, pts[0][1] + (rnd() - 0.5) * zitter);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] + (rnd() - 0.5) * zitter, pts[i][1] + (rnd() - 0.5) * zitter);
  ctx.stroke();
}
export function tuschRechteck(ctx, x, y, w, h, rnd, zitter = 1.4) {
  tuschLinie(ctx, [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]], rnd, zitter);
}
// Aquarell-Fleck: viele weiche, halbtransparente Schichten mit dunklerem Rand
function aquarell(g, x, y, r, farbe, rnd, alpha = 0.18) {
  g.save();
  g.fillStyle = farbe;
  for (let i = 0; i < 6; i++) {
    g.globalAlpha = alpha * (0.6 + rnd() * 0.6);
    g.beginPath();
    const n = 9;
    for (let k = 0; k <= n; k++) {
      const a = (k / n) * Math.PI * 2;
      const rr = r * (0.7 + rnd() * 0.45) * (1 - i * 0.07);
      const px = x + Math.cos(a) * rr * 1.6 + (rnd() - 0.5) * 8;
      const py = y + Math.sin(a) * rr * 0.6 + (rnd() - 0.5) * 6;
      if (k === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
    g.fill();
  }
  g.restore();
}
// Spray-Fleck (Graffiti)
function spray(g, x, y, r, farbe, rnd) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, farbe);
  gr.addColorStop(0.6, farbe);
  gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr;
  g.beginPath();
  g.arc(x, y, r, 0, 7);
  g.fill();
  for (let i = 0; i < 18; i++) {
    const a = rnd() * 7;
    const d = r * (0.9 + rnd() * 0.5);
    g.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d, 1.6, 1.6);
  }
}
// Graffiti-Tag: abstrakte, kantige Buchstabenformen mit Outline und Pfeil (keine echten Schriftzüge)
function tag(g, x, y, w, P, rnd) {
  const f = [P.a1, P.a2, P.a3][Math.floor(rnd() * 3)];
  const n = 4 + Math.floor(rnd() * 3);
  const bw = w / n;
  const formen = [];
  for (let i = 0; i < n; i++) {
    const bx = x + i * bw;
    const h = 26 + rnd() * 18;
    const pts = [[bx, y + h * 0.5], [bx + bw * 0.2, y - h * 0.5], [bx + bw * (0.4 + rnd() * 0.3), y + (rnd() - 0.5) * h * 0.6], [bx + bw * 0.75, y - h * 0.45], [bx + bw * 0.9, y + h * 0.5]];
    formen.push(pts);
  }
  const zeichne = () => {
    for (const pts of formen) {
      g.beginPath();
      pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)));
      g.stroke();
    }
    // Pfeil am Ende
    const [ex, ey] = formen[formen.length - 1][4];
    g.beginPath();
    g.moveTo(ex, ey);
    g.lineTo(ex + 22, ey - 14);
    g.moveTo(ex + 12, ey - 18);
    g.lineTo(ex + 22, ey - 14);
    g.lineTo(ex + 18, ey - 3);
    g.stroke();
  };
  g.lineCap = "round";
  g.lineJoin = "miter";
  g.strokeStyle = P.tinte;
  g.lineWidth = 11;
  zeichne();
  g.strokeStyle = f;
  g.lineWidth = 6;
  zeichne();
  g.strokeStyle = "rgba(255,255,255,0.6)";
  g.lineWidth = 1.5;
  g.save();
  g.translate(-1.5, -2);
  zeichne();
  g.restore();
  g.lineJoin = "round";
  // Tropfnasen
  g.strokeStyle = f;
  g.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const p = formen[Math.floor(rnd() * formen.length)][Math.floor(rnd() * 5)];
    g.beginPath();
    g.moveTo(p[0], p[1] + 4);
    g.lineTo(p[0], p[1] + 10 + rnd() * 20);
    g.stroke();
  }
}
function fenster(g, x, y, w, h, P, rnd, an = 0.45, gross = 7) {
  const sp = gross * 2.1;
  for (let fy = y + 10; fy < y + h - 8; fy += sp * 1.15)
    for (let fx = x + 7; fx < x + w - gross - 4; fx += sp) {
      if (rnd() < an) {
        g.fillStyle = rnd() < 0.12 ? P.a2 : rnd() < 0.15 ? P.a1 : P.fernLicht;
        g.globalAlpha = 0.55 + rnd() * 0.45;
        g.fillRect(fx, fy, gross, gross * 1.3);
      }
    }
  g.globalAlpha = 1;
}
function haus(g, x, y, w, h, farbe, P, rnd, stil, linie = 2.5) {
  g.fillStyle = farbe;
  g.fillRect(x, y, w, h);
  // Schatten-Seite: Halftone + Schraffur
  g.save();
  g.beginPath();
  g.rect(x + w * 0.62, y, w * 0.38, h);
  g.clip();
  g.globalAlpha = 0.35;
  g.fillStyle = muster(g, stil === "manga" ? "punkte" : "schraffur", P.tinte, 7);
  g.fillRect(x, y, w, h);
  g.restore();
  g.strokeStyle = P.tinte;
  g.lineWidth = linie;
  tuschRechteck(g, x, y, w, h + 40, rnd, 1.6);
}

// ---------- Hintergrund-Ebenen ----------
export const TILE_W = 1200;
export const TILE_H = 540;
// ebene: "fern" | "mitte"
export function malEbene(welt, stil, ebene, skala) {
  const c = document.createElement("canvas");
  c.width = Math.round(TILE_W * skala);
  c.height = Math.round(TILE_H * skala);
  const g = c.getContext("2d");
  g.scale(skala, skala);
  const P = palette(welt, stil);
  const rnd = zufall(1000 + welt * 17 + (ebene === "fern" ? 0 : 500));
  g.lineJoin = "round";
  g.lineCap = "round";
  const maler = [malDowntown, malKanal, malFabrik, malUbahn, malDaecher, malGlitch][welt];
  maler(g, ebene, P, rnd, stil, skala);
  nachbearbeitung(g, c, P, stil, rnd, ebene);
  return c;
}

function nachbearbeitung(g, c, P, stil, rnd, ebene) {
  if (stil === "noir") {
    // starke Kreuzschraffur über alles, was nicht hell ist
    g.save();
    g.globalCompositeOperation = "source-atop";
    g.globalAlpha = 0.5;
    g.fillStyle = muster(g, "kreuz", "#000", 9);
    g.fillRect(0, 0, TILE_W, TILE_H);
    g.restore();
  } else if (stil === "manga") {
    g.save();
    g.globalCompositeOperation = "source-atop";
    g.globalAlpha = ebene === "fern" ? 0.45 : 0.3;
    g.fillStyle = muster(g, "punkte", "#000", 6);
    g.fillRect(0, 0, TILE_W, TILE_H);
    g.restore();
  } else if (stil === "zine") {
    // Collage: Streifen ausschneiden und leicht verdreht wieder aufkleben, mit weißen Papierkanten
    const kopie = document.createElement("canvas");
    kopie.width = c.width;
    kopie.height = c.height;
    kopie.getContext("2d").drawImage(c, 0, 0);
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, c.width, c.height);
    const sk = c.width / TILE_W;
    let x = 0;
    while (x < TILE_W) {
      const w = 140 + rnd() * 220;
      const rot = (rnd() - 0.5) * 0.05;
      const dy = (rnd() - 0.5) * 16;
      g.save();
      g.scale(sk, sk);
      g.translate(x + w / 2, TILE_H / 2 + dy);
      g.rotate(rot);
      g.beginPath();
      const zack = (y0, y1, xx) => {
        for (let y = y0; y <= y1; y += 18) g.lineTo(xx + (rnd() - 0.5) * 6, y);
      };
      g.moveTo(-w / 2, -TILE_H / 2);
      g.lineTo(w / 2, -TILE_H / 2);
      zack(-TILE_H / 2, TILE_H / 2, w / 2);
      g.lineTo(-w / 2, TILE_H / 2);
      g.closePath();
      g.fillStyle = P.papier;
      g.fill();
      g.clip();
      g.drawImage(kopie, (-x - w / 2 + 3) * sk / sk - 0, -TILE_H / 2 - dy + 3, TILE_W, TILE_H);
      g.restore();
      x += w - 6;
    }
    g.restore();
    g.save();
    g.globalCompositeOperation = "source-atop";
    g.globalAlpha = 0.35;
    g.fillStyle = muster(g, "rauschen", "#000", 64);
    g.fillRect(0, 0, TILE_W, TILE_H);
    g.restore();
  }
}

// ---------- 1 Neon-Downtown ----------
function malDowntown(g, ebene, P, rnd, stil) {
  if (ebene === "fern") {
    // Mond
    g.fillStyle = P.papier;
    g.globalAlpha = 0.85;
    g.beginPath();
    g.arc(880, 110, 38, 0, 7);
    g.fill();
    g.globalAlpha = 1;
    fuelleMuster(g, "punkte", P.a1, 7, 0.4, 842, 72, 76, 76);
    // Sterne
    g.fillStyle = P.papier;
    for (let i = 0; i < 60; i++) g.fillRect(rnd() * TILE_W, rnd() * 220, 2, 2);
    let x = -10;
    while (x < TILE_W) {
      const w = 60 + rnd() * 90;
      const h = 120 + rnd() * 220;
      haus(g, x, 470 - h, w, h + 80, P.fern, P, rnd, stil, 2);
      fenster(g, x, 470 - h, w, h, P, rnd, 0.35, 5);
      if (rnd() < 0.3) {
        // Neon-Schild: einfache Form mit Leuchtrand
        const sx = x + 8;
        const sy = 470 - h + 20 + rnd() * 40;
        g.strokeStyle = rnd() < 0.5 ? P.a1 : P.a2;
        g.lineWidth = 4;
        g.globalAlpha = 0.35;
        g.strokeRect(sx - 3, sy - 3, w - 10, 24);
        g.globalAlpha = 1;
        g.lineWidth = 2;
        g.strokeRect(sx, sy, w - 16, 18);
      }
      if (rnd() < 0.25) {
        g.strokeStyle = P.tinte;
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(x + w / 2, 470 - h);
        g.lineTo(x + w / 2, 470 - h - 30);
        g.stroke();
      }
      x += w + rnd() * 8;
    }
    // Neon-Dunst
    const gr = g.createLinearGradient(0, 300, 0, 540);
    gr.addColorStop(0, "rgba(0,0,0,0)");
    gr.addColorStop(1, P.nebel);
    g.globalAlpha = 0.25;
    g.fillStyle = gr;
    g.fillRect(0, 300, TILE_W, 240);
    g.globalAlpha = 1;
  } else {
    // Ziegelwände mit Graffiti, Feuerleitern und Laternen
    let x = 0;
    while (x < TILE_W) {
      const w = 220 + rnd() * 160;
      const top = 210 + rnd() * 90;
      g.fillStyle = P.mitte;
      g.fillRect(x, top, w, 400);
      g.strokeStyle = P.tinte;
      g.globalAlpha = 0.35;
      g.lineWidth = 1.2;
      for (let y = top + 12; y < 540; y += 14) {
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + w, y);
        g.stroke();
        for (let bx = x + ((y / 14) % 2) * 14; bx < x + w; bx += 28) {
          g.beginPath();
          g.moveTo(bx, y);
          g.lineTo(bx, y - 14);
          g.stroke();
        }
      }
      g.globalAlpha = 1;
      fuelleMuster(g, "punkte", P.tinte, 8, 0.35, x + w * 0.7, top, w * 0.3, 400);
      // Graffiti: ein gesprühter Farbfleck als Grund, darauf ein Tag
      g.save();
      g.globalAlpha = 0.22;
      spray(g, x + w * 0.5, top + 140, Math.min(60, w * 0.2), [P.a1, P.a2, P.a3][Math.floor(rnd() * 3)], rnd);
      g.restore();
      tag(g, x + 24, top + 140 + rnd() * 30, Math.min(220, w - 80), P, rnd);
      // Feuerleiter
      if (rnd() < 0.6) {
        g.strokeStyle = P.tinte;
        g.lineWidth = 3;
        const lx = x + 20 + rnd() * (w - 100);
        for (let k = 0; k < 3; k++) {
          const ly = top + 30 + k * 46;
          g.strokeRect(lx, ly, 70, 4);
          g.beginPath();
          g.moveTo(lx + 8, ly + 4);
          g.lineTo(lx + 60, ly + 46);
          g.stroke();
        }
      }
      g.strokeStyle = P.tinte;
      g.lineWidth = 3;
      tuschRechteck(g, x, top, w, 400, rnd, 2);
      x += w + 40 + rnd() * 80;
      // Laterne in der Lücke
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(x - 50, 540);
      g.lineTo(x - 50, 260);
      g.quadraticCurveTo(x - 50, 240, x - 30, 240);
      g.stroke();
      const lg = g.createRadialGradient(x - 28, 250, 2, x - 28, 250, 90);
      lg.addColorStop(0, P.licht);
      lg.addColorStop(1, "rgba(0,0,0,0)");
      g.globalAlpha = 0.35;
      g.fillStyle = lg;
      g.beginPath();
      g.moveTo(x - 40, 248);
      g.lineTo(x - 100, 540);
      g.lineTo(x + 40, 540);
      g.closePath();
      g.fill();
      g.globalAlpha = 1;
      g.fillStyle = P.licht;
      g.fillRect(x - 36, 242, 16, 8);
    }
  }
}

// ---------- 2 Kanalisation ----------
function malKanal(g, ebene, P, rnd, stil) {
  if (ebene === "fern") {
    // Gewölbe-Bögen hintereinander mit giftgrünem Leuchten
    g.fillStyle = P.fern;
    g.fillRect(0, 0, TILE_W, TILE_H);
    for (let x = 0; x < TILE_W; x += 300) {
      const gl = g.createRadialGradient(x + 150, 420, 10, x + 150, 420, 200);
      gl.addColorStop(0, P.grube);
      gl.addColorStop(1, "rgba(0,0,0,0)");
      g.globalAlpha = 0.35;
      g.fillStyle = gl;
      g.fillRect(x, 200, 300, 340);
      g.globalAlpha = 1;
      g.strokeStyle = P.tinte;
      g.lineWidth = 26;
      g.beginPath();
      g.arc(x + 150, 470, 190, Math.PI, 0);
      g.stroke();
      g.strokeStyle = P.mitte;
      g.lineWidth = 18;
      g.beginPath();
      g.arc(x + 150, 470, 190, Math.PI, 0);
      g.stroke();
      // Ziegel im Bogen
      g.strokeStyle = P.tinte;
      g.lineWidth = 1.5;
      for (let a = Math.PI; a < Math.PI * 2; a += 0.16) {
        g.beginPath();
        g.moveTo(x + 150 + Math.cos(a) * 181, 470 + Math.sin(a) * 181);
        g.lineTo(x + 150 + Math.cos(a) * 199, 470 + Math.sin(a) * 199);
        g.stroke();
      }
    }
    // Halftone-Nebel
    const gr = g.createLinearGradient(0, 280, 0, 540);
    gr.addColorStop(0, "rgba(0,0,0,0)");
    gr.addColorStop(1, P.nebel);
    g.globalAlpha = 0.25;
    g.fillStyle = gr;
    g.fillRect(0, 280, TILE_W, 260);
    g.globalAlpha = 1;
    fuelleMuster(g, "punkte", P.a2, 9, 0.18, 0, 330, TILE_W, 210);
  } else {
    // Wand mit Rohren, Gittern und Schleimspuren
    let x = 0;
    while (x < TILE_W) {
      const w = 260 + rnd() * 160;
      const top = 150 + rnd() * 60;
      g.fillStyle = P.mitte;
      g.fillRect(x, top, w, 500);
      fuelleMuster(g, "schraffur", P.tinte, 8, 0.3, x + w * 0.65, top, w * 0.35, 500);
      // Rohre
      for (let k = 0; k < 2; k++) {
        const ry = top + 40 + k * 90 + rnd() * 30;
        const d = 16 + rnd() * 10;
        g.fillStyle = k ? P.a3 : P.wand;
        g.fillRect(x, ry, w, d);
        g.fillStyle = "rgba(255,255,255,0.18)";
        g.fillRect(x, ry + 3, w, 3);
        g.strokeStyle = P.tinte;
        g.lineWidth = 2.5;
        g.strokeRect(x, ry, w, d);
        for (let bx = x + 30; bx < x + w; bx += 90) g.strokeRect(bx, ry - 3, 10, d + 6);
        // Tropfen
        g.fillStyle = P.a1;
        for (let i = 0; i < 3; i++) {
          const tx = x + rnd() * w;
          g.beginPath();
          g.arc(tx, ry + d + 6 + rnd() * 30, 2.5, 0, 7);
          g.fill();
        }
      }
      // Gitter
      if (rnd() < 0.7) {
        const gx = x + 40 + rnd() * (w - 140);
        const gy = top + 210;
        g.fillStyle = P.grube;
        g.globalAlpha = 0.3;
        g.fillRect(gx, gy, 90, 70);
        g.globalAlpha = 1;
        g.strokeStyle = P.tinte;
        g.lineWidth = 3;
        g.strokeRect(gx, gy, 90, 70);
        for (let bx = gx + 15; bx < gx + 90; bx += 15) {
          g.beginPath();
          g.moveTo(bx, gy);
          g.lineTo(bx, gy + 70);
          g.stroke();
        }
      }
      // Schleim
      g.fillStyle = P.a1;
      g.globalAlpha = 0.5;
      for (let i = 0; i < 3; i++) {
        const sx = x + rnd() * w;
        g.beginPath();
        g.moveTo(sx - 8, top);
        g.quadraticCurveTo(sx, top + 40 + rnd() * 80, sx + 8, top);
        g.fill();
      }
      g.globalAlpha = 1;
      g.strokeStyle = P.tinte;
      g.lineWidth = 3;
      tuschRechteck(g, x, top, w, 500, rnd, 2);
      x += w + 60 + rnd() * 90;
    }
  }
}

// ---------- 3 Verlassene Fabrik ----------
function malFabrik(g, ebene, P, rnd, stil) {
  if (ebene === "fern") {
    let x = -20;
    while (x < TILE_W) {
      const w = 180 + rnd() * 120;
      const h = 200 + rnd() * 120;
      haus(g, x, 470 - h, w, h + 80, P.fern, P, rnd, stil, 2.5);
      // Sägezahndach
      g.fillStyle = P.fern;
      g.strokeStyle = P.tinte;
      g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(x, 470 - h);
      for (let k = 0; k < 4; k++) {
        g.lineTo(x + (w / 4) * k + w / 8, 470 - h - 26);
        g.lineTo(x + (w / 4) * (k + 1), 470 - h);
      }
      g.fill();
      g.stroke();
      // Fenstergitter mit Glut
      g.fillStyle = P.fernLicht;
      g.globalAlpha = 0.6;
      g.fillRect(x + 16, 470 - h + 30, w - 32, 70);
      g.globalAlpha = 1;
      g.strokeStyle = P.tinte;
      g.lineWidth = 2;
      for (let fx = x + 16; fx <= x + w - 16; fx += 20) {
        g.beginPath();
        g.moveTo(fx, 470 - h + 30);
        g.lineTo(fx, 470 - h + 100);
        g.stroke();
      }
      g.strokeRect(x + 16, 470 - h + 30, w - 32, 70);
      // Schornstein mit Rauch
      if (rnd() < 0.6) {
        const sx = x + w * 0.7;
        g.fillStyle = P.mitte;
        g.fillRect(sx, 470 - h - 110, 22, 110);
        g.strokeRect(sx, 470 - h - 110, 22, 110);
        g.fillStyle = P.tinte;
        g.globalAlpha = 0.25;
        for (let k = 0; k < 5; k++) {
          g.beginPath();
          g.arc(sx + 11 + k * 14, 470 - h - 120 - k * 20, 14 + k * 5, 0, 7);
          g.fill();
        }
        g.globalAlpha = 1;
      }
      x += w + 10;
    }
    fuelleMuster(g, "schraffur", P.tinte, 6, 0.3, 0, 0, TILE_W, TILE_H);
  } else {
    // Stahlträger-Fachwerk, Zahnräder, Ketten, Warnstreifen
    let x = 0;
    while (x < TILE_W) {
      const w = 300 + rnd() * 140;
      const top = 120 + rnd() * 50;
      g.strokeStyle = P.tinte;
      g.fillStyle = P.mitte;
      g.lineWidth = 3;
      // Stützen
      for (const sx of [x, x + w - 18]) {
        g.fillRect(sx, top, 18, 480);
        g.strokeRect(sx, top, 18, 480);
      }
      // Fachwerk
      g.fillRect(x, top, w, 18);
      g.strokeRect(x, top, w, 18);
      g.lineWidth = 2.5;
      g.beginPath();
      for (let k = 0; k < 4; k++) {
        const a = x + 18 + ((w - 36) / 4) * k;
        const b = a + (w - 36) / 4;
        g.moveTo(a, top + 18);
        g.lineTo(b, top + 70);
        g.moveTo(b, top + 18);
        g.lineTo(a, top + 70);
      }
      g.moveTo(x + 18, top + 70);
      g.lineTo(x + w - 18, top + 70);
      g.stroke();
      // Zahnrad
      if (rnd() < 0.7) {
        const zx = x + 80 + rnd() * (w - 160);
        const zy = top + 220 + rnd() * 60;
        const r = 36 + rnd() * 20;
        g.fillStyle = P.a2;
        g.beginPath();
        for (let k = 0; k < 24; k++) {
          const a = (k / 24) * Math.PI * 2;
          const rr = k % 2 ? r : r + 9;
          g.lineTo(zx + Math.cos(a) * rr, zy + Math.sin(a) * rr);
        }
        g.closePath();
        g.fill();
        g.stroke();
        g.fillStyle = P.tinte;
        g.beginPath();
        g.arc(zx, zy, r * 0.3, 0, 7);
        g.fill();
      }
      // Kette
      g.strokeStyle = P.tinte;
      g.lineWidth = 2;
      const kx = x + w * 0.4 + rnd() * 40;
      for (let y = top + 70; y < top + 70 + 120 + rnd() * 80; y += 9) {
        g.beginPath();
        g.ellipse(kx, y, 3, 5, 0, 0, 7);
        g.stroke();
      }
      // Warnstreifen
      const wy = top + 360;
      g.save();
      g.beginPath();
      g.rect(x + 18, wy, w - 36, 22);
      g.clip();
      g.fillStyle = P.a3;
      g.fillRect(x, wy, w, 22);
      g.fillStyle = P.tinte;
      for (let sx = x - 30; sx < x + w; sx += 28) {
        g.beginPath();
        g.moveTo(sx, wy + 22);
        g.lineTo(sx + 14, wy + 22);
        g.lineTo(sx + 36, wy);
        g.lineTo(sx + 22, wy);
        g.fill();
      }
      g.restore();
      x += w + 30 + rnd() * 60;
    }
  }
}

// ---------- 4 U-Bahn-Tunnel ----------
function malUbahn(g, ebene, P, rnd, stil) {
  if (ebene === "fern") {
    g.fillStyle = P.fern;
    g.fillRect(0, 0, TILE_W, TILE_H);
    // Tunnelröhre mit Deckenlampen
    g.strokeStyle = P.tinte;
    g.lineWidth = 3;
    for (let x = 0; x < TILE_W; x += 150) {
      g.fillStyle = "rgba(0,0,0,0.35)";
      g.beginPath();
      g.ellipse(x + 75, 330, 60, 80, 0, 0, 7);
      g.fill();
      g.stroke();
      g.fillStyle = P.licht;
      g.globalAlpha = 0.9;
      g.fillRect(x + 50, 80, 50, 6);
      g.globalAlpha = 0.18;
      g.beginPath();
      g.moveTo(x + 50, 86);
      g.lineTo(x + 10, 260);
      g.lineTo(x + 140, 260);
      g.lineTo(x + 100, 86);
      g.fill();
      g.globalAlpha = 1;
    }
    g.fillStyle = P.a2;
    g.fillRect(0, 200, TILE_W, 10);
    fuelleMuster(g, "punkte", P.a2, 8, 0.25, 0, 0, TILE_W, TILE_H);
  } else {
    // gekachelte Bahnsteigwand mit Plakaten, Stationsschild, Säulen
    let x = 0;
    while (x < TILE_W) {
      const w = 340 + rnd() * 120;
      const top = 150;
      g.fillStyle = P.mitte;
      g.fillRect(x, top, w, 400);
      g.strokeStyle = "rgba(0,0,0,0.25)";
      g.lineWidth = 1;
      for (let y = top; y < 540; y += 16) {
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + w, y);
        g.stroke();
      }
      for (let tx = x; tx < x + w; tx += 22) {
        g.beginPath();
        g.moveTo(tx, top);
        g.lineTo(tx, 540);
        g.stroke();
      }
      g.fillStyle = P.a2;
      g.fillRect(x, top + 40, w, 18);
      g.fillStyle = P.a1;
      g.fillRect(x, top + 58, w, 5);
      // Plakate (abstrakt)
      for (let k = 0; k < 2; k++) {
        const px = x + 30 + k * (w / 2);
        const py = top + 100;
        g.fillStyle = P.papier;
        g.fillRect(px, py, 110, 150);
        g.fillStyle = [P.a1, P.a2, P.a3][Math.floor(rnd() * 3)];
        g.beginPath();
        g.arc(px + 55, py + 60, 30 + rnd() * 14, 0, 7);
        g.fill();
        g.fillStyle = P.tinte;
        g.fillRect(px + 12, py + 112, 86, 8);
        g.fillRect(px + 12, py + 126, 60, 6);
        g.strokeStyle = P.tinte;
        g.lineWidth = 2.5;
        g.strokeRect(px, py, 110, 150);
      }
      // Säule
      g.fillStyle = P.wand;
      g.fillRect(x + w - 30, top - 30, 30, 430);
      g.strokeStyle = P.tinte;
      g.lineWidth = 3;
      g.strokeRect(x + w - 30, top - 30, 30, 430);
      fuelleMuster(g, "schraffur", P.tinte, 6, 0.5, x + w - 30, top - 30, 30, 430);
      x += w + 20;
    }
    // Stationsschild
    g.fillStyle = P.a2;
    g.fillRect(420, 110, 260, 34);
    g.strokeStyle = P.tinte;
    g.lineWidth = 3;
    g.strokeRect(420, 110, 260, 34);
    g.fillStyle = P.papier;
    g.font = "bold 22px Bangers, Impact, sans-serif";
    g.textAlign = "center";
    g.fillText("TINTENPLATZ", 550, 136);
  }
}

// ---------- 5 Dächer & Skyline ----------
function malDaecher(g, ebene, P, rnd, stil) {
  if (ebene === "fern") {
    // Aquarell-Himmel: Wolkenflecken in Pink, Orange, Lila
    for (let i = 0; i < 14; i++) aquarell(g, rnd() * TILE_W, 60 + rnd() * 220, 40 + rnd() * 60, [P.a1, P.a2, P.a3, P.papier][i % 4], rnd, 0.12);
    // Sonne
    g.fillStyle = P.licht;
    g.globalAlpha = 0.9;
    g.beginPath();
    g.arc(600, 330, 70, 0, 7);
    g.fill();
    g.globalAlpha = 1;
    fuelleMuster(g, "punkte", P.a2, 9, 0.45, 530, 260, 140, 140);
    let x = -10;
    while (x < TILE_W) {
      const w = 40 + rnd() * 70;
      const h = 90 + rnd() * 200;
      g.fillStyle = P.fern;
      g.fillRect(x, 480 - h, w, h + 60);
      fuelleMuster(g, "punkte", P.tinte, 6, 0.35, x + w * 0.6, 480 - h, w * 0.4, h + 60);
      if (rnd() < 0.3) {
        g.fillRect(x + w / 2 - 1, 480 - h - 40, 2, 40);
      }
      x += w;
    }
  } else {
    let x = 0;
    while (x < TILE_W) {
      const w = 150 + rnd() * 140;
      const top = 260 + rnd() * 120;
      haus(g, x, top, w, 400, P.mitte, P, rnd, stil, 3);
      fenster(g, x, top, w, 300, P, rnd, 0.3, 8);
      // Wassertank
      if (rnd() < 0.4) {
        const tx = x + 20 + rnd() * (w - 80);
        g.fillStyle = P.wand;
        g.strokeStyle = P.tinte;
        g.lineWidth = 2.5;
        g.fillRect(tx, top - 60, 50, 46);
        g.strokeRect(tx, top - 60, 50, 46);
        g.beginPath();
        g.moveTo(tx - 4, top - 60);
        g.lineTo(tx + 25, top - 80);
        g.lineTo(tx + 54, top - 60);
        g.fill();
        g.stroke();
        g.beginPath();
        g.moveTo(tx + 6, top - 14);
        g.lineTo(tx + 2, top);
        g.moveTo(tx + 44, top - 14);
        g.lineTo(tx + 48, top);
        g.stroke();
      }
      // Werbetafel (abstrakt)
      if (rnd() < 0.35) {
        const bx = x + 10;
        g.fillStyle = P.papier;
        g.fillRect(bx, top - 90, 120, 60);
        g.fillStyle = P.a1;
        g.fillRect(bx + 8, top - 82, 50, 44);
        g.fillStyle = P.a3;
        g.beginPath();
        g.arc(bx + 90, top - 60, 18, 0, 7);
        g.fill();
        g.strokeStyle = P.tinte;
        g.lineWidth = 2.5;
        g.strokeRect(bx, top - 90, 120, 60);
        g.beginPath();
        g.moveTo(bx + 20, top - 30);
        g.lineTo(bx + 20, top);
        g.moveTo(bx + 100, top - 30);
        g.lineTo(bx + 100, top);
        g.stroke();
      }
      x += w + rnd() * 20;
    }
    // Kran-Silhouette
    g.strokeStyle = P.tinte;
    g.lineWidth = 3;
    const kx = 300 + rnd() * 500;
    g.beginPath();
    g.moveTo(kx, 540);
    g.lineTo(kx, 70);
    g.moveTo(kx + 14, 540);
    g.lineTo(kx + 14, 70);
    for (let y = 80; y < 540; y += 24) {
      g.moveTo(kx, y);
      g.lineTo(kx + 14, y + 24);
    }
    g.moveTo(kx - 80, 80);
    g.lineTo(kx + 260, 80);
    g.moveTo(kx - 80, 94);
    g.lineTo(kx + 260, 94);
    for (let xx = kx - 80; xx < kx + 260; xx += 20) {
      g.moveTo(xx, 80);
      g.lineTo(xx + 10, 94);
    }
    g.moveTo(kx + 220, 94);
    g.lineTo(kx + 220, 180);
    g.stroke();
  }
}

// ---------- 6 Glitch-Dimension: Stücke der anderen Welten in Comic-Panels ----------
function malGlitch(g, ebene, P, rnd, stil, skala) {
  const quellen = [0, 1, 2, 3, 4];
  let x = 0;
  let i = Math.floor(rnd() * 5);
  while (x < TILE_W) {
    const w = 180 + rnd() * 160;
    const tile = malEbeneOhneGlitch(quellen[i % 5], stil, ebene);
    g.save();
    g.beginPath();
    const sch = (rnd() - 0.5) * 30;
    g.moveTo(x + sch, 0);
    g.lineTo(x + w + sch, 0);
    g.lineTo(x + w - sch, TILE_H);
    g.lineTo(x - sch, TILE_H);
    g.closePath();
    g.clip();
    g.drawImage(tile, x - 100, (rnd() - 0.5) * 30, TILE_W, TILE_H);
    // Farbebenen-Verschiebung
    g.globalCompositeOperation = "screen";
    g.globalAlpha = 0.25;
    g.fillStyle = i % 2 ? P.a1 : P.a2;
    g.fillRect(x - 40, 0, w + 80, TILE_H);
    g.restore();
    g.strokeStyle = P.papier;
    g.lineWidth = 8;
    g.beginPath();
    g.moveTo(x - sch, TILE_H);
    g.lineTo(x + sch, 0);
    g.stroke();
    g.strokeStyle = P.tinte;
    g.lineWidth = 3;
    g.stroke();
    x += w;
    i++;
  }
  void skala;
}
const ohneGlitchCache = new Map();
function malEbeneOhneGlitch(welt, stil, ebene) {
  const k = `${welt}|${stil}|${ebene}`;
  if (!ohneGlitchCache.has(k)) ohneGlitchCache.set(k, malEbene(welt, stil, ebene, 1));
  return ohneGlitchCache.get(k);
}
export function glitchCacheLeeren() {
  ohneGlitchCache.clear();
}
