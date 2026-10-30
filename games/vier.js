// Vier in einer Reihe gegen den Computer (du spielst Gelb und fängst an) oder zu zweit an einem Gerät.
import { leer, setze, reiheDurch, voll, frei, hoehe, SP, RE } from "./vier-engine.js";
import { overlayKlick } from "./eingabe.js";

export const HILFE = "Spalte antippen · Tastatur: ← → wählen, Enter oder Leertaste: Stein fallen lassen · Modus „Zu zweit“: Gelb und Lila ziehen abwechselnd";

const Z = 80;
const RAND = 14;
const OBEN = 96;
const W = SP * Z + RAND * 2;
const H = OBEN + RE * Z + RAND;
const BEDENKZEIT = { leicht: 550, mittel: 750, schwer: 900 };
const FARBE = { 1: "#f5d97a", 2: "#c8a2ff" };

export function start({ canvas, tools, stufe, passeCanvas, status, nachricht, ergebnis }) {
  const ctx = passeCanvas(canvas, W, H);
  // HD: Canvas in voller Bildschirmauflösung zeichnen (statt Pixel-Look)
  let skala = 1;
  function passeAufloesung() {
    const breite = canvas.getBoundingClientRect().width;
    if (!breite) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const px = Math.max(W, Math.round(breite * dpr));
    if (canvas.width !== px) {
      canvas.width = px;
      canvas.height = Math.round((px * H) / W);
    }
    skala = canvas.width / W;
    zeichne();
  }
  const ro = new ResizeObserver(() => brett && passeAufloesung());
  ro.observe(canvas);
  // Gewinn-Effekt: die vier Steine blinken 4× grün, danach ist die Partie vorbei
  let blinken = null;
  const BLINK_MAL = 4;
  const BLINK_TAKT = 260; // ms an, ms aus
  const worker = new Worker(new URL("./vier-worker.js", import.meta.url), { type: "module" });

  let brett, zeiger, amZug, vorbei, fallend, reihe4, raf, blinkRaf, anfrage = 0;
  // zu zweit: beide Farben werden von Menschen gesetzt, es wird nichts gewertet
  let zweiSpieler = false;
  let partie = 0;
  const NAME = { 1: "Gelb", 2: "Lila" };
  const mensch = () => amZug === 1 || (zweiSpieler && amZug === 2);

  function neu() {
    brett = leer();
    zeiger = 3;
    partie++;
    // zu zweit fängt abwechselnd Gelb oder Lila an
    amZug = zweiSpieler && partie % 2 === 0 ? 2 : 1;
    vorbei = false;
    fallend = null;
    reihe4 = null;
    blinken = null;
    cancelAnimationFrame(blinkRaf);
    anfrage++;
    nachricht(null);
    zeigeStatus();
    zeichne();
  }

  function zeigeStatus() {
    if (vorbei) return;
    if (zweiSpieler) status(`${NAME[amZug]} ist am Zug`);
    else status(amZug === 1 ? "Du bist am Zug" : "Computer denkt …");
  }

  const mx = (c) => RAND + c * Z + Z / 2;
  const my = (r) => OBEN + (RE - 1 - r) * Z + Z / 2;

  const HELL = { 1: "#fff1b8", 2: "#efe0ff", gruen: "#c9ffe3" };
  const DUNKEL = { 1: "#c99a2e", 2: "#7c56c4", gruen: "#1f9c63" };
  const BASIS = { 1: "#f5d97a", 2: "#c8a2ff", gruen: "#3ddc8f" };
  function scheibe(x, y, p, radius = Z * 0.385) {
    // Schatten, Körper mit Verlauf, Rille und Glanzlicht
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.arc(x + 2, y + 3, radius, 0, Math.PI * 2);
    ctx.fill();
    const g = ctx.createRadialGradient(x - radius * 0.35, y - radius * 0.4, radius * 0.1, x, y, radius);
    g.addColorStop(0, HELL[p]);
    g.addColorStop(0.45, BASIS[p]);
    g.addColorStop(1, DUNKEL[p]);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y + 1, radius * 0.7, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.beginPath();
    ctx.ellipse(x - radius * 0.32, y - radius * 0.42, radius * 0.28, radius * 0.14, -0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function zeichne() {
    ctx.setTransform(skala, 0, 0, skala, 0, 0);
    ctx.imageSmoothingEnabled = true;
    const hg = ctx.createLinearGradient(0, 0, 0, H);
    hg.addColorStop(0, "#14121b");
    hg.addColorStop(1, "#0d0c11");
    ctx.fillStyle = hg;
    ctx.fillRect(0, 0, W, H);
    // Vorschau-Stein über der gewählten Spalte
    if (!vorbei && mensch() && !fallend) {
      ctx.globalAlpha = 0.9;
      scheibe(mx(zeiger), OBEN / 2, amZug);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.beginPath();
      ctx.moveTo(mx(zeiger) - 8, OBEN - RAND - 10);
      ctx.lineTo(mx(zeiger) + 8, OBEN - RAND - 10);
      ctx.lineTo(mx(zeiger), OBEN - RAND - 2);
      ctx.fill();
    }
    // Lochhintergrund (dunkel, damit leere Felder Tiefe haben)
    ctx.fillStyle = "#0a090e";
    ctx.fillRect(RAND, OBEN - RAND, W - 2 * RAND, H - OBEN);
    // Steine (liegen hinter dem Brett und sind durch die Löcher zu sehen)
    const blinkAn = blinken && Math.floor((performance.now() - blinken.start) / BLINK_TAKT) % 2 === 0;
    const istReihe = (c, r) => reihe4?.some(([a, b]) => a === c && b === r);
    for (let c = 0; c < SP; c++)
      for (let r = 0; r < RE; r++) {
        const v = brett[c][r];
        if (!v || (fallend && fallend.c === c && fallend.r === r)) continue;
        const gruen = istReihe(c, r) && (blinken ? blinkAn : true);
        scheibe(mx(c), my(r), gruen ? "gruen" : v);
      }
    if (fallend) scheibe(mx(fallend.c), fallend.y, fallend.p);
    // Brett mit ausgestanzten Löchern, Verlauf und Kanten
    const bg = ctx.createLinearGradient(0, OBEN - RAND, 0, H);
    bg.addColorStop(0, "#3d3560");
    bg.addColorStop(1, "#231e3a");
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(0, OBEN - RAND, W, H - OBEN + RAND, 14);
    for (let c = 0; c < SP; c++)
      for (let r = 0; r < RE; r++) {
        ctx.moveTo(mx(c) + Z * 0.41, my(r));
        ctx.arc(mx(c), my(r), Z * 0.41, 0, Math.PI * 2);
      }
    ctx.fill("evenodd");
    // Lochränder: oben dunkel (Tiefe), unten hell (Lichtkante)
    for (let c = 0; c < SP; c++)
      for (let r = 0; r < RE; r++) {
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(0,0,0,0.45)";
        ctx.beginPath();
        ctx.arc(mx(c), my(r), Z * 0.41, Math.PI * 1.05, Math.PI * 1.95);
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,0.14)";
        ctx.beginPath();
        ctx.arc(mx(c), my(r), Z * 0.41, Math.PI * 0.1, Math.PI * 0.9);
        ctx.stroke();
      }
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(1, OBEN - RAND + 1, W - 2, H - OBEN + RAND - 2, 13);
    ctx.stroke();
    // Gewinnreihe: grüner Schein, solange sie leuchtet
    if (reihe4 && (!blinken || blinkAn)) {
      ctx.save();
      ctx.shadowColor = "#3ddc8f";
      ctx.shadowBlur = 22;
      ctx.strokeStyle = "#5ff0a8";
      ctx.lineWidth = 4;
      for (const [c, r] of reihe4) {
        ctx.beginPath();
        ctx.arc(mx(c), my(r), Z * 0.43, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
    // Tastatur-Spalte
    if (document.activeElement === canvas && !vorbei && mensch()) {
      ctx.fillStyle = "rgba(212,184,255,0.10)";
      ctx.fillRect(RAND + zeiger * Z, OBEN - RAND, Z, H - OBEN + RAND);
    }
  }

  // Siegerreihe 4× grün blinken lassen, danach `fertig`
  function blinkeReihe(fertig) {
    blinken = { start: performance.now() };
    const dauer = BLINK_MAL * 2 * BLINK_TAKT;
    const schritt = (t) => {
      if (!blinken) return;
      zeichne();
      if (t - blinken.start < dauer) blinkRaf = requestAnimationFrame(schritt);
      else {
        blinken = null;
        zeichne();
        fertig();
      }
    };
    blinkRaf = requestAnimationFrame(schritt);
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
      const gewonnen = p === 1;
      if (zweiSpieler) {
        status(`${NAME[p]} gewinnt!`);
        blinkeReihe(() => nachricht(`<p class="big">${NAME[p]} gewinnt!</p><p class="small">Klick für eine neue Partie</p>`));
        return true;
      }
      status(gewonnen ? "Gewonnen!" : "Verloren");
      ergebnis({ gewonnen });
      blinkeReihe(() => nachricht(`<p class="big">${gewonnen ? "Vier in einer Reihe!" : "Der Computer gewinnt"}</p><p class="small">Klick für eine neue Partie</p>`));
      return true;
    }
    if (voll(brett)) {
      vorbei = true;
      status("Unentschieden");
      if (!zweiSpieler) ergebnis({ gewonnen: false });
      nachricht(`<p class="big">Unentschieden</p><p>Das Brett ist voll.</p><p class="small">Klick für eine neue Partie</p>`);
      return true;
    }
    return false;
  }

  function spielerZug(c) {
    if (vorbei || !mensch() || fallend || !frei(brett, c)) return;
    if (zweiSpieler) {
      const p = amZug;
      amZug = 0;
      lassFallen(c, p, (r) => {
        if (pruefe(c, r, p)) return;
        amZug = p === 1 ? 2 : 1;
        zeigeStatus();
        zeichne();
      });
      return;
    }
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
      if (vorbei && !blinken) neu();
      else spielerZug(zeiger);
    }
  };
  const onFocus = () => zeichne();
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("focus", onFocus);
  canvas.addEventListener("blur", onFocus);
  window.addEventListener("keydown", onKey);
  const aus = overlayKlick(() => vorbei && !blinken && neu());

  // Modus-Wahl in der Werkzeugleiste
  tools.hidden = false;
  tools.innerHTML = `<label class="tools-feld"><span>Modus</span><select class="tools-select" data-s="vier-modus"><option value="cpu">Gegen Computer</option><option value="zwei">Zu zweit</option></select></label>`;
  const modusWahl = tools.querySelector('[data-s="vier-modus"]');
  modusWahl.addEventListener("change", () => {
    zweiSpieler = modusWahl.value === "zwei";
    partie = 0;
    neu();
    canvas.focus({ preventScroll: true });
  });

  neu();
  passeAufloesung();

  return {
    pause() {},
    stop() {
      vorbei = true;
      cancelAnimationFrame(raf);
      cancelAnimationFrame(blinkRaf);
      ro.disconnect();
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
