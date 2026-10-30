// Billard (8-Ball) gegen den Computer oder zu zweit an einem Gerät. Physik und Regeln in billard-physik.js,
// der Computer-Gegner in billard-ki.js.
import { overlayKlick } from "./eingabe.js";
import * as P from "./billard-physik.js";
import { planeStoss, legeWeisse } from "./billard-ki.js";
import { startLage, rolle, kugelTextur } from "./billard-kugel.js";

export const HILFE = "Zielen: zeigen oder antippen · Stoßen: gedrückt halten, zurückziehen, loslassen · Tastatur: ← → zielen (Shift fein), ↑ ↓ Kraft, Leertaste stoßen";

const { W, H, X0, X1, Y0, Y1, R, MITTE_X, MITTE_Y, LOECHER, MAX_TEMPO } = P;
const ZUG_MAX = 150; // so weit zurückziehen = volle Kraft
const FARBE = { 1: "#f2c230", 2: "#2f6fe0", 3: "#e0393c", 4: "#7a4bc0", 5: "#f07f1d", 6: "#1f9a57", 7: "#9a2a3a", 8: "#17161c" };
const LINIE = { leicht: 140, mittel: 80, schwer: 40 }; // Länge der Hilfslinie hinter der getroffenen Kugel
const DENKZEIT = 650;

function hdCanvas(ctx, canvas) {
  const dpr = Math.min(3, Math.max(2, window.devicePixelRatio || 1));
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.skala = dpr;
  return ctx;
}

// Die Löcher sind Netze: von oben sieht man in den Netzbeutel, versenkte Kugeln bleiben darin liegen.
// Liegeplätze im Loch (Abstand von der Lochmitte, leicht nach außen versetzt), danach stapeln sie sich.
const NETZE = LOECHER.map((l) => {
  const ux = l.ecke ? Math.sign(l.x - MITTE_X) * Math.SQRT1_2 : 0;
  const uy = l.ecke ? Math.sign(l.y - MITTE_Y) * Math.SQRT1_2 : Math.sign(l.y - MITTE_Y);
  return { l, ux, uy, r: l.r + 3 };
});
const PLAETZE = [[2, 0], [-3, -6], [-3, 6], [6, -5], [6, 5], [-7, 0], [0, -9], [0, 9], [8, 0], [-5, -3], [-5, 3], [4, 0], [0, -4], [0, 4], [-2, 0], [3, -2]];
const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
};

export function start({ canvas, tools, stufe, passeCanvas, status, nachricht, ergebnis }) {
  const ctx = hdCanvas(passeCanvas(canvas, W, H), canvas);
  let kugeln, gruppen, amZug, anstoss, ballInHand, zustand, vorher, stoss, raf, zuletzt, rest;
  let winkel = 0;
  let kraft = 0.6; // Tastatur-Kraft (0..1)
  let ziehen = null; // { start: {x,y}, kraft }
  let queue = null; // Animation des Queues beim Stoß
  let legen = null; // Weiße wird gerade hingelegt { x, y, frei }
  let hinweise = []; // kurze Einblendungen
  let netz = LOECHER.map(() => []); // je Loch: Kugeln im Netz { n, von: {x, y}, t, platz }
  let lagen = {}; // je Kugel: Drehlage, Textur und ob sie neu gezeichnet werden muss
  const TEX = Math.ceil((2 * R + 2) * (ctx.skala || 2));
  let cpuPlan = null;
  let zweiSpieler = false;
  let partie = 0;
  let pausiert = false;
  let t = 0;

  const NAMEN = () => (zweiSpieler ? ["Spieler 1", "Spieler 2"] : ["Du", "Computer"]);
  const mensch = () => zweiSpieler || amZug === 0;

  function neu() {
    kugeln = P.aufbauen();
    gruppen = { 0: null, 1: null };
    partie++;
    amZug = zweiSpieler && partie % 2 === 0 ? 1 : 0;
    anstoss = true;
    ballInHand = false;
    hinweise = [];
    netz = LOECHER.map(() => []);
    lagen = {};
    for (const k of kugeln) lagen[k.n] = { m: startLage(), tex: null, neu: true };
    queue = null;
    ziehen = null;
    legen = null;
    rest = 0;
    nachricht(null);
    winkel = 0;
    zugBeginnt();
  }

  function zugBeginnt() {
    zustand = "zielen";
    if (ballInHand) {
      zustand = "legen";
      kugeln[0].drin = true;
    }
    zeigeStatus();
    if (!mensch()) cpuZug();
    else if (zustand === "legen") {
      legen = null;
      legePruefen({ x: kugeln[0].x, y: kugeln[0].y });
    }
  }

  function zeigeStatus() {
    const n = NAMEN();
    const g = (s) => (gruppen[s] === "voll" ? " (Volle)" : gruppen[s] === "halb" ? " (Halbe)" : "");
    const wer = amZug === 0 && !zweiSpieler ? "Du bist dran" : `${n[amZug]} ist dran`;
    status(`${wer}${g(amZug)}${ballInHand ? " · Ball in der Hand" : ""}`);
  }

  function hinweis(text, farbe = "#f2f2f3") {
    hinweise.push({ text, farbe, t: 0 });
    if (hinweise.length > 3) hinweise.shift();
  }

  // ---------- Stoß ----------
  function stosse(w, tempo) {
    if (zustand !== "zielen") return;
    vorher = P.kopie(kugeln);
    stoss = P.neuerStoss();
    zustand = "stoss";
    queue = { t: 0, winkel: w, tempo, zug: Math.min(1, tempo / MAX_TEMPO) };
    winkel = w;
  }
  function losRollen() {
    const w = kugeln[0];
    w.vx = Math.cos(queue.winkel) * queue.tempo;
    w.vy = Math.sin(queue.winkel) * queue.tempo;
    zustand = "rollt";
  }

  function stossVorbei() {
    const spieler = amZug;
    const r = P.bewerte({ spieler, gruppen, vorher, stoss, anstoss });
    const n = NAMEN();
    if (r.ende) {
      zustand = "vorbei";
      const gewonnen = r.sieger === 0;
      if (!zweiSpieler) ergebnis({ gewonnen });
      const titel = zweiSpieler ? `${n[r.sieger]} gewinnt!` : gewonnen ? "Gewonnen!" : "Verloren";
      const diese = partie;
      setTimeout(() => {
        if (zustand === "vorbei" && partie === diese) nachricht(`<p class="big">${titel}</p><p>${r.grund}</p><p class="small">Leertaste oder Klick für eine neue Partie</p>`);
      }, 900);
      status(titel);
      return;
    }
    if (r.achtZurueck) {
      const acht = kugeln.find((k) => k.n === 8);
      acht.drin = false;
      let x = X0 + (X1 - X0) * 0.73;
      while (!P.freierPlatz(kugeln, x, MITTE_Y)) x += 2 * R + 1;
      acht.x = x;
      acht.y = MITTE_Y;
      ausNetz(8);
      hinweis("Die 8 kommt zurück aufs Feld");
    }
    if (r.foul) hinweis(`Foul: ${r.foul}`, "#e5566f");
    if (r.zugewiesen) {
      const wer = zweiSpieler || spieler === 1 ? n[spieler] : "Du";
      hinweis(`${wer} ${spieler === 0 && !zweiSpieler ? "spielst" : "spielt"} die ${r.zugewiesen === "voll" ? "Vollen" : "Halben"}`, "#f5d97a");
    }
    gruppen = r.gruppen || gruppen;
    ballInHand = r.ballInHand || kugeln[0].drin;
    if (kugeln[0].drin) {
      kugeln[0].x = X0 + (X1 - X0) * 0.25;
      kugeln[0].y = MITTE_Y;
    }
    if (r.naechster !== spieler && !r.foul) hinweis(`${n[r.naechster]} ist dran`, "#8a8698");
    amZug = r.naechster;
    anstoss = false;
    zugBeginnt();
  }

  // ---------- Computer ----------
  function cpuZug() {
    zustand = "cpu";
    const meinZug = { partie };
    cpuPlan = null;
    setTimeout(() => {
      if (partie !== meinZug.partie || zustand !== "cpu") return;
      if (ballInHand) {
        const p = legeWeisse({ kugeln, gruppen, spieler: amZug, anstoss });
        Object.assign(kugeln[0], { x: p.x, y: p.y, drin: false, vx: 0, vy: 0 });
        ausNetz(0);
        ballInHand = false;
      }
      const plan = planeStoss({ kugeln, gruppen, spieler: amZug, anstoss, stufe });
      cpuPlan = { ...plan, start: winkel, t: 0 };
    }, DENKZEIT);
  }

  // ---------- Eingabe ----------
  const punkt = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };
  const zielAuf = (p) => {
    const w = kugeln[0];
    if (Math.hypot(p.x - w.x, p.y - w.y) > R * 1.5) winkel = Math.atan2(p.y - w.y, p.x - w.x);
  };
  function legePruefen(p) {
    const x = Math.max(X0 + R, Math.min(X1 - R, p.x));
    const y = Math.max(Y0 + R, Math.min(Y1 - R, p.y));
    legen = { x, y, frei: P.freierPlatz(kugeln, x, y), ziehen: legen?.ziehen };
  }
  function legeHin() {
    if (!legen?.frei) return false;
    Object.assign(kugeln[0], { x: legen.x, y: legen.y, drin: false, vx: 0, vy: 0 });
    ausNetz(0);
    legen = null;
    ballInHand = false;
    zustand = "zielen";
    zeigeStatus();
    return true;
  }

  const onMove = (e) => {
    if (pausiert || !mensch()) return;
    const p = punkt(e);
    if (zustand === "legen") {
      if (e.pointerType === "mouse" || legen?.ziehen) legePruefen(p);
      return;
    }
    if (zustand !== "zielen") return;
    if (ziehen) {
      const dx = ziehen.start.x - p.x;
      const dy = ziehen.start.y - p.y;
      ziehen.kraft = Math.max(0, Math.min(1, (dx * Math.cos(winkel) + dy * Math.sin(winkel)) / ZUG_MAX));
    } else if (e.pointerType === "mouse") zielAuf(p);
  };
  const onDown = (e) => {
    e.preventDefault();
    canvas.focus({ preventScroll: true });
    if (pausiert || !mensch()) return;
    const p = punkt(e);
    if (zustand === "legen") {
      legePruefen(p);
      legen.ziehen = true;
      canvas.setPointerCapture?.(e.pointerId);
      return;
    }
    if (zustand !== "zielen") return;
    zielAuf(p);
    ziehen = { start: p, kraft: 0 };
    canvas.setPointerCapture?.(e.pointerId);
  };
  const onUp = (e) => {
    if (zustand === "legen" && legen?.ziehen) {
      legePruefen(punkt(e));
      legen.ziehen = false;
      legeHin();
      return;
    }
    if (!ziehen) return;
    const k = ziehen.kraft;
    ziehen = null;
    if (k > 0.04 && zustand === "zielen") stosse(winkel, 120 + k * (MAX_TEMPO - 120));
  };
  const onKey = (e) => {
    if (document.activeElement !== canvas && document.activeElement !== document.body) return;
    if (zustand === "vorbei" && (e.key === " " || e.key === "Enter")) {
      e.preventDefault();
      return neu();
    }
    if (pausiert || !mensch()) return;
    const fein = e.shiftKey ? 0.002 : 0.02;
    if (zustand === "legen") {
      const s = e.shiftKey ? 1 : 6;
      const d = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] }[e.key];
      if (d) {
        e.preventDefault();
        legePruefen({ x: (legen?.x ?? MITTE_X) + d[0], y: (legen?.y ?? MITTE_Y) + d[1] });
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        legeHin();
      }
      return;
    }
    if (zustand !== "zielen") return;
    if (e.key === "ArrowLeft") winkel -= fein;
    else if (e.key === "ArrowRight") winkel += fein;
    else if (e.key === "ArrowUp") kraft = Math.min(1, kraft + 0.05);
    else if (e.key === "ArrowDown") kraft = Math.max(0.05, kraft - 0.05);
    else if (e.key === " " || e.key === "Enter") stosse(winkel, 120 + kraft * (MAX_TEMPO - 120));
    else return;
    e.preventDefault();
  };
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  window.addEventListener("keydown", onKey);
  const aus = overlayKlick(() => zustand === "vorbei" && neu());

  // ---------- Ablauf ----------
  function loop(ms) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (ms - (zuletzt || ms)) / 1000);
    zuletzt = ms;
    if (!pausiert) aktualisiere(dt);
    zeichne();
  }
  function aktualisiere(dt) {
    t += dt;
    for (const h of hinweise) h.t += dt;
    hinweise = hinweise.filter((h) => h.t < 2.4);
    for (const liste of netz) for (const k of liste) k.t += dt;
    if (zustand === "cpu" && cpuPlan) {
      // Computer schwenkt den Queue sichtbar zum Ziel, holt aus und stößt
      cpuPlan.t += dt;
      const k = Math.min(1, cpuPlan.t / 0.7);
      const e = 1 - Math.pow(1 - k, 3);
      let d = cpuPlan.winkel - cpuPlan.start;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      winkel = cpuPlan.start + d * e;
      ziehen = cpuPlan.t > 0.8 ? { kraft: Math.min(cpuPlan.tempo / MAX_TEMPO, (cpuPlan.t - 0.8) / 0.45) } : null;
      if (cpuPlan.t > 1.35) {
        const plan = cpuPlan;
        cpuPlan = null;
        ziehen = null;
        zustand = "zielen";
        stosse(plan.winkel, plan.tempo);
      }
    }
    if (zustand === "stoss") {
      queue.t += dt;
      if (queue.t > 0.07) losRollen();
    }
    if (zustand === "rollt") {
      if (queue) queue.t += dt;
      rest += dt;
      while (rest >= P.DT) {
        const vor = stoss.versenkt.length;
        const alt = kugeln.map((k) => [k.x, k.y]);
        P.schritt(kugeln, stoss);
        // jede Kugel dreht sich um genau die Strecke, die sie gerollt ist
        kugeln.forEach((k, i) => {
          if (k.drin) return;
          if (rolle(lagen[k.n].m, k.x - alt[i][0], k.y - alt[i][1], R)) lagen[k.n].neu = true;
        });
        for (const n of stoss.versenkt.slice(vor)) {
          const k = kugeln.find((b) => b.n === n);
          const i = LOECHER.indexOf(k.loch);
          netz[i].push({ n, von: { x: k.x, y: k.y }, t: 0, platz: netz[i].length });
        }
        rest -= P.DT;
      }
      if (!P.rollt(kugeln)) {
        rest = 0;
        queue = null;
        stossVorbei();
      }
    }
  }

  // ---------- Zeichnen ----------
  function zeichneTisch() {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#0d0c12");
    bg.addColorStop(1, "#15131c");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    // Holzrahmen
    const rand = 30;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    const holz = ctx.createLinearGradient(0, Y0 - rand, 0, Y1 + rand);
    holz.addColorStop(0, "#6b3f24");
    holz.addColorStop(0.5, "#4f2c18");
    holz.addColorStop(1, "#3a1f10");
    ctx.fillStyle = holz;
    ctx.beginPath();
    ctx.roundRect(X0 - rand, Y0 - rand, X1 - X0 + 2 * rand, Y1 - Y0 + 2 * rand, 18);
    ctx.fill();
    ctx.restore();
    // Maserung
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(X0 - rand, Y0 - rand, X1 - X0 + 2 * rand, Y1 - Y0 + 2 * rand, 18);
    ctx.clip();
    ctx.strokeStyle = "rgba(255,220,180,0.05)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 14; i++) {
      ctx.beginPath();
      const y = Y0 - rand + 4 + i * 4.3;
      ctx.moveTo(X0 - rand, y);
      ctx.bezierCurveTo(200, y + 3, 500, y - 3, X1 + rand, y + 1);
      ctx.stroke();
      ctx.beginPath();
      const y2 = Y1 + 4 + i * 1.8;
      ctx.moveTo(X0 - rand, y2);
      ctx.bezierCurveTo(250, y2 - 2, 450, y2 + 2, X1 + rand, y2);
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = "rgba(255,230,200,0.18)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(X0 - rand + 1, Y0 - rand + 1, X1 - X0 + 2 * rand - 2, Y1 - Y0 + 2 * rand - 2, 17);
    ctx.stroke();
    // Diamanten auf dem Rahmen
    ctx.fillStyle = "#e9dcc4";
    for (let i = 1; i < 8; i++) {
      if (i === 4) continue;
      const x = X0 + ((X1 - X0) * i) / 8;
      for (const y of [Y0 - rand / 2 - 2, Y1 + rand / 2 + 2]) raute(x, y, 2.6);
    }
    for (let i = 1; i < 4; i++) {
      const y = Y0 + ((Y1 - Y0) * i) / 4;
      for (const x of [X0 - rand / 2 - 2, X1 + rand / 2 + 2]) raute(x, y, 2.6);
    }
    // Banden (Gummi) und Tuch
    ctx.fillStyle = "#145a49";
    ctx.fillRect(X0 - 8, Y0 - 8, X1 - X0 + 16, Y1 - Y0 + 16);
    const tuch = ctx.createRadialGradient(MITTE_X, MITTE_Y, 30, MITTE_X, MITTE_Y, 400);
    tuch.addColorStop(0, "#22977a");
    tuch.addColorStop(1, "#17705b");
    ctx.fillStyle = tuch;
    ctx.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
    // Schatten der Banden aufs Tuch
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = 3;
    ctx.strokeRect(X0 + 1.5, Y0 + 1.5, X1 - X0 - 3, Y1 - Y0 - 3);
    // feine Tuchstruktur
    ctx.fillStyle = "rgba(255,255,255,0.018)";
    for (let y = Y0; y < Y1; y += 3) ctx.fillRect(X0, y, X1 - X0, 1);
    // Kopflinie und Fußpunkt
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(X0 + (X1 - X0) * 0.25, Y0);
    ctx.lineTo(X0 + (X1 - X0) * 0.25, Y1);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.beginPath();
    ctx.arc(X0 + (X1 - X0) * 0.73, MITTE_Y, 2, 0, Math.PI * 2);
    ctx.fill();
    zeichneLoecher();
    // Lampenlicht von oben
    const licht = ctx.createRadialGradient(MITTE_X, MITTE_Y - 40, 40, MITTE_X, MITTE_Y, 420);
    licht.addColorStop(0, "rgba(255,250,230,0.08)");
    licht.addColorStop(1, "rgba(0,0,0,0.25)");
    ctx.fillStyle = licht;
    ctx.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
  }
  function raute(x, y, s) {
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.lineTo(x + s * 0.7, y);
    ctx.lineTo(x, y + s);
    ctx.lineTo(x - s * 0.7, y);
    ctx.fill();
  }

  // Kugel mit ihrer Drehlage zeichnen (Textur nur neu rechnen, wenn sie sich gedreht hat)
  function zeichneKugel3D(n, x, y, s = 1, schatten = true) {
    const l = lagen[n];
    if (!l) return zeichneKugel(n, x, y, R * s, schatten);
    if (l.neu || !l.tex) {
      l.tex = kugelTextur(n, l.m, TEX, l.tex);
      l.neu = false;
    }
    if (schatten) {
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.ellipse(x + 2.5 * s, y + 3 * s, R * s, R * s * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    const g = ((R + 1) * s);
    ctx.drawImage(l.tex, x - g, y - g, 2 * g, 2 * g);
  }

  // Position einer Kugel im Netz: rollt zum Loch, plumpst hinein und bleibt im Netz liegen
  function netzOrt(i, e) {
    const N = NETZE[i];
    const [a, b] = PLAETZE[e.platz % PLAETZE.length];
    const lage = Math.floor(e.platz / PLAETZE.length); // ab der zweiten Runde liegen sie obendrauf
    const ziel = { x: N.l.x + N.ux * a - N.uy * b + lage * 1.5, y: N.l.y + N.uy * a + N.ux * b - lage * 1.5 };
    if (e.t < 0.1) {
      const k = e.t / 0.1;
      return { x: e.von.x + (N.l.x - e.von.x) * k, y: e.von.y + (N.l.y - e.von.y) * k, s: 1 - k * 0.1, oben: true };
    }
    const k = Math.min(1, (e.t - 0.1) / 0.35);
    const ein = 1 - Math.pow(1 - k, 3);
    // fällt ins Netz: wird kleiner (tiefer), federt einmal nach
    const feder = Math.sin(Math.min(1, k * 1.6) * Math.PI) * (1 - k) * 0.08;
    return { x: N.l.x + (ziel.x - N.l.x) * ein, y: N.l.y + (ziel.y - N.l.y) * ein, s: 0.92 - 0.14 * ein + feder, oben: false, tiefe: ein };
  }
  function ausNetz(n) {
    for (const liste of netz) {
      const i = liste.findIndex((e) => e.n === n);
      if (i >= 0) liste.splice(i, 1);
    }
  }

  // Loch = Blick von oben in den Netzbeutel
  function zeichneLoecher() {
    NETZE.forEach((N, i) => {
      const { l } = N;
      ctx.save();
      ctx.beginPath();
      ctx.arc(l.x, l.y, N.r, 0, Math.PI * 2);
      ctx.clip();
      // Tiefe: unten im Beutel dunkel, zum Rand hin etwas heller (Netz fängt Licht)
      const g = ctx.createRadialGradient(l.x + N.ux * 3, l.y + N.uy * 3, 1, l.x, l.y, N.r);
      g.addColorStop(0, "#050506");
      g.addColorStop(0.7, "#141216");
      g.addColorStop(1, "#24201c");
      ctx.fillStyle = g;
      ctx.fillRect(l.x - N.r, l.y - N.r, 2 * N.r, 2 * N.r);
      // das Netz selbst: Maschen im Beutel, zur Mitte hin tiefer und dunkler
      masche(N, 4.5, "rgba(236,228,212,0.38)", 0.7, 0);
      const tief = ctx.createRadialGradient(l.x + N.ux * 3, l.y + N.uy * 3, 0, l.x, l.y, N.r * 0.8);
      tief.addColorStop(0, "rgba(0,0,0,0.55)");
      tief.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = tief;
      ctx.fillRect(l.x - N.r, l.y - N.r, 2 * N.r, 2 * N.r);
      // Kugeln liegen oben im Netz
      for (const e of netz[i]) {
        const o = netzOrt(i, e);
        if (o.oben) continue;
        zeichneKugel3D(e.n, o.x, o.y, o.s, false);
        ctx.fillStyle = `rgba(0,0,0,${0.04 + 0.1 * (o.tiefe || 0)})`;
        ctx.beginPath();
        ctx.arc(o.x, o.y, R * o.s, 0, Math.PI * 2);
        ctx.fill();
      }
      // Schatten der Lochkante nach innen
      const kante = ctx.createRadialGradient(l.x, l.y, N.r * 0.7, l.x, l.y, N.r);
      kante.addColorStop(0, "rgba(0,0,0,0)");
      kante.addColorStop(1, "rgba(0,0,0,0.6)");
      ctx.fillStyle = kante;
      ctx.fillRect(l.x - N.r, l.y - N.r, 2 * N.r, 2 * N.r);
      ctx.restore();
      // Lochrand (Leder)
      ctx.strokeStyle = "#2a1a10";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(l.x, l.y, N.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,220,180,0.12)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(l.x, l.y, N.r + 1.3, Math.PI * 1.05, Math.PI * 1.75);
      ctx.stroke();
    });
  }
  // Rautenmaschen, die zur Mitte hin enger werden (wirkt wie ein nach unten hängender Beutel)
  function masche(N, abstand, farbe, breite, versatz) {
    const { l } = N;
    ctx.strokeStyle = farbe;
    ctx.lineWidth = breite;
    const m = N.r + 2;
    const verzerrt = (x, y) => {
      const d = Math.hypot(x, y) / m;
      const f = 0.55 + 0.45 * d;
      return [l.x + x * f + N.ux * 2 * (1 - d), l.y + y * f + N.uy * 2 * (1 - d)];
    };
    for (const richtung of [1, -1])
      for (let d = -2 * m; d <= 2 * m; d += abstand) {
        ctx.beginPath();
        for (let k = -m; k <= m; k += 2) {
          const [x, y] = verzerrt(k + versatz, richtung * (k - d) + versatz);
          if (k === -m) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
  }

  function zeichneKugel(n, x, y, r = R, schatten = true) {
    if (schatten) {
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.ellipse(x + 2.5, y + 3, r, r * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    const halb = n > 8;
    const farbe = n === 0 ? "#f4f1e8" : FARBE[halb ? n - 8 : n];
    ctx.fillStyle = halb ? "#f4f1e8" : farbe;
    ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    if (halb) {
      ctx.fillStyle = farbe;
      ctx.fillRect(x - r, y - r * 0.55, 2 * r, r * 1.1);
    }
    if (n !== 0) {
      ctx.fillStyle = "#fbfaf5";
      ctx.beginPath();
      ctx.arc(x, y, r * 0.48, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1c1b22";
      ctx.font = `700 ${r * 0.62}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(n), x, y + r * 0.04);
    }
    // Rundung: Licht oben links, Schatten unten rechts
    const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.45, r * 0.1, x, y, r * 1.05);
    g.addColorStop(0, "rgba(255,255,255,0.55)");
    g.addColorStop(0.35, "rgba(255,255,255,0.05)");
    g.addColorStop(1, "rgba(0,0,0,0.42)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    ctx.restore();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.ellipse(x - r * 0.38, y - r * 0.42, r * 0.22, r * 0.14, -0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Ziellinie mit Geisterkugel und Laufrichtung der getroffenen Kugel
  function zeichneZiel() {
    const w = kugeln[0];
    const s = P.strahl(kugeln, w.x, w.y, winkel);
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = 1.2;
    ctx.setLineDash([5, 6]);
    ctx.lineDashOffset = -t * 20;
    ctx.beginPath();
    ctx.moveTo(w.x + Math.cos(winkel) * R, w.y + Math.sin(winkel) * R);
    ctx.lineTo(s.x, s.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.beginPath();
    ctx.arc(s.x, s.y, R, 0, Math.PI * 2);
    ctx.stroke();
    if (s.kugel) {
      const nx = s.kugel.x - s.x;
      const ny = s.kugel.y - s.y;
      const d = Math.hypot(nx, ny) || 1;
      const erlaubt = anstoss || P.ziele(kugeln, gruppen[amZug]).includes(s.kugel.n);
      const len = LINIE[stufe] || 80;
      ctx.strokeStyle = erlaubt ? "rgba(245,217,122,0.8)" : "rgba(229,86,111,0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s.kugel.x, s.kugel.y);
      ctx.lineTo(s.kugel.x + (nx / d) * len, s.kugel.y + (ny / d) * len);
      ctx.stroke();
      // Weiße läuft danach ungefähr im rechten Winkel weiter
      const cos = (Math.cos(winkel) * nx + Math.sin(winkel) * ny) / d;
      if (cos < 0.98) {
        let tx = Math.cos(winkel) - cos * (nx / d);
        let ty = Math.sin(winkel) - cos * (ny / d);
        const tl = Math.hypot(tx, ty);
        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x + (tx / tl) * len * 0.45 * (1 - cos), s.y + (ty / tl) * len * 0.45 * (1 - cos));
        ctx.stroke();
      }
      if (!erlaubt) {
        ctx.fillStyle = "rgba(229,86,111,0.9)";
        ctx.font = "600 11px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("nicht deine Kugel", s.kugel.x, s.kugel.y - R - 8);
      }
    }
    ctx.restore();
  }

  function zeichneQueue() {
    const w = kugeln[0];
    let zug = 0;
    if (ziehen) zug = ziehen.kraft;
    else if (zustand === "stoss" && queue) zug = queue.zug * Math.max(0, 1 - queue.t / 0.07);
    else if (zustand === "rollt" && queue) {
      if (queue.t > 0.45) return;
      ctx.globalAlpha = Math.max(0, 1 - queue.t / 0.45);
      zug = -0.06;
    }
    const abstand = R + 4 + zug * 60;
    const dx = -Math.cos(winkel);
    const dy = -Math.sin(winkel);
    const sx = w.x + dx * abstand;
    const sy = w.y + dy * abstand;
    const lang = 300;
    ctx.save();
    ctx.lineCap = "round";
    // Schatten
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(sx + 4, sy + 6);
    ctx.lineTo(sx + dx * lang + 4, sy + dy * lang + 6);
    ctx.stroke();
    // Stock: Spitze hell, Schaft Holz, Griff dunkel
    const g = ctx.createLinearGradient(sx, sy, sx + dx * lang, sy + dy * lang);
    g.addColorStop(0, "#5a7fb0");
    g.addColorStop(0.02, "#f3ead6");
    g.addColorStop(0.06, "#f3ead6");
    g.addColorStop(0.07, "#d9b77e");
    g.addColorStop(0.62, "#b8874a");
    g.addColorStop(0.63, "#2a1c14");
    g.addColorStop(0.7, "#c8a2ff");
    g.addColorStop(0.71, "#2a1c14");
    g.addColorStop(1, "#1a110c");
    ctx.strokeStyle = g;
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + dx * lang, sy + dy * lang);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(sx - dy * 1.5, sy + dx * 1.5);
    ctx.lineTo(sx + dx * lang - dy * 1.5, sy + dy * lang + dx * 1.5);
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function zeichneKraft() {
    const k = ziehen ? ziehen.kraft : zustand === "zielen" && mensch() ? kraft : 0;
    const x = X1 + 44;
    const h = Y1 - Y0 - 20;
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.roundRect(x - 4, Y0 + 10, 8, h, 4);
    ctx.fill();
    if (k > 0) {
      const g = ctx.createLinearGradient(0, Y0 + 10 + h, 0, Y0 + 10);
      g.addColorStop(0, "#5fc39c");
      g.addColorStop(0.6, "#f5d97a");
      g.addColorStop(1, "#e5566f");
      ctx.fillStyle = g;
      ctx.globalAlpha = ziehen ? 1 : 0.45;
      ctx.beginPath();
      ctx.roundRect(x - 4, Y0 + 10 + h * (1 - k), 8, h * k, 4);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function zeichneKopf() {
    const n = NAMEN();
    for (const s of [0, 1]) {
      const links = s === 0;
      const x = links ? 22 : W - 22;
      const dran = amZug === s && zustand !== "vorbei";
      ctx.textAlign = links ? "left" : "right";
      ctx.font = "700 15px system-ui, sans-serif";
      ctx.fillStyle = dran ? "#f2f2f3" : "#8a8698";
      if (dran) {
        ctx.shadowColor = "#5fc39c";
        ctx.shadowBlur = 10;
      }
      ctx.fillText(n[s], x, 20);
      ctx.shadowBlur = 0;
      const nameB = ctx.measureText(n[s]).width;
      if (dran) {
        ctx.fillStyle = "#5fc39c";
        ctx.beginPath();
        ctx.arc(links ? x + nameB + 10 : x - nameB - 10, 15, 3.5 + Math.sin(t * 5) * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
      const g = gruppen[s];
      ctx.font = "12px system-ui, sans-serif";
      ctx.fillStyle = "#8a8698";
      // Restliche Kugeln der Gruppe als kleine Kugeln, bei offenem Tisch ein Hinweis
      if (!g) ctx.fillText(anstoss ? "Anstoß" : "Tisch offen", x, 40);
      else {
        const meine = kugeln.filter((k) => !k.drin && P.gruppeVon(k.n) === g).map((k) => k.n);
        const liste = meine.length ? meine : [8];
        liste.forEach((nr, i) => zeichneKugel(nr, links ? x + 7 + i * 18 : x - 7 - i * 18, 36, 7, false));
      }
    }
    // Hinweise in der Mitte oben
    hinweise.forEach((h, i) => {
      const a = Math.min(1, h.t / 0.15, (2.4 - h.t) / 0.4);
      ctx.globalAlpha = a;
      ctx.font = "600 13px system-ui, sans-serif";
      ctx.textAlign = "center";
      const b = ctx.measureText(h.text).width + 22;
      const y = Y0 + 28 + i * 26 - (1 - Math.min(1, h.t / 0.15)) * 6;
      ctx.fillStyle = "rgba(15,14,19,0.85)";
      ctx.beginPath();
      ctx.roundRect(W / 2 - b / 2, y - 14, b, 22, 11);
      ctx.fill();
      ctx.strokeStyle = rgba(h.farbe, 0.6);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = h.farbe;
      ctx.fillText(h.text, W / 2, y + 1);
      ctx.globalAlpha = 1;
    });
    if (zustand === "cpu") {
      ctx.font = "12px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#8a8698";
      if (!hinweise.length) ctx.fillText(`Computer denkt${".".repeat(1 + (Math.floor(t * 3) % 3))}`, W / 2, 30);
    }
  }

  function zeichne() {
    ctx.save();
    zeichneTisch();
    for (const k of kugeln) if (!k.drin) zeichneKugel3D(k.n, k.x, k.y);
    // Kugeln auf dem Weg ins Loch
    netz.forEach((liste, i) =>
      liste.forEach((e) => {
        const o = netzOrt(i, e);
        if (o.oben) zeichneKugel3D(e.n, o.x, o.y, o.s, false);
      }),
    );
    const zielt = (zustand === "zielen" && mensch()) || (zustand === "cpu" && cpuPlan);
    if (zielt && !kugeln[0].drin) zeichneZiel();
    if ((zielt || zustand === "stoss" || zustand === "rollt") && !kugeln[0].drin) zeichneQueue();
    if (zustand === "legen" && legen && mensch()) {
      ctx.globalAlpha = legen.frei ? 0.9 : 0.4;
      zeichneKugel3D(0, legen.x, legen.y);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = legen.frei ? "rgba(95,195,156,0.9)" : "rgba(229,86,111,0.9)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.arc(legen.x, legen.y, R + 5 + Math.sin(t * 4), 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = "600 12px system-ui, sans-serif";
      ctx.fillStyle = "#f2f2f3";
      ctx.textAlign = "center";
      ctx.fillText("Ball in der Hand: Weiße hinlegen", MITTE_X, Y1 - 12);
    }
    zeichneKraft();
    zeichneKopf();
    ctx.restore();
  }

  // ---------- Modus ----------
  tools.hidden = false;
  tools.innerHTML = `<label class="tools-feld"><span>Modus</span><select class="tools-select" data-s="billard-modus"><option value="cpu">Gegen Computer</option><option value="zwei">Zu zweit</option></select></label>`;
  const modusWahl = tools.querySelector('[data-s="billard-modus"]');
  modusWahl.addEventListener("change", () => {
    zweiSpieler = modusWahl.value === "zwei";
    partie = 0;
    neu();
    canvas.focus({ preventScroll: true });
  });

  neu();
  raf = requestAnimationFrame(loop);

  return {
    pause() {
      if (pausiert || zustand === "vorbei") return;
      pausiert = true;
      nachricht(`<p class="big">Pause</p><p class="small">Klick zum Weiterspielen</p>`);
      const weiter = () => {
        pausiert = false;
        nachricht(null);
        zuletzt = 0;
      };
      document.getElementById("stage-msg")?.addEventListener("click", weiter, { once: true });
    },
    stop() {
      partie++;
      zustand = "vorbei";
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      window.removeEventListener("keydown", onKey);
      aus();
    },
  };
}
