// Schach gegen den Computer. Du spielst Weiß.
import { ausFen, START, zuege, spieleZug, ende, imSchach, farbe } from "./schach-engine.js";

export const HILFE = "Figur ziehen oder antippen, dann Zielfeld · Premove: schon ziehen, während der Computer denkt (Rechtsklick löscht) · ← → ↑ ↓: Züge nachspielen · Tastatur-Spiel: WASD + Enter";

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
  if (id === "pixel") return Promise.resolve();
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
function figurBild(p) {
  if (cache[p]) return cache[p];
  const muster = FIGUREN[p.toUpperCase()];
  const pal = PALETTE[farbe(p)];
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
  cache[p] = c;
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
    add(r - 1, c);
    if (r === 6) add(r - 2, c);
    add(r - 1, c - 1);
    add(r - 1, c + 1);
  } else if (t === "N") [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]].forEach(([a, b]) => add(r + a, c + b));
  else if (t === "B") strahl([[-1, -1], [-1, 1], [1, -1], [1, 1]]);
  else if (t === "R") strahl([[-1, 0], [1, 0], [0, -1], [0, 1]]);
  else if (t === "Q") strahl([[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]]);
  else if (t === "K") {
    for (const a of [-1, 0, 1]) for (const b of [-1, 0, 1]) if (a || b) add(r + a, c + b);
    if (sq === 60) out.push(62, 58); // Rochade
  }
  return out;
}

export function start({ canvas, tools, stufe, passeCanvas, status, nachricht, ergebnis }) {
  const ctx = passeCanvas(canvas, N, N);
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
  let tastaturAktiv = false; // Rahmen fürs Tastatur-Spiel erst zeigen, wenn WASD benutzt wird
  let druck = null; // gedrückte eigene Figur: { sq, x, y, warAusgewaehlt, id }
  let ziehen = false; // wird sie gerade gezogen?
  let zugPunkt = { x: 0, y: 0 }; // Zeigerposition in Brett-Einheiten

  const worker = new Worker(new URL("./schach-worker.js", import.meta.url), { type: "module" });

  const sicht = () => (ansicht === null ? { pos, zug: letzter } : stellungen[ansicht]);
  const sichtKey = () => (ansicht === null ? "live" : ansicht);

  function zeichneFigur(p, x, y, gross = 1) {
    if (stil !== "pixel") {
      const g = Z * 0.9 * gross;
      const bild = raster(stil, p, Math.round(g * skala));
      if (bild) {
        ctx.drawImage(bild, x + (Z - g) / 2, y + (Z - g) / 2, g, g);
        return;
      }
    }
    // Pixelfiguren: ohne Glätten skalieren, dann bleiben die Pixelkanten scharf
    const bild = figurBild(p);
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

  function zeichne(t = performance.now()) {
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
    // Koordinaten
    ctx.font = '11px "Press Start 2P", monospace';
    ctx.fillStyle = brett.koord;
    ctx.textBaseline = "top";
    for (let i = 0; i < 8; i++) {
      ctx.textAlign = "left";
      ctx.fillText(String(8 - i), 5, i * Z + 5);
      ctx.textAlign = "right";
      ctx.fillText("abcdefgh"[i], i * Z + Z - 5, N - 16);
    }

    // Figuren; die gerade gleitenden werden zuletzt obendrauf gezeichnet
    const ziehendeZiele = new Set(meineAnims.map((a) => a.to));
    if (meineAnims.length && geschlagen) zeichneFigur(geschlagen.p, (geschlagen.sq % 8) * Z, Math.floor(geschlagen.sq / 8) * Z);
    const gezogen = live && ziehen && druck ? druck.sq : -1;
    for (let sq = 0; sq < 64; sq++) if (p.b[sq] && !ziehendeZiele.has(sq) && sq !== gezogen) zeichneFigur(p.b[sq], (sq % 8) * Z, Math.floor(sq / 8) * Z);
    for (const a of meineAnims) {
      const k = ease(Math.min(1, (t - a.start) / ANIM_MS));
      const x = ((a.from % 8) + ((a.to % 8) - (a.from % 8)) * k) * Z;
      const y = (Math.floor(a.from / 8) + (Math.floor(a.to / 8) - Math.floor(a.from / 8)) * k) * Z;
      zeichneFigur(a.p, x, y - Math.sin(k * Math.PI) * 7); // kleiner „Hüpfer“
    }

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
      zeichneFigur(p.b[gezogen], zugPunkt.x - Z / 2, zugPunkt.y - Z / 2 - 6, 1.12);
    }
    if (live && document.activeElement === canvas && !meineAnims.length && tastaturAktiv) {
      ctx.strokeStyle = FARBEN.cursor;
      ctx.lineWidth = 2;
      ctx.strokeRect((cursor % 8) * Z + 2, Math.floor(cursor / 8) * Z + 2, Z - 4, Z - 4);
    }
  }

  // Figur(en) gleiten lassen. vorher = Stellung vor dem Zug (für die geschlagene Figur)
  function gleite(m, vorher, nachher, fuer, fertig) {
    const p = nachher.b[m.to];
    const opferFeld = m.ep ? m.to + (farbe(p) === "w" ? 8 : -8) : m.to;
    geschlagen = vorher.b[opferFeld] ? { p: vorher.b[opferFeld], sq: opferFeld } : null;
    const start = performance.now();
    anims = [{ p, from: m.from, to: m.to, start }];
    animFuer = fuer;
    const turm = { K: [63, 61], Q: [56, 59], k: [7, 5], q: [0, 3] }[m.rochade];
    if (turm) anims.push({ p: nachher.b[turm[1]], from: turm[0], to: turm[1], start });
    cancelAnimationFrame(raf);
    const schritt = (t) => {
      if (t - start >= ANIM_MS) {
        anims = [];
        animFuer = null;
        geschlagen = null;
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
      titel = e.sieger === "w" ? "Schachmatt – gewonnen!" : "Schachmatt – verloren";
      text = e.sieger === "w" ? "Du hast den Computer mattgesetzt." : "Der Computer hat dich mattgesetzt.";
    } else if (e.typ === "patt") text = "Patt: Keine Züge mehr, aber kein Schach.";
    status(titel);
    ergebnis({ gewonnen: e.typ === "matt" && e.sieger === "w" });
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
      const warte = Math.max(0, (BEDENKZEIT[stufe] || 900) - (performance.now() - start));
      setTimeout(() => {
        if (id !== anfrage || vorbei || !e.data.zug) return;
        animiereZug(e.data.zug, () => {
          denkt = false;
          if (pruefeEnde()) return;
          preZiele = [];
          if (versuchePremove()) return;
          // eine für den Premove angetippte Figur bleibt ausgewählt
          ziele = auswahl >= 0 && pos.b[auswahl] && farbe(pos.b[auswahl]) === "w" ? zuege(pos).filter((m) => m.from === auswahl) : [];
          if (!ziele.length) auswahl = -1;
          zeichne();
          zeigeStatus();
        });
      }, warte);
    };
    worker.postMessage({ pos: klon(pos), stufe, id });
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
    const amZug = pos.zug === "w" && !denkt && !anims.length;
    if (amZug) {
      const passend = ziele.filter((m) => m.to === sq);
      if (passend.length) {
        if (passend.length > 1) waehleUmwandlung(passend);
        else fuehreAus(passend[0]);
        return;
      }
      if (pos.b[sq] && farbe(pos.b[sq]) === "w") {
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
    } else if (pos.b[sq] && farbe(pos.b[sq]) === "w" && sq !== auswahl) {
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
    if (pos.zug !== "w" || denkt) auswahl = -1;
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
    <label class="tools-feld"><span>Figuren</span>
      <select class="tools-select">${STILE.map((s) => `<option value="${s.id}"${s.id === stil ? " selected" : ""}>${s.name}</option>`).join("")}</select>
    </label>
    <div class="tools-verlauf" role="group" aria-label="Züge nachspielen">
      <button type="button" class="tools-btn" data-v="anfang" aria-label="Zum Anfang">⏮</button>
      <button type="button" class="tools-btn" data-v="zurueck" aria-label="Zug zurück">◀</button>
      <span class="tools-nr num" aria-live="polite"></span>
      <button type="button" class="tools-btn" data-v="vor" aria-label="Zug vor">▶</button>
      <button type="button" class="tools-btn" data-v="ende" aria-label="Zur aktuellen Stellung">⏭</button>
    </div>
    <button type="button" class="more tools-neu">Neue Partie</button>`;
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
  tools.querySelector(".tools-neu").addEventListener("click", () => neuePartie());
  tools.querySelector(".tools-select").addEventListener("change", (e) => {
    stil = e.target.value;
    try {
      localStorage.setItem(STIL_KEY, stil);
    } catch {}
    ladeStil(stil).then(() => zeichne());
    zeichne();
  });

  function neuePartie() {
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
    const c = Math.floor(x / Z);
    const row = Math.floor(y / Z);
    return c < 0 || c > 7 || row < 0 || row > 7 ? -1 : row * 8 + c;
  }
  const eigeneFigur = (sq) => ansicht === null && !vorbei && pos.b[sq] && farbe(pos.b[sq]) === "w";

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
      const n = cursor + wasd[k];
      if (n >= 0 && n < 64 && !(k === "a" && cursor % 8 === 0) && !(k === "d" && cursor % 8 === 7)) cursor = n;
      zeichne();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      tastaturAktiv = true;
      if (vorbei) neuePartie();
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

  return {
    pause() {},
    stop() {
      vorbei = true;
      cancelAnimationFrame(raf);
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
