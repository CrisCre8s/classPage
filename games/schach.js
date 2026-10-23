// Schach gegen den Computer. Du spielst Weiß.
import { ausFen, START, zuege, spieleZug, ende, imSchach, farbe } from "./schach-engine.js";

export const HILFE = "Figur antippen, dann Zielfeld · Tastatur: Pfeiltasten + Enter · Du spielst Weiß";

const Z = 64; // Feldgröße
const N = Z * 8;
const PX = 3; // Pixelgröße der Figuren (16 × 16 Raster → 48 px)
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

const FARBEN = {
  hell: "#34323b",
  dunkel: "#1f1d25",
  auswahl: "rgba(212, 184, 255, 0.35)",
  letzter: "rgba(245, 217, 122, 0.22)",
  schach: "rgba(229, 86, 111, 0.55)",
  ziel: "rgba(245, 217, 122, 0.85)",
  cursor: "#f5d97a",
};

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

export function start({ canvas, stufe, passeCanvas, status, nachricht, ergebnis }) {
  const ctx = passeCanvas(canvas, N, N);
  let pos = ausFen(START);
  let auswahl = -1;
  let ziele = [];
  let letzter = null;
  let cursor = 52; // e2
  let denkt = false;
  let vorbei = false;
  let anfrage = 0;
  let anims = []; // { p, from, to, start }
  let geschlagen = null; // { p, sq } bleibt sichtbar, bis die Figur ankommt
  let raf = 0;

  const worker = new Worker(new URL("./schach-worker.js", import.meta.url), { type: "module" });

  function zeichneFigur(p, x, y) {
    const bild = figurBild(p);
    ctx.drawImage(bild, x + (Z - bild.width) / 2, y + (Z - bild.height) / 2 + 2);
  }

  function zeichne(t = performance.now()) {
    for (let sq = 0; sq < 64; sq++) {
      const r = Math.floor(sq / 8);
      const c = sq % 8;
      ctx.fillStyle = (r + c) % 2 ? FARBEN.dunkel : FARBEN.hell;
      ctx.fillRect(c * Z, r * Z, Z, Z);
      if (letzter && (sq === letzter.from || sq === letzter.to)) {
        ctx.fillStyle = FARBEN.letzter;
        ctx.fillRect(c * Z, r * Z, Z, Z);
      }
      if (sq === auswahl) {
        ctx.fillStyle = FARBEN.auswahl;
        ctx.fillRect(c * Z, r * Z, Z, Z);
      }
    }
    if (!anims.length && imSchach(pos)) {
      const k = pos.koenig[pos.zug];
      ctx.fillStyle = FARBEN.schach;
      ctx.fillRect((k % 8) * Z, Math.floor(k / 8) * Z, Z, Z);
    }
    // Koordinaten
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.textBaseline = "top";
    for (let i = 0; i < 8; i++) {
      ctx.textAlign = "left";
      ctx.fillText(String(8 - i), 4, i * Z + 4);
      ctx.textAlign = "right";
      ctx.fillText("abcdefgh"[i], i * Z + Z - 4, N - 14);
    }

    // Figuren; die gerade gleitenden werden zuletzt obendrauf gezeichnet
    const ziehendeZiele = new Set(anims.map((a) => a.to));
    if (geschlagen) zeichneFigur(geschlagen.p, (geschlagen.sq % 8) * Z, Math.floor(geschlagen.sq / 8) * Z);
    for (let sq = 0; sq < 64; sq++) if (pos.b[sq] && !ziehendeZiele.has(sq)) zeichneFigur(pos.b[sq], (sq % 8) * Z, Math.floor(sq / 8) * Z);
    for (const a of anims) {
      const k = ease(Math.min(1, (t - a.start) / ANIM_MS));
      const x = ((a.from % 8) + ((a.to % 8) - (a.from % 8)) * k) * Z;
      const y = (Math.floor(a.from / 8) + (Math.floor(a.to / 8) - Math.floor(a.from / 8)) * k) * Z;
      zeichneFigur(a.p, x, y - Math.sin(k * Math.PI) * 6); // kleiner „Hüpfer“
    }

    for (const m of ziele) {
      const x = (m.to % 8) * Z;
      const y = Math.floor(m.to / 8) * Z;
      ctx.fillStyle = FARBEN.ziel;
      if (pos.b[m.to] || m.ep) {
        ctx.fillRect(x, y, Z, 4);
        ctx.fillRect(x, y + Z - 4, Z, 4);
        ctx.fillRect(x, y, 4, Z);
        ctx.fillRect(x + Z - 4, y, 4, Z);
      } else {
        ctx.fillRect(x + Z / 2 - 6, y + Z / 2 - 6, 12, 12);
      }
    }
    if (document.activeElement === canvas && !anims.length) {
      ctx.strokeStyle = FARBEN.cursor;
      ctx.lineWidth = 2;
      ctx.strokeRect((cursor % 8) * Z + 2, Math.floor(cursor / 8) * Z + 2, Z - 4, Z - 4);
    }
  }

  // Zug ausführen und gleiten lassen; ruft danach `fertig` auf
  function animiereZug(m, fertig) {
    const p = pos.b[m.from];
    const opferFeld = m.ep ? m.to + (farbe(p) === "w" ? 8 : -8) : m.to;
    geschlagen = pos.b[opferFeld] ? { p: pos.b[opferFeld], sq: opferFeld } : null;
    spieleZug(pos, m);
    letzter = m;
    const start = performance.now();
    anims = [{ p: pos.b[m.to], from: m.from, to: m.to, start }];
    const turm = { K: [63, 61], Q: [56, 59], k: [7, 5], q: [0, 3] }[m.rochade];
    if (turm) anims.push({ p: pos.b[turm[1]], from: turm[0], to: turm[1], start });

    cancelAnimationFrame(raf);
    const schritt = (t) => {
      if (t - start >= ANIM_MS) {
        anims = [];
        geschlagen = null;
        zeichne(t);
        fertig();
        return;
      }
      zeichne(t);
      raf = requestAnimationFrame(schritt);
    };
    raf = requestAnimationFrame(schritt);
  }

  function zeigeStatus() {
    if (vorbei) return;
    if (denkt) status("Computer denkt …");
    else status(imSchach(pos) ? "Schach! Du bist am Zug" : "Du bist am Zug");
  }

  function pruefeEnde() {
    const e = ende(pos);
    if (!e) return false;
    vorbei = true;
    let titel = "Remis";
    let text = `Remis durch ${e.typ}`;
    if (e.typ === "matt") {
      titel = e.sieger === "w" ? "Schachmatt – gewonnen!" : "Schachmatt – verloren";
      text = e.sieger === "w" ? "Du hast den Computer mattgesetzt." : "Der Computer hat dich mattgesetzt.";
    } else if (e.typ === "patt") text = "Patt: Keine Züge mehr, aber kein Schach.";
    status(titel);
    ergebnis({ gewonnen: e.typ === "matt" && e.sieger === "w" });
    nachricht(`<p class="big">${titel}</p><p>${text}</p><p class="small">Klick für eine neue Partie</p>`);
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
          if (!pruefeEnde()) zeigeStatus();
        });
      }, warte);
    };
    worker.postMessage({ pos: { ...pos, b: [...pos.b], koenig: { ...pos.koenig }, verlauf: [...pos.verlauf] }, stufe, id });
  }

  function fuehreAus(m) {
    auswahl = -1;
    ziele = [];
    denkt = true; // während der Animation keine Eingaben
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
    if (denkt || vorbei || anims.length || pos.zug !== "w") return;
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
  }

  function neuePartie() {
    cancelAnimationFrame(raf);
    pos = ausFen(START);
    auswahl = -1;
    ziele = [];
    letzter = null;
    anims = [];
    geschlagen = null;
    vorbei = false;
    denkt = false;
    anfrage++;
    nachricht(null);
    zeichne();
    zeigeStatus();
  }

  // ---------- Eingabe ----------
  const onDown = (e) => {
    const r = canvas.getBoundingClientRect();
    const c = Math.floor(((e.clientX - r.left) / r.width) * 8);
    const row = Math.floor(((e.clientY - r.top) / r.height) * 8);
    if (c < 0 || c > 7 || row < 0 || row > 7) return;
    cursor = row * 8 + c;
    feldGeklickt(cursor);
  };
  const onKey = (e) => {
    if (document.activeElement !== canvas) return;
    const schritte = { ArrowUp: -8, ArrowDown: 8, ArrowLeft: -1, ArrowRight: 1 };
    if (e.key in schritte) {
      e.preventDefault();
      const n = cursor + schritte[e.key];
      if (n >= 0 && n < 64 && !(e.key === "ArrowLeft" && cursor % 8 === 0) && !(e.key === "ArrowRight" && cursor % 8 === 7)) cursor = n;
      zeichne();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (vorbei) neuePartie();
      else feldGeklickt(cursor);
    }
  };
  const msg = document.getElementById("stage-msg");
  const onMsg = (e) => {
    if (e.target.closest("button")) return;
    if (vorbei) neuePartie();
  };
  const onFocus = () => zeichne();

  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("focus", onFocus);
  canvas.addEventListener("blur", onFocus);
  window.addEventListener("keydown", onKey);
  msg.addEventListener("click", onMsg);
  canvas.setAttribute("aria-label", "Schachbrett, du spielst Weiß. Mit Pfeiltasten Feld wählen, Enter zum Ziehen.");

  document.fonts?.load('10px "Press Start 2P"').finally(() => zeichne());
  zeichne();
  zeigeStatus();

  return {
    pause() {},
    stop() {
      vorbei = true;
      cancelAnimationFrame(raf);
      worker.terminate();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("focus", onFocus);
      canvas.removeEventListener("blur", onFocus);
      window.removeEventListener("keydown", onKey);
      msg.removeEventListener("click", onMsg);
    },
  };
}
