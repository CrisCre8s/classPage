// Bug-Sucher: Alle Felder ohne Bug aufdecken. Zahlen zeigen die Bugs drumherum.
import { overlayKlick } from "./eingabe.js";

export const HILFE = "Klick/Tippen: aufdecken · Rechtsklick oder lange drücken: Flagge · Klick auf Zahl: Nachbarn aufdecken";

const STUFEN = {
  leicht: { sp: 9, ze: 9, bugs: 10 },
  mittel: { sp: 16, ze: 16, bugs: 40 },
  schwer: { sp: 30, ze: 16, bugs: 99 },
};
const T = 32;
const ZAHLFARBE = ["", "#7fb8ff", "#5fc39c", "#e5566f", "#c8a2ff", "#f0a35e", "#7fdbff", "#f2f2f3", "#9a9ca2"];

export function start({ canvas, stufe, passeCanvas, status, nachricht, ergebnis, einpassen }) {
  const S = STUFEN[stufe] || STUFEN.mittel;
  // Handy hochkant: breites Feld (30 × 16) ins Hochformat drehen
  const box = document.getElementById("stage-body").getBoundingClientRect();
  const hoch = S.sp > S.ze && box.height > box.width;
  const SP = hoch ? S.ze : S.sp;
  const ZE = hoch ? S.sp : S.ze;
  const W = SP * T;
  const H = ZE * T;
  const ctx = passeCanvas(canvas, W, H);
  einpassen?.();

  let feld, offen, flagge, erster, vorbei, start, uhr, aufgedeckt;
  const idx = (x, y) => y * SP + x;
  const nachbarn = (x, y) => {
    const n = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && x + dx >= 0 && y + dy >= 0 && x + dx < SP && y + dy < ZE) n.push([x + dx, y + dy]);
    return n;
  };

  function neu() {
    feld = new Array(SP * ZE).fill(0); // -1 = Bug, sonst Anzahl
    offen = new Array(SP * ZE).fill(false);
    flagge = new Array(SP * ZE).fill(false);
    erster = true;
    vorbei = false;
    aufgedeckt = 0;
    clearInterval(uhr);
    start = 0;
    zeigeStatus();
    zeichne();
  }

  // Bugs erst nach dem ersten Klick verteilen: dieses Feld und seine Nachbarn bleiben frei
  function verteile(sx, sy) {
    const tabu = new Set([idx(sx, sy), ...nachbarn(sx, sy).map(([x, y]) => idx(x, y))]);
    let n = 0;
    while (n < S.bugs) {
      const i = Math.floor(Math.random() * SP * ZE);
      if (feld[i] === -1 || tabu.has(i)) continue;
      feld[i] = -1;
      n++;
    }
    for (let y = 0; y < ZE; y++)
      for (let x = 0; x < SP; x++) if (feld[idx(x, y)] !== -1) feld[idx(x, y)] = nachbarn(x, y).filter(([a, b]) => feld[idx(a, b)] === -1).length;
    start = performance.now();
    uhr = setInterval(zeigeStatus, 500);
  }

  const sekunden = () => (start ? (performance.now() - start) / 1000 : 0);
  function zeigeStatus() {
    const flaggen = flagge.filter(Boolean).length;
    const s = Math.floor(sekunden());
    status(`Bugs ${S.bugs - flaggen} · ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);
  }

  function aufdecken(x, y) {
    const stapel = [[x, y]];
    while (stapel.length) {
      const [a, b] = stapel.pop();
      const i = idx(a, b);
      if (offen[i] || flagge[i]) continue;
      offen[i] = true;
      aufgedeckt++;
      if (feld[i] === -1) return verloren(i);
      if (feld[i] === 0) stapel.push(...nachbarn(a, b));
    }
    if (aufgedeckt === SP * ZE - S.bugs) gewonnen();
  }

  function klick(x, y) {
    if (vorbei) return;
    const i = idx(x, y);
    if (flagge[i]) return;
    if (erster) {
      verteile(x, y);
      erster = false;
    }
    if (offen[i]) {
      // „Akkord“: Zahl mit passender Flaggenanzahl → alle anderen Nachbarn aufdecken
      const n = nachbarn(x, y);
      if (feld[i] > 0 && n.filter(([a, b]) => flagge[idx(a, b)]).length === feld[i]) n.forEach(([a, b]) => !vorbei && aufdecken(a, b));
    } else aufdecken(x, y);
    zeichne();
  }

  function markiere(x, y) {
    if (vorbei) return;
    const i = idx(x, y);
    if (offen[i]) return;
    flagge[i] = !flagge[i];
    zeigeStatus();
    zeichne();
  }

  function verloren(i) {
    vorbei = true;
    clearInterval(uhr);
    feld.forEach((v, j) => v === -1 && (offen[j] = true));
    zeichne(i);
    ergebnis({ gewonnen: false });
    nachricht(`<p class="big">Bug gefunden …</p><p>Leider auf einen Bug getippt.</p><p class="small">Klick für ein neues Feld</p>`);
  }

  function gewonnen() {
    vorbei = true;
    clearInterval(uhr);
    const zeit = sekunden();
    zeigeStatus();
    const neuer = ergebnis({ gewonnen: true, zeit });
    const s = Math.round(zeit);
    nachricht(`<p class="big">Alles bugfrei!</p><p>Geschafft in ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}${neuer ? " · neue Bestzeit!" : ""}</p><p class="small">Klick für ein neues Feld</p>`);
  }

  // ---------- Zeichnen ----------
  function bug(x, y, farbe) {
    const px = 2.5;
    const muster = [".#....#.", "..####..", ".######.", "########", "#.####.#", "########", ".######.", "#.#..#.#"];
    ctx.fillStyle = farbe;
    muster.forEach((z, yy) => [...z].forEach((c, xx) => c === "#" && ctx.fillRect(x + 6 + xx * px, y + 6 + yy * px, px, px)));
  }

  function zeichne(treffer = -1) {
    ctx.font = 'bold 15px "Press Start 2P", monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let y = 0; y < ZE; y++)
      for (let x = 0; x < SP; x++) {
        const i = idx(x, y);
        const px = x * T;
        const py = y * T;
        if (!offen[i]) {
          ctx.fillStyle = "#2a2733";
          ctx.fillRect(px, py, T, T);
          ctx.fillStyle = "#353140";
          ctx.fillRect(px + 2, py + 2, T - 4, T - 4);
          ctx.fillStyle = "#1f1d25";
          ctx.fillRect(px + 2, py + T - 4, T - 4, 2);
          if (flagge[i]) {
            ctx.fillStyle = "#f5d97a";
            ctx.fillRect(px + 13, py + 8, 3, 17);
            ctx.fillRect(px + 16, py + 8, 8, 7);
            ctx.fillRect(px + 9, py + 23, 11, 3);
          }
        } else {
          ctx.fillStyle = i === treffer ? "#5a2230" : "#16141c";
          ctx.fillRect(px, py, T, T);
          ctx.fillStyle = "#211f29";
          ctx.fillRect(px, py, T, 1);
          ctx.fillRect(px, py, 1, T);
          if (feld[i] === -1) bug(px, py, i === treffer ? "#ffffff" : "#e5566f");
          else if (feld[i] > 0) {
            ctx.fillStyle = ZAHLFARBE[feld[i]];
            ctx.fillText(String(feld[i]), px + T / 2 + 1, py + T / 2 + 1);
          }
        }
      }
  }

  // ---------- Eingabe ----------
  function feldVon(e) {
    const r = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left) / r.width) * SP);
    const y = Math.floor(((e.clientY - r.top) / r.height) * ZE);
    return x >= 0 && y >= 0 && x < SP && y < ZE ? [x, y] : null;
  }
  let langTimer = 0;
  let langAusgeloest = false;
  const onDown = (e) => {
    const f = feldVon(e);
    if (!f) return;
    if (e.button === 2) return; // Rechtsklick → contextmenu
    langAusgeloest = false;
    clearTimeout(langTimer);
    langTimer = setTimeout(() => {
      langAusgeloest = true;
      markiere(...f);
      navigator.vibrate?.(20);
    }, 420);
  };
  const onUp = (e) => {
    clearTimeout(langTimer);
    if (e.button === 2 || langAusgeloest) return;
    const f = feldVon(e);
    if (f) klick(...f);
  };
  const onCancel = () => clearTimeout(langTimer);
  const onContext = (e) => {
    e.preventDefault();
    const f = feldVon(e);
    if (f) markiere(...f);
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onCancel);
  canvas.addEventListener("pointerleave", onCancel);
  canvas.addEventListener("contextmenu", onContext);
  const aus = overlayKlick(() => {
    if (vorbei) {
      nachricht(null);
      neu();
    }
  });

  document.fonts?.load('15px "Press Start 2P"').finally(() => zeichne());
  neu();

  return {
    pause() {},
    stop() {
      clearInterval(uhr);
      clearTimeout(langTimer);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onCancel);
      canvas.removeEventListener("pointerleave", onCancel);
      canvas.removeEventListener("contextmenu", onContext);
      aus();
    },
  };
}
