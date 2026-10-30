// Computer-Gegner fürs Billard: sucht Stöße über Geometrie (Geisterkugel), rechnet die besten voraus und wählt den Stoß
// mit dem besten Ergebnis. Die Stufe bestimmt, wie genau er danach wirklich stößt.
import { R, LOECHER, MAX_TEMPO, MITTE_Y, X0, X1, simuliere, bewerte, ziele, gruppeVon, freierPlatz, strahl } from "./billard-physik.js";

export const STUFEN = {
  leicht: { streuung: 0.05, tempo: 0.15, daneben: 0.35 },
  mittel: { streuung: 0.02, tempo: 0.07, daneben: 0.1 },
  schwer: { streuung: 0.006, tempo: 0.03, daneben: 0 },
};

function gauss(rnd) {
  return Math.sqrt(-2 * Math.log(rnd() || 1e-9)) * Math.cos(2 * Math.PI * rnd());
}

// Alle sinnvollen Lochstöße aus der aktuellen Lage, grob nach Erfolgsaussicht sortiert
function lochStoesse(kugeln, gruppe) {
  const weiss = kugeln[0];
  const erlaubt = ziele(kugeln, gruppe);
  const liste = [];
  for (const b of kugeln) {
    if (b.drin || !erlaubt.includes(b.n)) continue;
    for (const l of LOECHER) {
      let ux = l.x - b.x;
      let uy = l.y - b.y;
      const d2 = Math.hypot(ux, uy);
      ux /= d2;
      uy /= d2;
      // Mittellöcher nehmen nur Kugeln, die einigermaßen gerade kommen
      if (!l.ecke && Math.abs(uy) < 0.55) continue;
      const gx = b.x - ux * 2 * R;
      const gy = b.y - uy * 2 * R;
      const vx = gx - weiss.x;
      const vy = gy - weiss.y;
      const d1 = Math.hypot(vx, vy);
      if (d1 < 1) continue;
      const cos = (vx * ux + vy * uy) / d1;
      if (cos < 0.3) continue;
      const winkel = Math.atan2(vy, vx);
      // Weg zur Geisterkugel frei, und trifft wirklich diese Kugel?
      const s = strahl(kugeln, weiss.x, weiss.y, winkel);
      if (!s.kugel || s.kugel.n !== b.n) continue;
      // Weg der Zielkugel zum Loch frei?
      const s2 = strahl(kugeln, b.x, b.y, Math.atan2(uy, ux), b.n);
      if (s2.kugel && s2.kugel.n !== 0 && s2.d < d2 - R) continue;
      const guete = (cos * cos) / (1 + (d1 + d2) / 450);
      const tempo = Math.min(MAX_TEMPO * 0.9, Math.max(380, 260 + (d1 + d2 / cos) * 0.85));
      liste.push({ winkel, tempo, guete, ziel: b.n });
    }
  }
  return liste.sort((a, b) => b.guete - a.guete);
}

// Wie gut ist das Ergebnis eines vorausberechneten Stoßes für den Spieler?
function wert(kugeln, gruppen, spieler, anstoss, sim) {
  const r = bewerte({ spieler, gruppen, vorher: kugeln, stoss: sim.stoss, anstoss });
  if (r.ende) return r.sieger === spieler ? 10000 : -10000;
  if (r.foul) return -400;
  const g = r.gruppen?.[spieler] || gruppen[spieler];
  let w = 0;
  for (const n of sim.stoss.versenkt) if (n !== 0 && n !== 8) w += !g || gruppeVon(n) === g ? 120 : -60;
  if (r.naechster === spieler) {
    w += 80;
    // gute Lage für den nächsten Stoß
    const weiter = lochStoesse(sim.kugeln, g);
    if (weiter.length) w += 60 * weiter[0].guete + Math.min(3, weiter.length) * 5;
  }
  return w;
}

export function planeStoss({ kugeln, gruppen, spieler, anstoss, stufe, rnd = Math.random }) {
  const S = STUFEN[stufe] || STUFEN.mittel;
  const weiss = kugeln[0];
  if (anstoss) {
    const spitze = kugeln.filter((k) => !k.drin && k.n !== 0).reduce((a, b) => (b.x < a.x ? b : a));
    const w = Math.atan2(spitze.y - weiss.y, spitze.x - weiss.x) + gauss(rnd) * 0.004;
    return { winkel: w, tempo: MAX_TEMPO * (0.92 + rnd() * 0.08) };
  }
  const g = gruppen[spieler];
  const kandidaten = [];
  for (const k of lochStoesse(kugeln, g).slice(0, 12)) for (const f of [0.8, 1, 1.3]) kandidaten.push({ winkel: k.winkel, tempo: Math.min(MAX_TEMPO, k.tempo * f) });
  // Notlösung: eine erlaubte Kugel voll anspielen, damit es wenigstens kein Foul wird
  for (const n of ziele(kugeln, g)) {
    const b = kugeln.find((k) => k.n === n);
    const w = Math.atan2(b.y - weiss.y, b.x - weiss.x);
    const s = strahl(kugeln, weiss.x, weiss.y, w);
    if (s.kugel && s.kugel.n === n) kandidaten.push({ winkel: w, tempo: 550 }, { winkel: w, tempo: 900 });
  }
  // Wenn gar nichts direkt geht: ein paar Richtungen über die Bande probieren
  if (!kandidaten.length) for (let i = 0; i < 24; i++) kandidaten.push({ winkel: (i / 24) * Math.PI * 2, tempo: 900 });

  for (const k of kandidaten) k.wert = wert(kugeln, gruppen, spieler, false, simuliere(kugeln, k.winkel, k.tempo));
  kandidaten.sort((a, b) => b.wert - a.wert);
  let wahl = kandidaten[0];
  if (rnd() < S.daneben) wahl = kandidaten[Math.min(kandidaten.length - 1, Math.floor(rnd() * 5))];
  return {
    winkel: wahl.winkel + gauss(rnd) * S.streuung,
    tempo: Math.min(MAX_TEMPO, Math.max(200, wahl.tempo * (1 + gauss(rnd) * S.tempo))),
  };
}

// Ball in der Hand: Weiße so hinlegen, dass ein gerader Lochstoß möglich ist
export function legeWeisse({ kugeln, gruppen, spieler, anstoss }) {
  const weiss = kugeln[0];
  if (anstoss) return { x: X0 + (X1 - X0) * 0.25, y: MITTE_Y };
  const g = gruppen[spieler];
  let best = null;
  for (const b of kugeln) {
    if (b.drin || !ziele(kugeln, g).includes(b.n)) continue;
    for (const l of LOECHER) {
      let ux = l.x - b.x;
      let uy = l.y - b.y;
      const d = Math.hypot(ux, uy);
      ux /= d;
      uy /= d;
      if (!l.ecke && Math.abs(uy) < 0.55) continue;
      for (const abstand of [60, 110, 40]) {
        const x = b.x - ux * (2 * R + abstand);
        const y = b.y - uy * (2 * R + abstand);
        if (!freierPlatz(kugeln, x, y)) continue;
        const probe = kugeln.map((k) => (k.n === 0 ? { ...k, x, y, drin: false } : k));
        const s = strahl(probe, x, y, Math.atan2(uy, ux));
        if (!s.kugel || s.kugel.n !== b.n) continue;
        const s2 = strahl(probe, b.x, b.y, Math.atan2(uy, ux), b.n);
        if (s2.kugel && s2.d < d - R) continue;
        const guete = 1 / (1 + (abstand + d) / 400);
        if (!best || guete > best.guete) best = { x, y, guete };
      }
    }
  }
  if (best) return best;
  // sonst irgendwo frei in der Nähe der Kopfmitte
  for (let i = 0; i < 200; i++) {
    const x = X0 + R + Math.random() * (X1 - X0 - 2 * R);
    const y = MITTE_Y + (Math.random() - 0.5) * 200;
    if (freierPlatz(kugeln, x, y)) return { x, y };
  }
  return { x: weiss.x, y: weiss.y };
}
