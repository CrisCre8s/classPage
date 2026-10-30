// Flatter-PC: ein kleiner Pixel-Computer fliegt durch die Lücken zwischen Serverschränken. Ein-Tasten-Spiel.
import { overlayKlick } from "./eingabe.js";

export const HILFE = "Leertaste, ↑, Klick oder Tippen: hochflattern · P: Pause";

const W = 400;
const H = 560;
const BODEN = H - 40;
const PC_X = 110;
const PC_B = 34;
const PC_H = 28;
const RACK_B = 64;

const STUFEN = {
  leicht: { luecke: 175, tempo: 140, abstand: 250, schwerkraft: 1250, sprung: -390 },
  mittel: { luecke: 150, tempo: 165, abstand: 230, schwerkraft: 1450, sprung: -420 },
  schwer: { luecke: 128, tempo: 190, abstand: 215, schwerkraft: 1600, sprung: -440 },
};

export function start({ canvas, stufe, passeCanvas, status, nachricht, ergebnis }) {
  const S = STUFEN[stufe] || STUFEN.mittel;
  const ctx = passeCanvas(canvas, W, H);
  let pc, racks, punkte, zustand, raf, zuletzt, boden, funken, wackel;

  function neu() {
    pc = { y: H / 2 - 40, v: 0 };
    racks = [];
    punkte = 0;
    boden = 0;
    funken = [];
    wackel = 0;
    for (let i = 0; i < 3; i++) neuesRack(W + 120 + i * S.abstand);
    zeigeStatus();
  }
  function neuesRack(x) {
    const rand = 70;
    const mitte = rand + S.luecke / 2 + Math.random() * (BODEN - 2 * rand - S.luecke);
    // jede Hälfte bekommt eigene blinkende Lämpchen
    const leds = Array.from({ length: 24 }, () => ({ an: Math.random() < 0.6, takt: 0.3 + Math.random() * 1.4, farbe: Math.random() < 0.8 ? "#5fc39c" : "#f5d97a" }));
    racks.push({ x, mitte, gezaehlt: false, leds });
  }
  const zeigeStatus = () => status(`${punkte} Pkt`);

  function flattern() {
    if (zustand !== "laeuft") return los();
    pc.v = S.sprung;
  }

  function schritt(dt) {
    pc.v = Math.min(pc.v + S.schwerkraft * dt, 620);
    pc.y += pc.v * dt;
    boden = (boden + S.tempo * dt) % 32;
    // mit der Zeit etwas schneller
    const tempo = S.tempo * (1 + Math.min(punkte, 40) * 0.008);
    for (const r of racks) {
      r.x -= tempo * dt;
      if (!r.gezaehlt && r.x + RACK_B < PC_X) {
        r.gezaehlt = true;
        punkte++;
        zeigeStatus();
        for (let i = 0; i < 6; i++) funken.push({ x: PC_X, y: pc.y + PC_H / 2, vx: -40 - Math.random() * 80, vy: (Math.random() - 0.5) * 120, t: 0.5 });
      }
    }
    if (racks[0].x < -RACK_B - 10) {
      racks.shift();
      neuesRack(racks[racks.length - 1].x + S.abstand);
    }
    for (const f of funken) {
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.t -= dt;
    }
    funken = funken.filter((f) => f.t > 0);
    // Kollision (etwas nachsichtig: 3 px Rand)
    const k = 3;
    if (pc.y < -40) pc.y = -40;
    if (pc.y + PC_H >= BODEN) return crash();
    for (const r of racks) {
      if (PC_X + PC_B - k < r.x || PC_X + k > r.x + RACK_B) continue;
      if (pc.y + k < r.mitte - S.luecke / 2 || pc.y + PC_H - k > r.mitte + S.luecke / 2) return crash();
    }
  }
  function crash() {
    zustand = "ende";
    wackel = 0.3;
    const neuer = ergebnis({ punkte });
    nachricht(`<p class="big">Absturz!</p><p>${punkte} ${punkte === 1 ? "Serverschrank" : "Serverschränke"} geschafft${neuer ? " · neuer Highscore!" : ""}</p><p class="small">Leertaste oder Klick für einen neuen Flug</p>`);
  }

  // ---------- Zeichnen ----------
  function zeichneRack(x, y, h, oben, r, t) {
    ctx.fillStyle = "#24222c";
    ctx.fillRect(x, y, RACK_B, h);
    ctx.fillStyle = "#2f2c3a";
    ctx.fillRect(x + 4, y, RACK_B - 8, h);
    // Abschlussblende an der Lücke
    ctx.fillStyle = "#3d3949";
    ctx.fillRect(x - 4, oben ? y + h - 14 : y, RACK_B + 8, 14);
    // Einschübe mit Lämpchen
    const start = oben ? y + h - 14 - 18 : y + 14 + 4;
    let i = 0;
    for (let yy = start; oben ? yy > y : yy < y + h - 14; yy += oben ? -18 : 18) {
      ctx.fillStyle = "#1a1820";
      ctx.fillRect(x + 8, yy, RACK_B - 16, 14);
      const led = r.leds[i++ % r.leds.length];
      const an = led.an !== (Math.floor(t / led.takt) % 2 === 0);
      ctx.fillStyle = an ? led.farbe : "#2d3a34";
      ctx.fillRect(x + 12, yy + 5, 4, 4);
      ctx.fillStyle = "#3a3646";
      ctx.fillRect(x + 22, yy + 6, RACK_B - 36, 2);
    }
  }
  function zeichnePC(t) {
    const x = PC_X;
    const y = Math.round(pc.y);
    const neig = Math.max(-0.45, Math.min(0.7, pc.v / 700));
    ctx.save();
    ctx.translate(x + PC_B / 2, y + PC_H / 2);
    ctx.rotate(neig);
    ctx.translate(-PC_B / 2, -PC_H / 2);
    // kleine Flügel aus Lüftergittern, schlagen beim Hochflattern
    const schlag = pc.v < 0 ? Math.sin(t * 40) * 5 : 2;
    ctx.fillStyle = "#c8a2ff";
    ctx.fillRect(-8, 8 - schlag, 10, 4);
    ctx.fillRect(-6, 12 - schlag / 2, 8, 3);
    // Gehäuse
    ctx.fillStyle = "#e9e6ef";
    ctx.fillRect(0, 0, PC_B, PC_H - 6);
    ctx.fillStyle = "#b9b4c6";
    ctx.fillRect(0, PC_H - 9, PC_B, 3);
    // Bildschirm mit Gesicht
    ctx.fillStyle = "#1a2a3a";
    ctx.fillRect(4, 3, PC_B - 8, PC_H - 14);
    ctx.fillStyle = zustand === "ende" ? "#e5566f" : "#7fe0b0";
    if (zustand === "ende") {
      ctx.fillRect(9, 7, 2, 2); ctx.fillRect(13, 7, 2, 2); ctx.fillRect(11, 9, 2, 2); ctx.fillRect(9, 11, 2, 2); ctx.fillRect(13, 11, 2, 2);
      ctx.fillRect(19, 7, 2, 2); ctx.fillRect(23, 7, 2, 2); ctx.fillRect(21, 9, 2, 2); ctx.fillRect(19, 11, 2, 2); ctx.fillRect(23, 11, 2, 2);
    } else {
      ctx.fillRect(10, 8, 3, 4);
      ctx.fillRect(21, 8, 3, 4);
      ctx.fillRect(13, 14, 8, 2);
    }
    // Fuß
    ctx.fillStyle = "#b9b4c6";
    ctx.fillRect(PC_B / 2 - 5, PC_H - 6, 10, 3);
    ctx.fillRect(PC_B / 2 - 9, PC_H - 3, 18, 3);
    ctx.restore();
  }
  function zeichne(t) {
    ctx.save();
    if (wackel > 0) ctx.translate((Math.random() - 0.5) * 8 * wackel * 3, (Math.random() - 0.5) * 8 * wackel * 3);
    // Rechenzentrum im Hintergrund
    ctx.fillStyle = "#0f0e13";
    ctx.fillRect(-10, -10, W + 20, H + 20);
    ctx.fillStyle = "#14131a";
    for (let i = 0; i < 7; i++) ctx.fillRect(((i * 70 - boden * 0.5) % (W + 70)) - 10, 120, 50, BODEN - 120);
    ctx.fillStyle = "#1a1922";
    for (let i = 0; i < 12; i++) ctx.fillRect((i * 40 - (boden * 0.25) % 40), 60, 2, 40);
    for (const r of racks) {
      const oben = r.mitte - S.luecke / 2;
      const unten = r.mitte + S.luecke / 2;
      zeichneRack(r.x, -10, oben + 10, true, r, t);
      zeichneRack(r.x, unten, BODEN - unten, false, r, t + 0.7);
    }
    // Boden: Doppelboden-Platten
    ctx.fillStyle = "#24222c";
    ctx.fillRect(0, BODEN, W, H - BODEN);
    ctx.fillStyle = "#3a3550";
    ctx.fillRect(0, BODEN, W, 3);
    ctx.fillStyle = "#1a1820";
    for (let x = -boden; x < W; x += 32) ctx.fillRect(Math.round(x), BODEN + 3, 2, H - BODEN);
    for (const f of funken) {
      ctx.globalAlpha = f.t * 2;
      ctx.fillStyle = "#f5d97a";
      ctx.fillRect(f.x, f.y, 3, 3);
    }
    ctx.globalAlpha = 1;
    zeichnePC(t);
    // Punkte groß oben
    ctx.fillStyle = "#f2f2f3";
    ctx.font = '28px "Press Start 2P", monospace';
    ctx.textAlign = "center";
    ctx.fillText(String(punkte), W / 2, 60);
    ctx.restore();
  }

  function loop(t) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.034, (t - (zuletzt || t)) / 1000);
    zuletzt = t;
    if (zustand === "laeuft") schritt(dt);
    else if (zustand === "bereit") pc.y = H / 2 - 40 + Math.sin(t / 300) * 8;
    if (wackel > 0) wackel -= dt;
    zeichne(t / 1000);
  }
  function los() {
    if (zustand === "laeuft") return;
    if (zustand === "ende") {
      neu();
      zustand = "bereit";
    }
    if (zustand === "pause") {
      zustand = "laeuft";
      nachricht(null);
      return;
    }
    zustand = "laeuft";
    nachricht(null);
    pc.v = S.sprung;
  }
  function pause() {
    if (zustand !== "laeuft") return;
    zustand = "pause";
    nachricht(`<p class="big">Pause</p><p class="small">Leertaste oder Klick zum Weiterfliegen</p>`);
  }

  const onKey = (e) => {
    if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
      e.preventDefault();
      if (!e.repeat) flattern();
    } else if (e.key === "p" || e.key === "P" || e.key === "Escape") {
      zustand === "laeuft" ? pause() : null;
    }
  };
  const onDown = (e) => {
    e.preventDefault();
    flattern();
  };
  window.addEventListener("keydown", onKey);
  canvas.addEventListener("pointerdown", onDown);
  const aus = overlayKlick(() => zustand !== "laeuft" && los());

  zustand = "bereit";
  neu();
  nachricht(`<p class="big">Flatter-PC</p><p>Halt den kleinen Computer in der Luft und flieg durch die Lücken zwischen den Serverschränken. Jeder Schrank gibt einen Punkt.</p><p class="small">Leertaste, Klick oder Tippen zum Start</p>`);
  raf = requestAnimationFrame(loop);
  document.fonts?.load('10px "Press Start 2P"');

  return {
    pause,
    stop() {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      canvas.removeEventListener("pointerdown", onDown);
      aus();
    },
  };
}
