// Katzen-Schachfiguren mit Licht und Schatten (wirken plastisch) und kleinen Bewegungen:
// atmen, blinzeln, Schwanz wedeln, Ohr zucken. Alles selbst gezeichnet, gerechnet in einem
// 100 × 100 großen Feld und dann auf die echte Feldgröße skaliert.

const FARBEN = {
  w: { hell: "#fff0d9", mitte: "#ffc485", dunkel: "#e38d48", brust: "#fffaf2", streifen: "rgba(222, 128, 60, 0.45)", auge: "#7fd88e", augeDunkel: "#1f6b34", rand: "rgba(90, 44, 14, 0.55)", glanz: "rgba(255,255,255,0.0)", mund: "rgba(120, 60, 30, 0.75)", barthaar: "rgba(255,255,255,0.9)" },
  b: { hell: "#7f7896", mitte: "#3e3850", dunkel: "#1b1823", brust: "#4a4459", streifen: null, auge: "#ffd65c", augeDunkel: "#9a6200", rand: "rgba(0,0,0,0.6)", glanz: "rgba(200, 188, 240, 0.55)", mund: "rgba(230, 220, 250, 0.6)", barthaar: "rgba(230, 224, 245, 0.55)" },
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
  ctx.translate(50 + seite * 15, 31);
  ctx.rotate(seite * (0.22 + zucken));
  ctx.scale(0.95, 0.85);
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
    // zufrieden zugekniffen: kleiner Bogen nach oben
    ctx.beginPath();
    ctx.moveTo(x - 5.5, y + 1.5);
    ctx.quadraticCurveTo(x, y - 4, x + 5.5, y + 1.5);
    ctx.strokeStyle = "#1a1410";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.stroke();
    return;
  }
  const rx = 6.4 * gross;
  const ry = 7.4 * gross;
  const g = ctx.createRadialGradient(x, y + ry * 0.4, 0.5, x, y, ry);
  g.addColorStop(0, f.auge);
  g.addColorStop(1, f.augeDunkel);
  ellipse(ctx, x, y, rx + 1.1, ry + 1.1, "#140f0c");
  ellipse(ctx, x, y, rx, ry, g);
  ellipse(ctx, x, y + 0.6, 4.1 * gross, 5.2 * gross, "#120d0b");
  ellipse(ctx, x - 2.1 * gross, y - 2.8 * gross, 2.5 * gross, 2.5 * gross, "#ffffff");
  ellipse(ctx, x + 2.3 * gross, y + 2.5 * gross, 1.1 * gross, 1.1 * gross, "rgba(255,255,255,0.9)");
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
  ctx.ellipse(50, 66.5, 13, 3.6, 0, 0, Math.PI);
  ctx.strokeStyle = "#e23b52";
  ctx.lineWidth = 3;
  ctx.stroke();
  ellipse(ctx, 50, 71, 3.4, 3.4, gold(ctx, 68, 74));
  ellipse(ctx, 48.9, 69.9, 1.1, 1.1, "rgba(255,255,255,0.9)");
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

  // Karton etwas flacher, damit das runde Kinn herausschaut
  const karton = (fn) => {
    ctx.save();
    ctx.translate(50, 96);
    ctx.scale(1, 0.84);
    ctx.translate(-50, -96);
    fn(ctx);
    ctx.restore();
  };
  if (typ === "R") karton(kartonHinten);
  if (typ !== "R") schwanz(ctx, f, schwanzWinkel);

  // Körper (atmet) – klein und rund
  ctx.save();
  ctx.translate(50, 94);
  ctx.scale(1, atem);
  ctx.translate(-50, -94);
  ellipse(ctx, 50, 79, 20, 16, kugel(ctx, 50, 79, 20, f, 16));
  ellipse(ctx, 50, 81, 10, 11, f.brust);
  randlicht(ctx, 50, 79, 20, 16, f);
  // Pfötchen mit rosa Ballen
  [41, 59].forEach((px) => {
    ellipse(ctx, px, 92, 6.5, 4.6, kugel(ctx, px, 92, 6.5, { ...f, hell: f.brust }, 4.6));
    ellipse(ctx, px, 93, 2, 1.4, "rgba(245, 150, 170, 0.9)");
    [-2.8, 0, 2.8].forEach((d) => ellipse(ctx, px + d, 90.6, 0.9, 0.8, "rgba(245, 150, 170, 0.9)"));
  });
  ctx.restore();

  // Kopf: groß, rund, leicht geneigt, bewegt sich mit dem Atmen
  const kopfY = 94 - (94 - 44) * atem;
  ctx.save();
  ctx.translate(50, kopfY + 24);
  ctx.rotate(neigen);
  ctx.translate(-50, -(44 + 24));
  ohr(ctx, -1, f, zucken);
  ohr(ctx, 1, f, 0);
  ellipse(ctx, 50, 45, 27, 23.5, kugel(ctx, 50, 45, 27, f, 23.5));
  // helle Schnauze und Bäckchen
  ellipse(ctx, 50, 56, 10, 6.5, f.brust);
  if (f.streifen) {
    ctx.strokeStyle = f.streifen;
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    [[45, 25, 46, 30], [50, 23.5, 50, 29], [55, 25, 54, 30]].forEach(([a, b, c, d]) => {
      ctx.beginPath();
      ctx.moveTo(a, b);
      ctx.lineTo(c, d);
      ctx.stroke();
    });
  }
  randlicht(ctx, 50, 45, 27, 23.5, f);
  ellipse(ctx, 32, 56, 5, 3.2, "rgba(255, 120, 150, 0.38)");
  ellipse(ctx, 68, 56, 5, 3.2, "rgba(255, 120, 150, 0.38)");
  const augeGross = typ === "P" ? 1.12 : 1;
  auge(ctx, 39.5, 47, f, blinzeln, augeGross);
  auge(ctx, 60.5, 47, f, blinzeln, augeGross);
  // kleine Herz-Nase und „w“-Mündchen
  ctx.beginPath();
  ctx.moveTo(50, 55.6);
  ctx.bezierCurveTo(47, 53.5, 47.4, 51.8, 48.8, 52);
  ctx.quadraticCurveTo(50, 52.3, 50, 53.2);
  ctx.quadraticCurveTo(50, 52.3, 51.2, 52);
  ctx.bezierCurveTo(52.6, 51.8, 53, 53.5, 50, 55.6);
  ctx.fillStyle = "#f2869e";
  ctx.fill();
  ctx.strokeStyle = f.mund;
  ctx.lineWidth = 1.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(50, 55.6);
  ctx.quadraticCurveTo(48.4, 58.6, 46.4, 57);
  ctx.moveTo(50, 55.6);
  ctx.quadraticCurveTo(51.6, 58.6, 53.6, 57);
  ctx.stroke();
  // nur zwei kurze Schnurrhaare je Seite
  ctx.strokeStyle = f.barthaar;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  [-1, 1].forEach((s) => {
    ctx.moveTo(50 + s * 13, 54);
    ctx.lineTo(50 + s * 25, 52);
    ctx.moveTo(50 + s * 13, 56.5);
    ctx.lineTo(50 + s * 24, 58);
  });
  ctx.stroke();
  // Kopfschmuck
  if (typ === "K") krone(ctx);
  else if (typ === "Q") diadem(ctx);
  else if (typ === "B") zauberhut(ctx, hutWackeln);
  else if (typ === "N") helm(ctx, hutWackeln);
  ctx.restore();

  if (typ === "R") karton(kartonVorne);
  if (typ === "P") halsband(ctx);
  ctx.restore();
}
