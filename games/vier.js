// Vier in einer Reihe gegen den Computer. Du spielst Gelb und fängst an.
import { leer, setze, reiheDurch, voll, frei, hoehe, SP, RE } from "./vier-engine.js";
import { overlayKlick } from "./eingabe.js";

export const HILFE = "Spalte antippen · Tastatur: ← → wählen, Enter oder Leertaste: Stein fallen lassen";

const Z = 80;
const RAND = 14;
const OBEN = 96;
const W = SP * Z + RAND * 2;
const H = OBEN + RE * Z + RAND;
const BEDENKZEIT = { leicht: 550, mittel: 750, schwer: 900 };
const FARBE = { 1: "#f5d97a", 2: "#c8a2ff" };

export function start({ canvas, stufe, passeCanvas, status, nachricht, ergebnis }) {
  const ctx = passeCanvas(canvas, W, H);
  const worker = new Worker(new URL("./vier-worker.js", import.meta.url), { type: "module" });

  let brett, zeiger, amZug, vorbei, fallend, reihe4, raf, anfrage = 0;

  function neu() {
    brett = leer();
    zeiger = 3;
    amZug = 1;
    vorbei = false;
    fallend = null;
    reihe4 = null;
    anfrage++;
    nachricht(null);
    zeigeStatus();
    zeichne();
  }

  function zeigeStatus() {
    if (vorbei) return;
    status(amZug === 1 ? "Du bist am Zug" : "Computer denkt …");
  }

  const mx = (c) => RAND + c * Z + Z / 2;
  const my = (r) => OBEN + (RE - 1 - r) * Z + Z / 2;

  function scheibe(x, y, p, radius = Z * 0.38) {
    ctx.fillStyle = FARBE[p];
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    // innerer Ring für den Pixel-Look
    ctx.strokeStyle = "rgba(0,0,0,0.22)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, radius - 8, 0, Math.PI * 2);
    ctx.stroke();
  }

  function zeichne() {
    ctx.fillStyle = "#0f0e13";
    ctx.fillRect(0, 0, W, H);
    // Vorschau-Stein über der gewählten Spalte
    if (!vorbei && amZug === 1 && !fallend) {
      ctx.globalAlpha = 0.85;
      scheibe(mx(zeiger), OBEN / 2, 1);
      ctx.globalAlpha = 1;
    }
    // Steine (liegen hinter dem Brett und sind durch die Löcher zu sehen)
    for (let c = 0; c < SP; c++)
      for (let r = 0; r < RE; r++) {
        const v = brett[c][r];
        if (v && !(fallend && fallend.c === c && fallend.r === r)) scheibe(mx(c), my(r), v);
      }
    if (fallend) scheibe(mx(fallend.c), fallend.y, fallend.p);
    // Brett mit ausgestanzten Löchern
    ctx.fillStyle = "#2b2640";
    ctx.beginPath();
    ctx.rect(0, OBEN - RAND, W, H - OBEN + RAND);
    for (let c = 0; c < SP; c++)
      for (let r = 0; r < RE; r++) {
        ctx.moveTo(mx(c) + Z * 0.4, my(r));
        ctx.arc(mx(c), my(r), Z * 0.4, 0, Math.PI * 2);
      }
    ctx.fill("evenodd");
    // Gewinnreihe markieren
    if (reihe4) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 4;
      for (const [c, r] of reihe4) {
        ctx.beginPath();
        ctx.arc(mx(c), my(r), Z * 0.4, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    // Tastatur-Spalte
    if (document.activeElement === canvas && !vorbei && amZug === 1) {
      ctx.fillStyle = "rgba(212,184,255,0.12)";
      ctx.fillRect(RAND + zeiger * Z, OBEN - RAND, Z, H - OBEN + RAND);
    }
  }

  // Stein mit Schwerkraft fallen lassen, danach `fertig`
  function lassFallen(c, p, fertig) {
    const r = setze(brett, c, p);
    const zielY = my(r);
    const start = performance.now();
    const dauer = 140 + (RE - r) * 45;
    fallend = { c, r, p, y: OBEN / 2 };
    cancelAnimationFrame(raf);
    const schritt = (t) => {
      const k = Math.min(1, (t - start) / dauer);
      fallend.y = OBEN / 2 + (zielY - OBEN / 2) * k * k; // beschleunigt wie beim Fallen
      zeichne();
      if (k < 1) raf = requestAnimationFrame(schritt);
      else {
        fallend = null;
        zeichne();
        fertig(r);
      }
    };
    raf = requestAnimationFrame(schritt);
  }

  function pruefe(c, r, p) {
    const reihe = reiheDurch(brett, c, r);
    if (reihe) {
      vorbei = true;
      reihe4 = reihe;
      zeichne();
      const gewonnen = p === 1;
      status(gewonnen ? "Gewonnen!" : "Verloren");
      ergebnis({ gewonnen });
      nachricht(`<p class="big">${gewonnen ? "Vier in einer Reihe!" : "Der Computer gewinnt"}</p><p class="small">Klick für eine neue Partie</p>`);
      return true;
    }
    if (voll(brett)) {
      vorbei = true;
      status("Unentschieden");
      ergebnis({ gewonnen: false });
      nachricht(`<p class="big">Unentschieden</p><p>Das Brett ist voll.</p><p class="small">Klick für eine neue Partie</p>`);
      return true;
    }
    return false;
  }

  function spielerZug(c) {
    if (vorbei || amZug !== 1 || fallend || !frei(brett, c)) return;
    amZug = 0;
    lassFallen(c, 1, (r) => {
      if (pruefe(c, r, 1)) return;
      amZug = 2;
      zeigeStatus();
      const id = ++anfrage;
      const t0 = performance.now();
      worker.onmessage = (e) => {
        if (e.data.id !== id || vorbei) return;
        setTimeout(() => {
          if (id !== anfrage || vorbei) return;
          const cc = e.data.spalte;
          lassFallen(cc, 2, (rr) => {
            if (pruefe(cc, rr, 2)) return;
            amZug = 1;
            zeigeStatus();
            zeichne();
          });
        }, Math.max(0, (BEDENKZEIT[stufe] || 700) - (performance.now() - t0)));
      };
      worker.postMessage({ brett, stufe, id });
    });
  }

  // ---------- Eingabe ----------
  const spalteVon = (e) => {
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W - RAND;
    return Math.max(0, Math.min(SP - 1, Math.floor(x / Z)));
  };
  const onMove = (e) => {
    const c = spalteVon(e);
    if (c !== zeiger) {
      zeiger = c;
      zeichne();
    }
  };
  const onDown = (e) => {
    zeiger = spalteVon(e);
    spielerZug(zeiger);
  };
  const onKey = (e) => {
    if (document.activeElement !== canvas) return;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      zeiger = Math.max(0, Math.min(SP - 1, zeiger + (e.key === "ArrowLeft" ? -1 : 1)));
      zeichne();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (vorbei) neu();
      else spielerZug(zeiger);
    }
  };
  const onFocus = () => zeichne();
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("focus", onFocus);
  canvas.addEventListener("blur", onFocus);
  window.addEventListener("keydown", onKey);
  const aus = overlayKlick(() => vorbei && neu());

  neu();

  return {
    pause() {},
    stop() {
      vorbei = true;
      cancelAnimationFrame(raf);
      worker.terminate();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("focus", onFocus);
      canvas.removeEventListener("blur", onFocus);
      window.removeEventListener("keydown", onKey);
      aus();
    },
    _hoehe: hoehe,
  };
}
