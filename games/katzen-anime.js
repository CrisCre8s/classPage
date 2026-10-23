// Anime-Katzen: Cel-Shading (flache Farben mit harter Schattenkante), dunkle Umrisse,
// große glitzernde Augen, Bäckchen-Striche und quirlige Bewegungen (hüpfen mit Stauchen
// und Strecken, „Nya!“, Funkeln). Selbst gezeichnet in einem 100 × 100-Feld.

const PAL = {
  w: { fell: "#ffcf8f", schatten: "#f0a35a", licht: "#fff1d6", bauch: "#fff8ee", bauchSchatten: "#f1d9bc", linie: "#4a2511", auge: "#5fd07a", augeDunkel: "#1d7a3c", augeHell: "#c8f7b3", innenOhr: "#ffb3c3", streifen: "#ea9550", pupille: "#14200f" },
  b: { fell: "#3f3854", schatten: "#29243a", licht: "#7a70a0", bauch: "#4e4766", bauchSchatten: "#3b3552", linie: "#0d0a14", auge: "#ffc93a", augeDunkel: "#c86a00", augeHell: "#fff3a8", innenOhr: "#d98aa6", streifen: null, pupille: "#1a0f05" },
};
const GROESSE = { K: 0.94, Q: 0.95, R: 0.94, B: 0.92, N: 0.93, P: 0.8 }; // König so, dass das Kreuz im Feld bleibt
const UMRISS = 4.4; // Strichstärke der Außenlinie (wird halb überdeckt)

// ---------- Werkzeuge ----------
const ell = (x, y, rx, ry, rot = 0) => (ctx) => {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
};
const poly = (punkte) => (ctx) => {
  ctx.beginPath();
  punkte.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
};
// Umriss zuerst, breit, dann Flächen darüber: so gibt es nur eine Außenlinie, keine inneren Kanten
function umriss(ctx, pfade, farbe, breite = UMRISS) {
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = farbe;
  ctx.lineWidth = breite;
  for (const p of pfade) {
    p(ctx);
    ctx.stroke();
  }
}
function fuell(ctx, pfad, farbe) {
  pfad(ctx);
  ctx.fillStyle = farbe;
  ctx.fill();
}
// Cel-Shading: Fläche in Schattenfarbe, darüber die Grundfarbe leicht nach oben links versetzt
// → harte Schattensichel unten rechts
function cel(ctx, pfad, basis, schatten, dx = -3, dy = -3.6) {
  ctx.save();
  pfad(ctx);
  ctx.clip();
  pfad(ctx);
  ctx.fillStyle = schatten;
  ctx.fill();
  ctx.translate(dx, dy);
  pfad(ctx);
  ctx.fillStyle = basis;
  ctx.fill();
  ctx.restore();
}
function glanz(ctx, x, y, rx, ry, rot = 0, alpha = 0.9, farbe = "#ffffff") {
  ctx.save();
  ctx.globalAlpha = alpha;
  ell(x, y, rx, ry, rot)(ctx);
  ctx.fillStyle = farbe;
  ctx.fill();
  ctx.restore();
}
function funkeln(ctx, x, y, r, farbe = "#ffffff") {
  if (r <= 0.05) return;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fillStyle = farbe;
  ctx.fill();
}
function strich(ctx, farbe, breite, fn) {
  ctx.strokeStyle = farbe;
  ctx.lineWidth = breite;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  fn();
  ctx.stroke();
}

// ---------- Teile ----------
function ohrPfad(seite, zucken, innen = false) {
  return (ctx) => {
    ctx.save();
    ctx.translate(50 + seite * 16, 33);
    ctx.rotate(seite * (0.2 + zucken));
    ctx.beginPath();
    if (innen) {
      ctx.moveTo(-5 * seite, 5);
      ctx.quadraticCurveTo(-3 * seite, -5, 1 * seite, -12);
      ctx.quadraticCurveTo(6 * seite, -2, 6 * seite, 5);
    } else {
      ctx.moveTo(-10 * seite, 8);
      ctx.quadraticCurveTo(-6 * seite, -9, 1 * seite, -19);
      ctx.quadraticCurveTo(9 * seite, -5, 11 * seite, 8);
    }
    ctx.closePath();
    ctx.restore();
  };
}
const kopf = ell(50, 46, 28, 23);
const backeL = poly([[25, 48], [16, 54], [24, 55], [18, 60], [27, 59]]);
const backeR = poly([[75, 48], [84, 54], [76, 55], [82, 60], [73, 59]]);

function auge(ctx, x, y, P, zu, gr, seite, t, seed) {
  if (zu) {
    // glückliche „^ ^“-Augen
    strich(ctx, P.linie, 2.8, () => {
      ctx.moveTo(x - 6, y + 2.5);
      ctx.lineTo(x, y - 3.5);
      ctx.lineTo(x + 6, y + 2.5);
    });
    return;
  }
  const rx = 7.4 * gr;
  const ry = 9 * gr;
  const g = ctx.createLinearGradient(0, y - ry, 0, y + ry);
  // harte Farbbänder statt weichem Verlauf (typisch Anime)
  [[0, P.augeDunkel], [0.44, P.augeDunkel], [0.44, P.auge], [0.78, P.auge], [0.78, P.augeHell], [1, P.augeHell]].forEach(([o, c]) => g.addColorStop(o, c));
  fuell(ctx, ell(x, y, rx, ry), g);
  fuell(ctx, ell(x, y + 0.6, 3.3 * gr, 5.8 * gr), P.pupille);
  glanz(ctx, x - 2.5 * gr, y - 3.6 * gr, 2.7 * gr, 3.5 * gr, -0.45, 1);
  glanz(ctx, x + 2.7 * gr, y + 3.6 * gr, 1.4 * gr, 1.4 * gr, 0, 0.95);
  // Lidstrich oben, kräftig, mit kleinem Schwung außen
  strich(ctx, P.linie, 1.4, () => ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2));
  strich(ctx, P.linie, 3.4, () => ctx.ellipse(x, y, rx + 0.5, ry + 0.5, 0, Math.PI * 1.06, Math.PI * 1.94));
  strich(ctx, P.linie, 2.4, () => {
    ctx.moveTo(x + seite * rx * 0.92, y - ry * 0.42);
    ctx.lineTo(x + seite * (rx + 3), y - ry * 0.78);
  });
  // Glitzern im Auge
  funkeln(ctx, x + 3.1 * gr, y - 4.4 * gr, 1.3 + 1.3 * Math.max(0, Math.sin(t / 260 + seed * 9 + seite)));
}

function gesicht(ctx, P, weiss, zu, nya, gr, t, seed) {
  // helle Schnauze
  fuell(ctx, ell(50, 57.5, 9.5, 6.2), P.bauch);
  // Bäckchen: rosa Hauch + drei kleine Striche
  [-1, 1].forEach((s) => {
    glanz(ctx, 50 + s * 18.5, 58, 5.6, 3, 0, 0.38, "#ff7aa2");
    for (let i = 0; i < 3; i++)
      strich(ctx, "rgba(255, 105, 150, 0.85)", 1.2, () => {
        const bx = 50 + s * (15.5 + i * 2.8);
        ctx.moveTo(bx - 1.1, 60);
        ctx.lineTo(bx + 1.1, 56.4);
      });
  });
  auge(ctx, 38.5, 48, P, zu, gr, -1, t, seed);
  auge(ctx, 61.5, 48, P, zu, gr, 1, t, seed);
  // Näschen
  fuell(ctx, poly([[48.2, 55], [51.8, 55], [50, 57]]), "#ff8fb0");
  strich(ctx, P.linie, 1, () => {
    ctx.moveTo(48.2, 55);
    ctx.lineTo(51.8, 55);
    ctx.lineTo(50, 57);
    ctx.closePath();
  });
  if (nya) {
    // offenes Mäulchen mit Zähnchen: „Nya!“
    const maul = (c) => {
      c.beginPath();
      c.moveTo(46, 58.4);
      c.quadraticCurveTo(50, 66, 54, 58.4);
      c.closePath();
    };
    fuell(ctx, maul, "#c63f5c");
    fuell(ctx, ell(50, 62, 2.2, 1.4), "#ff92aa");
    fuell(ctx, poly([[47.3, 58.5], [49, 58.5], [48.1, 60.6]]), "#ffffff");
    maul(ctx);
    ctx.strokeStyle = P.linie;
    ctx.lineWidth = 1.3;
    ctx.stroke();
  } else {
    strich(ctx, P.linie, 1.5, () => {
      ctx.moveTo(45.4, 58.2);
      ctx.quadraticCurveTo(47.7, 61.2, 50, 58.6);
      ctx.quadraticCurveTo(52.3, 61.2, 54.6, 58.2);
    });
  }
  // Schnurrhaare
  strich(ctx, weiss ? "rgba(74, 37, 17, 0.75)" : "rgba(220, 210, 245, 0.6)", 0.9, () => {
    [-1, 1].forEach((s) => {
      ctx.moveTo(50 + s * 12, 55.5);
      ctx.lineTo(50 + s * 23, 53.5);
      ctx.moveTo(50 + s * 12, 58);
      ctx.lineTo(50 + s * 22.5, 59.5);
    });
  });
}

// ---------- Zubehör ----------
const GOLD = { basis: "#ffd23f", schatten: "#e39a17", licht: "#fff6b8", linie: "#6b4300" };

function krone(ctx) {
  const zacken = poly([[33, 27], [31, 10], [40.5, 18], [50, 3], [59.5, 18], [69, 10], [67, 27]]);
  const kreuzV = poly([[48.4, -5], [51.6, -5], [51.6, 5], [48.4, 5]]);
  const kreuzH = poly([[45.5, -1.6], [54.5, -1.6], [54.5, 1.4], [45.5, 1.4]]);
  umriss(ctx, [zacken, kreuzV, kreuzH], GOLD.linie, 3.4);
  cel(ctx, zacken, GOLD.basis, GOLD.schatten, -2.5, -2.5);
  fuell(ctx, kreuzV, GOLD.basis);
  fuell(ctx, kreuzH, GOLD.basis);
  strich(ctx, GOLD.licht, 1.6, () => {
    ctx.moveTo(35, 24);
    ctx.lineTo(34, 15);
  });
  [[50, 21, 3, "#ff4061"], [41, 22.5, 2.1, "#3e8cff"], [59, 22.5, 2.1, "#3e8cff"]].forEach(([x, y, r, c]) => {
    fuell(ctx, ell(x, y, r, r), c);
    strich(ctx, GOLD.linie, 1, () => ctx.ellipse(x, y, r, r, 0, 0, Math.PI * 2));
    glanz(ctx, x - r * 0.35, y - r * 0.35, r * 0.35, r * 0.35, 0, 1);
  });
}

function diadem(ctx) {
  const band = (c) => {
    c.beginPath();
    c.moveTo(34, 26);
    c.quadraticCurveTo(50, 17, 66, 26);
    c.lineTo(64, 29.5);
    c.quadraticCurveTo(50, 21.5, 36, 29.5);
    c.closePath();
  };
  const spitzen = [[40, 17, 2.4], [50, 9, 3.6], [60, 17, 2.4]].map(([x, y, r]) => poly([[x - r, 24], [x, y], [x + r, 24]]));
  umriss(ctx, [band, ...spitzen], GOLD.linie, 3.2);
  fuell(ctx, band, GOLD.basis);
  spitzen.forEach((s) => fuell(ctx, s, GOLD.basis));
  // Herz-Edelstein
  ctx.beginPath();
  ctx.moveTo(50, 25.6);
  ctx.bezierCurveTo(45.5, 22.5, 46.5, 18.8, 50, 20.8);
  ctx.bezierCurveTo(53.5, 18.8, 54.5, 22.5, 50, 25.6);
  ctx.fillStyle = "#ff5fa2";
  ctx.fill();
  ctx.strokeStyle = GOLD.linie;
  ctx.lineWidth = 1;
  ctx.stroke();
  glanz(ctx, 48.5, 21.6, 0.9, 0.9, 0, 1);
}

function schleife(ctx, wackeln) {
  // kleine Schleife am Ohr der Dame
  ctx.save();
  ctx.translate(68, 26);
  ctx.rotate(0.35 + wackeln);
  const l = poly([[0, 0], [-7, -5], [-7, 5]]);
  const r = poly([[0, 0], [7, -5], [7, 5]]);
  const k = ell(0, 0, 2.2, 2.2);
  umriss(ctx, [l, r, k], "#6b1636", 2.8);
  cel(ctx, l, "#ff7fb0", "#e0508b", 1.5, -1.5);
  cel(ctx, r, "#ff7fb0", "#e0508b", -1.5, -1.5);
  fuell(ctx, k, "#ff9cc4");
  ctx.restore();
}

function zauberhut(ctx, wackeln) {
  ctx.save();
  ctx.translate(50, 27);
  ctx.rotate(wackeln * 0.6);
  const kegel = (c) => {
    c.beginPath();
    c.moveTo(-15, 0);
    c.quadraticCurveTo(-5, -18, 8, -34);
    c.quadraticCurveTo(10, -16, 15, 0);
    c.closePath();
  };
  const krempe = ell(0, 0, 21, 5);
  umriss(ctx, [kegel, krempe], "#141a52", 3.6);
  cel(ctx, kegel, "#5d7cff", "#3a50d0", -3, 0);
  cel(ctx, krempe, "#5d7cff", "#3a50d0", 0, -1.6);
  strich(ctx, "rgba(220, 230, 255, 0.85)", 1.6, () => {
    ctx.moveTo(-9, -4);
    ctx.quadraticCurveTo(-4, -14, 2, -24);
  });
  [[-1, -12, 3], [6, -24, 2]].forEach(([x, y, r]) => {
    funkeln(ctx, x, y, r + 0.9, "#141a52");
    funkeln(ctx, x, y, r, "#ffe45c");
  });
  ctx.restore();
}

function helm(ctx, wackeln) {
  ctx.save();
  ctx.translate(55, 9);
  ctx.rotate(wackeln * 0.7);
  const feder = (c) => {
    c.beginPath();
    c.moveTo(-2, 6);
    c.bezierCurveTo(4, -12, 21, -14, 27, -3);
    c.bezierCurveTo(17, -5, 9, 1, 4, 9);
    c.closePath();
  };
  umriss(ctx, [feder], "#5a0d1a", 3.4);
  cel(ctx, feder, "#ff5a6e", "#d23049", 1.5, -2);
  ctx.restore();
  const kuppel = (c) => {
    c.beginPath();
    c.moveTo(26, 37);
    c.bezierCurveTo(26, 7, 74, 7, 74, 37);
    c.quadraticCurveTo(50, 31, 26, 37);
    c.closePath();
  };
  umriss(ctx, [kuppel], "#1f2330", 3.6);
  cel(ctx, kuppel, "#e3e8f2", "#a8b0c3", -3.5, -2.5);
  strich(ctx, "#5b6377", 1.6, () => {
    ctx.moveTo(50, 12);
    ctx.lineTo(50, 33);
  });
  strich(ctx, "#ffffff", 2, () => {
    ctx.moveTo(35, 26);
    ctx.quadraticCurveTo(36, 18, 42, 14);
  });
}

function karton(ctx, teil, P, atem) {
  ctx.save();
  ctx.translate(50, 96);
  ctx.scale(1, 0.84);
  ctx.translate(-50, -96);
  const linie = "#3d230c";
  if (teil === "hinten") {
    fuell(ctx, poly([[24, 62], [76, 62], [84, 55], [32, 55]]), "#5a3a1c");
  } else {
    const seite = poly([[76, 62], [84, 55], [84, 88], [76, 96]]);
    const front = poly([[24, 62], [76, 62], [76, 96], [24, 96]]);
    const klappeL = poly([[24, 62], [11, 52], [17, 45], [32, 55]]);
    const klappeR = poly([[76, 62], [91, 54], [93, 46], [84, 55]]);
    umriss(ctx, [seite, front, klappeL, klappeR], linie, 3.4);
    fuell(ctx, seite, "#a96d34");
    cel(ctx, front, "#eab679", "#cf904f", -4, -3);
    fuell(ctx, klappeL, "#dca468");
    fuell(ctx, klappeR, "#c88c4e");
    fuell(ctx, poly([[42, 73], [58, 73], [58, 77], [42, 77]]), "rgba(140, 90, 40, 0.55)");
    strich(ctx, "rgba(255, 240, 210, 0.8)", 1.4, () => {
      ctx.moveTo(27, 65);
      ctx.lineTo(73, 65);
    });
    // Pfötchen auf dem Kartonrand
    [40, 60].forEach((x) => {
      const pfote = ell(x, 62.5 - (atem - 1) * 30, 5.6, 4.2);
      umriss(ctx, [pfote], P.linie, 3.4);
      cel(ctx, pfote, P.bauch, P.bauchSchatten, -1, -1.4);
      strich(ctx, P.linie, 0.9, () => {
        ctx.moveTo(x - 1.6, 60.5);
        ctx.lineTo(x - 1.6, 63);
        ctx.moveTo(x + 1.6, 60.5);
        ctx.lineTo(x + 1.6, 63);
      });
    });
  }
  ctx.restore();
}

function halsband(ctx) {
  strich(ctx, "#5a0d1a", 4.6, () => ctx.ellipse(50, 66.5, 13, 3.6, 0, 0.1, Math.PI - 0.1));
  strich(ctx, "#ff4a66", 2.6, () => ctx.ellipse(50, 66.5, 13, 3.6, 0, 0.1, Math.PI - 0.1));
  const glocke = ell(50, 71.5, 3.6, 3.6);
  umriss(ctx, [glocke], GOLD.linie, 2.6);
  cel(ctx, glocke, GOLD.basis, GOLD.schatten, -1, -1.2);
  glanz(ctx, 48.8, 70.3, 1, 1, 0, 1);
  strich(ctx, GOLD.linie, 0.9, () => {
    ctx.moveTo(48, 73);
    ctx.lineTo(52, 73);
  });
}

// ---------- Katze ----------
export function zeichneAnimeKatze(ctx, p, x, y, Z, t, seed) {
  const weiss = p === p.toUpperCase();
  const P = PAL[weiss ? "w" : "b"];
  const typ = p.toUpperCase();
  const gr = GROESSE[typ];

  // Taktgeber (jede Katze leicht versetzt)
  const atem = 1 + 0.02 * Math.sin(t / 560 + seed * 6.28);
  const zu = (t + seed * 5000) % 4300 < 150;
  const nya = (t + seed * 6100) % 7300 < 650;
  const schwanzW = Math.sin(t / 520 + seed * 3) * 0.45 - 0.1;
  const zucken = (t + seed * 7000) % 5300 < 160 ? 0.25 : 0;
  const neigen = Math.sin(t / 1300 + seed * 2) * 0.05;
  const wackeln = Math.sin(t / 700 + seed * 4) * 0.08;
  // Hüpfer mit Stauchen und Strecken
  const hp = (t + seed * 2900) % 3600;
  let hoch = 0;
  let sy = 1;
  if (hp < 560) {
    const k = hp / 560;
    hoch = Math.sin(k * Math.PI) * 7;
    if (k < 0.15) sy = 1 - 0.1 * (k / 0.15);
    else if (k < 0.85) sy = 1.06;
    else sy = 1 - 0.1 * ((1 - k) / 0.15);
  }
  const sx = 1 / sy;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(Z / 100, Z / 100);
  // Schatten wird kleiner, wenn die Katze in der Luft ist
  glanz(ctx, 50, 94, 28 * gr * (1 - hoch / 30), 5.5, 0, 0.25, "#000000");
  ctx.translate(50, 96 - hoch);
  ctx.scale(gr * sx, gr * sy);
  ctx.translate(-50, -96);

  if (typ === "R") karton(ctx, "hinten", P, atem);
  else {
    // Schwanz (hinter dem Körper)
    ctx.save();
    ctx.translate(68, 86);
    ctx.rotate(schwanzW);
    const kurve = () => {
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(20, -2, 27, -20, 16, -34);
    };
    strich(ctx, P.linie, 11.5, kurve);
    strich(ctx, P.fell, 7.5, kurve);
    strich(ctx, P.schatten, 3, () => {
      ctx.moveTo(6, 1.5);
      ctx.bezierCurveTo(21, 1, 28, -16, 21, -28);
    });
    ctx.restore();

    // Körper + Pfötchen
    ctx.save();
    ctx.translate(50, 94);
    ctx.scale(1, atem);
    ctx.translate(-50, -94);
    const koerper = ell(50, 79, 20, 15.5);
    const pfoten = [ell(41, 92, 6.6, 4.6), ell(59, 92, 6.6, 4.6)];
    umriss(ctx, [koerper, ...pfoten], P.linie);
    cel(ctx, koerper, P.fell, P.schatten);
    // flauschiges Brustfell
    fuell(ctx, poly([[42, 68], [44, 75], [41, 79], [46, 80], [44, 86], [50, 83], [56, 86], [54, 80], [59, 79], [56, 75], [58, 68], [50, 71]]), P.bauch);
    pfoten.forEach((pf, i) => {
      cel(ctx, pf, P.bauch, P.bauchSchatten, -1, -1.4);
      const px = i ? 59 : 41;
      strich(ctx, P.linie, 0.9, () => {
        ctx.moveTo(px - 1.8, 89.5);
        ctx.lineTo(px - 1.8, 92.2);
        ctx.moveTo(px + 1.8, 89.5);
        ctx.lineTo(px + 1.8, 92.2);
      });
    });
    ctx.restore();
  }

  // Kopf (neigt sich, wippt mit dem Atmen)
  const kopfY = 94 - (94 - 46) * atem;
  ctx.save();
  ctx.translate(50, kopfY + 22);
  ctx.rotate(neigen);
  ctx.translate(-50, -(46 + 22));
  const ohrL = ohrPfad(-1, zucken);
  const ohrR = ohrPfad(1, 0);
  umriss(ctx, [ohrL, ohrR, kopf, backeL, backeR], P.linie);
  cel(ctx, ohrL, P.fell, P.schatten, 1.5, -2);
  cel(ctx, ohrR, P.fell, P.schatten, -2, -2);
  fuell(ctx, ohrPfad(-1, zucken, true), P.innenOhr);
  fuell(ctx, ohrPfad(1, 0, true), P.innenOhr);
  fuell(ctx, backeL, P.fell);
  fuell(ctx, backeR, P.schatten);
  cel(ctx, kopf, P.fell, P.schatten, -3.5, -3.4);
  // Glanzkante oben links
  strich(ctx, P.licht, 2.2, () => ctx.ellipse(50, 46, 24.5, 19.5, 0, Math.PI * 1.08, Math.PI * 1.42));
  if (P.streifen) {
    [[44, 25.5, 46.5, 32], [50, 24, 50, 31], [56, 25.5, 53.5, 32]].forEach(([a, b, c, d]) =>
      fuell(ctx, poly([[a - 1.6, b], [a + 1.6, b], [c, d]]), P.streifen),
    );
  }
  gesicht(ctx, P, weiss, zu, nya, typ === "P" ? 1.12 : 1, t, seed);
  if (typ === "K") krone(ctx);
  else if (typ === "Q") {
    diadem(ctx);
    schleife(ctx, wackeln);
  } else if (typ === "B") zauberhut(ctx, wackeln);
  else if (typ === "N") helm(ctx, wackeln);
  ctx.restore();

  if (typ === "R") karton(ctx, "vorne", P, atem);
  if (typ === "P") halsband(ctx);

  // ab und zu ein Funkeln neben dem Kopf
  const sp = (t + seed * 4100) % 5200;
  if (sp < 700) {
    const k = Math.sin((sp / 700) * Math.PI);
    const fx = seed > 0.5 ? 82 : 18;
    funkeln(ctx, fx, 22 + seed * 8, 4.6 * k + 1, P.linie);
    funkeln(ctx, fx, 22 + seed * 8, 4.6 * k, "#fff6a8");
  }
  ctx.restore();
}
