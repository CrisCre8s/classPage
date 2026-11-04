// Stick-Skater: Kulissen je Level. Jede Welt hat drei Stimmungen (v = 0, 1, 2) – andere Tageszeit, anderes
// Wetter, eigene Wahrzeichen im Hintergrund. Alles mit Code gezeichnet, keine Bilder.
import { HINTERGRUND, cache, schicht, parallax, verlauf, glanz, kreis, sr, sterneMalen, sterneErzeugen, palmeSilhouette, zeichneWetter } from "./skate-welten.js";

const zufall = (a, b) => a + Math.random() * (b - a);
const wrap = (x, b) => ((x % b) + b) % b;

// ---------------------------------------------------------------------------
// kleine Bausteine
// ---------------------------------------------------------------------------
function wolkeRund(ctx, x, y, b, seed, farbe) {
  const r = sr(seed);
  ctx.fillStyle = farbe;
  for (let i = 0; i < 7; i++) {
    const k = i / 6;
    kreis(ctx, x + k * b, y - Math.sin(k * Math.PI) * b * 0.16 - r() * 12, b * (0.12 + r() * 0.1));
  }
  ctx.fillRect(x, y - 4, b, b * 0.12);
}
function wolkenStreifen(ctx, t, kamX, liste, farbe, tempo = 0.004, dicke = 6) {
  ctx.fillStyle = farbe;
  for (const w of liste) {
    const x = wrap(w.x - kamX * 0.02 + t * tempo, 1500) - 250;
    ctx.beginPath();
    ctx.ellipse(x, w.y, w.b / 2, dicke, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w.b * 0.18, w.y - dicke, w.b / 3, dicke * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}
function voegel(ctx, t, kamX, n, farbe, y0 = 80) {
  ctx.strokeStyle = farbe;
  ctx.lineWidth = 1.8;
  for (let i = 0; i < n; i++) {
    const x = wrap(i * 211 + t * (0.03 + (i % 3) * 0.01) - kamX * 0.05, 1200) - 120;
    const y = y0 + ((i * 47) % 70) + Math.sin(t / 700 + i) * 6;
    const f = Math.sin(t / 120 + i * 1.7) * 4;
    ctx.beginPath();
    ctx.moveTo(x - 7, y - f);
    ctx.quadraticCurveTo(x - 3, y - 2, x, y);
    ctx.quadraticCurveTo(x + 3, y - 2, x + 7, y - f);
    ctx.stroke();
  }
}
function sonne(ctx, x, y, r, innen, aussen, a = 0.5) {
  glanz(ctx, x, y, r * 4, aussen, a);
  const g = ctx.createRadialGradient(x, y - r * 0.3, r * 0.1, x, y, r);
  g.addColorStop(0, "#fffdf0");
  g.addColorStop(1, innen);
  ctx.fillStyle = g;
  kreis(ctx, x, y, r);
}
function mond(ctx, x, y, r, farbe = "#f5e6b8") {
  glanz(ctx, x, y, r * 3.6, "rgba(245, 230, 184, A)", 0.32);
  ctx.fillStyle = farbe;
  kreis(ctx, x, y, r);
  ctx.fillStyle = "rgba(180, 165, 125, 0.35)";
  [[-0.3, -0.25, 0.2], [0.35, 0.3, 0.14], [0.1, -0.45, 0.1], [-0.15, 0.35, 0.12]].forEach(([a, b, c]) => kreis(ctx, x + a * r, y + b * r, c * r));
}
function nebel(ctx, W, H, y0, farbe, a) {
  const g = ctx.createLinearGradient(0, y0, 0, H);
  g.addColorStop(0, farbe.replace("A", 0));
  g.addColorStop(1, farbe.replace("A", a));
  ctx.fillStyle = g;
  ctx.fillRect(0, y0, W, H - y0);
}
// Gebäude-Silhouetten (aus dem Stadt-Cache), Farben und Fenster je Stimmung
function skyline(ctx, t, kamX, kamY, W, H, c, farben, fensterFarbe, neon = null) {
  c.ebenen.forEach((e, ei) => {
    parallax(ctx, e, kamX, kamY, W, H, (x, basis, h) => {
      const top = basis - h.h - 120;
      ctx.fillStyle = farben[ei];
      ctx.fillRect(x, top, h.b, H - top + 40);
      if (h.antenne) {
        ctx.fillRect(x + h.b / 2 - 1, top - 18, 2, 18);
        ctx.fillStyle = Math.sin(t / 400 + h.x) > 0 ? "#e5566f" : "#5a2030";
        ctx.fillRect(x + h.b / 2 - 2, top - 20, 4, 4);
      }
      for (const [fx, fy, p] of h.fenster) {
        ctx.fillStyle = fensterFarbe(p, ei);
        ctx.fillRect(x + fx, top + fy, 7, 9);
      }
      // Leuchtreklame auf manchen Häusern der vorderen Reihe
      if (neon && ei === 2 && h.b > 90 && Math.floor(h.x) % 3 === 0) {
        const wort = neon.woerter[Math.floor(h.x) % neon.woerter.length];
        const farbe = neon.farben[Math.floor(h.x / 7) % neon.farben.length];
        const an = Math.sin(t / 700 + h.x) > -0.85 || Math.random() < 0.4;
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(10, 8, 18, 0.8)";
        ctx.fillRect(x + h.b / 2 - 40, top - 26, 80, 20);
        ctx.shadowColor = farbe;
        ctx.shadowBlur = an ? 14 : 0;
        ctx.fillStyle = an ? farbe : "rgba(120,120,140,0.5)";
        ctx.fillText(wort, x + h.b / 2, top - 11);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(10, 8, 18, 0.8)";
        ctx.fillRect(x + h.b / 2 - 30, top - 6, 2, 6);
        ctx.fillRect(x + h.b / 2 + 28, top - 6, 2, 6);
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Zusatz-Caches je Stimmung
// ---------------------------------------------------------------------------
const extra = {};
function ex(key, bau) {
  if (!extra[key]) extra[key] = bau();
  return extra[key];
}
const wolkenListe = (n, y0, y1) => Array.from({ length: n }, () => ({ x: Math.random() * 1500, y: zufall(y0, y1), b: zufall(90, 240) }));

// ---------------------------------------------------------------------------
// Szenen
// ---------------------------------------------------------------------------
const SZENE = {
  // ======================= STADT =======================
  // 1-1 Dämmerung über den Dächern
  "stadt-0"(ctx, t, kamX, kamY, W, H) {
    const c = cache("stadt", W);
    const e = ex("stadt-0", () => ({ wolken: wolkenListe(8, 40, 200) }));
    verlauf(ctx, H, W, [[0, "#1d1748"], [0.35, "#5b2f72"], [0.62, "#d86a5e"], [0.82, "#ffb070"], [1, "#ffd59a"]]);
    sterneMalen(ctx, c.sterne.slice(0, 30), t);
    sonne(ctx, 640, 268, 58, "#ff9a5a", "rgba(255, 170, 100, A)", 0.5);
    wolkenStreifen(ctx, t, kamX, e.wolken, "rgba(255, 170, 170, 0.32)");
    voegel(ctx, t, kamX, 6, "rgba(40, 20, 50, 0.7)", 110);
    skyline(ctx, t, kamX, kamY, W, H, c, ["#3a2350", "#2d1c42", "#221634"], (p, ei) => (p > 0.6 ? `rgba(255, 200, 120, ${0.3 + p * 0.4})` : `rgba(255, 220, 160, ${0.08 + ei * 0.05})`), { woerter: ["SKATE", "RADIO", "PIZZA", "KINO"], farben: ["#ff6fa8", "#5ff7e4", "#ffd36a"] });
    nebel(ctx, W, H, H * 0.5, "rgba(255, 140, 110, A)", 0.28);
  },
  // 1-2 Skatepark bei Nacht: Flutlicht schwenkt über den Himmel
  "stadt-1"(ctx, t, kamX, kamY, W, H) {
    HINTERGRUND.stadt(ctx, t, kamX, kamY, W, H, cache("stadt", W));
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 4; i++) {
      const fx = wrap(140 + i * 300 - kamX * 0.25, 1200) - 120;
      const w = Math.sin(t / 1800 + i * 1.3) * 0.5 - Math.PI / 2;
      const g = ctx.createLinearGradient(fx, H, fx + Math.cos(w) * 520, H + Math.sin(w) * 520);
      g.addColorStop(0, "rgba(200, 220, 255, 0.24)");
      g.addColorStop(1, "rgba(200, 220, 255, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(fx - 8, H * 0.78);
      ctx.lineTo(fx + Math.cos(w - 0.09) * 620, H * 0.78 + Math.sin(w - 0.09) * 620);
      ctx.lineTo(fx + Math.cos(w + 0.09) * 620, H * 0.78 + Math.sin(w + 0.09) * 620);
      ctx.lineTo(fx + 8, H * 0.78);
      ctx.fill();
    }
    ctx.restore();
    // Flutlichtmasten
    for (let i = 0; i < 4; i++) {
      const fx = wrap(140 + i * 300 - kamX * 0.25, 1200) - 120;
      ctx.fillStyle = "#1a1530";
      ctx.fillRect(fx - 2, H * 0.78 - 4, 4, 140);
      ctx.fillStyle = "#2a2346";
      ctx.fillRect(fx - 14, H * 0.78 - 12, 28, 10);
      ctx.fillStyle = "#f4f7ff";
      for (let k = 0; k < 4; k++) ctx.fillRect(fx - 12 + k * 7, H * 0.78 - 10, 5, 6);
      glanz(ctx, fx, H * 0.78 - 8, 40, "rgba(230, 240, 255, A)", 0.4);
    }
    nebel(ctx, W, H, H * 0.55, "rgba(120, 140, 220, A)", 0.22);
  },
  // 1-3 Innenstadt im Regen: Neon, nasse Spiegelungen, Wolkendecke
  "stadt-2"(ctx, t, kamX, kamY, W, H) {
    const c = cache("stadt", W);
    const e = ex("stadt-2", () => ({ wolken: wolkenListe(10, 10, 140) }));
    verlauf(ctx, H, W, [[0, "#0b0f1c"], [0.5, "#1a2236"], [1, "#2c3550"]]);
    // fernes Wetterleuchten
    const f = (t / 5200) % 1;
    if (f < 0.05) {
      ctx.fillStyle = `rgba(180, 200, 255, ${0.25 * (1 - f / 0.05)})`;
      ctx.fillRect(0, 0, W, H * 0.6);
    }
    wolkenStreifen(ctx, t, kamX, e.wolken, "rgba(70, 80, 110, 0.55)", 0.006, 14);
    skyline(ctx, t, kamX, kamY, W, H, c, ["#151a2b", "#1a2034", "#20273f"], (p) => (p > 0.8 ? `rgba(255, 90, 170, ${0.35 + p * 0.3})` : p > 0.55 ? `rgba(95, 247, 228, ${0.2 + p * 0.3})` : `rgba(245, 217, 122, ${0.12 + p * 0.25})`), { woerter: ["NUDELN", "HOTEL", "BAR", "24/7", "ARCADE"], farben: ["#ff4fa0", "#5ff7e4", "#b48ef0", "#ffd36a"] });
    // Spiegelung auf nassem Asphalt (unten, hinter der Fahrbahn)
    nebel(ctx, W, H, H * 0.45, "rgba(120, 90, 200, A)", 0.32);
  },

  // ======================= STRAND =======================
  "strand-0"(ctx, t, kamX, kamY, W, H) {
    HINTERGRUND.strand(ctx, t, kamX, kamY, W, H, cache("strand", W));
    // Segelboot am Horizont
    const hz = 262 - (kamY + H * 0.68) * 0.04;
    const bx = wrap(820 - kamX * 0.03 + t * 0.006, 1300) - 150;
    ctx.fillStyle = "#3b1b40";
    ctx.beginPath();
    ctx.moveTo(bx - 22, hz - 2);
    ctx.lineTo(bx + 22, hz - 2);
    ctx.lineTo(bx + 16, hz + 4);
    ctx.lineTo(bx - 16, hz + 4);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(bx, hz - 40);
    ctx.lineTo(bx + 16, hz - 6);
    ctx.lineTo(bx, hz - 6);
    ctx.fill();
    voegel(ctx, t, kamX, 5, "rgba(60, 20, 60, 0.6)", 90);
  },
  // 2-2 Mittag am Leuchtturm
  "strand-1"(ctx, t, kamX, kamY, W, H) {
    const e = ex("strand-1", () => ({
      wolken: Array.from({ length: 6 }, () => ({ x: Math.random() * 1500, y: zufall(40, 150), b: zufall(140, 260), seed: Math.random() })),
      palmen: schicht(0.3, 40, (x) => ({ x, b: 70, h: zufall(130, 200), neig: zufall(-0.35, 0.35), seed: Math.random(), abst: zufall(80, 320) })),
      klippen: schicht(0.06, 6, (x) => ({ x, b: zufall(260, 380), h: zufall(50, 80), turm: Math.random() < 0.5, abst: zufall(500, 900) })),
      boote: Array.from({ length: 3 }, (_, i) => ({ x: 200 + i * 430, s: 0.7 + i * 0.25 })),
    }));
    verlauf(ctx, H, W, [[0, "#2f86e8"], [0.45, "#8fd0ff"], [0.6, "#d8f1ff"], [1, "#fff6dc"]]);
    sonne(ctx, 780, 70, 34, "#fff2b0", "rgba(255, 250, 210, A)", 0.6);
    for (const w of e.wolken) wolkeRund(ctx, wrap(w.x - kamX * 0.02 + t * 0.008, 1500) - 250, w.y, w.b, w.seed, "rgba(255,255,255,0.9)");
    const hz = 250 - (kamY + H * 0.68) * 0.04;
    // Meer
    const mg = ctx.createLinearGradient(0, hz, 0, H);
    mg.addColorStop(0, "#1f8fc9");
    mg.addColorStop(0.4, "#22b5c4");
    mg.addColorStop(1, "#4fd8c8");
    ctx.fillStyle = mg;
    ctx.fillRect(0, hz, W, H - hz);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    for (let i = 0; i < 40; i++) {
      const x = wrap(i * 97 - kamX * (0.05 + (i % 4) * 0.03) + Math.sin(t / 700 + i) * 6, W + 40) - 20;
      const y = hz + 6 + ((i * 41) % 110);
      const a = 0.25 + 0.25 * Math.sin(t / 300 + i * 2);
      ctx.globalAlpha = a;
      ctx.fillRect(x, y, 10 + (i % 3) * 6, 1.6);
    }
    ctx.globalAlpha = 1;
    // Segelboote
    for (const b of e.boote) {
      const bx = wrap(b.x - kamX * 0.04 * b.s + t * 0.01 * b.s, 1300) - 150;
      const by = hz + 10 * b.s;
      ctx.fillStyle = "#f4f1f8";
      ctx.beginPath();
      ctx.moveTo(bx, by - 38 * b.s);
      ctx.lineTo(bx + 18 * b.s, by - 6 * b.s);
      ctx.lineTo(bx, by - 6 * b.s);
      ctx.fill();
      ctx.fillStyle = "#e5566f";
      ctx.beginPath();
      ctx.moveTo(bx - 2, by - 30 * b.s);
      ctx.lineTo(bx - 14 * b.s, by - 6 * b.s);
      ctx.lineTo(bx - 2, by - 6 * b.s);
      ctx.fill();
      ctx.fillStyle = "#2a3a5a";
      ctx.fillRect(bx - 18 * b.s, by - 6 * b.s, 38 * b.s, 5 * b.s);
    }
    // Klippen mit Leuchtturm
    parallax(ctx, e.klippen, kamX, kamY, W, H, (x, _b, it) => {
      const y = hz + 2;
      ctx.fillStyle = "#6b5a48";
      ctx.beginPath();
      ctx.moveTo(x, y + 4);
      ctx.lineTo(x + 30, y - it.h);
      ctx.lineTo(x + it.b - 50, y - it.h - 6);
      ctx.lineTo(x + it.b, y + 4);
      ctx.fill();
      ctx.fillStyle = "#5fa058";
      ctx.fillRect(x + 28, y - it.h - 6, it.b - 76, 6);
      if (!it.turm) return;
      const tx = x + it.b * 0.45;
      const ty = y - it.h - 6;
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = i % 2 ? "#e5566f" : "#ffffff";
        ctx.fillRect(tx - 9 + i * 0.8, ty - 18 - i * 16, 18 - i * 1.6, 16);
      }
      ctx.fillStyle = "#2a2a3a";
      ctx.fillRect(tx - 7, ty - 104, 14, 14);
      ctx.fillStyle = "#fff6b0";
      ctx.fillRect(tx - 5, ty - 102, 10, 10);
      ctx.fillStyle = "#e5566f";
      ctx.beginPath();
      ctx.moveTo(tx - 9, ty - 104);
      ctx.lineTo(tx, ty - 116);
      ctx.lineTo(tx + 9, ty - 104);
      ctx.fill();
      // Lichtstrahl dreht sich (bei Tag nur zart)
      const w = (t / 1400) % (Math.PI * 2);
      const l = Math.cos(w) * 160;
      ctx.fillStyle = "rgba(255, 250, 200, 0.18)";
      ctx.beginPath();
      ctx.moveTo(tx, ty - 97);
      ctx.lineTo(tx + l, ty - 115);
      ctx.lineTo(tx + l, ty - 80);
      ctx.fill();
    });
    // Palmen in Farbe
    parallax(ctx, e.palmen, kamX, kamY, W, H, (x, basis, it) => palmeSilhouette(ctx, x + 35, basis - 130, it, t, "#2f7a4a"));
    voegel(ctx, t, kamX, 7, "rgba(60, 70, 90, 0.7)", 70);
  },
  // 2-3 Strandparty bei Nacht: Mond, leuchtende Wellen, Lampions, Lagerfeuer
  "strand-2"(ctx, t, kamX, kamY, W, H) {
    const e = ex("strand-2", () => ({
      sterne: sterneErzeugen(120, 240, W),
      palmen: schicht(0.28, 40, (x) => ({ x, b: 70, h: zufall(120, 190), neig: zufall(-0.35, 0.35), seed: Math.random(), abst: zufall(60, 260) })),
      feuer: schicht(0.12, 12, (x) => ({ x, b: 40, abst: zufall(260, 600), seed: Math.random() })),
    }));
    verlauf(ctx, H, W, [[0, "#050616"], [0.5, "#121a3e"], [1, "#24305e"]]);
    sterneMalen(ctx, e.sterne, t, true);
    mond(ctx, 250, 90, 30, "#fff4d6");
    const hz = 262 - (kamY + H * 0.68) * 0.04;
    const mg = ctx.createLinearGradient(0, hz, 0, H);
    mg.addColorStop(0, "#0e1a40");
    mg.addColorStop(1, "#050a1e");
    ctx.fillStyle = mg;
    ctx.fillRect(0, hz, W, H - hz);
    // Mondspiegelung
    for (let i = 0; i < 14; i++) {
      const b = 60 - i * 3 + Math.sin(t / 300 + i) * 8;
      ctx.fillStyle = `rgba(255, 240, 200, ${0.4 - i * 0.025})`;
      ctx.fillRect(250 - b / 2 + Math.sin(t / 500 + i * 2) * 5, hz + 4 + i * i * 0.9, b, 2);
    }
    // leuchtendes Plankton in den Wellen
    for (let r = 0; r < 4; r++) {
      const y = hz + 22 + r * 24;
      ctx.strokeStyle = `rgba(80, 240, 255, ${0.18 + 0.14 * Math.sin(t / 600 + r)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = -10; x < W + 10; x += 12) {
        const yy = y + Math.sin(x / 60 + t / 500 + r * 2 - kamX * 0.002 * (r + 1)) * 3;
        x < 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    // Lagerfeuer am fernen Strand
    parallax(ctx, e.feuer, kamX, kamY, W, H, (x, basis) => {
      const y = basis - 175;
      glanz(ctx, x, y, 60, "rgba(255, 140, 60, A)", 0.45 + 0.1 * Math.sin(t / 90 + x));
      ctx.fillStyle = "#ffb040";
      ctx.beginPath();
      ctx.moveTo(x - 7, y);
      ctx.quadraticCurveTo(x, y - 22 - Math.sin(t / 80 + x) * 4, x + 7, y);
      ctx.fill();
      ctx.fillStyle = "#fff0a0";
      ctx.beginPath();
      ctx.moveTo(x - 3, y);
      ctx.quadraticCurveTo(x, y - 10, x + 3, y);
      ctx.fill();
    });
    parallax(ctx, e.palmen, kamX, kamY, W, H, (x, basis, it) => palmeSilhouette(ctx, x + 35, basis - 130, it, t, "#060a1c"));
    // Lampion-Kette quer über den Himmel
    const off = wrap(-kamX * 0.35, 480);
    for (let k = -1; k < 3; k++) {
      const x0 = off + k * 480;
      ctx.strokeStyle = "rgba(20, 20, 40, 0.9)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x0, 40);
      ctx.quadraticCurveTo(x0 + 240, 120, x0 + 480, 40);
      ctx.stroke();
      for (let i = 1; i < 8; i++) {
        const u = i / 8;
        const lx = x0 + u * 480;
        const ly = (1 - u) * (1 - u) * 40 + 2 * (1 - u) * u * 120 + u * u * 40 + 8;
        const f = ["#ff6b6b", "#ffd36a", "#5ff7e4", "#b48ef0"][i % 4];
        glanz(ctx, lx, ly, 22, "rgba(255, 220, 150, A)", 0.25);
        ctx.fillStyle = f;
        ctx.beginPath();
        ctx.ellipse(lx, ly + Math.sin(t / 500 + i) * 1.5, 6, 8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  },

  // ======================= DSCHUNGEL =======================
  "dschungel-0"(ctx, t, kamX, kamY, W, H) {
    HINTERGRUND.dschungel(ctx, t, kamX, kamY, W, H, cache("dschungel", W));
    // Papageien fliegen vorbei
    for (let i = 0; i < 2; i++) {
      const x = wrap(t * 0.09 + i * 640 - kamX * 0.1, 1400) - 200;
      const y = 90 + i * 50 + Math.sin(t / 400 + i) * 12;
      const f = Math.sin(t / 70 + i) * 6;
      ctx.fillStyle = i ? "#3aa0ff" : "#e5463f";
      ctx.beginPath();
      ctx.ellipse(x, y, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = i ? "#ffd36a" : "#ffd36a";
      ctx.beginPath();
      ctx.moveTo(x - 2, y);
      ctx.lineTo(x - 10, y - 8 - f);
      ctx.lineTo(x + 4, y - 1);
      ctx.fill();
      ctx.fillStyle = i ? "#1f6ad0" : "#2fa85a";
      ctx.fillRect(x - 18, y - 1, 9, 2);
    }
  },
  // 3-2 Pilztempel: Stufenpyramide, Wasserfall, leuchtende Riesenpilze
  "dschungel-1"(ctx, t, kamX, kamY, W, H) {
    const e = ex("dschungel-1", () => ({
      tempel: schicht(0.05, 6, (x) => ({ x, b: zufall(260, 340), h: zufall(150, 200), abst: zufall(600, 1000) })),
      faelle: schicht(0.1, 8, (x) => ({ x, b: zufall(40, 60), h: zufall(140, 220), abst: zufall(500, 900), seed: Math.random() })),
      pilze: schicht(0.24, 30, (x) => ({ x, b: zufall(60, 120), h: zufall(70, 150), farbe: Math.random(), abst: zufall(60, 260) })),
      lianen: schicht(0.5, 40, (x) => ({ x, b: 30, l: zufall(60, 160), seed: Math.random(), abst: zufall(60, 240) })),
    }));
    verlauf(ctx, H, W, [[0, "#0f3a3a"], [0.45, "#3a8a6a"], [0.75, "#d9c784"], [1, "#f2e2a8"]]);
    sonne(ctx, 480, 150, 40, "#ffe7a0", "rgba(255, 240, 180, A)", 0.4);
    // Stufentempel in der Ferne
    parallax(ctx, e.tempel, kamX, kamY, W, H, (x, basis, it) => {
      const fuss = basis - 150;
      const stufen = 6;
      for (let i = 0; i < stufen; i++) {
        const k = i / stufen;
        const b = it.b * (1 - k * 0.75);
        ctx.fillStyle = i % 2 ? "#4f6a5a" : "#577566";
        ctx.fillRect(x + (it.b - b) / 2, fuss - (i + 1) * (it.h / stufen), b, it.h / stufen + 1);
      }
      ctx.fillStyle = "#3e5548";
      ctx.fillRect(x + it.b / 2 - 10, fuss - it.h, 20, it.h);
      ctx.fillStyle = "#2c3f35";
      ctx.fillRect(x + it.b / 2 - 16, fuss - it.h - 26, 32, 26);
      ctx.fillStyle = `rgba(150, 255, 200, ${0.4 + 0.3 * Math.sin(t / 500)})`;
      ctx.fillRect(x + it.b / 2 - 6, fuss - it.h - 18, 12, 14);
      ctx.fillStyle = "rgba(60, 140, 80, 0.6)";
      for (let i = 0; i < 8; i++) ctx.fillRect(x + it.b * (0.15 + i * 0.09), fuss - it.h * (0.2 + (i % 3) * 0.2), 8, 22);
    });
    // Wasserfälle von Felsen
    parallax(ctx, e.faelle, kamX, kamY, W, H, (x, basis, it) => {
      const top = basis - 150 - it.h;
      ctx.fillStyle = "#2d4f44";
      ctx.fillRect(x - 40, top - 20, it.b + 80, 30);
      const g = ctx.createLinearGradient(0, top, 0, basis - 150);
      g.addColorStop(0, "rgba(220, 245, 255, 0.85)");
      g.addColorStop(1, "rgba(220, 245, 255, 0.35)");
      ctx.fillStyle = g;
      ctx.fillRect(x, top, it.b, it.h);
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      for (let i = 0; i < 6; i++) {
        const yy = top + wrap(t * 0.25 + i * 37 + it.seed * 100, it.h);
        ctx.fillRect(x + 4 + ((i * 13) % (it.b - 8)), yy, 3, 16);
      }
      glanz(ctx, x + it.b / 2, basis - 150, it.b * 1.4, "rgba(255,255,255,A)", 0.35);
    });
    // leuchtende Riesenpilze
    parallax(ctx, e.pilze, kamX, kamY, W, H, (x, basis, it) => {
      const fuss = basis - 110;
      ctx.fillStyle = "#e8dcc0";
      ctx.fillRect(x + it.b / 2 - it.b * 0.08, fuss - it.h, it.b * 0.16, it.h);
      const f = it.farbe < 0.5 ? ["#ff7fb0", "rgba(255, 127, 176, A)"] : ["#7fe0ff", "rgba(127, 224, 255, A)"];
      glanz(ctx, x + it.b / 2, fuss - it.h, it.b, f[1], 0.25 + 0.1 * Math.sin(t / 600 + it.x));
      ctx.fillStyle = f[0];
      ctx.beginPath();
      ctx.ellipse(x + it.b / 2, fuss - it.h, it.b / 2, it.b * 0.28, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      kreis(ctx, x + it.b * 0.35, fuss - it.h - it.b * 0.12, 4);
      kreis(ctx, x + it.b * 0.6, fuss - it.h - it.b * 0.18, 3);
    });
    nebel(ctx, W, H, H * 0.45, "rgba(230, 255, 230, A)", 0.25);
    parallax(ctx, e.lianen, kamX, kamY, W, H, (x, _b, it) => {
      const sw = Math.sin(t / 1300 + it.seed * 9) * 5;
      ctx.strokeStyle = "#2a6a3e";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x, -5);
      ctx.quadraticCurveTo(x + 8 + sw, it.l / 2, x + sw, it.l);
      ctx.stroke();
    });
  },
  // 3-3 Glühwürmchen-Nacht
  "dschungel-2"(ctx, t, kamX, kamY, W, H) {
    const c = cache("dschungel", W);
    const e = ex("dschungel-2", () => ({ sterne: sterneErzeugen(70, 160, W) }));
    verlauf(ctx, H, W, [[0, "#020a12"], [0.5, "#06241f"], [1, "#0e3a2e"]]);
    sterneMalen(ctx, e.sterne, t);
    mond(ctx, 700, 80, 36, "#e9f7d8");
    ctx.fillStyle = "#08241c";
    parallax(ctx, c.huegel, kamX, kamY, W, H, (x, basis, it) => {
      ctx.beginPath();
      ctx.ellipse(x + it.b / 2, basis - 150, it.b / 2 + 30, it.h, 0, Math.PI, 0);
      ctx.fill();
    });
    parallax(ctx, c.kronen, kamX, kamY, W, H, (x, basis, it) => {
      const r = sr(it.seed);
      const top = basis - 140 - it.h;
      ctx.fillStyle = "#04160f";
      ctx.fillRect(x + it.b / 2 - 7, top + 30, 14, it.h);
      for (let i = 0; i < 6; i++) kreis(ctx, x + r() * it.b, top + r() * 50, 30 + r() * 30);
      // Mondlicht am Rand der Krone
      ctx.fillStyle = "rgba(200, 255, 220, 0.06)";
      kreis(ctx, x + it.b * 0.7, top + 10, 26);
    });
    // leuchtende Blüten
    parallax(ctx, c.staemme, kamX, kamY, W, H, (x, basis, it) => {
      ctx.fillStyle = "#020d09";
      ctx.fillRect(x, -40, it.b, basis + 40);
      const r = sr(it.seed);
      for (let i = 0; i < 3; i++) {
        const bx = x + r() * it.b;
        const by = basis - 160 - r() * 160;
        glanz(ctx, bx, by, 14, i % 2 ? "rgba(255, 120, 220, A)" : "rgba(120, 220, 255, A)", 0.6 + 0.3 * Math.sin(t / 400 + i + it.seed * 9));
      }
    });
    nebel(ctx, W, H, H * 0.5, "rgba(120, 255, 180, A)", 0.12);
  },

  // ======================= EIS =======================
  "eis-0"(ctx, t, kamX, kamY, W, H) {
    HINTERGRUND.eis(ctx, t, kamX, kamY, W, H, cache("eis", W));
    // Iglus mit warmem Licht zwischen den Tannen
    const e = ex("eis-0", () => ({ iglus: schicht(0.34, 10, (x) => ({ x, b: 70, abst: zufall(500, 900) })) }));
    parallax(ctx, e.iglus, kamX, kamY, W, H, (x, basis) => {
      const fuss = basis - 100;
      ctx.fillStyle = "#dceaff";
      ctx.beginPath();
      ctx.arc(x + 35, fuss, 32, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = "rgba(120, 150, 200, 0.5)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(x + 35, fuss, 32, Math.PI + 0.1, -0.1);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + 3 + i * 2, fuss - i * 8);
        ctx.lineTo(x + 67 - i * 2, fuss - i * 8);
        ctx.stroke();
      }
      glanz(ctx, x + 35, fuss - 6, 40, "rgba(255, 190, 110, A)", 0.4 + 0.1 * Math.sin(t / 300 + x));
      ctx.fillStyle = "#ffcf7a";
      ctx.beginPath();
      ctx.arc(x + 35, fuss, 11, Math.PI, 0);
      ctx.fill();
    });
  },
  // 4-2 Gletscher am Mittag
  "eis-1"(ctx, t, kamX, kamY, W, H) {
    const c = cache("eis", W);
    const e = ex("eis-1", () => ({
      berge: schicht(0.12, 20, (x) => ({ x, b: zufall(70, 140), h: zufall(26, 60), abst: zufall(120, 360), seed: Math.random() })),
      kolonie: schicht(0.2, 12, (x) => ({ x, b: 120, n: Math.floor(zufall(4, 9)), seed: Math.random(), abst: zufall(400, 800) })),
    }));
    verlauf(ctx, H, W, [[0, "#3a8ee8"], [0.5, "#a8dcff"], [1, "#f2fbff"]]);
    sonne(ctx, 200, 70, 30, "#fffbe0", "rgba(255, 255, 230, A)", 0.6);
    const berg = (s, farbe, schatten, kappe, hoch) =>
      parallax(ctx, s, kamX, kamY, W, H, (x, basis, it) => {
        const fuss = basis - hoch;
        const sx = x + it.b / 2;
        ctx.fillStyle = farbe;
        ctx.beginPath();
        ctx.moveTo(x - 40, fuss + 200);
        ctx.lineTo(sx, fuss - it.h);
        ctx.lineTo(x + it.b + 40, fuss + 200);
        ctx.fill();
        ctx.fillStyle = schatten;
        ctx.beginPath();
        ctx.moveTo(sx, fuss - it.h);
        ctx.lineTo(x + it.b + 40, fuss + 200);
        ctx.lineTo(sx + 20, fuss + 200);
        ctx.fill();
        ctx.fillStyle = kappe;
        ctx.beginPath();
        ctx.moveTo(sx, fuss - it.h);
        ctx.lineTo(sx + (it.b / 2 + 40) * 0.3, fuss - it.h + (it.h + 200) * 0.3);
        ctx.lineTo(sx - (it.b / 2 + 40) * 0.3, fuss - it.h + (it.h + 200) * 0.3);
        ctx.fill();
      });
    berg(c.fern, "#c6dcf2", "rgba(110, 150, 200, 0.35)", "#ffffff", 170);
    berg(c.nah, "#9cc2e8", "rgba(80, 120, 180, 0.35)", "#f4faff", 130);
    // Meer mit Eisbergen
    const hz = 300 - (kamY + H * 0.68) * 0.12;
    const mg = ctx.createLinearGradient(0, hz, 0, H);
    mg.addColorStop(0, "#2a6fb0");
    mg.addColorStop(1, "#173f73");
    ctx.fillStyle = mg;
    ctx.fillRect(0, hz, W, H - hz);
    parallax(ctx, e.berge, kamX, kamY, W, H, (x, _b, it) => {
      const r = sr(it.seed);
      const y = hz + 8 + r() * 20;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + it.b * 0.25, y - it.h);
      ctx.lineTo(x + it.b * 0.55, y - it.h * 0.8);
      ctx.lineTo(x + it.b * 0.7, y - it.h * 0.95);
      ctx.lineTo(x + it.b, y);
      ctx.fill();
      ctx.fillStyle = "rgba(120, 190, 240, 0.6)";
      ctx.beginPath();
      ctx.moveTo(x + it.b * 0.55, y - it.h * 0.8);
      ctx.lineTo(x + it.b * 0.7, y - it.h * 0.95);
      ctx.lineTo(x + it.b, y);
      ctx.lineTo(x + it.b * 0.6, y);
      ctx.fill();
      ctx.fillStyle = "rgba(160, 220, 255, 0.35)";
      ctx.fillRect(x + 4, y, it.b - 8, 6);
    });
    // Pinguinkolonie auf einer Scholle
    parallax(ctx, e.kolonie, kamX, kamY, W, H, (x, _b, it) => {
      const y = hz + 34;
      ctx.fillStyle = "#f4faff";
      ctx.beginPath();
      ctx.ellipse(x + 60, y, 70, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < it.n; i++) {
        const px = x + 14 + i * 12;
        const hop = Math.max(0, Math.sin(t / 260 + i * 1.3 + it.seed * 9)) * 2;
        ctx.fillStyle = "#1a2030";
        ctx.beginPath();
        ctx.ellipse(px, y - 9 - hop, 4, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.ellipse(px + 1, y - 8 - hop, 2.4, 5.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffb040";
        ctx.fillRect(px + 2, y - 14 - hop, 3, 1.5);
      }
    });
    // Glitzern
    for (let i = 0; i < 18; i++) {
      const a = Math.max(0, Math.sin(t / 300 + i * 2.1));
      if (a < 0.6) continue;
      const x = wrap(i * 131 - kamX * 0.1, W);
      const y = hz + 10 + ((i * 29) % 80);
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.fillRect(x - 3 * a, y, 6 * a, 1);
      ctx.fillRect(x, y - 3 * a, 1, 6 * a);
    }
  },
  // 4-3 Schneesturm
  "eis-2"(ctx, t, kamX, kamY, W, H) {
    const c = cache("eis", W);
    verlauf(ctx, H, W, [[0, "#5d6b80"], [0.6, "#9aa8bb"], [1, "#d6dde8"]]);
    const berg = (s, farbe, hoch) =>
      parallax(ctx, s, kamX, kamY, W, H, (x, basis, it) => {
        const fuss = basis - hoch;
        ctx.fillStyle = farbe;
        ctx.beginPath();
        ctx.moveTo(x - 40, fuss + 200);
        ctx.lineTo(x + it.b / 2, fuss - it.h);
        ctx.lineTo(x + it.b + 40, fuss + 200);
        ctx.fill();
      });
    berg(c.fern, "rgba(150, 165, 185, 0.6)", 170);
    berg(c.nah, "rgba(120, 138, 162, 0.7)", 130);
    parallax(ctx, c.tannen, kamX, kamY, W, H, (x, basis, it) => {
      const fuss = basis - 100;
      ctx.fillStyle = "rgba(70, 86, 110, 0.75)";
      ctx.beginPath();
      ctx.moveTo(x, fuss);
      ctx.lineTo(x + it.b / 2, fuss - it.h);
      ctx.lineTo(x + it.b, fuss);
      ctx.fill();
    });
    // Nebelbänder treiben
    for (let i = 0; i < 4; i++) {
      const y = 120 + i * 60;
      const x = wrap(-t * (0.06 + i * 0.03) - kamX * 0.2, 1400) - 300;
      const g = ctx.createLinearGradient(x, 0, x + 900, 0);
      g.addColorStop(0, "rgba(235, 240, 248, 0)");
      g.addColorStop(0.5, "rgba(235, 240, 248, 0.35)");
      g.addColorStop(1, "rgba(235, 240, 248, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(x, y, 900, 50);
      ctx.fillRect(x - 1400, y, 900, 50);
    }
  },

  // ======================= HÖLLE =======================
  "hoelle-0"(ctx, t, kamX, kamY, W, H) {
    HINTERGRUND.hoelle(ctx, t, kamX, kamY, W, H, cache("hoelle", W));
    // Fledermäuse unter der Höhlendecke
    voegel(ctx, t * 1.6, kamX, 7, "rgba(25, 4, 6, 0.85)", 70);
  },
  // 5-2 Kettenbrücken: Lavafälle und eine finstere Burg
  "hoelle-1"(ctx, t, kamX, kamY, W, H) {
    const e = ex("hoelle-1", () => ({
      burg: schicht(0.04, 3, (x) => ({ x, b: 300, abst: 1400 })),
      faelle: schicht(0.12, 10, (x) => ({ x, b: zufall(30, 50), h: zufall(160, 240), abst: zufall(300, 600), seed: Math.random() })),
      ketten: schicht(0.3, 12, (x) => ({ x, b: zufall(220, 320), abst: zufall(200, 400), seed: Math.random() })),
      felsen: schicht(0.2, 40, (x) => ({ x, b: zufall(80, 170), h: zufall(60, 160), seed: Math.random(), abst: zufall(-20, 40) })),
    }));
    verlauf(ctx, H, W, [[0, "#1a0306"], [0.5, "#4a0c0c"], [1, "#b8381a"]]);
    // Burg auf einem Felsen
    parallax(ctx, e.burg, kamX, kamY, W, H, (x, basis) => {
      const fuss = basis - 190;
      ctx.fillStyle = "#1c0406";
      ctx.beginPath();
      ctx.moveTo(x - 40, fuss + 120);
      ctx.lineTo(x + 40, fuss);
      ctx.lineTo(x + 260, fuss);
      ctx.lineTo(x + 340, fuss + 120);
      ctx.fill();
      const turm = (tx, th, tb) => {
        ctx.fillStyle = "#14030a";
        ctx.fillRect(tx, fuss - th, tb, th);
        for (let i = 0; i < Math.floor(tb / 8); i++) if (i % 2 === 0) ctx.fillRect(tx + i * 8, fuss - th - 8, 8, 8);
        ctx.beginPath();
        ctx.moveTo(tx - 4, fuss - th - 8);
        ctx.lineTo(tx + tb / 2, fuss - th - 40);
        ctx.lineTo(tx + tb + 4, fuss - th - 8);
        ctx.fill();
        ctx.fillStyle = `rgba(255, 120, 40, ${0.6 + 0.3 * Math.sin(t / 300 + tx)})`;
        for (let k = 0; k < 3; k++) ctx.fillRect(tx + tb / 2 - 3, fuss - th + 14 + k * 22, 6, 10);
      };
      turm(x + 60, 130, 34);
      turm(x + 130, 180, 44);
      turm(x + 210, 110, 30);
      ctx.fillStyle = "#14030a";
      ctx.fillRect(x + 60, fuss - 70, 180, 70);
      glanz(ctx, x + 150, fuss - 100, 160, "rgba(255, 60, 30, A)", 0.18);
    });
    // Lavafälle
    parallax(ctx, e.faelle, kamX, kamY, W, H, (x, basis, it) => {
      const top = basis - 140 - it.h;
      ctx.fillStyle = "#2a0808";
      ctx.fillRect(x - 30, top - 20, it.b + 60, 26);
      const g = ctx.createLinearGradient(0, top, 0, top + it.h);
      g.addColorStop(0, "#ffdf70");
      g.addColorStop(0.5, "#ff7a2a");
      g.addColorStop(1, "#c2300e");
      ctx.fillStyle = g;
      ctx.fillRect(x, top, it.b, it.h);
      ctx.fillStyle = "rgba(255, 245, 170, 0.8)";
      for (let i = 0; i < 5; i++) ctx.fillRect(x + 3 + ((i * 9) % (it.b - 6)), top + wrap(t * 0.18 + i * 47 + it.seed * 90, it.h), 3, 18);
      glanz(ctx, x + it.b / 2, top + it.h, it.b * 2.2, "rgba(255, 120, 40, A)", 0.5);
    });
    parallax(ctx, e.felsen, kamX, kamY, W, H, (x, basis, it) => {
      const r = sr(it.seed);
      const fuss = basis - 90;
      ctx.fillStyle = "#300a09";
      ctx.beginPath();
      ctx.moveTo(x, fuss + 100);
      let px = x;
      while (px < x + it.b) {
        px += 12 + r() * 20;
        ctx.lineTo(Math.min(px, x + it.b), fuss - it.h * (0.4 + r() * 0.6));
      }
      ctx.lineTo(x + it.b, fuss + 100);
      ctx.fill();
    });
    // Ketten hängen zwischen den Felsen
    parallax(ctx, e.ketten, kamX, kamY, W, H, (x, basis, it) => {
      const y = basis - 260;
      ctx.strokeStyle = "rgba(255, 140, 60, 0.6)";
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + it.b / 2, y + 70 + Math.sin(t / 900 + it.seed * 6) * 6, x + it.b, y);
      ctx.stroke();
      ctx.setLineDash([]);
    });
    nebel(ctx, W, H, H * 0.5, "rgba(255, 90, 30, A)", 0.35 + 0.06 * Math.sin(t / 400));
  },
  // 5-3 Feuerregen: Aschewolken, ausbrechender Vulkan, Feuerbälle am Himmel
  "hoelle-2"(ctx, t, kamX, kamY, W, H) {
    const c = cache("hoelle", W);
    const e = ex("hoelle-2", () => ({ wolken: wolkenListe(9, 20, 180) }));
    verlauf(ctx, H, W, [[0, "#2a0a06"], [0.4, "#7a1a0c"], [0.75, "#d8501a"], [1, "#ff9a3a"]]);
    wolkenStreifen(ctx, t, kamX, e.wolken, "rgba(40, 14, 12, 0.75)", 0.01, 16);
    // Feuerbälle in der Ferne
    for (let i = 0; i < 6; i++) {
      const p = wrap(t / 2600 + i * 0.37, 1);
      const x = wrap(i * 190 + 600 - kamX * 0.03, W + 200) - 100 - p * 300;
      const y = -20 + p * 320;
      const g = ctx.createLinearGradient(x, y, x + 60, y - 70);
      g.addColorStop(0, "rgba(255, 220, 120, 0.9)");
      g.addColorStop(1, "rgba(255, 90, 30, 0)");
      ctx.strokeStyle = g;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 60, y - 70);
      ctx.stroke();
      glanz(ctx, x, y, 12, "rgba(255, 230, 150, A)", 0.9);
    }
    parallax(ctx, c.vulkane, kamX, kamY, W, H, (x, basis, it) => {
      const fuss = basis - 110;
      const top = fuss - it.h;
      ctx.fillStyle = "#1e0505";
      ctx.beginPath();
      ctx.moveTo(x - 60, fuss + 200);
      ctx.lineTo(x + it.b * 0.4, top);
      ctx.lineTo(x + it.b * 0.6, top);
      ctx.lineTo(x + it.b + 60, fuss + 200);
      ctx.fill();
      // Ausbruch: Lavafontäne
      const puls = 0.6 + 0.4 * Math.sin(t / 250 + it.seed * 10);
      glanz(ctx, x + it.b / 2, top, 120, "rgba(255, 150, 50, A)", puls * 0.8);
      ctx.fillStyle = "#ffcf5a";
      for (let i = 0; i < 8; i++) {
        const k = wrap(t / 900 + i / 8 + it.seed, 1);
        const vx = (i % 2 ? 1 : -1) * (20 + i * 9);
        kreis(ctx, x + it.b / 2 + vx * k * 2, top - 120 * k + 160 * k * k, 3.5 * (1 - k) + 1);
      }
    });
    nebel(ctx, W, H, H * 0.45, "rgba(255, 110, 40, A)", 0.38);
  },

  // ======================= HIMMEL =======================
  "himmel-0"(ctx, t, kamX, kamY, W, H) {
    HINTERGRUND.himmel(ctx, t, kamX, kamY, W, H, cache("himmel", W));
    voegel(ctx, t, kamX, 5, "rgba(80, 100, 140, 0.55)", 120);
  },
  // 6-2 Abendrot mit Wolkenschloss
  "himmel-1"(ctx, t, kamX, kamY, W, H) {
    const c = cache("himmel", W);
    const e = ex("himmel-1", () => ({ schloss: schicht(0.04, 3, (x) => ({ x, b: 280, abst: 1500 })) }));
    verlauf(ctx, H, W, [[0, "#3a2470"], [0.35, "#b04a8a"], [0.6, "#ff8a6a"], [0.85, "#ffc98a"], [1, "#ffe8c0"]]);
    sonne(ctx, 480, 330, 70, "#ff9a5a", "rgba(255, 170, 110, A)", 0.55);
    parallax(ctx, e.schloss, kamX, kamY, W, H, (x, basis) => {
      const fuss = basis - 280;
      wolkeRund(ctx, x - 40, fuss + 20, 360, 0.77, "rgba(255, 200, 210, 0.9)");
      const turm = (tx, th, tb, f) => {
        ctx.fillStyle = "#f6e6f0";
        ctx.fillRect(tx, fuss - th, tb, th);
        ctx.fillStyle = "#b47ab0";
        ctx.beginPath();
        ctx.moveTo(tx - 5, fuss - th);
        ctx.lineTo(tx + tb / 2, fuss - th - 34);
        ctx.lineTo(tx + tb + 5, fuss - th);
        ctx.fill();
        ctx.strokeStyle = "#6a3a6a";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(tx + tb / 2, fuss - th - 34);
        ctx.lineTo(tx + tb / 2, fuss - th - 52);
        ctx.stroke();
        ctx.fillStyle = f;
        ctx.beginPath();
        ctx.moveTo(tx + tb / 2, fuss - th - 52);
        ctx.lineTo(tx + tb / 2 + 14 + Math.sin(t / 200 + tx) * 2, fuss - th - 48);
        ctx.lineTo(tx + tb / 2, fuss - th - 44);
        ctx.fill();
        ctx.fillStyle = "rgba(255, 220, 140, 0.9)";
        ctx.fillRect(tx + tb / 2 - 3, fuss - th + 14, 6, 10);
      };
      ctx.fillStyle = "#f6e6f0";
      ctx.fillRect(x + 50, fuss - 60, 180, 60);
      turm(x + 40, 100, 30, "#e5566f");
      turm(x + 120, 150, 40, "#f5d97a");
      turm(x + 210, 90, 28, "#7fb8ff");
    });
    parallax(ctx, c.fern, kamX, kamY, W, H, (x, basis, it) => wolkeRund(ctx, x, basis - 250, it.b, it.seed, "rgba(255, 190, 200, 0.65)"));
    parallax(ctx, c.nah, kamX, kamY, W, H, (x, basis, it) => wolkeRund(ctx, x, basis - 150, it.b, it.seed, "rgba(255, 215, 200, 0.85)"));
    voegel(ctx, t, kamX, 6, "rgba(80, 30, 70, 0.6)", 100);
  },
  // 6-3 Gewitter
  "himmel-2"(ctx, t, kamX, kamY, W, H) {
    const c = cache("himmel", W);
    verlauf(ctx, H, W, [[0, "#141826"], [0.5, "#2c3346"], [1, "#55607a"]]);
    // Blitze in der Ferne
    const z = Math.floor(t / 2300);
    const k = (t % 2300) / 2300;
    if (k < 0.08) {
      const bx = 100 + ((z * 263) % 760);
      ctx.fillStyle = `rgba(200, 215, 255, ${0.3 * (1 - k / 0.08)})`;
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = `rgba(255, 250, 220, ${1 - k / 0.08})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(bx, 0);
      let y = 0;
      let x = bx;
      const r = sr(z * 0.137 + 0.01);
      while (y < 260) {
        y += 30;
        x += (r() - 0.5) * 50;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    parallax(ctx, c.fern, kamX, kamY, W, H, (x, basis, it) => wolkeRund(ctx, x, basis - 250, it.b, it.seed, "rgba(70, 78, 100, 0.9)"));
    parallax(ctx, c.inseln, kamX, kamY, W, H, (x, basis, it) => {
      const y = basis - 290 + it.y + Math.sin(t / 1600 + it.seed * 8) * 6;
      ctx.fillStyle = "#3a3440";
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + it.b, y);
      ctx.lineTo(x + it.b * 0.55, y + it.b * 0.45);
      ctx.fill();
      ctx.fillStyle = "#3e5a3a";
      ctx.fillRect(x - 3, y - 5, it.b + 6, 8);
    });
    parallax(ctx, c.nah, kamX, kamY, W, H, (x, basis, it) => wolkeRund(ctx, x, basis - 150, it.b, it.seed, "rgba(90, 98, 122, 0.92)"));
  },

  // ======================= MOND =======================
  "weltall-0"(ctx, t, kamX, kamY, W, H) {
    HINTERGRUND.weltall(ctx, t, kamX, kamY, W, H, cache("weltall", W));
    // Satellit zieht langsam vorbei und blinkt
    const sx = wrap(t * 0.012 - kamX * 0.01, W + 200) - 100;
    const sy = 60 + Math.sin(t / 9000) * 20;
    ctx.fillStyle = "#c8cede";
    ctx.fillRect(sx - 4, sy - 4, 8, 8);
    ctx.fillStyle = "#3a6ad0";
    ctx.fillRect(sx - 22, sy - 3, 15, 6);
    ctx.fillRect(sx + 7, sy - 3, 15, 6);
    if (Math.sin(t / 300) > 0.6) glanz(ctx, sx, sy - 6, 8, "rgba(255, 90, 90, A)", 0.9);
  },
  // 7-2 Mondbasis: große Kuppeln, Radar, Landefähre
  "weltall-1"(ctx, t, kamX, kamY, W, H) {
    HINTERGRUND.weltall(ctx, t, kamX, kamY, W, H, cache("weltall", W));
    const e = ex("weltall-1", () => ({ anlagen: schicht(0.22, 10, (x) => ({ x, b: 220, art: Math.floor(Math.random() * 3), abst: zufall(260, 520), seed: Math.random() })) }));
    parallax(ctx, e.anlagen, kamX, kamY, W, H, (x, basis, it) => {
      const fuss = basis - 196;
      if (it.art === 0) {
        // große Glaskuppel mit Pflanzen
        ctx.fillStyle = "#3a3d4e";
        ctx.fillRect(x, fuss - 6, 160, 10);
        const g = ctx.createRadialGradient(x + 80, fuss - 40, 10, x + 80, fuss - 20, 80);
        g.addColorStop(0, "rgba(160, 230, 255, 0.35)");
        g.addColorStop(1, "rgba(120, 180, 255, 0.12)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x + 80, fuss - 6, 74, Math.PI, 0);
        ctx.fill();
        ctx.strokeStyle = "rgba(200, 230, 255, 0.5)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "#3f9a5a";
        for (let i = 0; i < 5; i++) kreis(ctx, x + 40 + i * 20, fuss - 16 - (i % 2) * 8, 10);
      } else if (it.art === 1) {
        // Radarschüssel dreht sich
        ctx.fillStyle = "#4b4f63";
        ctx.fillRect(x + 60, fuss - 50, 6, 50);
        const w = Math.sin(t / 1500 + it.seed * 6) * 0.6;
        ctx.save();
        ctx.translate(x + 63, fuss - 54);
        ctx.rotate(w);
        ctx.fillStyle = "#c8cede";
        ctx.beginPath();
        ctx.ellipse(0, 0, 30, 12, 0, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = "#e5566f";
        kreis(ctx, 0, -14, 3);
        ctx.restore();
      } else {
        // Landefähre (eigene Form)
        ctx.strokeStyle = "#a0a6ba";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + 40, fuss);
        ctx.lineTo(x + 60, fuss - 30);
        ctx.moveTo(x + 120, fuss);
        ctx.lineTo(x + 100, fuss - 30);
        ctx.stroke();
        ctx.fillStyle = "#d9b44a";
        ctx.fillRect(x + 56, fuss - 46, 48, 20);
        ctx.fillStyle = "#cfd4e2";
        ctx.beginPath();
        ctx.moveTo(x + 62, fuss - 46);
        ctx.lineTo(x + 70, fuss - 76);
        ctx.lineTo(x + 90, fuss - 76);
        ctx.lineTo(x + 98, fuss - 46);
        ctx.fill();
        ctx.fillStyle = "#2a3a5a";
        ctx.fillRect(x + 74, fuss - 70, 12, 10);
      }
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = Math.sin(t / 250 + i + it.seed * 9) > 0.3 ? "#5ff7e4" : "#1f4a48";
        ctx.fillRect(x + 20 + i * 36, fuss + 2, 4, 3);
      }
    });
  },
  // 7-3 Meteoritenschauer: Nebel, Ringplanet, viele Sternschnuppen
  "weltall-2"(ctx, t, kamX, kamY, W, H) {
    const c = cache("weltall", W);
    verlauf(ctx, H, W, [[0, "#06010e"], [0.6, "#160828"], [1, "#2a0d2a"]]);
    // farbiger Nebel
    glanz(ctx, 300, 140, 260, "rgba(200, 60, 140, A)", 0.22);
    glanz(ctx, 620, 90, 220, "rgba(90, 80, 220, A)", 0.22);
    sterneMalen(ctx, c.sterne, t, true);
    // Ringplanet
    const px = 760;
    const py = 120;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-0.35);
    ctx.strokeStyle = "rgba(240, 200, 150, 0.6)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(0, 0, 80, 18, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
    const g = ctx.createLinearGradient(-44, -44, 44, 44);
    g.addColorStop(0, "#f0c890");
    g.addColorStop(1, "#8a4a3a");
    ctx.fillStyle = g;
    kreis(ctx, 0, 0, 44);
    ctx.fillStyle = "rgba(120, 60, 40, 0.35)";
    ctx.fillRect(-44, -8, 88, 6);
    ctx.fillRect(-44, 10, 88, 4);
    ctx.beginPath();
    ctx.ellipse(0, 0, 80, 18, 0, 0, Math.PI);
    ctx.stroke();
    ctx.restore();
    // Sternschnuppen-Regen
    for (let i = 0; i < 9; i++) {
      const p = wrap(t / 1700 + i * 0.113, 1);
      if (p > 0.35) continue;
      const k = p / 0.35;
      const sx = ((i * 137) % W) + 200 - k * 380;
      const sy = 10 + ((i * 53) % 120) + k * 200;
      ctx.strokeStyle = `rgba(255, 220, 190, ${1 - k})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + 50, sy - 26);
      ctx.stroke();
    }
    parallax(ctx, c.fern, kamX, kamY, W, H, (x, basis, it) => {
      const r2 = sr(it.seed);
      const fuss = basis - 120;
      ctx.fillStyle = "#1e1624";
      ctx.beginPath();
      ctx.moveTo(x - 20, fuss + 120);
      let p = x - 20;
      while (p < x + it.b + 20) {
        p += 20 + r2() * 30;
        ctx.lineTo(p, fuss - it.h * (0.3 + r2() * 0.7));
      }
      ctx.lineTo(x + it.b + 30, fuss + 120);
      ctx.fill();
    });
    parallax(ctx, c.nah, kamX, kamY, W, H, (x, basis, it) => {
      const fuss = basis - 80;
      ctx.fillStyle = "#2a2232";
      ctx.beginPath();
      ctx.ellipse(x + it.b / 2, fuss + 20, it.b / 2, it.h, 0, Math.PI, 0);
      ctx.fill();
      glanz(ctx, x + it.b / 2, fuss + 10, it.b * 0.4, "rgba(255, 120, 60, A)", 0.15);
    });
  },
};

export function zeichneKulisse(ctx, welt, t, kamX, kamY, W, H, v = 0) {
  const fn = SZENE[`${welt}-${v}`] || SZENE[`${welt}-0`];
  if (fn) fn(ctx, t, kamX, kamY, W, H);
  else HINTERGRUND.stadt(ctx, t, kamX, kamY, W, H, cache("stadt", W));
}

// ---------------------------------------------------------------------------
// Wetter vor der Szene
// ---------------------------------------------------------------------------
const tropfen = Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random(), v: 0.7 + Math.random() * 0.6, l: 8 + Math.random() * 10 }));
function regenMalen(ctx, t, kamX, W, H, farbe, n, schraeg = 0.25, tempo = 0.9) {
  ctx.strokeStyle = farbe;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (const p of tropfen.slice(0, n)) {
    const y = wrap(p.y * (H + 40) + t * tempo * p.v, H + 40) - 20;
    const x = wrap(p.x * W - kamX * 0.6 * p.v - y * schraeg, W);
    ctx.moveTo(x, y);
    ctx.lineTo(x - p.l * schraeg, y - p.l);
  }
  ctx.stroke();
}
export function zeichneWetterKulisse(ctx, welt, t, kamX, W, H, v = 0) {
  // Grundwetter der Welt (Schnee, Glut, Glühwürmchen, Funkeln)
  if (!(welt === "eis" && v === 1)) zeichneWetter(ctx, welt, t, kamX, W, H);
  if (welt === "stadt" && v === 2) regenMalen(ctx, t, kamX, W, H, "rgba(170, 190, 255, 0.35)", 120);
  if (welt === "himmel" && v === 2) regenMalen(ctx, t, kamX, W, H, "rgba(200, 215, 255, 0.4)", 140, 0.35, 1.1);
  if (welt === "eis" && v === 2) {
    // Schneesturm: dichte, schräge Flocken und Nebel
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    for (const p of tropfen) {
      const y = wrap(p.y * (H + 40) + t * 0.12 * p.v, H + 40) - 20;
      const x = wrap(p.x * W - t * 0.5 * p.v - kamX * 0.8 * p.v, W);
      ctx.fillRect(x, y, 2.2 * p.v, 1.6);
    }
    ctx.fillStyle = "rgba(225, 232, 242, 0.16)";
    ctx.fillRect(0, 0, W, H);
  }
  if (welt === "dschungel" && v === 2) {
    // viele Glühwürmchen
    for (let i = 0; i < 40; i++) {
      const a = Math.max(0, Math.sin(t / 500 + i * 1.9));
      if (a < 0.15) continue;
      const x = wrap(i * 97 + Math.sin(t / 1800 + i) * 40 - kamX * (0.2 + (i % 3) * 0.15), W);
      const y = 80 + ((i * 61) % 320) + Math.cos(t / 1300 + i) * 18;
      glanz(ctx, x, y, 8, "rgba(220, 255, 120, A)", a * 0.9);
    }
  }
  if (welt === "hoelle" && v === 2) {
    // Ascheregen
    ctx.fillStyle = "rgba(60, 40, 40, 0.5)";
    for (const p of tropfen.slice(0, 80)) {
      const y = wrap(p.y * (H + 20) + t * 0.04 * p.v, H + 20) - 10;
      const x = wrap(p.x * W + Math.sin(t / 700 + p.x * 9) * 20 - kamX * 0.5 * p.v, W);
      ctx.fillRect(x, y, 2, 2);
    }
  }
  if (welt === "strand" && v === 1) {
    // Gischt: ein paar helle Tröpfchen
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    for (let i = 0; i < 10; i++) {
      const x = wrap(i * 113 - kamX * 0.9 + Math.sin(t / 600 + i) * 10, W);
      const y = H - 40 - ((t * 0.02 + i * 37) % 120);
      kreis(ctx, x, y, 1.6);
    }
  }
}
