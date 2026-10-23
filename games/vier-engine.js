// Vier in einer Reihe: Regeln und Computergegner (Alpha-Beta), ohne Abhängigkeiten.
// Brett: 7 Spalten × 6 Reihen, brett[spalte][reihe], Reihe 0 = unten. 0 leer, 1 Spieler, 2 Computer.

export const SP = 7;
export const RE = 6;
const ORDNUNG = [3, 2, 4, 1, 5, 0, 6]; // Mitte zuerst prüfen (bessere Schnitte)
const SIEG = 1_000_000;

export const leer = () => Array.from({ length: SP }, () => new Array(RE).fill(0));
export const kopie = (b) => b.map((s) => [...s]);
export const frei = (b, c) => b[c][RE - 1] === 0;
export const hoehe = (b, c) => b[c].indexOf(0);

export function setze(b, c, p) {
  const r = hoehe(b, c);
  b[c][r] = p;
  return r;
}

// Hat der Stein auf (c, r) eine Viererreihe vervollständigt? Gibt die 4+ Felder zurück oder null
export function reiheDurch(b, c, r) {
  const p = b[c][r];
  for (const [dc, dr] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
    const felder = [[c, r]];
    for (const s of [1, -1]) {
      let x = c + dc * s;
      let y = r + dr * s;
      while (x >= 0 && x < SP && y >= 0 && y < RE && b[x][y] === p) {
        felder.push([x, y]);
        x += dc * s;
        y += dr * s;
      }
    }
    if (felder.length >= 4) return felder;
  }
  return null;
}

export const voll = (b) => b.every((s) => s[RE - 1] !== 0);

// Bewertung aus Sicht von p: offene Fenster mit 2/3 eigenen Steinen zählen
function bewerte(b, p) {
  const g = 3 - p;
  let s = 0;
  for (let r = 0; r < RE; r++) if (b[3][r] === p) s += 6;
  const fenster = (a) => {
    let eigen = 0;
    let fremd = 0;
    for (const v of a) {
      if (v === p) eigen++;
      else if (v === g) fremd++;
    }
    if (eigen && fremd) return 0;
    if (eigen === 3) return 50;
    if (eigen === 2) return 8;
    if (fremd === 3) return -60;
    if (fremd === 2) return -8;
    return 0;
  };
  for (let c = 0; c < SP; c++)
    for (let r = 0; r < RE; r++) {
      if (c + 3 < SP) s += fenster([b[c][r], b[c + 1][r], b[c + 2][r], b[c + 3][r]]);
      if (r + 3 < RE) s += fenster([b[c][r], b[c][r + 1], b[c][r + 2], b[c][r + 3]]);
      if (c + 3 < SP && r + 3 < RE) s += fenster([b[c][r], b[c + 1][r + 1], b[c + 2][r + 2], b[c + 3][r + 3]]);
      if (c + 3 < SP && r - 3 >= 0) s += fenster([b[c][r], b[c + 1][r - 1], b[c + 2][r - 2], b[c + 3][r - 3]]);
    }
  return s;
}

function negamax(b, tiefe, alpha, beta, p, ply, stat) {
  stat.knoten++;
  if (voll(b)) return 0;
  if (tiefe === 0) return bewerte(b, p);
  for (const c of ORDNUNG) {
    if (!frei(b, c)) continue;
    const r = setze(b, c, p);
    let s;
    if (reiheDurch(b, c, r)) s = SIEG - ply;
    else s = -negamax(b, tiefe - 1, -beta, -alpha, 3 - p, ply + 1, stat);
    b[c][r] = 0;
    if (s > alpha) alpha = s;
    if (alpha >= beta) break;
  }
  return alpha;
}

export const STUFEN = {
  leicht: { tiefe: 2, fehlgriff: 0.3 },
  mittel: { tiefe: 5, fehlgriff: 0 },
  schwer: { tiefe: 8, fehlgriff: 0 },
};

// Bester Zug (Spalte) für p
export function besterZug(brett, p, stufe = "mittel") {
  const opt = STUFEN[stufe] || STUFEN.mittel;
  const b = kopie(brett);
  const moeglich = ORDNUNG.filter((c) => frei(b, c));
  if (!moeglich.length) return -1;

  // sofort gewinnen oder sofortigen Sieg des Gegners verhindern (auch auf Leicht)
  for (const q of [p, 3 - p])
    for (const c of moeglich) {
      const r = setze(b, c, q);
      const sieg = reiheDurch(b, c, r);
      b[c][r] = 0;
      if (sieg && (q === p || Math.random() > opt.fehlgriff)) return c;
    }
  if (opt.fehlgriff && Math.random() < opt.fehlgriff) return moeglich[Math.floor(Math.random() * moeglich.length)];

  const stat = { knoten: 0 };
  let best = moeglich[0];
  let bestWert = -Infinity;
  for (const c of moeglich) {
    const r = setze(b, c, p);
    const s = reiheDurch(b, c, r) ? SIEG : -negamax(b, opt.tiefe - 1, -SIEG - 1, -bestWert, 3 - p, 1, stat);
    b[c][r] = 0;
    if (s > bestWert) {
      bestWert = s;
      best = c;
    }
  }
  return best;
}
