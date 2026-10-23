// Schach-Regeln und Computergegner, ohne Abhängigkeiten.
// Brett: 64 Felder, Index = reihe * 8 + linie, Reihe 0 = 8. Reihe (schwarze Grundreihe).
// Figuren: Großbuchstaben = Weiß (PNBRQK), Kleinbuchstaben = Schwarz.

export const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const SPRINGER = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const LAEUFER = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const TURM = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const KOENIG = [...LAEUFER, ...TURM];

export const farbe = (p) => (p ? (p === p.toUpperCase() ? "w" : "b") : null);
const gegner = (f) => (f === "w" ? "b" : "w");
const imBrett = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;

// ---------- Stellung ----------
export function ausFen(fen) {
  const [teile, zug, rochade, ep, halb] = fen.split(" ");
  const b = [];
  for (const ch of teile.replace(/\//g, "")) {
    if (/\d/.test(ch)) for (let i = 0; i < Number(ch); i++) b.push(null);
    else b.push(ch);
  }
  const pos = {
    b,
    zug,
    rochade: rochade === "-" ? "" : rochade,
    ep: ep === "-" ? -1 : feldIndex(ep),
    halb: Number(halb) || 0,
    koenig: { w: b.indexOf("K"), b: b.indexOf("k") },
    verlauf: [],
  };
  pos.verlauf.push(schluessel(pos));
  return pos;
}

export function feldIndex(name) {
  return (8 - Number(name[1])) * 8 + (name.charCodeAt(0) - 97);
}
export function feldName(i) {
  return String.fromCharCode(97 + (i % 8)) + (8 - Math.floor(i / 8));
}

function schluessel(pos) {
  return pos.b.map((p) => p || ".").join("") + pos.zug + pos.rochade + pos.ep;
}

// ---------- Angriffe ----------
export function angegriffen(pos, sq, von) {
  const r = Math.floor(sq / 8);
  const c = sq % 8;
  const b = pos.b;
  // Bauern
  const pr = von === "w" ? r + 1 : r - 1;
  const bauer = von === "w" ? "P" : "p";
  for (const dc of [-1, 1]) if (imBrett(pr, c + dc) && b[pr * 8 + c + dc] === bauer) return true;
  // Springer
  const springer = von === "w" ? "N" : "n";
  for (const [dr, dc] of SPRINGER) if (imBrett(r + dr, c + dc) && b[(r + dr) * 8 + c + dc] === springer) return true;
  // König
  const koenig = von === "w" ? "K" : "k";
  for (const [dr, dc] of KOENIG) if (imBrett(r + dr, c + dc) && b[(r + dr) * 8 + c + dc] === koenig) return true;
  // Linien
  const gerade = von === "w" ? ["R", "Q"] : ["r", "q"];
  const schraeg = von === "w" ? ["B", "Q"] : ["b", "q"];
  for (const [richtungen, figuren] of [[TURM, gerade], [LAEUFER, schraeg]]) {
    for (const [dr, dc] of richtungen) {
      let rr = r + dr;
      let cc = c + dc;
      while (imBrett(rr, cc)) {
        const p = b[rr * 8 + cc];
        if (p) {
          if (figuren.includes(p)) return true;
          break;
        }
        rr += dr;
        cc += dc;
      }
    }
  }
  return false;
}

export function imSchach(pos, f = pos.zug) {
  return angegriffen(pos, pos.koenig[f], gegner(f));
}

// ---------- Züge ----------
function pseudoZuege(pos, nurSchlagen = false) {
  const z = [];
  const { b, zug } = pos;
  const weiss = zug === "w";
  for (let sq = 0; sq < 64; sq++) {
    const p = b[sq];
    if (!p || farbe(p) !== zug) continue;
    const r = Math.floor(sq / 8);
    const c = sq % 8;
    const typ = p.toUpperCase();

    if (typ === "P") {
      const dir = weiss ? -1 : 1;
      const startReihe = weiss ? 6 : 1;
      const umwReihe = weiss ? 0 : 7;
      const add = (to, extra = {}) => {
        if (Math.floor(to / 8) === umwReihe) for (const u of ["Q", "R", "B", "N"]) z.push({ from: sq, to, umw: u, ...extra });
        else z.push({ from: sq, to, ...extra });
      };
      const vor = (r + dir) * 8 + c;
      if (!nurSchlagen && imBrett(r + dir, c) && !b[vor]) {
        add(vor);
        const zwei = (r + 2 * dir) * 8 + c;
        if (r === startReihe && !b[zwei]) z.push({ from: sq, to: zwei, doppel: true });
      }
      for (const dc of [-1, 1]) {
        if (!imBrett(r + dir, c + dc)) continue;
        const to = (r + dir) * 8 + c + dc;
        if (b[to] && farbe(b[to]) !== zug) add(to);
        else if (to === pos.ep) z.push({ from: sq, to, ep: true });
      }
      continue;
    }

    if (typ === "N" || typ === "K") {
      for (const [dr, dc] of typ === "N" ? SPRINGER : KOENIG) {
        if (!imBrett(r + dr, c + dc)) continue;
        const to = (r + dr) * 8 + c + dc;
        if (!b[to] ? !nurSchlagen : farbe(b[to]) !== zug) z.push({ from: sq, to });
      }
      if (typ === "K" && !nurSchlagen) rochaden(pos, sq, z);
      continue;
    }

    const richtungen = typ === "B" ? LAEUFER : typ === "R" ? TURM : KOENIG;
    for (const [dr, dc] of richtungen) {
      let rr = r + dr;
      let cc = c + dc;
      while (imBrett(rr, cc)) {
        const to = rr * 8 + cc;
        if (b[to]) {
          if (farbe(b[to]) !== zug) z.push({ from: sq, to });
          break;
        }
        if (!nurSchlagen) z.push({ from: sq, to });
        rr += dr;
        cc += dc;
      }
    }
  }
  return z;
}

function rochaden(pos, sq, z) {
  const { b, zug, rochade } = pos;
  const g = gegner(zug);
  if (zug === "w" && sq === 60) {
    if (rochade.includes("K") && !b[61] && !b[62] && b[63] === "R" && !angegriffen(pos, 60, g) && !angegriffen(pos, 61, g) && !angegriffen(pos, 62, g))
      z.push({ from: 60, to: 62, rochade: "K" });
    if (rochade.includes("Q") && !b[59] && !b[58] && !b[57] && b[56] === "R" && !angegriffen(pos, 60, g) && !angegriffen(pos, 59, g) && !angegriffen(pos, 58, g))
      z.push({ from: 60, to: 58, rochade: "Q" });
  }
  if (zug === "b" && sq === 4) {
    if (rochade.includes("k") && !b[5] && !b[6] && b[7] === "r" && !angegriffen(pos, 4, g) && !angegriffen(pos, 5, g) && !angegriffen(pos, 6, g))
      z.push({ from: 4, to: 6, rochade: "k" });
    if (rochade.includes("q") && !b[3] && !b[2] && !b[1] && b[0] === "r" && !angegriffen(pos, 4, g) && !angegriffen(pos, 3, g) && !angegriffen(pos, 2, g))
      z.push({ from: 4, to: 2, rochade: "q" });
  }
}

const TURM_ECKEN = { 0: "q", 7: "k", 56: "Q", 63: "K" };
const ROCHADE_TURM = { K: [63, 61], Q: [56, 59], k: [7, 5], q: [0, 3] };

export function ziehe(pos, m) {
  const { b } = pos;
  const p = b[m.from];
  const weiss = pos.zug === "w";
  const undo = { m, p, geschlagen: b[m.to], rochade: pos.rochade, ep: pos.ep, halb: pos.halb, koenig: { ...pos.koenig }, epFeld: -1 };

  if (m.ep) {
    undo.epFeld = m.to + (weiss ? 8 : -8);
    undo.geschlagen = b[undo.epFeld];
    b[undo.epFeld] = null;
  }
  b[m.to] = m.umw ? (weiss ? m.umw : m.umw.toLowerCase()) : p;
  b[m.from] = null;
  if (m.rochade) {
    const [rf, rt] = ROCHADE_TURM[m.rochade];
    b[rt] = b[rf];
    b[rf] = null;
  }

  let r = pos.rochade;
  if (p === "K") r = r.replace(/[KQ]/g, "");
  if (p === "k") r = r.replace(/[kq]/g, "");
  if (TURM_ECKEN[m.from]) r = r.replace(TURM_ECKEN[m.from], "");
  if (TURM_ECKEN[m.to]) r = r.replace(TURM_ECKEN[m.to], "");
  pos.rochade = r;

  pos.ep = m.doppel ? (m.from + m.to) / 2 : -1;
  pos.halb = p.toUpperCase() === "P" || undo.geschlagen ? 0 : pos.halb + 1;
  if (p.toUpperCase() === "K") pos.koenig[pos.zug] = m.to;
  pos.zug = gegner(pos.zug);
  return undo;
}

export function zurueck(pos, u) {
  const { b } = pos;
  const { m } = u;
  pos.zug = gegner(pos.zug);
  b[m.from] = u.p;
  if (m.ep) {
    b[m.to] = null;
    b[u.epFeld] = u.geschlagen;
  } else {
    b[m.to] = u.geschlagen;
  }
  if (m.rochade) {
    const [rf, rt] = ROCHADE_TURM[m.rochade];
    b[rf] = b[rt];
    b[rt] = null;
  }
  pos.rochade = u.rochade;
  pos.ep = u.ep;
  pos.halb = u.halb;
  pos.koenig = u.koenig;
}

export function zuege(pos, nurSchlagen = false) {
  const wer = pos.zug;
  return pseudoZuege(pos, nurSchlagen).filter((m) => {
    const u = ziehe(pos, m);
    const ok = !angegriffen(pos, pos.koenig[wer], pos.zug);
    zurueck(pos, u);
    return ok;
  });
}

// Zug im echten Spiel ausführen (mit Verlauf für Stellungswiederholung)
export function spieleZug(pos, m) {
  ziehe(pos, m);
  pos.verlauf.push(schluessel(pos));
}

export function perft(pos, tiefe) {
  if (tiefe === 0) return 1;
  let n = 0;
  for (const m of zuege(pos)) {
    const u = ziehe(pos, m);
    n += perft(pos, tiefe - 1);
    zurueck(pos, u);
  }
  return n;
}

// ---------- Spielende ----------
function zuWenigMaterial(b) {
  const rest = b.filter((p) => p && p.toUpperCase() !== "K");
  if (rest.length === 0) return true;
  if (rest.length === 1 && "NBnb".includes(rest[0])) return true;
  return false;
}

export function ende(pos) {
  if (zuege(pos).length === 0) return imSchach(pos) ? { typ: "matt", sieger: gegner(pos.zug) } : { typ: "patt" };
  if (pos.halb >= 100) return { typ: "50 Züge" };
  if (zuWenigMaterial(pos.b)) return { typ: "zu wenig Material" };
  const k = pos.verlauf[pos.verlauf.length - 1];
  if (pos.verlauf.filter((x) => x === k).length >= 3) return { typ: "dreifache Wiederholung" };
  return null;
}

// ---------- Bewertung ----------
const WERT = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 0 };
// Stellungstabellen aus Sicht von Weiß, erste Zeile = 8. Reihe
const TAB = {
  P: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
  N: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
  B: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
  R: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
  Q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
  K: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
};

// Bewertung aus Sicht der Seite am Zug
export function bewerte(pos) {
  let s = 0;
  for (let sq = 0; sq < 64; sq++) {
    const p = pos.b[sq];
    if (!p) continue;
    const t = p.toUpperCase();
    if (p === t) s += WERT[t] + TAB[t][sq];
    else s -= WERT[t] + TAB[t][(7 - Math.floor(sq / 8)) * 8 + (sq % 8)];
  }
  return pos.zug === "w" ? s : -s;
}

// ---------- Suche ----------
const MATT = 100000;

function sortiere(pos, liste) {
  const score = (m) => {
    let s = 0;
    const opfer = m.ep ? "P" : pos.b[m.to];
    if (opfer) s += 10 * WERT[opfer.toUpperCase()] - WERT[pos.b[m.from].toUpperCase()] + 1000;
    if (m.umw) s += WERT[m.umw] + 900;
    return s;
  };
  return liste.sort((a, b) => score(b) - score(a));
}

function ruhesuche(pos, alpha, beta, tiefe, stat) {
  stat.knoten++;
  const steh = bewerte(pos);
  if (steh >= beta) return beta;
  if (steh > alpha) alpha = steh;
  if (tiefe <= 0) return alpha;
  for (const m of sortiere(pos, zuege(pos, true))) {
    const u = ziehe(pos, m);
    const s = -ruhesuche(pos, -beta, -alpha, tiefe - 1, stat);
    zurueck(pos, u);
    if (s >= beta) return beta;
    if (s > alpha) alpha = s;
  }
  return alpha;
}

function negamax(pos, tiefe, alpha, beta, ply, opt, stat) {
  stat.knoten++;
  const liste = zuege(pos);
  if (liste.length === 0) return imSchach(pos) ? -MATT + ply : 0;
  if (pos.halb >= 100) return 0;
  if (tiefe === 0) return opt.ruhe ? ruhesuche(pos, alpha, beta, 6, stat) : bewerte(pos);
  for (const m of sortiere(pos, liste)) {
    const u = ziehe(pos, m);
    const s = -negamax(pos, tiefe - 1, -beta, -alpha, ply + 1, opt, stat);
    zurueck(pos, u);
    if (s >= beta) return beta;
    if (s > alpha) alpha = s;
  }
  return alpha;
}

// Computerzüge je Stufe: Suchtiefe, Ruhesuche und wie sehr er „daneben“ greift
export const STUFEN = {
  leicht: { tiefe: 1, ruhe: false, rauschen: 90, fehlgriff: 0.2 },
  mittel: { tiefe: 2, ruhe: true, rauschen: 20, fehlgriff: 0 },
  schwer: { tiefe: 4, ruhe: true, rauschen: 0, fehlgriff: 0 },
};

export function besterZug(pos, stufe = "mittel") {
  const opt = STUFEN[stufe] || STUFEN.mittel;
  const liste = sortiere(pos, zuege(pos));
  if (liste.length === 0) return null;
  if (opt.fehlgriff && Math.random() < opt.fehlgriff) return liste[Math.floor(Math.random() * liste.length)];

  const stat = { knoten: 0 };
  let best = null;
  let bestWert = -Infinity;
  for (const m of liste) {
    const u = ziehe(pos, m);
    // ohne Zufall darf die Suche schlechtere Züge früh abschneiden (Alpha-Beta an der Wurzel)
    const obergrenze = opt.rauschen ? MATT + 1 : -bestWert;
    let s = -negamax(pos, opt.tiefe - 1, -MATT - 1, obergrenze, 1, opt, stat);
    zurueck(pos, u);
    s += (Math.random() * 2 - 1) * opt.rauschen;
    if (s > bestWert) {
      bestWert = s;
      best = m;
    }
  }
  return best;
}
