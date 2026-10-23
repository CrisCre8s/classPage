// Effekte beim Schlagen: „Explosion“ für alle Figuren oder „passend“ zur schlagenden Figur.
// Alles in Brett-Einheiten (ein Feld = Z). Teilchen bewegen sich nach Formel (Zeit seit Start),
// dadurch braucht es keinen eigenen Zustand pro Bild.

export const EFFEKTE = [
  { id: "aus", name: "Aus" },
  { id: "explosion", name: "Explosion" },
  { id: "passend", name: "Passend zur Figur" },
];

const zufall = (a, b) => a + Math.random() * (b - a);
const wahl = (liste) => liste[Math.floor(Math.random() * liste.length)];

// Wie die schlagende Figur sich bewegt (nur bei „passend“): Springer springt hoch, Turm rammt geradeaus …
export function bewegung(art, typ) {
  if (art !== "passend") return null;
  return (
    {
      N: { hop: 30, ease: (t) => 1 - (1 - t) ** 2 },
      R: { hop: 0, ease: (t) => t * t * t }, // wird immer schneller
      Q: { hop: 0, ease: (t) => 1 - (1 - t) ** 4 },
      K: { hop: 16, ease: (t) => (t < 0.7 ? (t / 0.7) * 0.9 : 0.9 + ((t - 0.7) / 0.3) * 0.1) },
      P: { hop: 4, ease: (t) => t * t },
      B: { hop: 2, ease: (t) => 1 - (1 - t) ** 3 },
    }[typ] || null
  );
}

// Teilchen: q = Pixelquadrat, c = Kreis (wächst, z. B. Rauch), s = Stern
function teil(x, y, o) {
  return { x, y, vx: 0, vy: 0, g: 0, verz: 0, leben: 600, groesse: 4, wachsen: 0, form: "q", farbe: "#fff", ...o };
}

// Kopf-Farbe des Opfers für Splitter (passt grob zu allen Figurensätzen)
const splitterFarben = (opfer) => (opfer === opfer.toUpperCase() ? ["#f4f1f8", "#d9d4e4", "#b9b2c8"] : ["#3a3346", "#5a4f6e", "#1f1a27"]);

export function erzeuge({ art, angreifer, opfer, sq, dir, start, Z }) {
  const cx = (sq % 8) * Z + Z / 2;
  const cy = Math.floor(sq / 8) * Z + Z / 2;
  const typ = art === "explosion" ? "X" : angreifer.toUpperCase();
  const e = { typ, opfer, cx, cy, dir, start, dauer: 700, wackeln: null, teile: [], seed: Math.random() };
  const T = e.teile;
  const splitter = splitterFarben(opfer);

  if (typ === "X") {
    e.dauer = 1100;
    e.wackeln = { dauer: 260, staerke: 8 };
    for (let i = 0; i < 34; i++) {
      const w = zufall(0, Math.PI * 2);
      const v = zufall(0.12, 0.42);
      T.push(teil(cx, cy, { vx: Math.cos(w) * v, vy: Math.sin(w) * v - 0.08, g: 0.0006, leben: zufall(450, 850), groesse: wahl([3, 4, 5, 6]), farbe: wahl(["#fff3b0", "#ffd25e", "#ff9f40", "#ff6a3a"]) }));
    }
    for (let i = 0; i < 10; i++) {
      const w = zufall(0, Math.PI * 2);
      const v = zufall(0.08, 0.22);
      T.push(teil(cx, cy, { vx: Math.cos(w) * v, vy: Math.sin(w) * v - 0.12, g: 0.0009, leben: zufall(700, 1000), groesse: wahl([6, 7, 8]), farbe: wahl(splitter), dreh: zufall(-0.02, 0.02) }));
    }
    for (let i = 0; i < 7; i++)
      T.push(teil(cx + zufall(-12, 12), cy + zufall(-8, 8), { vx: zufall(-0.02, 0.02), vy: zufall(-0.06, -0.03), verz: zufall(120, 260), leben: zufall(700, 900), groesse: zufall(10, 16), wachsen: 0.03, form: "c", farbe: wahl(["#5a5560", "#45414c", "#6d6873"]) }));
    return e;
  }

  const [dx, dy] = dir;
  if (typ === "P") {
    // Stich: kurzer Funkenkegel in Zugrichtung
    e.dauer = 520;
    for (let i = 0; i < 14; i++) {
      const w = Math.atan2(dy, dx) + zufall(-0.6, 0.6);
      const v = zufall(0.12, 0.3);
      T.push(teil(cx, cy, { vx: Math.cos(w) * v, vy: Math.sin(w) * v, leben: zufall(220, 420), groesse: wahl([2, 3, 4]), farbe: wahl(["#ffffff", "#fff3b0", "#ffd25e"]) }));
    }
  } else if (typ === "N") {
    // Stampfer: Druckwelle und Staub am Boden
    e.dauer = 700;
    e.wackeln = { dauer: 170, staerke: 5 };
    for (let i = 0; i < 14; i++) {
      const seite = i % 2 ? 1 : -1;
      T.push(teil(cx + seite * zufall(4, 14), cy + Z * 0.3, { vx: seite * zufall(0.05, 0.16), vy: zufall(-0.06, -0.01), g: 0.0002, leben: zufall(450, 650), groesse: zufall(5, 9), wachsen: 0.015, form: "c", farbe: wahl(["#c9b08a", "#b59a74", "#d8c4a2"]) }));
    }
  } else if (typ === "B") {
    // Schnitt: das Opfer zerfällt in zwei Hälften
    e.dauer = 800;
    e.diagonale = dx * dy > 0 ? 1 : -1;
    for (let i = 0; i < 10; i++) {
      const t = zufall(-0.5, 0.5);
      T.push(teil(cx + t * Z * e.diagonale * -1, cy + t * Z, { vx: zufall(-0.05, 0.05), vy: zufall(-0.08, 0.02), g: 0.0005, verz: 60, leben: zufall(300, 500), groesse: 3, farbe: "#ffffff" }));
    }
  } else if (typ === "R") {
    // Rammbock: Opfer fliegt weg, Steinbrocken, starkes Wackeln
    e.dauer = 800;
    e.wackeln = { dauer: 300, staerke: 10 };
    for (let i = 0; i < 12; i++) {
      const w = Math.atan2(dy, dx) + zufall(-1, 1);
      const v = zufall(0.1, 0.32);
      T.push(teil(cx, cy, { vx: Math.cos(w) * v, vy: Math.sin(w) * v - 0.1, g: 0.0008, leben: zufall(500, 800), groesse: wahl([4, 5, 6, 7]), farbe: wahl(["#8d8796", "#6f6a78", "#a8a2b0"]), dreh: zufall(-0.02, 0.02) }));
    }
    for (let i = 0; i < 5; i++)
      T.push(teil(cx, cy + Z * 0.25, { vx: zufall(-0.06, 0.06), vy: zufall(-0.05, -0.02), leben: 650, groesse: 8, wachsen: 0.02, form: "c", farbe: "#77727f" }));
  } else if (typ === "Q") {
    // Blitz: Einschlag von oben, das Opfer zerfällt zu Asche
    e.dauer = 900;
    e.wackeln = { dauer: 140, staerke: 4 };
    for (let i = 0; i < 18; i++)
      T.push(teil(cx + zufall(-Z * 0.3, Z * 0.3), cy + zufall(-Z * 0.2, Z * 0.3), { vx: zufall(-0.02, 0.02), vy: zufall(-0.09, -0.04), verz: zufall(150, 400), leben: zufall(400, 600), groesse: wahl([2, 3, 4]), farbe: wahl(["#2a2630", "#3d3845", "#57505f", "#ffb347"]) }));
  } else if (typ === "K") {
    // Krone: plattgedrückt, goldene Sterne
    e.dauer = 900;
    e.wackeln = { dauer: 150, staerke: 4 };
    for (let i = 0; i < 6; i++) {
      const w = -Math.PI / 2 + (i - 2.5) * 0.45;
      T.push(teil(cx, cy, { vx: Math.cos(w) * 0.1, vy: Math.sin(w) * 0.12, g: 0.0002, verz: 80, leben: 700, groesse: 7, form: "s", farbe: wahl(["#ffd84a", "#f5c542", "#fff0a0"]) }));
    }
  }
  return e;
}

// Wackeln des ganzen Bretts (Pixel-Versatz) zum Zeitpunkt t
export function wackeln(effekte, t) {
  let s = 0;
  for (const e of effekte) {
    if (!e.wackeln) continue;
    const a = t - e.start;
    if (a >= 0 && a < e.wackeln.dauer) s = Math.max(s, e.wackeln.staerke * (1 - a / e.wackeln.dauer));
  }
  return s ? [zufall(-s, s), zufall(-s, s)] : null;
}

function stern(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const w = (i * Math.PI) / 5 - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(w) * rr, y + Math.sin(w) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

function zeichneTeile(ctx, e, a) {
  for (const p of e.teile) {
    const age = a - p.verz;
    if (age < 0 || age > p.leben) continue;
    const k = age / p.leben;
    const x = p.x + p.vx * age;
    const y = p.y + p.vy * age + 0.5 * p.g * age * age;
    const gr = p.groesse + p.wachsen * age;
    ctx.globalAlpha = p.form === "c" ? 0.55 * (1 - k) : 1 - k * k;
    ctx.fillStyle = p.farbe;
    if (p.form === "c") {
      ctx.beginPath();
      ctx.arc(x, y, gr, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.form === "s") {
      stern(ctx, x, y, gr * (1 - k * 0.4));
    } else if (p.dreh) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(p.dreh * age);
      ctx.fillRect(-gr / 2, -gr / 2, gr, gr);
      ctx.restore();
    } else {
      ctx.fillRect(Math.round(x - gr / 2), Math.round(y - gr / 2), gr, gr);
    }
  }
  ctx.globalAlpha = 1;
}

// Opfer mit Verformung zeichnen (um die Feldmitte)
let zeigeOpfer = true; // wird pro Zeichen-Ebene gesetzt (siehe zeichne)
function opferZeichnen(ctx, e, zeichneFigur, Z, { dx = 0, dy = 0, sx = 1, sy = 1, rot = 0, alpha = 1, unten = false }) {
  if (!zeigeOpfer || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const ay = unten ? e.cy + Z * 0.4 : e.cy; // „unten“: vom Boden aus stauchen
  ctx.translate(e.cx + dx, ay + dy);
  ctx.rotate(rot);
  ctx.scale(sx, sy);
  ctx.translate(-e.cx, -ay);
  zeichneFigur(e.opfer, e.cx - Z / 2, e.cy - Z / 2);
  ctx.restore();
}

// ebene „unten“ = unter den Figuren (plattgedrückte Opfer), „oben“ = alles andere darüber
export function zeichne(ctx, e, t, zeichneFigur, Z, ebene = "oben") {
  const a = t - e.start;
  if (a < 0) return;
  const rest = ebene === "oben";
  const opferEbene = e.typ === "N" || e.typ === "K" ? "unten" : "oben";
  zeigeOpfer = ebene === opferEbene;
  const { cx, cy } = e;
  const [dx, dy] = e.dir;

  if (e.typ === "X") {
    if (!rest) return;
    // Blitzlicht, Feuerball, dann Teilchen
    if (a < 160) {
      ctx.globalAlpha = 0.85 * (1 - a / 160);
      ctx.fillStyle = "#fffbe8";
      ctx.beginPath();
      ctx.arc(cx, cy, 10 + (a / 160) * Z * 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
    if (a < 420) {
      const f = a / 420;
      const r = Z * (0.25 + 0.6 * Math.sqrt(f));
      [["#ff5e3a", 1], ["#ffb347", 0.72], ["#fff3b0", 0.42]].forEach(([farbe, anteil]) => {
        ctx.globalAlpha = (1 - f) * 0.9;
        ctx.fillStyle = farbe;
        ctx.beginPath();
        ctx.arc(cx, cy, r * anteil, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    ctx.globalAlpha = 1;
    zeichneTeile(ctx, e, a);
    return;
  }

  if (e.typ === "P") {
    // Opfer schrumpft mit kleiner Drehung weg, dazu ein heller Treffer-Stern
    const f = Math.min(1, a / 260);
    opferZeichnen(ctx, e, zeichneFigur, Z, { sx: 1 - f, sy: 1 - f, rot: f * 0.8 * (dx || 1), alpha: 1 - f });
    if (rest && a < 200) {
      ctx.globalAlpha = 1 - a / 200;
      ctx.fillStyle = "#ffffff";
      stern(ctx, cx - dx * Z * 0.2, cy - dy * Z * 0.2, 10 + a / 12);
      ctx.globalAlpha = 1;
    }
  } else if (e.typ === "N") {
    // plattgetreten + Druckwelle
    const f = Math.min(1, a / 180);
    opferZeichnen(ctx, e, zeichneFigur, Z, { sx: 1 + 0.5 * f, sy: 1 - 0.88 * f, alpha: a < 300 ? 1 : 1 - (a - 300) / 200, unten: true });
    if (rest && a < 450) {
      const w = a / 450;
      ctx.strokeStyle = `rgba(255, 244, 214, ${0.8 * (1 - w)})`;
      ctx.lineWidth = 4 * (1 - w) + 1;
      ctx.beginPath();
      ctx.ellipse(cx, cy + Z * 0.32, 8 + w * Z * 0.9, 3 + w * Z * 0.28, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (e.typ === "B") {
    // Schnitt quer übers Feld, die zwei Hälften gleiten auseinander und fallen
    const h = Z / 2;
    const d = e.diagonale; // 1: Linie von oben rechts nach unten links
    const versatz = Math.max(0, a - 120);
    const weg = versatz * 0.05;
    const fall = 0.0004 * versatz * versatz;
    const alpha = a < 450 ? 1 : 1 - (a - 450) / 300;
    const haelfte = (seite) => {
      ctx.save();
      ctx.beginPath();
      if (d > 0) {
        if (seite > 0) ctx.moveTo(cx + h, cy - h), ctx.lineTo(cx + h, cy + h), ctx.lineTo(cx - h, cy + h);
        else ctx.moveTo(cx + h, cy - h), ctx.lineTo(cx - h, cy - h), ctx.lineTo(cx - h, cy + h);
      } else {
        if (seite > 0) ctx.moveTo(cx - h, cy - h), ctx.lineTo(cx + h, cy - h), ctx.lineTo(cx + h, cy + h);
        else ctx.moveTo(cx - h, cy - h), ctx.lineTo(cx - h, cy + h), ctx.lineTo(cx + h, cy + h);
      }
      ctx.closePath();
      // Teilfläche verschieben, dann zuschneiden
      const sx = seite * weg * (d > 0 ? 0.7 : -0.7);
      const sy = seite * weg * 0.7 + fall;
      ctx.translate(sx, sy);
      ctx.clip();
      opferZeichnen(ctx, e, zeichneFigur, Z, { rot: seite * versatz * 0.0012, alpha });
      ctx.restore();
    };
    haelfte(1);
    haelfte(-1);
    if (rest && a < 260) {
      const f = Math.min(1, a / 90);
      ctx.globalAlpha = a < 90 ? 1 : 1 - (a - 90) / 170;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      const x0 = d > 0 ? cx + h * 1.1 : cx - h * 1.1;
      const x1 = d > 0 ? cx - h * 1.1 : cx + h * 1.1;
      ctx.moveTo(x0, cy - h * 1.1);
      ctx.lineTo(x0 + (x1 - x0) * f, cy - h * 1.1 + 2.2 * h * f);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  } else if (e.typ === "R") {
    // weggeschleudert in Zugrichtung, mit Drehung
    const w = a * 0.32;
    opferZeichnen(ctx, e, zeichneFigur, Z, { dx: dx * w, dy: dy * w - 0.12 * a + 0.0004 * a * a, rot: (dx || 1) * a * 0.012, alpha: 1 - Math.min(1, a / 450) });
  } else if (e.typ === "Q") {
    // Blitz von oben (zackig, flackert), Opfer verglüht
    if (rest && a < 260) {
      const flacker = Math.floor(a / 40) + e.seed;
      let r = flacker * 9301;
      const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280) - 0.5;
      ctx.strokeStyle = "#cfe6ff";
      ctx.lineWidth = 6;
      ctx.shadowColor = "#7fb8ff";
      ctx.shadowBlur = 16;
      ctx.globalAlpha = 1 - a / 260;
      ctx.beginPath();
      let x = cx + rnd() * Z;
      ctx.moveTo(x, 0);
      const stufen = 9;
      for (let i = 1; i <= stufen; i++) {
        x = i === stufen ? cx : x + rnd() * 30;
        ctx.lineTo(x, (cy * i) / stufen);
      }
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      if (a < 120) {
        ctx.globalAlpha = 0.6 * (1 - a / 120);
        ctx.fillStyle = "#e8f3ff";
        ctx.beginPath();
        ctx.arc(cx, cy, Z * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    const f = Math.min(1, a / 500);
    ctx.save();
    ctx.filter = `brightness(${1 - f * 0.9})`;
    opferZeichnen(ctx, e, zeichneFigur, Z, { sy: 1 - f * 0.3, alpha: 1 - f, unten: true });
    ctx.restore();
  } else if (e.typ === "K") {
    // langsam plattgedrückt
    const f = Math.min(1, a / 260);
    opferZeichnen(ctx, e, zeichneFigur, Z, { sx: 1 + 0.35 * f, sy: 1 - 0.9 * f, alpha: a < 450 ? 1 : 1 - (a - 450) / 250, unten: true });
  }
  if (rest) zeichneTeile(ctx, e, a);
}
