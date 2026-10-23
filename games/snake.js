// Snake: Bits fressen, länger werden, nicht in sich selbst (oder die Wand) beißen.
import { richtungsEingabe, overlayKlick, RICHTUNG } from "./eingabe.js";

export const HILFE = "Pfeiltasten, WASD oder Wischen · Leertaste: Start/Pause";

const SP = 24;
const ZE = 16;
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

  const frei = (x, y) => !schlange.some((t) => t.x === x && t.y === y) && !steine.some((s) => s.x === x && s.y === y);

  function neuesFutter() {
    let x, y, n = 0;
    do {
      x = Math.floor(Math.random() * SP);
      y = Math.floor(Math.random() * ZE);
    } while (!frei(x, y) && n++ < 500);
    futter = { x, y };
  }

  function neu() {
    schlange = [{ x: 6, y: 8 }, { x: 5, y: 8 }, { x: 4, y: 8 }];
    dir = { ...RICHTUNG.rechts };
    warteschlange = [];
    steine = [];
    // Hindernisse nicht in der Startreihe
    while (steine.length < S.hindernisse) {
      const s = { x: 2 + Math.floor(Math.random() * (SP - 4)), y: 1 + Math.floor(Math.random() * (ZE - 2)) };
      if (s.y !== 8 && frei(s.x, s.y)) steine.push(s);
    }
    punkte = 0;
    tempo = S.tempo;
    akku = 0;
    neuesFutter();
    zeigeStatus();
  }

  function zeigeStatus() {
    status(`${punkte} Pkt · Länge ${schlange.length}`);
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
    if (wand || koerper.some((t) => t.x === x && t.y === y) || steine.some((s) => s.x === x && s.y === y)) {
      ende();
      return;
    }
    schlange.unshift({ x, y });
    if (frisst) {
      punkte += 10;
      tempo += S.plus;
      neuesFutter();
      zeigeStatus();
    } else schlange.pop();
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

    schlange.forEach((teil, i) => {
      ctx.fillStyle = i === 0 ? "#ffffff" : i % 2 ? "#c8a2ff" : "#b48ef0";
      ctx.fillRect(teil.x * T + 2, teil.y * T + 2, T - 4, T - 4);
    });
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
      akku += dt * tempo;
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
  nachricht(`<p class="big">Snake</p><p>Friss die gelben Bits${S.waende ? ", die Wand ist tabu" : ", du kannst durch die Wände"}.</p><p class="small">Pfeiltaste, Wischen oder Klick zum Start</p>`);
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
