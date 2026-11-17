// Stick-Skater – die Figur: Strichmännchen mit dicken, zitternden Tuschelinien, Kostüme und Boards,
// Trick-Animationen am Brett und Ragdoll beim Sturz. Die Pose springt bewusst nur 12-mal pro Sekunde
// („auf Zweiern“), die Position bleibt flüssig.
import { zufall } from "./strecke.js";

const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

// Zwei-Gelenk-Kette (Hüfte → Knie → Fuß), Knie zeigt nach vorn
function ik(a, b, l1, l2, vorn = 1) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const d = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.01);
  const w = Math.atan2(dy, dx);
  const k = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const ang = w - k * vorn;
  return [a[0] + Math.cos(ang) * l1, a[1] + Math.sin(ang) * l1];
}

// ---------- Pose aus dem Spielzustand ----------
export function poseAus(s, zeitQ) {
  const p = s.p;
  const q = {
    c: 0.15,
    lean: 0.06,
    arme: "locker",
    phase: zeitQ,
    fuss: 0,
    brett: { rot: 0, art: null, ph: 0 },
    bal: 0,
    schiebt: false,
  };
  if (p.zustand === "boden" || p.zustand === "ziel") {
    q.c = 0.12 + Math.sin(zeitQ * 6) * 0.04 + (p.landT < 0.15 ? 0.5 * (1 - p.landT / 0.15) : 0);
    q.lean = 0.08 + Math.min(0.12, (p.vx - 380) / 1500);
    q.schiebt = p.vx < s.st.tempo * 0.98 && p.landT > 0.3 && p.zustand === "boden";
    if (p.zustand === "ziel") {
      q.arme = "jubel";
      q.c = 0.05;
    }
  } else if (p.zustand === "luft") {
    const steigt = p.vy < 0;
    q.c = steigt ? 0.55 : 0.35;
    q.arme = "hoch";
    q.lean = p.vy * 0.00006;
    q.brett.rot = Math.max(-0.3, Math.min(0.3, p.vy * -0.0002));
    if (p.trick) {
      q.brett.art = p.trick.art;
      q.brett.ph = Math.min(1, p.trick.t / p.trick.dauer);
      q.fuss = Math.sin(q.brett.ph * Math.PI);
      q.c = 0.75;
      q.arme = "trick";
    }
  } else if (p.zustand === "grind") {
    const g = p.grind;
    q.c = 0.38;
    q.arme = "balance";
    q.bal = g.bal;
    q.lean = g.bal * 0.45;
    const seg = g.seg;
    q.brett.rot = Math.atan2(seg.y1 - seg.y0, seg.x1 - seg.x0);
  }
  return q;
}

// ---------- Zeichnen ----------
// opt: { P, kostuem, board, zeit, frame, skala (Größe), druck (Farbversatz an), glitch }
export function zeichneFigur(g, x, y, q, opt) {
  const { P, kostuem = "basic", board = "standard", frame = 0, groesse = 1 } = opt;
  const rnd = zufall(frame * 31 + 7);
  const j = () => (rnd() - 0.5) * 1.3; // Zittern der Linie (pro Zeichnung neu, 12 fps)
  g.save();
  g.translate(x, y);
  g.scale(groesse, groesse);
  g.rotate(q.brett.rot * 0.8);

  // Gelenke berechnen
  const c = q.c;
  const lift = q.fuss * 15;
  const fussH = [-10, -9 - lift];
  const fussV = [10, -9 - lift * 0.8];
  const huefte = [-2 + q.lean * 10, -36 + c * 13 - lift * 0.4];
  const [nx, ny] = rot(0, -26, q.lean);
  const hals = [huefte[0] + nx, huefte[1] + ny];
  const [kx, ky] = rot(3, -11, q.lean * 0.6);
  const kopf = [hals[0] + kx, hals[1] + ky];
  let fussHin = fussH;
  if (q.schiebt) {
    // Anschieben: hinterer Fuß tritt auf den Boden
    const ph = (q.phase * 2.2) % 1;
    fussHin = [-10 - Math.sin(ph * Math.PI * 2) * 16, -1];
  }
  const knieH = ik(huefte, fussHin, 17.5, 17.5, 1);
  const knieV = ik(huefte, fussV, 17.5, 17.5, 1);
  const schulter = [hals[0], hals[1] + 3];
  let ellL, handL, ellR, handR;
  const ph = q.phase;
  switch (q.arme) {
    case "hoch":
      ellL = [schulter[0] - 12, schulter[1] - 6];
      handL = [schulter[0] - 20, schulter[1] - 18];
      ellR = [schulter[0] + 13, schulter[1] - 4];
      handR = [schulter[0] + 24, schulter[1] - 14];
      break;
    case "trick":
      ellL = [schulter[0] - 14, schulter[1] - 2];
      handL = [schulter[0] - 26, schulter[1] - 10];
      ellR = [schulter[0] + 14, schulter[1] + 2];
      handR = [schulter[0] + 18, schulter[1] + 16];
      break;
    case "balance": {
      const w = q.bal * 8 + Math.sin(ph * 9) * 3;
      ellL = [schulter[0] - 15, schulter[1] + 1 + w];
      handL = [schulter[0] - 30, schulter[1] - 2 + w * 1.6];
      ellR = [schulter[0] + 15, schulter[1] + 1 - w];
      handR = [schulter[0] + 30, schulter[1] - 2 - w * 1.6];
      break;
    }
    case "jubel":
      ellL = [schulter[0] - 8, schulter[1] - 14];
      handL = [schulter[0] - 12, schulter[1] - 30];
      ellR = [schulter[0] + 8, schulter[1] - 14];
      handR = [schulter[0] + 12, schulter[1] - 30 + Math.sin(ph * 14) * 3];
      break;
    default: {
      const sw = Math.sin(ph * 5) * 4;
      ellL = [schulter[0] - 9, schulter[1] + 13];
      handL = [schulter[0] - 14 + sw, schulter[1] + 26];
      ellR = [schulter[0] + 9, schulter[1] + 12];
      handR = [schulter[0] + 16 - sw, schulter[1] + 22];
    }
  }

  const glieder = [
    [huefte, knieH, fussHin],
    [huefte, knieV, fussV],
    [huefte, hals],
    [schulter, ellL, handL],
    [schulter, ellR, handR],
  ];
  const tinte = P.tinte;
  const K = kostuemFarben(kostuem, P, opt.zeit || 0);

  // Brett zuerst (liegt hinter den Füßen)
  zeichneBrett(g, q.brett, board, P, lift, opt, rnd);

  // Kostüm: Teile hinter dem Körper
  if (kostuem === "noir") mantel(g, huefte, hals, q, K, tinte, j);
  if (kostuem === "hoodie") {
    // Kapuze liegt hinten am Kopf
    g.fillStyle = K.stoff;
    g.beginPath();
    g.ellipse(kopf[0] - 4, kopf[1] + 2, 11, 13, -0.3, 0, 7);
    g.fill();
  }

  // Papier-Rand, damit die Figur auf jedem Hintergrund lesbar bleibt
  const breite = kostuem === "robo" ? 5.4 : 4.4;
  g.lineCap = "round";
  g.lineJoin = "round";
  g.strokeStyle = P.papier;
  g.lineWidth = breite + 5;
  g.globalAlpha = 0.92;
  for (const gl of glieder) linie(g, gl, () => 0);
  g.beginPath();
  g.arc(kopf[0], kopf[1], 13.5, 0, 7);
  g.fillStyle = P.papier;
  g.fill();
  g.globalAlpha = 1;

  // Farbversatz (verrutschter Offsetdruck)
  if (opt.druck !== false) {
    g.lineWidth = breite;
    for (const [farbe, dx, dy] of [["rgba(0,229,255,0.75)", -2.2, -0.8], ["rgba(255,43,214,0.75)", 2.2, 1.2]]) {
      g.strokeStyle = farbe;
      g.save();
      g.translate(dx, dy);
      for (const gl of glieder) linie(g, gl, j);
      g.beginPath();
      g.arc(kopf[0], kopf[1], 10, 0, 7);
      g.stroke();
      g.restore();
    }
  }
  // Körper: Hoodie / Mantel als Fläche
  if (kostuem === "hoodie" || kostuem === "ninja") {
    g.fillStyle = K.stoff;
    g.strokeStyle = tinte;
    g.lineWidth = 3;
    g.beginPath();
    const [a1, b1] = rot(-8, 0, q.lean);
    const [a2, b2] = rot(8, 0, q.lean);
    g.moveTo(hals[0] + a1, hals[1] + b1 + 2);
    g.lineTo(hals[0] + a2, hals[1] + b2 + 2);
    g.lineTo(huefte[0] + a2 * 0.9, huefte[1] + b2 + 3);
    g.lineTo(huefte[0] + a1 * 0.9, huefte[1] + b1 + 3);
    g.closePath();
    g.fill();
    g.stroke();
  }
  // Tusche
  g.strokeStyle = K.linie || tinte;
  g.lineWidth = breite;
  for (const gl of glieder) linie(g, gl, j);

  // Kopf
  if (kostuem === "robo") {
    g.save();
    g.translate(kopf[0], kopf[1]);
    g.rotate(q.lean * 0.6);
    g.fillStyle = K.stoff;
    g.fillRect(-11, -11, 22, 20);
    g.strokeStyle = tinte;
    g.lineWidth = 3.5;
    g.strokeRect(-11 + j(), -11 + j(), 22, 20);
    g.fillStyle = K.akzent;
    g.fillRect(-1, -5, 12, 5);
    g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo(-3, -11);
    g.lineTo(-6, -23);
    g.stroke();
    g.fillStyle = K.akzent;
    g.beginPath();
    g.arc(-6, -25, 3.5, 0, 7);
    g.fill();
    g.stroke();
    g.restore();
  } else {
    g.fillStyle = K.haut;
    g.beginPath();
    g.arc(kopf[0], kopf[1], 10, 0, 7);
    g.fill();
    g.strokeStyle = tinte;
    g.lineWidth = 3.6;
    g.beginPath();
    g.arc(kopf[0] + j() * 0.4, kopf[1] + j() * 0.4, 10, 0, 7);
    g.stroke();
    // Auge
    g.fillStyle = tinte;
    g.beginPath();
    g.arc(kopf[0] + 4, kopf[1] - 1, 1.8, 0, 7);
    g.fill();
  }
  if (kostuem === "hoodie") {
    // Kapuzenrand und Kopfhörer (Bügel über den Kopf, Muschel am Ohr)
    g.strokeStyle = tinte;
    g.lineWidth = 2.5;
    g.beginPath();
    g.arc(kopf[0] - 2, kopf[1] + 1, 12.5, Math.PI * 0.55, Math.PI * 1.35);
    g.stroke();
    g.strokeStyle = K.akzent;
    g.lineWidth = 3.2;
    g.beginPath();
    g.arc(kopf[0] - 1, kopf[1] + 1, 12, Math.PI * 1.05, Math.PI * 1.75);
    g.stroke();
    g.fillStyle = K.akzent;
    g.strokeStyle = tinte;
    g.lineWidth = 2;
    g.beginPath();
    g.ellipse(kopf[0] - 6, kopf[1] + 1, 3.5, 5, 0, 0, 7);
    g.fill();
    g.stroke();
  } else if (kostuem === "noir") {
    // Hut
    g.save();
    g.translate(kopf[0], kopf[1] - 6);
    g.rotate(q.lean * 0.5 - 0.08);
    g.fillStyle = K.stoff;
    g.strokeStyle = tinte;
    g.lineWidth = 2.5;
    g.beginPath();
    g.ellipse(0, 0, 17, 3.5, 0, 0, 7);
    g.fill();
    g.stroke();
    g.beginPath();
    g.moveTo(-9, 0);
    g.lineTo(-8, -12);
    g.quadraticCurveTo(0, -16, 8, -12);
    g.lineTo(9, 0);
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = K.akzent;
    g.fillRect(-8.5, -4, 17, 3);
    g.restore();
  } else if (kostuem === "ninja") {
    // Maske mit flatternden Bändern
    g.fillStyle = K.stoff;
    g.beginPath();
    g.arc(kopf[0], kopf[1], 10.5, Math.PI * 0.95, Math.PI * 2.05);
    g.fill();
    g.fillStyle = K.akzent;
    g.fillRect(kopf[0] - 10, kopf[1] - 4, 20, 5);
    g.strokeStyle = K.akzent;
    g.lineWidth = 3;
    const flatter = Math.sin(ph * 18) * 4;
    g.beginPath();
    g.moveTo(kopf[0] - 9, kopf[1] - 2);
    g.quadraticCurveTo(kopf[0] - 20, kopf[1] - 6 + flatter, kopf[0] - 30, kopf[1] - 2 - flatter);
    g.moveTo(kopf[0] - 9, kopf[1]);
    g.quadraticCurveTo(kopf[0] - 18, kopf[1] + 3 - flatter, kopf[0] - 27, kopf[1] + 8 + flatter);
    g.stroke();
    g.fillStyle = P.papier;
    g.fillRect(kopf[0] + 2, kopf[1] - 3, 6, 3);
    // Spraydose am Gürtel
    g.fillStyle = K.dose;
    g.strokeStyle = tinte;
    g.lineWidth = 2;
    g.fillRect(huefte[0] - 9, huefte[1] - 6, 7, 12);
    g.strokeRect(huefte[0] - 9, huefte[1] - 6, 7, 12);
    g.fillRect(huefte[0] - 7, huefte[1] - 9, 3, 3);
  }
  g.restore();
}

function linie(g, pts, j) {
  g.beginPath();
  g.moveTo(pts[0][0] + j(), pts[0][1] + j());
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0] + j(), pts[i][1] + j());
  g.stroke();
}

function mantel(g, huefte, hals, q, K, tinte, j) {
  // Trenchcoat flattert nach hinten
  const fl = 6 + Math.sin(q.phase * 10) * 3;
  g.fillStyle = K.stoff;
  g.strokeStyle = tinte;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(hals[0] - 6, hals[1] + 3);
  g.lineTo(hals[0] + 7, hals[1] + 3);
  g.lineTo(huefte[0] + 9, huefte[1] + 12);
  g.lineTo(huefte[0] - 12 - fl, huefte[1] + 16 + j());
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = K.akzent;
  g.fillRect(huefte[0] - 8, huefte[1] - 2, 16, 3);
}

function kostuemFarben(k, P, zeit) {
  switch (k) {
    case "hoodie":
      return { stoff: "#2b2b38", akzent: P.a1 === "#111111" ? "#555" : P.a1, haut: P.papier };
    case "noir":
      return { stoff: "#c9b48a", akzent: "#1a1a1a", haut: P.papier };
    case "robo":
      return { stoff: "#b8c4d0", akzent: P.a2, haut: P.papier };
    case "ninja":
      return { stoff: "#1a1a22", akzent: P.a1, haut: P.papier, dose: P.a2 };
    case "glitch": {
      const farben = ["#00ffd0", "#ff00a8", "#ffe600", "#7a5cff"];
      return { stoff: farben[Math.floor(zeit * 8) % 4], akzent: farben[(Math.floor(zeit * 8) + 1) % 4], haut: P.papier, linie: farben[Math.floor(zeit * 12) % 4] === "#ffe600" ? P.tinte : farben[Math.floor(zeit * 12) % 4] };
    }
    default:
      return { stoff: P.a1, akzent: P.a2, haut: P.papier };
  }
}

// ---------- Boards ----------
const BRETT_FARBEN = {
  standard: { deck: "#c9853f", unten: "#e94b3c", rolle: "#f4f0e6" },
  neon: { deck: "#101018", unten: "#00e5ff", rolle: "#ff2bd6", leuchten: "#00e5ff" },
  stahl: { deck: "#8e98a3", unten: "#5b636c", rolle: "#2b2f35", nieten: true },
  schleim: { deck: "#2d5a3a", unten: "#39ff88", rolle: "#39ff88", schleim: true },
  riss: { deck: "#2a0f4a", unten: "#ff00a8", rolle: "#00ffd0", riss: true },
};
function zeichneBrett(g, b, board, P, lift, opt, rnd) {
  const F = BRETT_FARBEN[board] || BRETT_FARBEN.standard;
  const ph = b.ph;
  g.save();
  g.translate(0, -6 - lift * 0.55);
  let sx = 1;
  let sy = 1;
  let zeigeUnten = false;
  if (b.art === "kickflip" || b.art === "heelflip") {
    const w = ph * Math.PI * 2 * (b.art === "heelflip" ? -1 : 1);
    sy = Math.cos(w);
    zeigeUnten = sy < 0;
  } else if (b.art === "shove360") {
    const w = ph * Math.PI * 2;
    sx = Math.cos(w);
    zeigeUnten = false;
  } else if (b.art === "impossible") {
    g.translate(-14, 0);
    g.rotate(-ph * Math.PI * 2);
    g.translate(14, 0);
  }
  if (F.leuchten && opt.P.papier !== "#ffffff") {
    g.strokeStyle = F.leuchten;
    g.globalAlpha = 0.28;
    g.lineWidth = 14;
    g.beginPath();
    g.moveTo(-20, 0);
    g.lineTo(20, 0);
    g.stroke();
    g.globalAlpha = 1;
  }
  g.scale(sx, 1);
  const dick = 4.5 * Math.max(0.35, Math.abs(sy));
  // Rollen
  if (Math.abs(sy) > 0.15 || b.art !== "kickflip") {
    const ry = zeigeUnten ? -dick - 3 : dick + 1.5;
    g.fillStyle = F.rolle;
    g.strokeStyle = P_t(opt);
    g.lineWidth = 1.8;
    for (const wx of [-12, 12]) {
      g.beginPath();
      g.arc(wx, ry * Math.abs(sy || 1), 3.4, 0, 7);
      g.fill();
      g.stroke();
      if (F.schleim) {
        g.fillStyle = "#39ff88";
        g.fillRect(wx - 1, ry + 3, 2, 3 + rnd() * 3);
        g.fillStyle = F.rolle;
      }
    }
  }
  // Deck: dicke Linie mit hochgezogenen Enden (Seitenansicht), Unterseite beim Flip sichtbar
  const deck = () => {
    g.beginPath();
    g.moveTo(-22, -dick - 3);
    g.quadraticCurveTo(-19, -1, -14, -1);
    g.lineTo(14, -1);
    g.quadraticCurveTo(19, -1, 22, -dick - 3);
  };
  g.lineCap = "round";
  g.lineJoin = "round";
  g.strokeStyle = P_t(opt);
  g.lineWidth = dick + 4.5;
  deck();
  g.stroke();
  g.strokeStyle = zeigeUnten ? F.unten : F.deck;
  g.lineWidth = dick;
  deck();
  g.stroke();
  if (!zeigeUnten && Math.abs(sy) > 0.5) {
    // Griptape oben
    g.strokeStyle = "rgba(0,0,0,0.55)";
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(-13, -1 - dick / 2 + 0.5);
    g.lineTo(13, -1 - dick / 2 + 0.5);
    g.stroke();
  }
  if (F.nieten) {
    g.fillStyle = P_t(opt);
    for (const nx of [-12, -6, 6, 12]) g.fillRect(nx - 0.8, -dick * 0.6 - 0.8, 1.6, 1.6);
  }
  if (F.riss) {
    g.strokeStyle = "#00ffd0";
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(-10, -1);
    g.lineTo(-4, -dick);
    g.lineTo(1, -1);
    g.lineTo(6, -dick);
    g.stroke();
  }
  g.restore();
}
const P_t = (opt) => opt.P.tinte;

// ---------- Ragdoll ----------
export function zeichneRagdoll(g, rd, opt) {
  const { P, kostuem = "basic", board = "standard", frame = 0 } = opt;
  const rnd = zufall(frame * 13 + 3);
  const j = () => (rnd() - 0.5) * 1.4;
  const p = rd.pts;
  const pt = (k) => [p[k].x, p[k].y];
  const glieder = [
    [pt("huefte"), pt("knieL"), pt("fussL")],
    [pt("huefte"), pt("knieR"), pt("fussR")],
    [pt("huefte"), pt("hals")],
    [pt("hals"), pt("ellL"), pt("handL")],
    [pt("hals"), pt("ellR"), pt("handR")],
  ];
  // Brett fliegt allein weiter
  g.save();
  g.translate(rd.brett.x, rd.brett.y);
  g.rotate(rd.brett.rot);
  zeichneBrett(g, { art: null, ph: 0 }, board, P, 0, opt, rnd);
  g.restore();
  g.lineCap = "round";
  g.lineJoin = "round";
  g.strokeStyle = P.papier;
  g.lineWidth = 9.5;
  for (const gl of glieder) linie(g, gl, () => 0);
  const K = kostuemFarben(kostuem, P, opt.zeit || 0);
  g.strokeStyle = K.linie || P.tinte;
  g.lineWidth = 4.4;
  for (const gl of glieder) linie(g, gl, j);
  const kp = pt("kopf");
  g.fillStyle = kostuem === "robo" ? K.stoff : P.papier;
  g.beginPath();
  g.arc(kp[0], kp[1], 10, 0, 7);
  g.fill();
  g.strokeStyle = P.tinte;
  g.lineWidth = 3.6;
  g.stroke();
  // Sternchen-Augen: X X
  g.lineWidth = 1.8;
  for (const dx of [-3.5, 3.5]) {
    g.beginPath();
    g.moveTo(kp[0] + dx - 2, kp[1] - 3);
    g.lineTo(kp[0] + dx + 2, kp[1] + 1);
    g.moveTo(kp[0] + dx + 2, kp[1] - 3);
    g.lineTo(kp[0] + dx - 2, kp[1] + 1);
    g.stroke();
  }
}
