// Schach gegen den Computer. Du spielst Weiß.
import { ausFen, START, zuege, spieleZug, ende, imSchach, farbe, feldName } from "./schach-engine.js";

export const HILFE = "Figur antippen, dann Zielfeld · Tastatur: Pfeiltasten + Enter · Du spielst Weiß";

const Z = 64; // Feldgröße
const N = Z * 8;
const PX = 4; // Pixelgröße der Figuren (12 × 12 Raster)

// Eigene 12×12-Pixelfiguren
const FIGUREN = {
  P: ["............", "............", ".....##.....", "....####....", "....####....", ".....##.....", "....####....", ".....##.....", "....####....", "...######...", "..########..", "............"],
  R: ["............", "..##.##.##..", "..########..", "...######...", "....####....", "....####....", "....####....", "....####....", "...######...", "..########..", "..########..", "............"],
  N: ["............", "....##......", "...#####....", "..#######...", "..###.###...", ".....####...", "....####....", "...#####....", "...#####....", "..#######...", "..########..", "............"],
  B: ["............", ".....##.....", "....#.##....", "....##.#....", "....####....", ".....##.....", "....####....", ".....##.....", "....####....", "...######...", "..########..", "............"],
  Q: [".#...##...#.", ".##.####.##.", "..########..", "..########..", "...######...", "....####....", "....####....", "....####....", "...######...", "..########..", "..########..", "............"],
  K: [".....##.....", "....####....", ".....##.....", "...######...", "..########..", "..########..", "...######...", "....####....", "....####....", "...######...", "..########..", "............"],
};
const NAMEN = { Q: "Dame", R: "Turm", B: "Läufer", N: "Springer" };

const FARBEN = {
  hell: "#34323b",
  dunkel: "#1f1d25",
  weiss: "#f2f2f3",
  weissRand: "#0b0b0e",
  schwarz: "#c8a2ff",
  schwarzRand: "#0b0b0e",
  auswahl: "rgba(212, 184, 255, 0.35)",
  letzter: "rgba(245, 217, 122, 0.22)",
  schach: "rgba(229, 86, 111, 0.55)",
  ziel: "rgba(245, 217, 122, 0.85)",
  cursor: "#f5d97a",
};

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

  const worker = new Worker(new URL("./schach-worker.js", import.meta.url), { type: "module" });

  function zeichneFigur(p, sq) {
    const muster = FIGUREN[p.toUpperCase()];
    const weiss = farbe(p) === "w";
    const x0 = (sq % 8) * Z + (Z - 12 * PX) / 2;
    const y0 = Math.floor(sq / 8) * Z + (Z - 12 * PX) / 2 + 2;
    // Umriss: die Figur in alle 4 Richtungen versetzt in Randfarbe
    ctx.fillStyle = weiss ? FARBEN.weissRand : FARBEN.schwarzRand;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]])
      muster.forEach((zeile, y) => [...zeile].forEach((ch, x) => ch === "#" && ctx.fillRect(x0 + (x + dx) * PX, y0 + (y + dy) * PX, PX, PX)));
    ctx.fillStyle = weiss ? FARBEN.weiss : FARBEN.schwarz;
    muster.forEach((zeile, y) => [...zeile].forEach((ch, x) => ch === "#" && ctx.fillRect(x0 + x * PX, y0 + y * PX, PX, PX)));
  }

  function zeichne() {
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
    // König im Schach
    if (imSchach(pos)) {
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
    for (let sq = 0; sq < 64; sq++) if (pos.b[sq]) zeichneFigur(pos.b[sq], sq);
    // mögliche Ziele
    for (const m of ziele) {
      const cx = (m.to % 8) * Z + Z / 2;
      const cy = Math.floor(m.to / 8) * Z + Z / 2;
      ctx.fillStyle = FARBEN.ziel;
      if (pos.b[m.to] || m.ep) {
        const x = (m.to % 8) * Z;
        const y = Math.floor(m.to / 8) * Z;
        ctx.fillRect(x, y, Z, 4);
        ctx.fillRect(x, y + Z - 4, Z, 4);
        ctx.fillRect(x, y, 4, Z);
        ctx.fillRect(x + Z - 4, y, 4, Z);
      } else {
        ctx.fillRect(cx - 6, cy - 6, 12, 12);
      }
    }
    // Tastatur-Cursor
    if (document.activeElement === canvas) {
      ctx.strokeStyle = FARBEN.cursor;
      ctx.lineWidth = 2;
      ctx.strokeRect((cursor % 8) * Z + 2, Math.floor(cursor / 8) * Z + 2, Z - 4, Z - 4);
    }
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
      // kurz warten, damit sehr schnelle Züge nicht „ruckartig“ wirken
      const warte = Math.max(0, 350 - (performance.now() - start));
      setTimeout(() => {
        const m = e.data.zug;
        if (!m) return;
        spieleZug(pos, m);
        letzter = m;
        denkt = false;
        zeichne();
        if (!pruefeEnde()) zeigeStatus();
      }, warte);
    };
    worker.postMessage({ pos: { ...pos, b: [...pos.b], koenig: { ...pos.koenig }, verlauf: [...pos.verlauf] }, stufe, id });
  }

  function fuehreAus(m) {
    spieleZug(pos, m);
    letzter = m;
    auswahl = -1;
    ziele = [];
    zeichne();
    if (!pruefeEnde()) computerZieht();
  }

  function waehleUmwandlung(kandidaten) {
    nachricht(
      `<p class="big">Umwandlung</p><p>In welche Figur soll der Bauer werden?</p><p>${["Q", "R", "B", "N"]
        .map((u) => `<button class="btn" type="button" data-umw="${u}">${NAMEN[u]}</button>`)
        .join(" ")}</p>`,
    );
    const msg = document.getElementById("stage-msg");
    msg.querySelectorAll("[data-umw]").forEach((b) =>
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        nachricht(null);
        fuehreAus(kandidaten.find((m) => m.umw === b.dataset.umw));
      }),
    );
  }

  function feldGeklickt(sq) {
    if (denkt || vorbei || pos.zug !== "w") return;
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
    pos = ausFen(START);
    auswahl = -1;
    ziele = [];
    letzter = null;
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

  // Schrift für die Koordinaten laden, dann zeichnen
  document.fonts?.load('10px "Press Start 2P"').finally(zeichne);
  zeichne();
  zeigeStatus();

  return {
    pause() {},
    stop() {
      vorbei = true;
      worker.terminate();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("focus", onFocus);
      canvas.removeEventListener("blur", onFocus);
      window.removeEventListener("keydown", onKey);
      msg.removeEventListener("click", onMsg);
    },
    // für Tests
    _feld: feldName,
  };
}
