// Katzen-Schachfiguren mit Licht und Schatten (wirken plastisch) und kleinen Bewegungen:
// atmen, blinzeln, Schwanz wedeln, Ohr zucken. Alles selbst gezeichnet, gerechnet in einem
// 100 × 100 großen Feld und dann auf die echte Feldgröße skaliert.

const FARBEN = {
  w: { hell: "#ffe2b8", mitte: "#f2ad66", dunkel: "#c2702c", brust: "#fff4e6", streifen: "rgba(196, 104, 40, 0.55)", auge: "#5cc46e", augeDunkel: "#1d4a24", rand: "rgba(90, 44, 14, 0.55)", glanz: "rgba(255,255,255,0.0)" },
  b: { hell: "#6b6380", mitte: "#2f2a39", dunkel: "#131118", brust: "#3b3548", streifen: null, auge: "#ffd447", augeDunkel: "#8a5a00", rand: "rgba(0,0,0,0.6)", glanz: "rgba(190, 176, 230, 0.55)" },
};
const GROESSE = { K: 1, Q: 0.97, R: 0.94, B: 0.93, N: 0.93, P: 0.8 };

function kugel(ctx, cx, cy, r, f, ry = r) {
  // Radialer Verlauf von oben links: wirkt wie eine beleuchtete Kugel
  const g = ctx.createRadialGradient(cx - r * 0.35, cy - ry * 0.45, r * 0.08, cx, cy, Math.max(r, ry) * 1.12);
  g.addColorStop(0, f.hell);
  g.addColorStop(0.55, f.mitte);
  g.addColorStop(1, f.dunkel);
  return g;
}

function ellipse(ctx, x, y, rx, ry, fill) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

// Randlicht auf der linken Seite (wichtig bei den schwarzen Katzen)
function randlicht(ctx, x, y, rx, ry, f) {
  if (!f.glanz || f.glanz.endsWith("0.0)")) return;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, Math.PI * 0.75, Math.PI * 1.45);
  ctx.strokeStyle = f.glanz;
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.restore();
}

function ohr(ctx, seite, f, zucken) {
  ctx.save();
  ctx.translate(50 + seite * 13, 30);
  ctx.rotate(seite * (0.12 + zucken));
  const g = ctx.createLinearGradient(0, -20, 0, 6);
  g.addColorStop(0, f.hell);
  g.addColorStop(1, f.dunkel);
  ctx.beginPath();
  ctx.moveTo(-8 * seite, 6);
  ctx.quadraticCurveTo(-4 * seite, -14, 2 * seite, -20);
  ctx.quadraticCurveTo(8 * seite, -6, 10 * seite, 6);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-4 * seite, 4);
  ctx.quadraticCurveTo(-1 * seite, -9, 2 * seite, -13);
  ctx.quadraticCurveTo(6 * seite, -3, 6 * seite, 4);
  ctx.closePath();
  ctx.fillStyle = "rgba(240, 140, 160, 0.85)";
  ctx.fill();
  ctx.restore();
}

function auge(ctx, x, y, f, zu, gross) {
  if (zu) {
    ctx.beginPath();
    ctx.moveTo(x - 5, y);
    ctx.quadraticCurveTo(x, y + 3, x + 5, y);
    ctx.strokeStyle = "#1a1410";
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    ctx.stroke();
    return;
  }
  const rx = 5.2 * gross;
  const ry = 6 * gross;
  const g = ctx.createRadialGradient(x - 1.5, y - 2, 0.5, x, y, ry);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.25, f.auge);
  g.addColorStop(1, f.augeDunkel);
  ellipse(ctx, x, y, rx + 1, ry + 1, "#120e0c");
  ellipse(ctx, x, y, rx, ry, g);
  ellipse(ctx, x, y + 0.5, 1.6 * gross, 4.6 * gross, "#0b0907");
  ellipse(ctx, x - 1.8 * gross, y - 2.4 * gross, 1.5 * gross, 1.5 * gross, "rgba(255,255,255,0.95)");
}

function schwanz(ctx, f, winkel) {
  ctx.save();
  ctx.translate(68, 86);
  ctx.rotate(winkel);
  const g = ctx.createLinearGradient(0, 0, 22, -36);
  g.addColorStop(0, f.mitte);
  g.addColorStop(1, f.dunkel);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(22, -2, 26, -22, 14, -34);
  ctx.strokeStyle = g;
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.restore();
}

// ---------- Zubehör ----------
function gold(ctx, y0, y1) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, "#fff4b0");
  g.addColorStop(0.45, "#f4bd3a");
  g.addColorStop(1, "#a8700e");
  return g;
}

function krone(ctx) {
  ctx.beginPath();
  ctx.moveTo(34, 26);
  ctx.lineTo(33, 10);
  ctx.lineTo(41, 18);
  ctx.lineTo(50, 4);
  ctx.lineTo(59, 18);
  ctx.lineTo(67, 10);
  ctx.lineTo(66, 26);
  ctx.closePath();
  ctx.fillStyle = gold(ctx, 4, 26);
  ctx.fill();
  ctx.strokeStyle = "rgba(110, 70, 6, 0.8)";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ellipse(ctx, 50, 21, 2.8, 2.8, "#e23b52");
  ellipse(ctx, 41, 22, 2, 2, "#3b8cf0");
  ellipse(ctx, 59, 22, 2, 2, "#3b8cf0");
  ellipse(ctx, 49.2, 20, 0.9, 0.9, "rgba(255,255,255,0.9)");
  // Kreuz oben
  ctx.fillStyle = gold(ctx, -4, 6);
  ctx.fillRect(48.6, -4, 2.8, 9);
  ctx.fillRect(46, -1, 8, 2.6);
}

function diadem(ctx) {
  ctx.beginPath();
  ctx.moveTo(35, 25);
  ctx.quadraticCurveTo(50, 17, 65, 25);
  ctx.lineTo(63, 28);
  ctx.quadraticCurveTo(50, 21, 37, 28);
  ctx.closePath();
  ctx.fillStyle = gold(ctx, 17, 28);
  ctx.fill();
  [[40, 18, 2.2], [50, 11, 3.4], [60, 18, 2.2]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.moveTo(x - r, 23);
    ctx.lineTo(x, y);
    ctx.lineTo(x + r, 23);
    ctx.fillStyle = gold(ctx, y, 23);
    ctx.fill();
    ellipse(ctx, x, y - 1, r * 0.7, r * 0.7, "#f4f2ff");
    ellipse(ctx, x - 0.4, y - 1.5, r * 0.25, r * 0.25, "#ffffff");
  });
  ellipse(ctx, 50, 21, 2.4, 2.4, "#c43cf0");
}

function zauberhut(ctx, wackeln) {
  ctx.save();
  ctx.translate(50, 26);
  ctx.rotate(wackeln * 0.5);
  const g = ctx.createLinearGradient(-16, 0, 16, 0);
  g.addColorStop(0, "#6f8cff");
  g.addColorStop(0.5, "#3a55d6");
  g.addColorStop(1, "#1f2c86");
  ctx.beginPath();
  ctx.moveTo(-15, 0);
  ctx.quadraticCurveTo(-4, -18, 6, -34);
  ctx.quadraticCurveTo(9, -16, 15, 0);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  ellipse(ctx, 0, 0, 21, 5, g);
  ellipse(ctx, 0, -1.5, 15, 2.2, "rgba(255,255,255,0.12)");
  ctx.fillStyle = "#ffe066";
  [[-3, -10, 2.4], [5, -20, 1.8], [-6, -3, 1.5]].forEach(([x, y, r]) => {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const w = (i * Math.PI) / 5 - Math.PI / 2;
      const rr = i % 2 ? r * 0.45 : r;
      ctx.lineTo(x + Math.cos(w) * rr, y + Math.sin(w) * rr);
    }
    ctx.fill();
  });
  ctx.restore();
}

function helm(ctx, wackeln) {
  // Ritterhelm mit Federbusch (Springer = Ritter)
  ctx.save();
  ctx.translate(54, 8);
  ctx.rotate(wackeln * 0.6);
  const fg = ctx.createLinearGradient(0, 0, 20, -14);
  fg.addColorStop(0, "#ff6b6b");
  fg.addColorStop(1, "#b5182c");
  ctx.beginPath();
  ctx.moveTo(-2, 6);
  ctx.bezierCurveTo(4, -12, 20, -14, 26, -4);
  ctx.bezierCurveTo(16, -6, 8, 0, 4, 8);
  ctx.closePath();
  ctx.fillStyle = fg;
  ctx.fill();
  ctx.restore();
  const g = ctx.createRadialGradient(42, 16, 2, 50, 26, 26);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.4, "#c9ced8");
  g.addColorStop(1, "#5b6170");
  ctx.beginPath();
  ctx.moveTo(27, 36);
  ctx.bezierCurveTo(27, 8, 73, 8, 73, 36);
  ctx.lineTo(73, 37);
  ctx.quadraticCurveTo(50, 31, 27, 37);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = "rgba(40, 44, 54, 0.6)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "rgba(40, 44, 54, 0.55)";
  ctx.fillRect(49, 12, 2, 20); // Mittelgrat
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillRect(36, 18, 2, 10);
}

function kartonHinten(ctx) {
  ctx.beginPath();
  ctx.moveTo(24, 62);
  ctx.lineTo(76, 62);
  ctx.lineTo(84, 55);
  ctx.lineTo(32, 55);
  ctx.closePath();
  ctx.fillStyle = "#5a3a1c";
  ctx.fill();
}

function kartonVorne(ctx) {
  // Seite (Tiefe), Vorderseite, Klappen
  ctx.beginPath();
  ctx.moveTo(76, 62);
  ctx.lineTo(84, 55);
  ctx.lineTo(84, 88);
  ctx.lineTo(76, 96);
  ctx.closePath();
  ctx.fillStyle = "#9a6630";
  ctx.fill();
  const g = ctx.createLinearGradient(24, 62, 76, 96);
  g.addColorStop(0, "#e6b47a");
  g.addColorStop(1, "#b9803f");
  ctx.fillStyle = g;
  ctx.fillRect(24, 62, 52, 34);
  ctx.fillStyle = "rgba(255, 236, 200, 0.55)";
  ctx.fillRect(24, 62, 52, 2);
  ctx.fillStyle = "rgba(120, 76, 30, 0.45)";
  ctx.fillRect(42, 74, 16, 3); // Klebeband
  ctx.fillStyle = "rgba(90, 56, 20, 0.5)";
  ctx.fillRect(24, 94, 52, 2);
  // Klappen
  const klappe = (a, b, c, d, farbe) => {
    ctx.beginPath();
    ctx.moveTo(...a);
    ctx.lineTo(...b);
    ctx.lineTo(...c);
    ctx.lineTo(...d);
    ctx.closePath();
    ctx.fillStyle = farbe;
    ctx.fill();
  };
  klappe([24, 62], [12, 52], [18, 46], [32, 55], "#d9a465");
  klappe([76, 62], [90, 54], [92, 47], [84, 55], "#c58d4e");
}

function halsband(ctx) {
  ctx.beginPath();
  ctx.ellipse(50, 60, 14, 4, 0, 0, Math.PI);
  ctx.strokeStyle = "#e23b52";
  ctx.lineWidth = 3;
  ctx.stroke();
  ellipse(ctx, 50, 65, 3.2, 3.2, gold(ctx, 62, 68));
  ellipse(ctx, 49, 64, 1, 1, "rgba(255,255,255,0.9)");
}

// ---------- Katze ----------
export function zeichneKatze(ctx, p, x, y, Z, t, seed) {
  const weiss = p === p.toUpperCase();
  const f = FARBEN[weiss ? "w" : "b"];
  const typ = p.toUpperCase();
  const g = GROESSE[typ];
  const atem = 1 + 0.025 * Math.sin(t / 620 + seed * 6.28);
  const blinzeln = (t + seed * 5000) % 4300 < 130;
  const schwanzWinkel = Math.sin(t / 720 + seed * 3) * 0.35 - 0.1;
  const zucken = (t + seed * 7000) % 6100 < 180 ? 0.18 : 0;
  const neigen = Math.sin(t / 1400 + seed * 2) * 0.035;
  const hutWackeln = Math.sin(t / 900 + seed * 4) * 0.08;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(Z / 100, Z / 100);
  // Bodenschatten (bleibt flach)
  ellipse(ctx, 50, 94, 30 * g, 6, "rgba(0, 0, 0, 0.28)");
  // ganze Figur um die Fußmitte skalieren
  ctx.translate(50, 96);
  ctx.scale(g, g);
  ctx.translate(-50, -96);

  if (typ === "R") kartonHinten(ctx);
  if (typ !== "R") schwanz(ctx, f, schwanzWinkel);

  // Körper (atmet)
  ctx.save();
  ctx.translate(50, 94);
  ctx.scale(1, atem);
  ctx.translate(-50, -94);
  ellipse(ctx, 50, 72, 24, 22, kugel(ctx, 50, 72, 24, f, 22));
  ellipse(ctx, 50, 75, 12, 15, f.brust);
  if (f.streifen) {
    ctx.strokeStyle = f.streifen;
    ctx.lineWidth = 2.6;
    ctx.lineCap = "round";
    [[30, 66, 36, 72], [70, 66, 64, 72], [29, 76, 35, 80], [71, 76, 65, 80]].forEach(([a, b, c, d]) => {
      ctx.beginPath();
      ctx.moveTo(a, b);
      ctx.lineTo(c, d);
      ctx.stroke();
    });
  }
  randlicht(ctx, 50, 72, 24, 22, f);
  // Pfoten
  ellipse(ctx, 40, 91, 7.5, 4.8, kugel(ctx, 40, 91, 7.5, { ...f, hell: f.brust }, 4.8));
  ellipse(ctx, 60, 91, 7.5, 4.8, kugel(ctx, 60, 91, 7.5, { ...f, hell: f.brust }, 4.8));
  ctx.restore();

  // Kopf (leicht geneigt, bewegt sich mit dem Atmen)
  const kopfY = 94 - (94 - 42) * atem;
  ctx.save();
  ctx.translate(50, kopfY + 22);
  ctx.rotate(neigen);
  ctx.translate(-50, -(42 + 22));
  ohr(ctx, -1, f, zucken);
  ohr(ctx, 1, f, 0);
  ellipse(ctx, 50, 42, 23, 21, kugel(ctx, 50, 42, 23, f, 21));
  ellipse(ctx, 50, 51, 12, 8, f.brust);
  if (f.streifen) {
    ctx.strokeStyle = f.streifen;
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    [[44, 24, 45, 31], [50, 22, 50, 30], [56, 24, 55, 31]].forEach(([a, b, c, d]) => {
      ctx.beginPath();
      ctx.moveTo(a, b);
      ctx.lineTo(c, d);
      ctx.stroke();
    });
  }
  randlicht(ctx, 50, 42, 23, 21, f);
  const augeGross = typ === "P" ? 1.15 : 1;
  auge(ctx, 41, 42, f, blinzeln, augeGross);
  auge(ctx, 59, 42, f, blinzeln, augeGross);
  // Nase, Mund, Schnurrhaare
  ctx.beginPath();
  ctx.moveTo(47.5, 48.5);
  ctx.lineTo(52.5, 48.5);
  ctx.lineTo(50, 51.5);
  ctx.closePath();
  ctx.fillStyle = "#ef7f98";
  ctx.fill();
  ctx.strokeStyle = weiss ? "rgba(90, 44, 14, 0.7)" : "rgba(220, 210, 240, 0.5)";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(50, 51.5);
  ctx.quadraticCurveTo(47, 55, 44.5, 53);
  ctx.moveTo(50, 51.5);
  ctx.quadraticCurveTo(53, 55, 55.5, 53);
  ctx.stroke();
  ctx.strokeStyle = weiss ? "rgba(255,255,255,0.85)" : "rgba(230, 224, 245, 0.55)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  [-1, 1].forEach((s) => {
    ctx.moveTo(50 + s * 8, 50);
    ctx.lineTo(50 + s * 24, 47);
    ctx.moveTo(50 + s * 8, 52);
    ctx.lineTo(50 + s * 24, 53);
    ctx.moveTo(50 + s * 8, 54);
    ctx.lineTo(50 + s * 22, 58);
  });
  ctx.stroke();
  // Kopfschmuck
  if (typ === "K") krone(ctx);
  else if (typ === "Q") diadem(ctx);
  else if (typ === "B") zauberhut(ctx, hutWackeln);
  else if (typ === "N") helm(ctx, hutWackeln);
  ctx.restore();

  if (typ === "R") kartonVorne(ctx);
  if (typ === "P") halsband(ctx);
  ctx.restore();
}
