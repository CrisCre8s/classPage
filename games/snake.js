// Snake: Bits fressen, länger werden, nicht in sich selbst (oder die Wand) beißen.
import { richtungsEingabe, overlayKlick, RICHTUNG } from "./eingabe.js";

export const HILFE = "Pfeiltasten, WASD oder Wischen · Leertaste: Start/Pause · Power-ups: Uhr = 5 s Zeitlupe, Geist = 5 s durch dich selbst";

// Power-ups (erscheinen selten nach dem Fressen, verschwinden nach einer Weile wieder)
const POWER = {
  langsam: { name: "Zeitlupe", farbe: "#7fb8ff", dauer: 5 },
  geist: { name: "Geist", farbe: "#e9e3ff", dauer: 5 },
};
const POWER_CHANCE = 0.2; // pro gefressenem Bit
const POWER_ABSTAND = 4; // mindestens so viele Bits zwischen zwei Power-ups
const POWER_LIEGT = 8; // Sekunden, bis ein Power-up wieder verschwindet

// quadratisches Feld: so ist die Schlange in alle Richtungen gleich schnell am Rand
// (bei 24 × 16 wirkte sie nach oben/unten schneller, weil das Feld dort kürzer war)
const SP = 20;
const ZE = 20;
const START_Y = ZE / 2;
const T = 24;
const W = SP * T;
const H = ZE * T;

// Tempo (Felder pro Sekunde), ob Wände tödlich sind, Hindernisse
const STUFEN = {
  leicht: { tempo: 6.5, waende: false, hindernisse: 0, plus: 0.12 },
  mittel: { tempo: 9, waende: true, hindernisse: 0, plus: 0.18 },
  schwer: { tempo: 11.5, waende: true, hindernisse: 14, plus: 0.25 },
};

export function start({ canvas, stufe, passeCanvas, status, nachricht, ergebnis }) {
  const S = STUFEN[stufe] || STUFEN.mittel;
  const ctx = passeCanvas(canvas, W, H);

  let schlange, dir, warteschlange, futter, steine, punkte, tempo, zustand, raf, zuletzt, akku;
  let item, effekt, seitPower; // liegendes Power-up, aktive Wirkung { art, rest }, Bits seit dem letzten

  const frei = (x, y) =>
    !schlange.some((t) => t.x === x && t.y === y) && !steine.some((s) => s.x === x && s.y === y) && !(item && item.x === x && item.y === y) && !(futter && futter.x === x && futter.y === y);
  const gleich = (a, b) => a.x === b.x && a.y === b.y;

  function neuesFutter() {
    let x, y, n = 0;
    do {
      x = Math.floor(Math.random() * SP);
      y = Math.floor(Math.random() * ZE);
    } while (!frei(x, y) && n++ < 500);
    futter = { x, y };
  }

  function vielleichtPowerUp() {
    seitPower++;
    if (item || effekt || seitPower < POWER_ABSTAND || Math.random() > POWER_CHANCE) return;
    let x, y, n = 0;
    do {
      x = Math.floor(Math.random() * SP);
      y = Math.floor(Math.random() * ZE);
    } while (!frei(x, y) && n++ < 500);
    if (n >= 500) return;
    item = { x, y, art: Math.random() < 0.5 ? "langsam" : "geist", rest: POWER_LIEGT };
    seitPower = 0;
  }

  function neu() {
    schlange = [{ x: 6, y: START_Y }, { x: 5, y: START_Y }, { x: 4, y: START_Y }];
    dir = { ...RICHTUNG.rechts };
    warteschlange = [];
    steine = [];
    // Hindernisse nicht in der Startreihe
    while (steine.length < S.hindernisse) {
      const s = { x: 2 + Math.floor(Math.random() * (SP - 4)), y: 1 + Math.floor(Math.random() * (ZE - 2)) };
      if (s.y !== START_Y && frei(s.x, s.y)) steine.push(s);
    }
    punkte = 0;
    tempo = S.tempo;
    akku = 0;
    item = null;
    effekt = null;
    seitPower = 0;
    futter = null;
    neuesFutter();
    zeigeStatus();
  }

  function zeigeStatus() {
    status(`${punkte} Pkt · Länge ${schlange.length}${effekt ? ` · ${POWER[effekt.art].name} ${Math.ceil(effekt.rest)} s` : ""}`);
  }

  function schritt() {
    if (warteschlange.length) dir = warteschlange.shift();
    let x = schlange[0].x + dir.x;
    let y = schlange[0].y + dir.y;
    if (!S.waende) {
      x = (x + SP) % SP;
      y = (y + ZE) % ZE;
    }
    const wand = x < 0 || y < 0 || x >= SP || y >= ZE;
    const frisst = x === futter.x && y === futter.y;
    // in den eigenen Schwanz laufen ist erlaubt, wenn er sich im selben Schritt wegbewegt
    const koerper = frisst ? schlange : schlange.slice(0, -1);
    // Als Geist darf der Kopf durch den Körper. Ist der Geist vorbei, der Kopf aber noch
    // im eigenen Körper, darf er sich noch herausarbeiten; sobald er frei ist, gilt wieder alles.
    const kopfImKoerper = schlange.slice(1).some((t) => gleich(t, schlange[0]));
    const durchKoerper = effekt?.art === "geist" || kopfImKoerper;
    const beisst = !durchKoerper && koerper.some((t) => t.x === x && t.y === y);
    if (wand || beisst || steine.some((s) => s.x === x && s.y === y)) {
      ende();
      return;
    }
    schlange.unshift({ x, y });
    if (item && gleich(item, { x, y })) {
      effekt = { art: item.art, rest: POWER[item.art].dauer };
      punkte += 5;
      item = null;
      zeigeStatus();
    }
    if (frisst) {
      punkte += 10;
      tempo += S.plus;
      neuesFutter();
      vielleichtPowerUp();
      zeigeStatus();
    } else schlange.pop();
  }

  // Power-up-Symbole: Uhr (Zeitlupe) und Geist
  function symbol(art, cx, cy, r, t) {
    if (art === "langsam") {
      ctx.fillStyle = POWER.langsam.farbe;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0f0e13";
      ctx.beginPath();
      ctx.arc(cx, cy, r - 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = POWER.langsam.farbe;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      const a = t / 900;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * (r - 5), cy + Math.sin(a) * (r - 5));
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx, cy - r + 6);
      ctx.stroke();
    } else {
      const sw = Math.sin(t / 250) * 1.5;
      ctx.fillStyle = POWER.geist.farbe;
      ctx.beginPath();
      ctx.arc(cx, cy - 2 + sw, r - 1, Math.PI, 0);
      ctx.lineTo(cx + r - 1, cy + r - 2 + sw);
      for (let i = 0; i < 3; i++) {
        const x0 = cx + r - 1 - ((i + 0.5) * (2 * r - 2)) / 3;
        ctx.lineTo(x0, cy + r - 6 + sw);
        ctx.lineTo(x0 - (2 * r - 2) / 6, cy + r - 2 + sw);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#0f0e13";
      ctx.fillRect(cx - 4, cy - 4 + sw, 3, 4);
      ctx.fillRect(cx + 1.5, cy - 4 + sw, 3, 4);
    }
  }

  function ende() {
    zustand = "ende";
    const neuer = ergebnis({ punkte });
    nachricht(`<p class="big">Game Over</p><p>${punkte} Punkte · Länge ${schlange.length}${neuer ? " · neuer Highscore!" : ""}</p><p class="small">Leertaste oder Klick für ein neues Spiel</p>`);
  }

  function zeichne(t) {
    ctx.fillStyle = "#0f0e13";
    ctx.fillRect(0, 0, W, H);
    // feines Raster
    ctx.fillStyle = "#16141c";
    for (let x = 0; x < SP; x++) for (let y = 0; y < ZE; y++) if ((x + y) % 2) ctx.fillRect(x * T, y * T, T, T);
    if (S.waende) {
      ctx.strokeStyle = "#4a4166";
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, W - 2, H - 2);
    }
    ctx.fillStyle = "#3a3550";
    for (const s of steine) ctx.fillRect(s.x * T + 2, s.y * T + 2, T - 4, T - 4);

    // Futter: blinkendes Bit
    const puls = 2 + Math.round(Math.sin(t / 160) * 1.5);
    ctx.fillStyle = "#f5d97a";
    ctx.fillRect(futter.x * T + 6 - puls / 2, futter.y * T + 6 - puls / 2, T - 12 + puls, T - 12 + puls);

    // liegendes Power-up: leuchtet, blinkt kurz bevor es verschwindet
    if (item && !(item.rest < 2 && Math.floor(t / 120) % 2)) {
      const cx = item.x * T + T / 2;
      const cy = item.y * T + T / 2;
      const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, T);
      g.addColorStop(0, POWER[item.art].farbe + "66");
      g.addColorStop(1, POWER[item.art].farbe + "00");
      ctx.fillStyle = g;
      ctx.fillRect(cx - T, cy - T, T * 2, T * 2);
      symbol(item.art, cx, cy, 9, t);
    }

    const geist = effekt?.art === "geist";
    const zeitlupe = effekt?.art === "langsam";
    const endetBald = effekt && effekt.rest < 1.2 && Math.floor(t / 110) % 2;
    // als Geist halb durchsichtig (Überlappungen sieht man dann)
    ctx.globalAlpha = geist && !endetBald ? 0.55 : 1;
    schlange.forEach((teil, i) => {
      if (zeitlupe && !endetBald) ctx.fillStyle = i === 0 ? "#ffffff" : i % 2 ? "#a8d4ff" : "#7fb8ff";
      else ctx.fillStyle = i === 0 ? "#ffffff" : i % 2 ? "#c8a2ff" : "#b48ef0";
      ctx.fillRect(teil.x * T + 2, teil.y * T + 2, T - 4, T - 4);
    });
    ctx.globalAlpha = 1;
    // Restzeit der Wirkung als Leiste oben
    if (effekt) {
      const k = effekt.rest / POWER[effekt.art].dauer;
      ctx.fillStyle = "rgba(15, 14, 19, 0.7)";
      ctx.fillRect(W / 2 - 62, 6, 124, 14);
      ctx.fillStyle = POWER[effekt.art].farbe;
      ctx.fillRect(W / 2 - 40, 10, 98 * k, 6);
      symbol(effekt.art, W / 2 - 51, 13, 6, t);
    }
    // Augen am Kopf, quer zur Laufrichtung
    const k = schlange[0];
    const mx = k.x * T + T / 2 + dir.x * 4;
    const my = k.y * T + T / 2 + dir.y * 4;
    ctx.fillStyle = "#0f0e13";
    for (const s of [-1, 1]) ctx.fillRect(mx - dir.y * 4 * s - 1.5, my + dir.x * 4 * s - 1.5, 3, 3);
  }

  function loop(t) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.1, (t - (zuletzt || t)) / 1000);
    zuletzt = t;
    if (zustand === "laeuft") {
      if (item && (item.rest -= dt) <= 0) item = null;
      if (effekt) {
        const vorher = Math.ceil(effekt.rest);
        effekt.rest -= dt;
        if (effekt.rest <= 0) effekt = null;
        if (!effekt || Math.ceil(effekt.rest) !== vorher) zeigeStatus();
      }
      akku += dt * tempo * (effekt?.art === "langsam" ? 0.55 : 1);
      while (akku >= 1 && zustand === "laeuft") {
        akku -= 1;
        schritt();
      }
    }
    zeichne(t);
  }

  function los() {
    if (zustand === "ende") neu();
    if (zustand !== "laeuft") {
      zustand = "laeuft";
      nachricht(null);
    }
  }
  function pause() {
    if (zustand !== "laeuft") return;
    zustand = "pause";
    nachricht(`<p class="big">Pause</p><p class="small">Leertaste oder Klick zum Weiterspielen</p>`);
  }

  const aus1 = richtungsEingabe(canvas, {
    richtung(r) {
      const n = RICHTUNG[r];
      const letzte = warteschlange.at(-1) || dir;
      // nicht direkt umdrehen; max. 2 Eingaben vormerken
      if (n.x === -letzte.x && n.y === -letzte.y) return;
      if (n.x === letzte.x && n.y === letzte.y) return;
      if (warteschlange.length < 2) warteschlange.push({ ...n });
      if (zustand === "bereit") los();
    },
    leertaste: () => (zustand === "laeuft" ? pause() : los()),
    tippen: () => zustand !== "laeuft" && los(),
  });
  const aus2 = overlayKlick(() => zustand !== "laeuft" && los());

  zustand = "bereit";
  neu();
  nachricht(`<p class="big">Snake</p><p>Friss die gelben Bits${S.waende ? ", die Wand ist tabu" : ", du kannst durch die Wände"}. Manchmal taucht ein Power-up auf: Uhr = 5 s Zeitlupe, Geist = 5 s durch dich selbst.</p><p class="small">Pfeiltaste, Wischen oder Klick zum Start</p>`);
  raf = requestAnimationFrame(loop);

  return {
    pause,
    stop() {
      cancelAnimationFrame(raf);
      aus1();
      aus2();
    },
  };
}
