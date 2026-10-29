// Schach gegen den Computer (du spielst Weiß) und ein Lernmodus für Eröffnungen.
import { ausFen, START, zuege, spieleZug, ende, imSchach, farbe, feldName } from "./schach-engine.js";
import { EROEFFNUNGEN, sanDeutsch, sanZuZug } from "./schach-eroeffnungen.js";
import { EFFEKTE, erzeuge as erzeugeEffekt, zeichne as zeichneEffekt, wackeln, bewegung } from "./schach-effekte.js";

export const HILFE = "Stufe „Lernen“ bzw. Modus „Eröffnungen lernen“: die Züge der gewählten Eröffnung nachspielen, mit Erklärung und Tipps · Figur ziehen oder antippen, dann Zielfeld · Premove: schon ziehen, während der Computer denkt (Rechtsklick löscht) · ← → ↑ ↓: Züge nachspielen · Tastatur-Spiel: WASD + Enter";

const Z = 80; // Feldgröße
const N = Z * 8;
const PX = 4; // Pixelgröße der Figuren (16 × 16 Raster → 64 px)
const ANIM_MS = 320; // so lange gleitet eine Figur
// Bedenkzeit des Computers (mindestens), damit seine Züge nachvollziehbar bleiben
const BEDENKZEIT = { leicht: 700, mittel: 950, schwer: 1200 };

// Eigene 16×16-Pixelfiguren: # Grundfarbe · * Glanz · + Schatten (Umriss wird automatisch gezeichnet)
const FIGUREN = {
  P: ["................", "................", "................", "......####......", ".....#*####.....", ".....######.....", ".....##+###.....", "......####......", ".......##.......", "......####......", ".....######.....", "......####......", ".....######.....", "....##++++##....", "...##########...", "...##########..."],
  R: ["................", "...##..##..##...", "...##..##..##...", "...##########...", "...#*########...", "....########....", ".....######.....", ".....#*####.....", ".....######.....", ".....######.....", ".....##+###.....", ".....######.....", "....########....", "...##++++++##...", "..############..", "..############.."],
  N: ["................", ".......#........", "......###.......", ".....#####......", "....##*####.....", "...###.#####....", "..##########....", ".###########....", ".#####.######...", "..##...######...", "......#######...", ".....########...", ".....##+#####...", "....##++++###...", "...###########..", "...###########.."],
  B: ["................", ".......##.......", "......####......", ".....###.##.....", ".....##.###.....", ".....#*####.....", "......####......", ".......##.......", "......####......", ".....######.....", "......####......", "......####......", ".....##+###.....", "....##++++##....", "...##########...", "...##########..."],
  Q: ["................", ".#.....##.....#.", ".##...####...##.", ".###.######.###.", "..############..", "..#*##########..", "...##########...", "....########....", ".....######.....", ".....#*####.....", ".....######.....", "....########....", "....##+#####....", "...##++++++##...", "..############..", "..############.."],
  K: [".......##.......", "......####......", ".......##.......", "....##.##.##....", "...##########...", "..#*##########..", "..############..", "...##########...", "....########....", ".....######.....", ".....#*####.....", ".....######.....", "....##+#####....", "...##++++++##...", "..############..", "..############.."],
};
const NAMEN = { Q: "Dame", R: "Turm", B: "Läufer", N: "Springer" };

const PALETTE = {
  w: { "#": "#eceaf2", "*": "#ffffff", "+": "#a9a5b8", rand: "#0b0b0e" },
  b: { "#": "#b48ef0", "*": "#dcc8ff", "+": "#7656b8", rand: "#0b0b0e" },
};

const PIXEL_SAETZE = { pixel: { muster: FIGUREN, palette: PALETTE } };

// Brettfarben: dunkel für die Pixelfiguren, heller für die Lichess-Figuren
// (schwarze Figuren wären auf dunklen Feldern kaum zu sehen)
const BRETT = {
  dunkel: { hell: "#34323b", dunkel: "#1f1d25", koord: "rgba(255,255,255,0.28)" },
  hell: { hell: "#e4def0", dunkel: "#9a87c2", koord: "rgba(20,16,30,0.45)" },
};
const FARBEN = {
  auswahl: "rgba(212, 184, 255, 0.45)",
  letzter: "rgba(245, 217, 122, 0.32)",
  schach: "rgba(229, 86, 111, 0.6)",
  ziel: "rgba(245, 217, 122, 0.9)",
  premove: "rgba(96, 170, 255, 0.45)",
  premoveZiel: "rgba(96, 170, 255, 0.9)",
  cursor: "#f5d97a",
};

// Figurensätze: „pixel“ ist selbst gezeichnet, die anderen kommen von Lichess (public/pieces, siehe LICENSE.md)
export const STILE = [
  { id: "pixel", name: "Pixel", brett: "dunkel" },
  { id: "cburnett", name: "Klassisch", brett: "hell" },
  { id: "fantasy", name: "Fantasy", brett: "hell" },
  { id: "celtic", name: "Keltisch", brett: "hell" },
  { id: "chessnut", name: "Chessnut", brett: "hell" },
  { id: "rhosgfx", name: "Holz", brett: "hell" },
];
const STIL_KEY = "schach:figuren";
const EFFEKT_KEY = "schach:effekt";
function gemerkterEffekt() {
  try {
    const s = localStorage.getItem(EFFEKT_KEY);
    return EFFEKTE.some((x) => x.id === s) ? s : "passend";
  } catch {
    return "passend";
  }
}
function gemerkterStil() {
  try {
    const s = localStorage.getItem(STIL_KEY);
    return STILE.some((x) => x.id === s) ? s : "pixel";
  } catch {
    return "pixel";
  }
}

// SVG-Figuren einmal laden; gerastert wird passend zur echten Bildschirmgröße (siehe raster)
const svgCache = {};
function ladeStil(id) {
  if (PIXEL_SAETZE[id]) return Promise.resolve();
  if (svgCache[id]) return svgCache[id].bereit;
  const imgs = {};
  const bereit = Promise.all(
    ["K", "Q", "R", "B", "N", "P"].flatMap((t) =>
      ["w", "b"].map(
        (f) =>
          new Promise((ok) => {
            const img = new Image();
            img.onload = img.onerror = ok;
            img.src = `/pieces/${id}/${f}${t}.svg`;
            imgs[f === "w" ? t : t.toLowerCase()] = img;
          }),
      ),
    ),
  );
  svgCache[id] = { imgs, bereit, raster: {} };
  return bereit;
}

// Figur als Bitmap in genau der Pixelgröße, in der sie gezeichnet wird (gestochen scharf)
function raster(id, p, px) {
  const c = svgCache[id];
  const img = c?.imgs[p];
  if (!img?.complete || !img.naturalWidth) return null;
  const key = `${px}`;
  c.raster[key] ||= {};
  if (!c.raster[key][p]) {
    const cv = document.createElement("canvas");
    cv.width = cv.height = px;
    const g = cv.getContext("2d");
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = "high";
    g.drawImage(img, 0, 0, px, px);
    c.raster[key][p] = cv;
  }
  return c.raster[key][p];
}

// Figuren einmal vorrendern (schneller beim Animieren)
const cache = {};
function figurBild(p, satz = "pixel") {
  const key = satz + p;
  if (cache[key]) return cache[key];
  const muster = PIXEL_SAETZE[satz].muster[p.toUpperCase()];
  const pal = PIXEL_SAETZE[satz].palette[farbe(p)];
  const c = document.createElement("canvas");
  c.width = c.height = 18 * PX;
  const g = c.getContext("2d");
  // Umriss: Silhouette in alle 8 Richtungen versetzt
  g.fillStyle = pal.rand;
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]])
    muster.forEach((zeile, y) => [...zeile].forEach((ch, x) => ch !== "." && g.fillRect((x + 1 + dx) * PX, (y + 1 + dy) * PX, PX, PX)));
  muster.forEach((zeile, y) =>
    [...zeile].forEach((ch, x) => {
      if (ch === ".") return;
      g.fillStyle = pal[ch];
      g.fillRect((x + 1) * PX, (y + 1) * PX, PX, PX);
    }),
  );
  cache[key] = c;
  return c;
}

const ease = (t) => 1 - (1 - t) ** 3;
const klon = (p) => ({ ...p, b: [...p.b], koenig: { ...p.koenig }, verlauf: [...p.verlauf] });

// Felder, die eine weiße Figur rein geometrisch erreichen könnte (für Premoves, Blockaden egal)
function premoveZiele(p, sq) {
  const r = Math.floor(sq / 8);
  const c = sq % 8;
  const out = [];
  const add = (rr, cc) => rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && out.push(rr * 8 + cc);
  const strahl = (dirs) => dirs.forEach(([dr, dc]) => {
    for (let i = 1; i < 8; i++) add(r + dr * i, c + dc * i);
  });
  const t = p.toUpperCase();
  if (t === "P") {
    const v = farbe(p) === "w" ? -1 : 1;
    add(r + v, c);
    if (r === (v < 0 ? 6 : 1)) add(r + 2 * v, c);
    add(r + v, c - 1);
    add(r + v, c + 1);
  } else if (t === "N") [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]].forEach(([a, b]) => add(r + a, c + b));
  else if (t === "B") strahl([[-1, -1], [-1, 1], [1, -1], [1, 1]]);
  else if (t === "R") strahl([[-1, 0], [1, 0], [0, -1], [0, 1]]);
  else if (t === "Q") strahl([[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]]);
  else if (t === "K") {
    for (const a of [-1, 0, 1]) for (const b of [-1, 0, 1]) if (a || b) add(r + a, c + b);
    if (sq === 60 && p === "K") out.push(62, 58); // Rochade
    if (sq === 4 && p === "k") out.push(6, 2);
  }
  return out;
}

export function start({ canvas, tools, stufe, passeCanvas, status, nachricht, ergebnis }) {
  const ctx = passeCanvas(canvas, N, N);
  // Stufe „Lernen“: startet direkt mit den Eröffnungen; gespielt wird danach gegen „Leicht“
  const lernStufe = stufe === "lernen";
  const kiStufe = lernStufe ? "leicht" : stufe;
  // Auflösung an die echte Anzeigegröße anpassen: das Brett wird groß dargestellt,
  // die Zeichenfläche hat deshalb so viele Pixel wie auf dem Bildschirm (× Pixeldichte)
  let skala = 1; // Bildschirmpixel pro Brett-Einheit
  function passeAufloesung() {
    const breite = canvas.getBoundingClientRect().width;
    if (!breite) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const px = Math.max(N, Math.round(breite * dpr));
    if (canvas.width !== px) canvas.width = canvas.height = px;
    skala = px / N;
    ctx.setTransform(skala, 0, 0, skala, 0, 0);
    ctx.imageSmoothingEnabled = false;
    zeichne();
  }
  const aufloesungRO = new ResizeObserver(passeAufloesung);
  let pos = ausFen(START);
  let stil = gemerkterStil();
  let auswahl = -1;
  let ziele = []; // legale Züge der ausgewählten Figur
  let preZiele = []; // mögliche Premove-Felder
  let premove = null; // { from, to }
  let letzter = null;
  let cursor = 52; // e2
  let denkt = false;
  let vorbei = false;
  let anfrage = 0;
  let anims = []; // { p, from, to, start }
  let animFuer = null; // "live" oder Index der Ansicht, zu der die Animation gehört
  let geschlagen = null; // { p, sq } bleibt sichtbar, bis die Figur ankommt
  let raf = 0;
  // Verlauf: jede Stellung nach einem Zug, zum Nachspielen mit den Pfeiltasten
  let stellungen = [{ pos: klon(pos), zug: null }];
  let ansicht = null; // null = aktuelle Partie, sonst Index in stellungen
  let effekt = gemerkterEffekt();
  let effekte = []; // laufende Schlag-Effekte
  let fxRaf = 0;
  let tastaturAktiv = false; // Rahmen fürs Tastatur-Spiel erst zeigen, wenn WASD benutzt wird
  let druck = null; // gedrückte eigene Figur: { sq, x, y, warAusgewaehlt, id }
  let ziehen = false; // wird sie gerade gezogen?
  let zugPunkt = { x: 0, y: 0 }; // Zeigerposition in Brett-Einheiten

  // Lernmodus: Eröffnungen nachspielen
  let modus = "partie"; // partie | lernen
  let lernSeite = "w"; // welche Farbe man lernt (im Lernmodus und beim Weiterspielen danach)
  let lernPartie = false; // nach einer Eröffnung gegen den Computer weiterspielen
  let gedreht = false; // Brett aus Sicht von Schwarz
  let eroe = EROEFFNUNGEN[0];
  let lernIndex = 0; // nächster Halbzug der Eröffnung
  let lernFehler = 0;
  let fehlerHier = 0; // Fehlversuche beim aktuellen Zug (steuert die Tipps)
  let falsch = null; // { from, to, bis } kurz rot markierter falscher Zug
  let tippPfeil = null; // { from, to } eingeblendeter Lösungszug
  let lernText = "";
  let eigeneZeile = ""; // Erklärung zum eigenen, richtigen Zug (bleibt stehen, wenn der Gegner antwortet)
  let lernSitzung = 0; // verhindert, dass ein verspäteter Gegenzug in eine neu gestartete Übung gerät
  const meine = () => (modus === "lernen" || lernPartie ? lernSeite : "w");

  const worker = new Worker(new URL("./schach-worker.js", import.meta.url), { type: "module" });

  const sicht = () => (ansicht === null ? { pos, zug: letzter } : stellungen[ansicht]);
  const sichtKey = () => (ansicht === null ? "live" : ansicht);

  function zeichneFigur(p, x, y, gross = 1) {
    if (gedreht) {
      // Brett ist um 180° gedreht: die Figur selbst wieder aufrecht stellen
      ctx.save();
      ctx.translate(x + Z / 2, y + Z / 2);
      ctx.rotate(Math.PI);
      ctx.translate(-x - Z / 2, -y - Z / 2);
      zeichneFigurAufrecht(p, x, y, gross);
      ctx.restore();
      return;
    }
    zeichneFigurAufrecht(p, x, y, gross);
  }
  function zeichneFigurAufrecht(p, x, y, gross) {
    if (!PIXEL_SAETZE[stil]) {
      const g = Z * 0.9 * gross;
      const bild = raster(stil, p, Math.round(g * skala));
      if (bild) {
        ctx.drawImage(bild, x + (Z - g) / 2, y + (Z - g) / 2, g, g);
        return;
      }
    }
    // Pixelfiguren: ohne Glätten skalieren, dann bleiben die Pixelkanten scharf
    const bild = figurBild(p, PIXEL_SAETZE[stil] ? stil : "pixel");
    const w = bild.width * gross;
    ctx.drawImage(bild, x + (Z - w) / 2, y + (Z - w) / 2 + 2, w, w);
  }

  const feldRahmen = (sq, farbeRahmen, d = 4) => {
    const x = (sq % 8) * Z;
    const y = Math.floor(sq / 8) * Z;
    ctx.fillStyle = farbeRahmen;
    ctx.fillRect(x, y, Z, d);
    ctx.fillRect(x, y + Z - d, Z, d);
    ctx.fillRect(x, y, d, Z);
    ctx.fillRect(x + Z - d, y, d, Z);
  };
  const feldPunkt = (sq, farbePunkt) => {
    ctx.fillStyle = farbePunkt;
    ctx.fillRect((sq % 8) * Z + Z / 2 - 7, Math.floor(sq / 8) * Z + Z / 2 - 7, 14, 14);
  };

  // Ein Bild zeichnen: Brett (evtl. wackelnd), dann die Effekte darüber
  function zeichne(t = performance.now()) {
    const versatz = wackeln(effekte, t);
    if (versatz) {
      ctx.fillStyle = "#0f0e13";
      ctx.fillRect(0, 0, N, N);
      ctx.save();
      ctx.translate(versatz[0], versatz[1]);
    }
    if (gedreht) {
      ctx.save();
      ctx.translate(N, N);
      ctx.rotate(Math.PI);
    }
    zeichneBrett(t);
    const key = sichtKey();
    for (const e of effekte) if (e.fuer === key) zeichneEffekt(ctx, e, t, zeichneFigur, Z, "oben");
    if (gedreht) {
      ctx.restore();
      zeichneKoordinaten(BRETT[STILE.find((s) => s.id === stil).brett]);
    }
    if (versatz) ctx.restore();
  }
  // Beschriftung der Reihen und Linien (beim gedrehten Brett nach dem Zurückdrehen, damit sie lesbar bleibt)
  function zeichneKoordinaten(brett) {
    ctx.font = '11px "Press Start 2P", monospace';
    ctx.fillStyle = brett.koord;
    ctx.textBaseline = "top";
    for (let i = 0; i < 8; i++) {
      ctx.textAlign = "left";
      ctx.fillText(String(gedreht ? i + 1 : 8 - i), 5, i * Z + 5);
      ctx.textAlign = "right";
      ctx.fillText((gedreht ? "hgfedcba" : "abcdefgh")[i], i * Z + Z - 5, N - 16);
    }
  }

  function zeichneBrett(t) {
    const { pos: p, zug } = sicht();
    const live = ansicht === null;
    const brett = BRETT[STILE.find((s) => s.id === stil).brett];
    const meineAnims = animFuer === sichtKey() ? anims : [];
    for (let sq = 0; sq < 64; sq++) {
      const r = Math.floor(sq / 8);
      const c = sq % 8;
      ctx.fillStyle = (r + c) % 2 ? brett.dunkel : brett.hell;
      ctx.fillRect(c * Z, r * Z, Z, Z);
      if (zug && (sq === zug.from || sq === zug.to)) {
        ctx.fillStyle = FARBEN.letzter;
        ctx.fillRect(c * Z, r * Z, Z, Z);
      }
      if (live && premove && (sq === premove.from || sq === premove.to)) {
        ctx.fillStyle = FARBEN.premove;
        ctx.fillRect(c * Z, r * Z, Z, Z);
      }
      if (live && sq === auswahl) {
        ctx.fillStyle = preZiele.length ? FARBEN.premove : FARBEN.auswahl;
        ctx.fillRect(c * Z, r * Z, Z, Z);
      }
    }
    if (!meineAnims.length && imSchach(p)) {
      const k = p.koenig[p.zug];
      ctx.fillStyle = FARBEN.schach;
      ctx.fillRect((k % 8) * Z, Math.floor(k / 8) * Z, Z, Z);
    }
    // Koordinaten (beim gedrehten Brett erst nach dem Zurückdrehen, siehe zeichne)
    if (!gedreht) zeichneKoordinaten(brett);
    // Lernmodus: falscher Zug rot, Tipp-Pfeil grün
    if (live && falsch && performance.now() < falsch.bis) {
      for (const sq of [falsch.from, falsch.to]) {
        ctx.fillStyle = "rgba(229, 86, 111, 0.45)";
        ctx.fillRect((sq % 8) * Z, Math.floor(sq / 8) * Z, Z, Z);
      }
    }

    // Figuren; die gerade gleitenden werden zuletzt obendrauf gezeichnet
    const ziehendeZiele = new Set(meineAnims.map((a) => a.to));
    if (meineAnims.length && geschlagen) zeichneFigur(geschlagen.p, (geschlagen.sq % 8) * Z, Math.floor(geschlagen.sq / 8) * Z);
    for (const e of effekte) if (e.fuer === sichtKey()) zeichneEffekt(ctx, e, t, zeichneFigur, Z, "unten");
    const gezogen = live && ziehen && druck ? druck.sq : -1;
    for (let sq = 0; sq < 64; sq++) if (p.b[sq] && !ziehendeZiele.has(sq) && sq !== gezogen) zeichneFigur(p.b[sq], (sq % 8) * Z, Math.floor(sq / 8) * Z);
    for (const a of meineAnims) {
      const roh = Math.max(0, Math.min(1, (t - a.start) / ANIM_MS));
      const k = (a.ease || ease)(roh);
      const x = ((a.from % 8) + ((a.to % 8) - (a.from % 8)) * k) * Z;
      const y = (Math.floor(a.from / 8) + (Math.floor(a.to / 8) - Math.floor(a.from / 8)) * k) * Z;
      zeichneFigur(a.p, x, y - Math.sin(roh * Math.PI) * (a.hop ?? 7) * (gedreht ? -1 : 1)); // kleiner „Hüpfer“
    }

    if (live && tippPfeil) zeichnePfeil(tippPfeil.from, tippPfeil.to);
    if (live) {
      for (const m of ziele) (p.b[m.to] || m.ep ? feldRahmen(m.to, FARBEN.ziel) : feldPunkt(m.to, FARBEN.ziel));
      for (const sq of preZiele) (p.b[sq] ? feldRahmen(sq, FARBEN.premoveZiel) : feldPunkt(sq, FARBEN.premoveZiel));
    } else {
      // beim Nachspielen: dezenter Rahmen ums ganze Brett
      ctx.strokeStyle = "rgba(245, 217, 122, 0.8)";
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, N - 4, N - 4);
    }
    // Figur, die gerade mit Maus/Finger gezogen wird: Zielfeld markieren, Figur unter dem Zeiger
    if (gezogen >= 0 && p.b[gezogen]) {
      const ueber = feldBei(zugPunkt.x, zugPunkt.y);
      if (ueber >= 0 && ueber !== gezogen) feldRahmen(ueber, preZiele.length ? FARBEN.premoveZiel : "rgba(255,255,255,0.75)", 3);
      if (gedreht) zeichneFigur(p.b[gezogen], N - zugPunkt.x - Z / 2, N - zugPunkt.y - Z / 2 + 6, 1.12);
      else zeichneFigur(p.b[gezogen], zugPunkt.x - Z / 2, zugPunkt.y - Z / 2 - 6, 1.12);
    }
    if (live && document.activeElement === canvas && !meineAnims.length && tastaturAktiv) {
      ctx.strokeStyle = FARBEN.cursor;
      ctx.lineWidth = 2;
      ctx.strokeRect((cursor % 8) * Z + 2, Math.floor(cursor / 8) * Z + 2, Z - 4, Z - 4);
    }
  }

  // Pfeil für den Tipp im Lernmodus
  function zeichnePfeil(from, to) {
    const mx = (sq) => (sq % 8) * Z + Z / 2;
    const my = (sq) => Math.floor(sq / 8) * Z + Z / 2;
    const x0 = mx(from);
    const y0 = my(from);
    const x1 = mx(to);
    const y1 = my(to);
    const w = Math.atan2(y1 - y0, x1 - x0);
    const l = Math.hypot(x1 - x0, y1 - y0) - 18;
    ctx.save();
    ctx.translate(x0, y0);
    ctx.rotate(w);
    ctx.fillStyle = "rgba(95, 195, 156, 0.85)";
    ctx.fillRect(0, -7, l - 14, 14);
    ctx.beginPath();
    ctx.moveTo(l + 8, 0);
    ctx.lineTo(l - 20, -20);
    ctx.lineTo(l - 20, 20);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Figur(en) gleiten lassen. vorher = Stellung vor dem Zug (für die geschlagene Figur)
  function gleite(m, vorher, nachher, fuer, fertig) {
    const p = nachher.b[m.to];
    const opferFeld = m.ep ? m.to + (farbe(p) === "w" ? 8 : -8) : m.to;
    geschlagen = vorher.b[opferFeld] ? { p: vorher.b[opferFeld], sq: opferFeld } : null;
    const opfer = geschlagen;
    const start = performance.now();
    // beim Schlagen bewegt sich die Figur bei „passend“ auf ihre eigene Art
    const art = opfer ? bewegung(effekt, p.toUpperCase()) : null;
    anims = [{ p, from: m.from, to: m.to, start, ...(art || {}) }];
    animFuer = fuer;
    const turm = { K: [63, 61], Q: [56, 59], k: [7, 5], q: [0, 3] }[m.rochade];
    if (turm) anims.push({ p: nachher.b[turm[1]], from: turm[0], to: turm[1], start });
    cancelAnimationFrame(raf);
    const schritt = (t) => {
      if (t - start >= ANIM_MS) {
        anims = [];
        animFuer = null;
        geschlagen = null;
        if (opfer && effekt !== "aus") starteEffekt(m, p, opfer, fuer, t);
        zeichne(t);
        fertig?.();
        return;
      }
      zeichne(t);
      raf = requestAnimationFrame(schritt);
    };
    raf = requestAnimationFrame(schritt);
  }

  // Zug rückwärts zeigen: Figur gleitet vom Ziel- zurück aufs Startfeld.
  // vorher = Stellung vor dem Zug (dort steht auch eine geschlagene Figur wieder)
  function gleiteZurueck(m, vorher, fuer) {
    const start = performance.now();
    anims = [{ p: vorher.b[m.from], from: m.to, to: m.from, start }];
    const turm = { K: [63, 61], Q: [56, 59], k: [7, 5], q: [0, 3] }[m.rochade];
    if (turm) anims.push({ p: vorher.b[turm[0]], from: turm[1], to: turm[0], start });
    animFuer = fuer;
    geschlagen = null;
    const schritt = (t) => {
      if (t - start >= ANIM_MS) {
        anims = [];
        animFuer = null;
        zeichne(t);
        return;
      }
      zeichne(t);
      raf = requestAnimationFrame(schritt);
    };
    raf = requestAnimationFrame(schritt);
  }

  // Schlag-Effekt starten und so lange Bilder zeichnen, bis er vorbei ist
  function starteEffekt(m, angreifer, opfer, fuer, t) {
    const fx = m.to % 8 - (m.from % 8);
    const fy = Math.floor(m.to / 8) - Math.floor(m.from / 8);
    const len = Math.hypot(fx, fy) || 1;
    const e = erzeugeEffekt({ art: effekt, angreifer, opfer: opfer.p, sq: opfer.sq, dir: [fx / len, fy / len], start: t, Z });
    e.fuer = fuer;
    effekte.push(e);
    if (!fxRaf) fxRaf = requestAnimationFrame(fxSchritt);
  }
  function fxSchritt(t) {
    effekte = effekte.filter((e) => t - e.start < e.dauer);
    if (!anims.length) zeichne(t); // während einer Zug-Animation zeichnet die schon
    fxRaf = effekte.length ? requestAnimationFrame(fxSchritt) : 0;
    if (!effekte.length && !anims.length) zeichne(t);
  }

  // Zug in der Partie ausführen; ruft danach `fertig` auf
  function animiereZug(m, fertig) {
    const vorher = klon(pos);
    spieleZug(pos, m);
    letzter = m;
    stellungen.push({ pos: klon(pos), zug: m });
    zeigeVerlauf();
    if (ansicht !== null) {
      // jemand schaut gerade alte Züge an: Partie läuft im Hintergrund weiter
      zeichne();
      setTimeout(() => fertig(), 0);
      return;
    }
    gleite(m, vorher, pos, "live", fertig);
  }

  function zeigeStatus() {
    if (vorbei) return;
    if (modus === "lernen") {
      const meinePly = eroe.zuege.filter((_, i) => (i % 2 === 0 ? "w" : "b") === lernSeite).length;
      const geschafft = eroe.zuege.slice(0, lernIndex).filter((_, i) => (i % 2 === 0 ? "w" : "b") === lernSeite).length;
      status(`${eroe.name} · ${geschafft} von ${meinePly} Zügen · Fehler ${lernFehler}`);
      return;
    }
    if (ansicht !== null) status(`Zug ${ansicht} von ${stellungen.length - 1} · → zurück zur Partie`);
    else if (denkt) status(premove ? "Computer denkt … · Premove gesetzt" : "Computer denkt …");
    else status(imSchach(pos) ? "Schach! Du bist am Zug" : "Du bist am Zug");
  }

  function pruefeEnde() {
    const e = ende(pos);
    if (!e) return false;
    vorbei = true;
    premove = null;
    let titel = "Remis";
    let text = `Remis durch ${e.typ}`;
    if (e.typ === "matt") {
      titel = e.sieger === meine() ? "Schachmatt – gewonnen!" : "Schachmatt – verloren";
      text = e.sieger === meine() ? "Du hast den Computer mattgesetzt." : "Der Computer hat dich mattgesetzt.";
    } else if (e.typ === "patt") text = "Patt: Keine Züge mehr, aber kein Schach.";
    status(titel);
    if (!lernPartie && !lernStufe) ergebnis({ gewonnen: e.typ === "matt" && e.sieger === "w" });
    nachricht(`<p class="big">${titel}</p><p>${text}</p><p class="small">Mit ← → kannst du die Partie nachspielen</p><p><button class="btn" type="button" data-neu>Neue Partie</button> <button class="btn btn-ghost" type="button" data-ansehen>Partie ansehen</button></p>`);
    document.querySelector("#stage-msg [data-neu]")?.addEventListener("click", (ev) => {
      ev.stopPropagation();
      neuePartie();
    });
    document.querySelector("#stage-msg [data-ansehen]")?.addEventListener("click", (ev) => {
      ev.stopPropagation();
      nachricht(null);
      canvas.focus({ preventScroll: true });
    });
    return true;
  }

  // Am Zug: gespeicherten Premove ausführen, wenn er jetzt legal ist
  function versuchePremove() {
    const pm = premove;
    premove = null;
    if (!pm) return false;
    const kand = zuege(pos).filter((m) => m.from === pm.from && m.to === pm.to);
    if (!kand.length) return false;
    fuehreAus(kand.find((m) => m.umw === "Q") || kand[0]);
    return true;
  }

  function computerZieht() {
    denkt = true;
    zeigeStatus();
    const id = ++anfrage;
    const start = performance.now();
    worker.onmessage = (e) => {
      if (e.data.id !== id || vorbei) return;
      const warte = Math.max(0, (BEDENKZEIT[kiStufe] || 900) - (performance.now() - start));
      setTimeout(() => {
        if (id !== anfrage || vorbei || !e.data.zug) return;
        animiereZug(e.data.zug, () => {
          denkt = false;
          if (pruefeEnde()) return;
          preZiele = [];
          if (versuchePremove()) return;
          // eine für den Premove angetippte Figur bleibt ausgewählt
          ziele = auswahl >= 0 && pos.b[auswahl] && farbe(pos.b[auswahl]) === meine() ? zuege(pos).filter((m) => m.from === auswahl) : [];
          if (!ziele.length) auswahl = -1;
          zeichne();
          zeigeStatus();
        });
      }, warte);
    };
    worker.postMessage({ pos: klon(pos), stufe: kiStufe, id });
  }

  function fuehreAus(m) {
    auswahl = -1;
    ziele = [];
    preZiele = [];
    denkt = true; // ab jetzt ist der Computer dran (Klicks werden Premoves)
    animiereZug(m, () => {
      if (!pruefeEnde()) computerZieht();
    });
  }

  function waehleUmwandlung(kandidaten) {
    nachricht(
      `<p class="big">Umwandlung</p><p>In welche Figur soll der Bauer werden?</p><p>${["Q", "R", "B", "N"]
        .map((u) => `<button class="btn" type="button" data-umw="${u}">${NAMEN[u]}</button>`)
        .join(" ")}</p>`,
    );
    document.querySelectorAll("#stage-msg [data-umw]").forEach((b) =>
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        nachricht(null);
        fuehreAus(kandidaten.find((m) => m.umw === b.dataset.umw));
      }),
    );
  }

  function feldGeklickt(sq) {
    if (vorbei) return;
    if (ansicht !== null) {
      // Klick beim Nachspielen springt zurück zur laufenden Partie
      zuAnsicht(null);
      return;
    }
    const amZug = pos.zug === meine() && !denkt && !anims.length;
    if (modus === "lernen" && !amZug) return; // im Lernmodus keine Premoves
    if (amZug) {
      const passend = ziele.filter((m) => m.to === sq);
      if (passend.length) {
        if (modus === "lernen") lernZug(passend.find((m) => m.umw === "Q") || passend[0]);
        else if (passend.length > 1) waehleUmwandlung(passend);
        else fuehreAus(passend[0]);
        return;
      }
      if (pos.b[sq] && farbe(pos.b[sq]) === meine()) {
        auswahl = sq === auswahl ? -1 : sq;
        ziele = auswahl >= 0 ? zuege(pos).filter((m) => m.from === auswahl) : [];
      } else {
        auswahl = -1;
        ziele = [];
      }
      zeichne();
      return;
    }
    // Computer ist dran: Premove setzen
    ziele = [];
    if (auswahl >= 0 && preZiele.includes(sq)) {
      premove = { from: auswahl, to: sq };
      auswahl = -1;
      preZiele = [];
    } else if (pos.b[sq] && farbe(pos.b[sq]) === meine() && sq !== auswahl) {
      auswahl = sq;
      preZiele = premoveZiele(pos.b[sq], sq);
      premove = null;
    } else {
      auswahl = -1;
      preZiele = [];
      premove = null;
    }
    zeichne();
    zeigeStatus();
  }

  function premoveLoeschen() {
    premove = null;
    preZiele = [];
    if (pos.zug !== meine() || denkt) auswahl = -1;
    zeichne();
    zeigeStatus();
  }

  // ---------- Nachspielen ----------
  function zuAnsicht(i) {
    const letzteNr = stellungen.length - 1;
    if (i !== null) i = Math.max(0, Math.min(letzteNr, i));
    if (i === letzteNr) i = null;
    const alt = ansicht === null ? letzteNr : ansicht;
    ansicht = i;
    const neu = i === null ? letzteNr : i;
    zeigeVerlauf();
    zeigeStatus();
    // Eine laufende Animation der echten Partie nicht abbrechen (danach zieht der Computer)
    const liveLaeuft = animFuer === "live";
    if (!liveLaeuft) {
      cancelAnimationFrame(raf);
      anims = [];
      animFuer = null;
      geschlagen = null;
    }
    if (!liveLaeuft && neu === alt + 1) {
      // einen Zug vor: Figur gleitet vom Start- aufs Zielfeld
      gleite(stellungen[neu].zug, stellungen[alt].pos, stellungen[neu].pos, sichtKey());
    } else if (!liveLaeuft && neu === alt - 1) {
      // einen Zug zurück: dieselbe Bewegung rückwärts
      gleiteZurueck(stellungen[alt].zug, stellungen[neu].pos, sichtKey());
    } else {
      zeichne();
    }
  }

  // ---------- Leiste unter dem Brett: Figurenstil + Nachspielen ----------
  tools.hidden = false;
  tools.innerHTML = `
    <label class="tools-feld"><span>Modus</span>
      <select class="tools-select" data-s="modus">
        <option value="partie">Gegen den Computer</option>
        <option value="lernen">Eröffnungen lernen</option>
      </select>
    </label>
    <label class="tools-feld" data-s="eroe-feld" hidden><span>Eröffnung</span>
      <select class="tools-select" data-s="eroe">${EROEFFNUNGEN.map((e) => `<option value="${e.id}">${e.name} (${e.seite === "w" ? "Weiß" : "Schwarz"})</option>`).join("")}</select>
    </label>
    <button type="button" class="more" data-s="tipp" hidden>Tipp</button>
    <label class="tools-feld"><span>Figuren</span>
      <select class="tools-select" data-s="figuren">${STILE.map((s) => `<option value="${s.id}"${s.id === stil ? " selected" : ""}>${s.name}</option>`).join("")}</select>
    </label>
    <label class="tools-feld"><span>Schlagen</span>
      <select class="tools-select tools-effekt">${EFFEKTE.map((s) => `<option value="${s.id}"${s.id === effekt ? " selected" : ""}>${s.name}</option>`).join("")}</select>
    </label>
    <div class="tools-verlauf" role="group" aria-label="Züge nachspielen">
      <button type="button" class="tools-btn" data-v="anfang" aria-label="Zum Anfang">⏮</button>
      <button type="button" class="tools-btn" data-v="zurueck" aria-label="Zug zurück">◀</button>
      <span class="tools-nr num" aria-live="polite"></span>
      <button type="button" class="tools-btn" data-v="vor" aria-label="Zug vor">▶</button>
      <button type="button" class="tools-btn" data-v="ende" aria-label="Zur aktuellen Stellung">⏭</button>
    </div>
    <button type="button" class="more tools-neu">Neue Partie</button>
    <div class="lern-box" data-s="box" hidden aria-live="polite"></div>`;
  const nrEl = tools.querySelector(".tools-nr");
  function zeigeVerlauf() {
    const n = stellungen.length - 1;
    const i = ansicht === null ? n : ansicht;
    nrEl.textContent = `${i} / ${n}`;
    tools.querySelector('[data-v="anfang"]').disabled = tools.querySelector('[data-v="zurueck"]').disabled = i === 0;
    tools.querySelector('[data-v="vor"]').disabled = tools.querySelector('[data-v="ende"]').disabled = ansicht === null;
  }
  const schritt = { anfang: () => zuAnsicht(0), zurueck: () => zuAnsicht((ansicht ?? stellungen.length - 1) - 1), vor: () => ansicht !== null && zuAnsicht(ansicht + 1), ende: () => zuAnsicht(null) };
  tools.querySelectorAll("[data-v]").forEach((b) => b.addEventListener("click", () => schritt[b.dataset.v]()));
  tools.querySelector(".tools-neu").addEventListener("click", () => (modus === "lernen" ? starteLernen(eroe.id) : neuePartie()));
  const sEl = (n) => tools.querySelector(`[data-s="${n}"]`);
  sEl("modus").addEventListener("change", (e) => {
    e.target.blur();
    if (e.target.value === "lernen") starteLernen(sEl("eroe").value);
    else {
      lernPartie = false;
      neuePartie();
    }
  });
  sEl("eroe").addEventListener("change", (e) => {
    e.target.blur();
    starteLernen(e.target.value);
  });
  sEl("tipp").addEventListener("click", (e) => {
    e.currentTarget.blur();
    tipp(true);
  });

  // ---------- Lernmodus ----------
  const plyFarbe = (i) => (i % 2 === 0 ? "w" : "b");
  const zugText = (i) => `${i % 2 === 0 ? `${i / 2 + 1}.` : `${Math.floor(i / 2) + 1}. …`} ${sanDeutsch(eroe.zuege[i][0])}`;
  const FIGUR_NAME = { P: "Bauer", N: "Springer", B: "Läufer", R: "Turm", Q: "Dame", K: "König" };
  function zeigeLernBox() {
    const box = sEl("box");
    box.hidden = modus !== "lernen";
    if (box.hidden) return;
    const liste = eroe.zuege
      .map((_, i) => {
        const gespielt = i < lernIndex;
        const art = plyFarbe(i) === lernSeite ? "mein" : "gegner";
        const text = gespielt ? sanDeutsch(eroe.zuege[i][0]) : plyFarbe(i) === lernSeite ? "?" : "…";
        return `${i % 2 === 0 ? `<span class="lb-nr">${i / 2 + 1}.</span>` : ""}<span class="lb-zug ${art}${gespielt ? " ok" : ""}${i === lernIndex ? " jetzt" : ""}">${text}</span>`;
      })
      .join("");
    box.innerHTML = `<p class="lb-kopf"><b>${eroe.name}</b> · du spielst ${lernSeite === "w" ? "Weiß" : "Schwarz"}</p><p class="lb-idee">${eroe.idee}</p><p class="lb-zuege">${liste}</p><p class="lb-text">${lernText}</p>`;
  }
  function starteLernen(id) {
    eroe = EROEFFNUNGEN.find((e) => e.id === id) || EROEFFNUNGEN[0];
    modus = "lernen";
    lernPartie = false;
    lernSeite = eroe.seite;
    gedreht = lernSeite === "b";
    sEl("modus").value = "lernen";
    sEl("eroe").value = eroe.id;
    sEl("eroe-feld").hidden = false;
    sEl("tipp").hidden = false;
    tools.querySelector(".tools-neu").textContent = "Von vorn";
    neuePartie(true);
    lernIndex = 0;
    lernFehler = 0;
    fehlerHier = 0;
    eigeneZeile = "";
    lernSitzung++;
    lernText = lernSeite === "w" ? "Du hast Weiß und beginnst. Welcher Zug eröffnet diese Partie?" : "Du hast Schwarz. Weiß beginnt gleich, schau dir den Zug an.";
    zeigeLernBox();
    zeigeStatus();
    naechsterLernschritt();
  }
  function naechsterLernschritt() {
    if (modus !== "lernen") return;
    tippPfeil = null;
    fehlerHier = 0;
    if (lernIndex >= eroe.zuege.length) return lernGeschafft();
    if (plyFarbe(lernIndex) !== lernSeite) {
      // die Gegenseite spielt ihren Buchzug
      denkt = true;
      const nr = lernIndex;
      const sitzung = lernSitzung;
      setTimeout(() => {
        if (modus !== "lernen" || sitzung !== lernSitzung || nr !== lernIndex || vorbei) return;
        const m = sanZuZug(pos, eroe.zuege[nr][0], zuege, feldName);
        if (!m) return;
        animiereZug(m, () => {
          if (sitzung !== lernSitzung) return;
          lernIndex = nr + 1;
          denkt = false;
          lernText = (eigeneZeile ? `${eigeneZeile}<br>` : "") + `<b>${zugText(nr)}</b>: ${eroe.zuege[nr][1]}` + (lernIndex < eroe.zuege.length ? ` <span class="lb-frage">Dein Zug!</span>` : "");
          eigeneZeile = "";
          zeigeLernBox();
          zeigeStatus();
          naechsterLernschritt();
        });
      }, 650);
      return;
    }
    denkt = false;
    zeichne();
  }
  function lernZug(m) {
    const soll = sanZuZug(pos, eroe.zuege[lernIndex][0], zuege, feldName);
    eigeneZeile = "";
    if (soll && m.from === soll.from && m.to === soll.to) {
      auswahl = -1;
      ziele = [];
      tippPfeil = null;
      const nr = lernIndex;
      const sitzung = lernSitzung;
      denkt = true;
      animiereZug(m, () => {
        if (sitzung !== lernSitzung) return;
        lernIndex = nr + 1;
        denkt = false;
        eigeneZeile = `<span class="lb-richtig">Richtig!</span> <b>${zugText(nr)}</b>: ${eroe.zuege[nr][1]}`;
        lernText = eigeneZeile;
        zeigeLernBox();
        zeigeStatus();
        naechsterLernschritt();
      });
      return;
    }
    // falscher Zug: nicht ausführen, kurz rot zeigen, Tipp geben
    lernFehler++;
    fehlerHier++;
    falsch = { from: m.from, to: m.to, bis: performance.now() + 700 };
    auswahl = -1;
    ziele = [];
    setTimeout(() => zeichne(), 720);
    tipp(false);
    zeigeStatus();
  }
  // Tipps werden deutlicher: Figur → Startfeld → ganzer Zug
  function tipp(perKnopf) {
    if (modus !== "lernen" || lernIndex >= eroe.zuege.length || plyFarbe(lernIndex) !== lernSeite || denkt) return;
    const soll = sanZuZug(pos, eroe.zuege[lernIndex][0], zuege, feldName);
    if (!soll) return;
    if (perKnopf) fehlerHier++;
    const figur = FIGUR_NAME[pos.b[soll.from].toUpperCase()];
    const vorne = perKnopf ? "" : `<span class="lb-falsch">Nicht der Zug dieser Eröffnung.</span> `;
    if (fehlerHier <= 1) lernText = `${vorne}Tipp: Es zieht ${figur === "Dame" ? "die" : "der"} ${figur}.`;
    else if (fehlerHier === 2) {
      lernText = `${vorne}Tipp: ${figur === "Dame" ? "Die" : "Der"} ${figur} auf ${feldName(soll.from)} ist dran.`;
      auswahl = soll.from;
      ziele = zuege(pos).filter((z) => z.from === soll.from);
    } else {
      lernText = `${vorne}Lösung: <b>${sanDeutsch(eroe.zuege[lernIndex][0])}</b> (grüner Pfeil). Spiel ihn nach.`;
      tippPfeil = { from: soll.from, to: soll.to };
    }
    zeigeLernBox();
    zeichne();
  }
  function lernGeschafft() {
    const naechste = EROEFFNUNGEN[(EROEFFNUNGEN.indexOf(eroe) + 1) % EROEFFNUNGEN.length];
    const lob = lernFehler === 0 ? "Fehlerfrei, stark!" : lernFehler <= 2 ? `Mit ${lernFehler} Fehler${lernFehler > 1 ? "n" : ""}, gut gemacht.` : `Mit ${lernFehler} Fehlern. Nochmal üben?`;
    status(`${eroe.name} geschafft · Fehler ${lernFehler}`);
    nachricht(`<p class="big">Geschafft!</p><p>${eroe.name}: ${lob}</p><p class="small">${eroe.idee}</p><p><button class="btn" type="button" data-l="nochmal">Nochmal</button> <button class="btn btn-ghost" type="button" data-l="weiter">Nächste: ${naechste.name}</button></p><p><button class="btn btn-ghost" type="button" data-l="spielen">Ab hier gegen den Computer spielen</button></p>`);
    const knopf = (n, fn) =>
      document.querySelector(`#stage-msg [data-l="${n}"]`)?.addEventListener("click", (ev) => {
        ev.stopPropagation();
        fn();
      });
    knopf("nochmal", () => starteLernen(eroe.id));
    knopf("weiter", () => starteLernen(naechste.id));
    knopf("spielen", () => {
      // Stellung behalten, Modus wechseln: du spielst weiter deine Farbe
      nachricht(null);
      modus = "partie";
      lernPartie = true;
      sEl("modus").value = "partie";
      sEl("eroe-feld").hidden = true;
      sEl("tipp").hidden = true;
      sEl("box").hidden = true;
      tools.querySelector(".tools-neu").textContent = "Neue Partie";
      if (pos.zug !== meine()) computerZieht();
      else zeigeStatus();
      zeichne();
    });
  }
  tools.querySelector(".tools-effekt").addEventListener("change", (e) => {
    effekt = e.target.value;
    try {
      localStorage.setItem(EFFEKT_KEY, effekt);
    } catch {}
  });
  tools.querySelector('[data-s="figuren"]').addEventListener("change", (e) => {
    stil = e.target.value;
    try {
      localStorage.setItem(STIL_KEY, stil);
    } catch {}
    ladeStil(stil).then(() => zeichne());
    zeichne();
  });

  function neuePartie(fuerLernen = false) {
    if (!fuerLernen) {
      // zurück zum normalen Spiel gegen den Computer (du spielst Weiß)
      modus = "partie";
      lernPartie = false;
      gedreht = false;
      sEl("modus").value = "partie";
      sEl("eroe-feld").hidden = true;
      sEl("tipp").hidden = true;
      sEl("box").hidden = true;
      tools.querySelector(".tools-neu").textContent = "Neue Partie";
    }
    tippPfeil = null;
    falsch = null;
    cancelAnimationFrame(raf);
    pos = ausFen(START);
    stellungen = [{ pos: klon(pos), zug: null }];
    ansicht = null;
    auswahl = -1;
    ziele = [];
    preZiele = [];
    premove = null;
    letzter = null;
    anims = [];
    animFuer = null;
    geschlagen = null;
    vorbei = false;
    denkt = false;
    anfrage++;
    nachricht(null);
    zeigeVerlauf();
    zeichne();
    zeigeStatus();
  }

  // ---------- Eingabe ----------
  // Klick oder Festhalten und Ziehen
  const brettPunkt = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * N, y: ((e.clientY - r.top) / r.height) * N };
  };
  function feldBei(x, y) {
    if (gedreht) {
      x = N - x;
      y = N - y;
    }
    const c = Math.floor(x / Z);
    const row = Math.floor(y / Z);
    return c < 0 || c > 7 || row < 0 || row > 7 ? -1 : row * 8 + c;
  }
  const eigeneFigur = (sq) => ansicht === null && !vorbei && pos.b[sq] && farbe(pos.b[sq]) === meine();

  const onDown = (e) => {
    if (e.button === 2) return;
    tastaturAktiv = false;
    const pt = brettPunkt(e);
    const sq = feldBei(pt.x, pt.y);
    if (sq < 0) return;
    cursor = sq;
    if (eigeneFigur(sq)) {
      druck = { sq, x: pt.x, y: pt.y, warAusgewaehlt: auswahl === sq, id: e.pointerId };
      zugPunkt = pt;
      canvas.setPointerCapture?.(e.pointerId);
      if (auswahl !== sq) feldGeklickt(sq); // gleich auswählen, damit die Ziele schon beim Ziehen sichtbar sind
    } else {
      druck = null;
      feldGeklickt(sq);
    }
  };
  const onMove = (e) => {
    const pt = brettPunkt(e);
    if (!druck) {
      if (e.pointerType === "mouse") canvas.style.cursor = eigeneFigur(feldBei(pt.x, pt.y)) ? "grab" : "default";
      return;
    }
    if (e.pointerId !== druck.id) return;
    if (!ziehen && Math.hypot(pt.x - druck.x, pt.y - druck.y) < 6) return;
    ziehen = true;
    zugPunkt = pt;
    canvas.style.cursor = "grabbing";
    zeichne();
  };
  const onUp = (e) => {
    if (!druck || e.pointerId !== druck.id) return;
    const d = druck;
    const warZiehen = ziehen;
    druck = null;
    ziehen = false;
    canvas.style.cursor = "";
    if (warZiehen) {
      const ziel = feldBei(zugPunkt.x, zugPunkt.y);
      // abgelegt auf einem anderen Feld: wie ein Klick dorthin (Zug, Premove oder neue Auswahl)
      if (ziel >= 0 && ziel !== d.sq) feldGeklickt(ziel);
      else zeichne();
    } else if (d.warAusgewaehlt) {
      feldGeklickt(d.sq); // zweiter Klick auf dieselbe Figur hebt die Auswahl auf
    }
  };
  const onCancel = () => {
    druck = null;
    ziehen = false;
    canvas.style.cursor = "";
    zeichne();
  };
  const onContext = (e) => {
    e.preventDefault(); // Rechtsklick löscht Premove und Auswahl
    premoveLoeschen();
  };
  const onKey = (e) => {
    if (e.target.closest?.("input, select, textarea")) return;
    // Pfeiltasten: Züge nachspielen (wie bei Lichess)
    const verlauf = { ArrowLeft: "zurueck", ArrowRight: "vor", ArrowUp: "anfang", ArrowDown: "ende", Home: "anfang", End: "ende" };
    if (e.key in verlauf) {
      e.preventDefault();
      schritt[verlauf[e.key]]();
      return;
    }
    if (document.activeElement !== canvas) return;
    const wasd = { w: -8, s: 8, a: -1, d: 1 };
    const k = e.key.toLowerCase();
    if (k in wasd) {
      e.preventDefault();
      tastaturAktiv = true;
      const n = cursor + wasd[k] * (gedreht ? -1 : 1);
      const links = gedreht ? "d" : "a";
      const rechts = gedreht ? "a" : "d";
      if (n >= 0 && n < 64 && !(k === links && cursor % 8 === 0) && !(k === rechts && cursor % 8 === 7)) cursor = n;
      zeichne();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      tastaturAktiv = true;
      if (vorbei) (modus === "lernen" ? starteLernen(eroe.id) : neuePartie());
      else feldGeklickt(cursor);
    } else if (e.key === "Escape") premoveLoeschen();
  };
  const onFocus = () => zeichne();

  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onCancel);
  canvas.addEventListener("contextmenu", onContext);
  aufloesungRO.observe(canvas);
  canvas.addEventListener("focus", onFocus);
  canvas.addEventListener("blur", onFocus);
  window.addEventListener("keydown", onKey);
  canvas.setAttribute("aria-label", "Schachbrett, du spielst Weiß. Feld mit WASD wählen, Enter zum Ziehen, Pfeiltasten zum Nachspielen.");

  document.fonts?.load('11px "Press Start 2P"').finally(() => zeichne());
  ladeStil(stil).then(() => zeichne());
  zeigeVerlauf();
  zeichne();
  zeigeStatus();
  if (lernStufe) starteLernen(EROEFFNUNGEN[0].id);

  return {
    pause() {},
    stop() {
      vorbei = true;
      cancelAnimationFrame(raf);
      cancelAnimationFrame(fxRaf);
      worker.terminate();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onCancel);
      canvas.removeEventListener("contextmenu", onContext);
      aufloesungRO.disconnect();
      canvas.style.cursor = "";
      canvas.removeEventListener("focus", onFocus);
      canvas.removeEventListener("blur", onFocus);
      window.removeEventListener("keydown", onKey);
    },
  };
}
