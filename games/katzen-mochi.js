// Mochi-Katzen: kugelrunde Katzen (Kopf = Körper), kleine glänzende Knopfaugen,
// ω-Mündchen, rosa Bäckchen, viele Fellmuster. Weich schattiert und wabbelig animiert.
// Eigene Zeichnung in einem 100 × 100-Feld.
import { krone, diadem, schleife, zauberhut, helm, karton, funkeln } from "./katzen-anime.js";

// Fell je Seite und Figur. Weiß = helle Katzen, Schwarz = dunkle Katzen
const FELL = {
  w: {
    K: { basis: "#ffffff", schatten: "#e3dfea", flausch: true },
    Q: { basis: "#fffaf4", schatten: "#eadfd4", flecken: [[30, 42, 19, 15, "#f2a25c", -0.3], [72, 47, 14, 12, "#6b4a3a", 0.4]], ohren: ["#f2a25c", "#6b4a3a"] },
    R: { basis: "#ffffff", schatten: "#e4e0ec", flecken: [[50, 33, 40, 15, "#b8a5e6", 0]], ohren: ["#b8a5e6", "#b8a5e6"] },
    B: { basis: "#ffffff", schatten: "#e3e3ea", flecken: [[38, 38, 22, 13, "#a9adb8", -0.25], [76, 64, 10, 9, "#a9adb8", 0]], ohren: ["#a9adb8", "#ffffff"] },
    N: { basis: "#f5d9ab", schatten: "#e3bf88", streifen: "#d39f63", ohren: ["#f5d9ab", "#f5d9ab"] },
    P: { basis: "#ffffff", schatten: "#e6e2ec", flecken: [[67, 41, 12, 9, "#f2b06c", 0.3]], ohren: ["#ffffff", "#f2b06c"] },
  },
  b: {
    K: { basis: "#302a37", schatten: "#1c1821", flausch: true },
    Q: { basis: "#3a302e", schatten: "#241d1c", flecken: [[30, 42, 18, 14, "#8a5a3a", -0.3], [74, 42, 12, 9, "#1a1414", 0.4]], ohren: ["#8a5a3a", "#3a302e"] },
    R: { basis: "#4b4654", schatten: "#33303b", flecken: [[50, 33, 40, 15, "#2a2630", 0]], ohren: ["#2a2630", "#2a2630"] },
    B: { basis: "#2c2831", schatten: "#1b181f", flecken: [[50, 76, 19, 13, "#f3f1f6", 0]], ohren: ["#2c2831", "#2c2831"] },
    N: { basis: "#5b4737", schatten: "#3e2f24", streifen: "#36271d", ohren: ["#5b4737", "#5b4737"] },
    P: { basis: "#302a37", schatten: "#1c1821", ohren: ["#302a37", "#302a37"] },
  },
};
const GROESSE = { K: 0.98, Q: 0.95, R: 0.93, B: 0.93, N: 0.93, P: 0.8 };

// runde „Mochi“-Form als Superellipse, unten etwas flacher; flausch = zackiger Fellrand
function blob(ctx, flausch) {
  const n = 2.5;
  const N = flausch ? 60 : 64;
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const w = (i / N) * Math.PI * 2;
    const c = Math.cos(w);
    const s = Math.sin(w);
    let rx = 34;
    let ry = s > 0 ? 30 : 31;
    if (flausch && i % 2) {
      rx += 1.9;
      ry += 1.9;
    }
    const x = 50 + rx * Math.sign(c) * Math.abs(c) ** (2 / n);
    const y = 63 + ry * Math.sign(s) * Math.abs(s) ** (2 / n);
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.closePath();
}

function ell(ctx, x, y, rx, ry, farbe, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.fillStyle = farbe;
  ctx.fill();
}

function linie(ctx, farbe, breite, fn) {
  ctx.strokeStyle = farbe;
  ctx.lineWidth = breite;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  fn();
  ctx.stroke();
}

function ohr(ctx, seite, farbe, rand, zucken) {
  ctx.save();
  ctx.translate(50 + seite * 22, 39);
  ctx.rotate(seite * (0.35 + zucken));
  const aussen = () => {
    ctx.beginPath();
    ctx.moveTo(-9, 6);
    ctx.quadraticCurveTo(-7, -9, 0, -15);
    ctx.quadraticCurveTo(7, -9, 9, 6);
    ctx.closePath();
  };
  aussen();
  ctx.fillStyle = farbe;
  ctx.fill();
  ctx.strokeStyle = rand;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-5, 5);
  ctx.quadraticCurveTo(-4, -5, 0, -9);
  ctx.quadraticCurveTo(4, -5, 5, 5);
  ctx.closePath();
  ctx.fillStyle = "rgba(255, 160, 180, 0.9)";
  ctx.fill();
  ctx.restore();
}

// Ausdruck: normal · zu (– –) · froh (^ ^) · kneif (> <)
function augen(ctx, ausdruck, dunkel, gr) {
  const farbe = dunkel ? "#0c0a0e" : "#2a1f1c";
  [-1, 1].forEach((s) => {
    const x = 50 + s * 14;
    const y = 62;
    if (ausdruck === "zu") {
      linie(ctx, dunkel ? "#d9d2e4" : farbe, 2, () => {
        ctx.moveTo(x - 4, y);
        ctx.lineTo(x + 4, y);
      });
    } else if (ausdruck === "froh") {
      linie(ctx, dunkel ? "#d9d2e4" : farbe, 2, () => {
        ctx.moveTo(x - 4.2, y + 1.8);
        ctx.lineTo(x, y - 2.2);
        ctx.lineTo(x + 4.2, y + 1.8);
      });
    } else if (ausdruck === "kneif") {
      linie(ctx, dunkel ? "#d9d2e4" : farbe, 2, () => {
        ctx.moveTo(x - s * 4, y - 3);
        ctx.lineTo(x + s * 3, y);
        ctx.lineTo(x - s * 4, y + 3);
      });
    } else {
      if (dunkel) ell(ctx, x, y, 4.4 * gr, 5 * gr, "rgba(190, 180, 210, 0.45)");
      ell(ctx, x, y, 3.5 * gr, 4.1 * gr, farbe);
      ell(ctx, x - 1.2 * gr, y - 1.5 * gr, 1.3 * gr, 1.3 * gr, "#ffffff");
      ell(ctx, x + 1.3 * gr, y + 1.5 * gr, 0.6 * gr, 0.6 * gr, "rgba(255,255,255,0.85)");
    }
  });
}

function mund(ctx, offen, dunkel) {
  const farbe = dunkel ? "#d9d2e4" : "#4a3430";
  // Näschen
  ctx.beginPath();
  ctx.moveTo(48.6, 66);
  ctx.lineTo(51.4, 66);
  ctx.lineTo(50, 67.6);
  ctx.closePath();
  ctx.fillStyle = "#f58fa8";
  ctx.fill();
  if (offen) {
    ctx.beginPath();
    ctx.moveTo(46.8, 68.6);
    ctx.quadraticCurveTo(50, 67.6, 53.2, 68.6);
    ctx.quadraticCurveTo(53, 74.5, 50, 74.6);
    ctx.quadraticCurveTo(47, 74.5, 46.8, 68.6);
    ctx.closePath();
    ctx.fillStyle = "#b8344f";
    ctx.fill();
    ell(ctx, 50, 72.6, 2.4, 1.6, "#ff8ea7");
    ctx.strokeStyle = farbe;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  } else {
    linie(ctx, farbe, 1.5, () => {
      ctx.moveTo(45.6, 68.4);
      ctx.quadraticCurveTo(47.8, 71.2, 50, 68.8);
      ctx.quadraticCurveTo(52.2, 71.2, 54.4, 68.4);
    });
  }
}

function glocke(ctx) {
  linie(ctx, "#b8344f", 2.6, () => ctx.ellipse(50, 78, 22, 5, 0, 0.15, Math.PI - 0.15));
  ell(ctx, 50, 84, 3.6, 3.6, "#ffd23f");
  ctx.strokeStyle = "#8a5a00";
  ctx.lineWidth = 1;
  ctx.stroke();
  ell(ctx, 48.8, 82.8, 1.1, 1.1, "#ffffff");
}

export function zeichneMochiKatze(ctx, p, x, y, Z, t, seed) {
  const weiss = p === p.toUpperCase();
  const typ = p.toUpperCase();
  const F = FELL[weiss ? "w" : "b"][typ];
  const dunkel = !weiss;
  const rand = dunkel ? "#120f16" : "#7a6660";
  const gr = GROESSE[typ];

  // --- Bewegung ---
  const atmen = Math.sin(t / 680 + seed * 6.28) * 0.03;
  let sx = 1 + atmen;
  let sy = 1 - atmen;
  // Hüpfer, danach wabbelt die Katze nach wie Wackelpudding
  const hp = (t + seed * 3100) % 4200;
  let hoch = 0;
  if (hp < 420) hoch = Math.sin((hp / 420) * Math.PI) * 7;
  else if (hp < 1100) {
    const k = (hp - 420) / 680;
    const wabbel = Math.exp(-k * 4) * Math.cos(k * Math.PI * 5) * 0.09;
    sy -= wabbel;
    sx += wabbel;
  }
  const kippen = Math.sin(t / 1700 + seed * 3) * 0.045;
  const zucken = (t + seed * 7000) % 5300 < 170 ? 0.3 : 0;
  const ph = (t + seed * 9000) % 9000;
  const ausdruck = ph < 150 || (ph > 4500 && ph < 4650) ? "zu" : ph > 3000 && ph < 3800 ? "froh" : ph > 6400 && ph < 6800 ? "kneif" : "normal";
  const offen = ausdruck === "froh" || (ph > 7600 && ph < 8000);
  const schwanz = Math.sin(t / 560 + seed * 5) * 0.4;
  const wackeln = Math.sin(t / 760 + seed * 4) * 0.08;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(Z / 100, Z / 100);
  // weicher Bodenschatten
  const sg = ctx.createRadialGradient(50, 94, 2, 50, 94, 32);
  sg.addColorStop(0, "rgba(0,0,0,0.3)");
  sg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.ellipse(50, 94, 32 * gr * (1 - hoch / 28), 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(50, 95 - hoch);
  ctx.rotate(kippen);
  ctx.scale(gr * sx, gr * sy);
  ctx.translate(-50, -95);

  // Schwanz hinter dem Körper
  if (typ !== "R") {
    ctx.save();
    ctx.translate(78, 84);
    ctx.rotate(schwanz - 0.2);
    const kurve = () => {
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(12, -2, 17, -14, 12, -24);
    };
    linie(ctx, rand, 9.5, kurve);
    linie(ctx, F.ohren?.[1] || F.basis, 6.5, kurve);
    ctx.restore();
  }
  if (typ === "R") {
    ctx.save();
    ctx.translate(50, 96);
    ctx.scale(1, 0.7);
    ctx.translate(-50, -96);
    karton(ctx, "hinten");
    ctx.restore();
  }

  // Ohren
  const ohrFarben = F.ohren || [F.basis, F.basis];
  ohr(ctx, -1, ohrFarben[0], rand, zucken);
  ohr(ctx, 1, ohrFarben[1], rand, 0);

  // Körper: weich beleuchtet
  const g = ctx.createRadialGradient(40, 46, 3, 50, 64, 44);
  g.addColorStop(0, F.basis);
  g.addColorStop(0.7, F.basis);
  g.addColorStop(1, F.schatten);
  blob(ctx, F.flausch);
  ctx.fillStyle = g;
  ctx.fill();
  // Muster innerhalb der Form
  ctx.save();
  blob(ctx, F.flausch);
  ctx.clip();
  (F.flecken || []).forEach(([fx, fy, rx, ry, c, rot]) => ell(ctx, fx, fy, rx, ry, c, rot));
  if (F.streifen) {
    [[44, 34, 45, 42], [50, 33, 50, 42], [56, 34, 55, 42], [18, 60, 26, 62], [18, 68, 26, 67], [82, 60, 74, 62], [82, 68, 74, 67]].forEach(([a, b, c, d]) =>
      linie(ctx, F.streifen, 3, () => {
        ctx.moveTo(a, b);
        ctx.lineTo(c, d);
      }),
    );
  }
  // weiche Rundung: unten rechts etwas dunkler, oben links ein Lichtfleck
  const r = ctx.createRadialGradient(42, 46, 10, 52, 66, 46);
  r.addColorStop(0, "rgba(0,0,0,0)");
  r.addColorStop(0.75, "rgba(0,0,0,0)");
  r.addColorStop(1, dunkel ? "rgba(0,0,0,0.35)" : "rgba(90, 60, 80, 0.16)");
  ctx.fillStyle = r;
  ctx.fillRect(0, 0, 100, 100);
  ell(ctx, 37, 44, 11, 6, dunkel ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.7)", -0.5);
  ctx.restore();
  blob(ctx, F.flausch);
  ctx.strokeStyle = rand;
  ctx.lineWidth = 1.7;
  ctx.stroke();

  // Pfötchen
  [39, 61].forEach((px) => {
    ell(ctx, px, 92, 6.4, 4.2, F.flecken && F.flecken[0][4] === "#f3f1f6" ? "#f3f1f6" : F.basis);
    ctx.strokeStyle = rand;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    linie(ctx, rand, 0.9, () => {
      ctx.moveTo(px - 1.8, 90.4);
      ctx.lineTo(px - 1.8, 92.6);
      ctx.moveTo(px + 1.8, 90.4);
      ctx.lineTo(px + 1.8, 92.6);
    });
  });

  // Gesicht
  ell(ctx, 32, 68, 5.4, 3, "rgba(255, 130, 160, 0.42)");
  ell(ctx, 68, 68, 5.4, 3, "rgba(255, 130, 160, 0.42)");
  augen(ctx, ausdruck, dunkel, typ === "P" ? 1.15 : 1);
  mund(ctx, offen, dunkel);
  linie(ctx, dunkel ? "rgba(220, 212, 236, 0.6)" : "rgba(122, 102, 96, 0.7)", 0.9, () => {
    [-1, 1].forEach((s) => {
      ctx.moveTo(50 + s * 26, 66);
      ctx.lineTo(50 + s * 38, 64);
      ctx.moveTo(50 + s * 26, 69);
      ctx.lineTo(50 + s * 38, 70);
    });
  });

  // Kopfschmuck (Teile aus den Anime-Katzen, etwas tiefer gesetzt)
  ctx.save();
  ctx.translate(0, 9);
  if (typ === "K") krone(ctx);
  else if (typ === "Q") {
    diadem(ctx);
    ctx.translate(4, 4);
    schleife(ctx, wackeln);
  } else if (typ === "B") zauberhut(ctx, wackeln);
  else if (typ === "N") {
    ctx.translate(50, 30);
    ctx.scale(0.9, 0.9);
    ctx.translate(-50, -30);
    helm(ctx, wackeln);
  }
  ctx.restore();

  if (typ === "R") {
    ctx.save();
    ctx.translate(50, 96);
    ctx.scale(1, 0.7);
    ctx.translate(-50, -96);
    karton(ctx, "vorne", { linie: rand, bauch: F.basis, bauchSchatten: F.schatten }, 1);
    ctx.restore();
  }
  if (typ === "P") glocke(ctx);

  // kleines Funkeln, wenn sie sich freut
  if (ausdruck === "froh") {
    funkeln(ctx, 84, 34, 4.5, rand);
    funkeln(ctx, 84, 34, 3.6, "#fff3a0");
  }
  ctx.restore();
}
