// Mauerbrecher: Ball im Spiel halten, alle Steine abräumen. Jede Mauer wird schneller.
import { overlayKlick } from "./eingabe.js";

export const HILFE = "Maus, Finger oder ←/→ · Leertaste/Klick: Ball abschießen · P: Pause";

const W = 640;
const H = 480;
const SPALTEN = 10;
const STEIN_B = 58;
const STEIN_H = 20;
const LUECKE = 4;
const LINKS = (W - (SPALTEN * STEIN_B + (SPALTEN - 1) * LUECKE)) / 2;
const OBEN = 56;
const BALL = 10;
const SCHL_Y = H - 34;
const SCHL_H = 12;
const REIHENFARBEN = ["#e5566f", "#f0a35e", "#f5d97a", "#5fc39c", "#7fb8ff", "#c8a2ff", "#e5566f", "#f0a35e"];

const STUFEN = {
  leicht: { reihen: 5, breite: 124, tempo: 4.4, leben: 5, hart: 0 },
  mittel: { reihen: 6, breite: 98, tempo: 5.4, leben: 3, hart: 0 },
  schwer: { reihen: 8, breite: 78, tempo: 6.4, leben: 3, hart: 2 },
};

export function start({ canvas, stufe, passeCanvas, status, nachricht, ergebnis }) {
  const S = STUFEN[stufe] || STUFEN.mittel;
  const ctx = passeCanvas(canvas, W, H);

  let steine, schl, ball, punkte, leben, mauer, tempo, zustand, raf, zuletzt;
  let tasten = { l: false, r: false };
  let zielX = null;

  function baueMauer() {
    steine = [];
    for (let r = 0; r < S.reihen; r++)
      for (let c = 0; c < SPALTEN; c++)
        steine.push({
          x: LINKS + c * (STEIN_B + LUECKE),
          y: OBEN + r * (STEIN_H + LUECKE),
          farbe: REIHENFARBEN[r % REIHENFARBEN.length],
          wert: (S.reihen - r) * 10,
          leben: r < S.hart ? 2 : 1,
        });
  }

  function ballAufSchlaeger() {
    ball = { x: schl.x + schl.b / 2 - BALL / 2, y: SCHL_Y - BALL - 1, vx: 0, vy: 0, klebt: true };
  }

  function neu() {
    punkte = 0;
    leben = S.leben;
    mauer = 1;
    tempo = S.tempo;
    schl = { x: W / 2 - S.breite / 2, b: S.breite };
    baueMauer();
    ballAufSchlaeger();
    zeigeStatus();
  }

  function zeigeStatus() {
    status(`${punkte} Pkt · ${"♥".repeat(leben)} · Mauer ${mauer}`);
  }

  function abschuss() {
    if (!ball.klebt) return;
    const w = (-Math.PI / 2) + (Math.random() * 0.6 - 0.3);
    ball.vx = Math.cos(w) * tempo;
    ball.vy = Math.sin(w) * tempo;
    ball.klebt = false;
  }

  function trifftStein() {
    for (const s of steine) {
      if (ball.x + BALL <= s.x || ball.x >= s.x + STEIN_B || ball.y + BALL <= s.y || ball.y >= s.y + STEIN_H) continue;
      // Richtung über die kleinste Überlappung bestimmen
      const ueberX = Math.min(ball.x + BALL - s.x, s.x + STEIN_B - ball.x);
      const ueberY = Math.min(ball.y + BALL - s.y, s.y + STEIN_H - ball.y);
      if (ueberX < ueberY) {
        ball.vx = -ball.vx;
        ball.x += ball.vx > 0 ? ueberX : -ueberX;
      } else {
        ball.vy = -ball.vy;
        ball.y += ball.vy > 0 ? ueberY : -ueberY;
      }
      s.leben--;
      if (s.leben <= 0) {
        punkte += s.wert;
        steine.splice(steine.indexOf(s), 1);
      }
      zeigeStatus();
      return;
    }
  }

  function schritt(dt) {
    const v = 9 * dt;
    if (tasten.l) schl.x -= v;
    if (tasten.r) schl.x += v;
    if (zielX != null) schl.x += (zielX - schl.b / 2 - schl.x) * Math.min(1, 0.4 * dt);
    schl.x = Math.max(0, Math.min(W - schl.b, schl.x));

    if (ball.klebt) {
      ball.x = schl.x + schl.b / 2 - BALL / 2;
      return;
    }
    // in Teilschritten, damit der Ball nicht durch Steine tunnelt
    const teile = Math.ceil((Math.hypot(ball.vx, ball.vy) * dt) / 4);
    for (let i = 0; i < teile; i++) {
      ball.x += (ball.vx * dt) / teile;
      ball.y += (ball.vy * dt) / teile;
      if (ball.x <= 0) {
        ball.x = 0;
        ball.vx = Math.abs(ball.vx);
      }
      if (ball.x >= W - BALL) {
        ball.x = W - BALL;
        ball.vx = -Math.abs(ball.vx);
      }
      if (ball.y <= 0) {
        ball.y = 0;
        ball.vy = Math.abs(ball.vy);
      }
      // Schläger: Abprallwinkel hängt von der Trefferstelle ab
      if (ball.vy > 0 && ball.y + BALL >= SCHL_Y && ball.y + BALL <= SCHL_Y + SCHL_H + 6 && ball.x + BALL >= schl.x && ball.x <= schl.x + schl.b) {
        const rel = (ball.x + BALL / 2 - (schl.x + schl.b / 2)) / (schl.b / 2);
        const w = -Math.PI / 2 + Math.max(-1, Math.min(1, rel)) * (Math.PI / 3);
        const t = Math.hypot(ball.vx, ball.vy);
        ball.vx = Math.cos(w) * t;
        ball.vy = Math.sin(w) * t;
        ball.y = SCHL_Y - BALL;
      }
      trifftStein();
      if (ball.y > H) {
        verliertBall();
        return;
      }
    }
    if (!steine.length) naechsteMauer();
  }

  function verliertBall() {
    leben--;
    zeigeStatus();
    if (leben <= 0) {
      zustand = "ende";
      const neuer = ergebnis({ punkte });
      nachricht(`<p class="big">Game Over</p><p>${punkte} Punkte · Mauer ${mauer}${neuer ? " · neuer Highscore!" : ""}</p><p class="small">Leertaste oder Klick für ein neues Spiel</p>`);
      return;
    }
    ballAufSchlaeger();
  }

  function naechsteMauer() {
    mauer++;
    punkte += 250;
    tempo *= 1.08;
    baueMauer();
    ballAufSchlaeger();
    zeigeStatus();
  }

  function zeichne() {
    ctx.fillStyle = "#0f0e13";
    ctx.fillRect(0, 0, W, H);
    for (const s of steine) {
      ctx.fillStyle = s.farbe;
      ctx.fillRect(s.x, s.y, STEIN_B, STEIN_H);
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.fillRect(s.x, s.y, STEIN_B, 3);
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.fillRect(s.x, s.y + STEIN_H - 3, STEIN_B, 3);
      if (s.leben > 1) {
        // harter Stein: dunkler Kern
        ctx.fillStyle = "rgba(15,14,19,0.45)";
        ctx.fillRect(s.x + 8, s.y + 6, STEIN_B - 16, STEIN_H - 12);
      }
    }
    ctx.fillStyle = "#f2f2f3";
    ctx.fillRect(Math.round(schl.x), SCHL_Y, schl.b, SCHL_H);
    ctx.fillStyle = "#c8a2ff";
    ctx.fillRect(Math.round(schl.x), SCHL_Y + SCHL_H - 3, schl.b, 3);
    ctx.fillStyle = "#f5d97a";
    ctx.fillRect(Math.round(ball.x), Math.round(ball.y), BALL, BALL);
    if (ball.klebt && zustand === "laeuft") {
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = '11px "Press Start 2P", monospace';
      ctx.textAlign = "center";
      ctx.fillText("KLICK ODER LEERTASTE", W / 2, H - 70);
    }
  }

  function loop(t) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(3, (t - (zuletzt || t)) / (1000 / 60));
    zuletzt = t;
    if (zustand === "laeuft") schritt(dt);
    zeichne();
  }

  function los() {
    if (zustand === "ende") neu();
    if (zustand !== "laeuft") {
      zustand = "laeuft";
      nachricht(null);
      return;
    }
    abschuss();
  }
  function pause() {
    if (zustand !== "laeuft") return;
    zustand = "pause";
    nachricht(`<p class="big">Pause</p><p class="small">Leertaste oder Klick zum Weiterspielen</p>`);
  }

  // ---------- Eingabe ----------
  const xVon = (e) => {
    const r = canvas.getBoundingClientRect();
    return ((e.clientX - r.left) / r.width) * W;
  };
  const onMove = (e) => (zielX = xVon(e));
  const onDown = (e) => {
    zielX = xVon(e);
    los();
  };
  const onKey = (e) => {
    const runter = e.type === "keydown";
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      tasten.l = runter;
      zielX = null;
      e.preventDefault();
    } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      tasten.r = runter;
      zielX = null;
      e.preventDefault();
    } else if (e.key === " " && runter) {
      e.preventDefault();
      los();
    } else if ((e.key === "p" || e.key === "P") && runter) {
      zustand === "laeuft" ? pause() : los();
    }
  };
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerdown", onDown);
  window.addEventListener("keydown", onKey);
  window.addEventListener("keyup", onKey);
  const aus = overlayKlick(() => zustand !== "laeuft" && los());

  zustand = "bereit";
  neu();
  nachricht(`<p class="big">Mauerbrecher</p><p>${S.leben} Leben · ${S.reihen} Reihen${S.hart ? " · obere Reihen brauchen 2 Treffer" : ""}</p><p class="small">Klick oder Leertaste zum Start</p>`);
  raf = requestAnimationFrame(loop);

  return {
    pause,
    stop() {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      aus();
    },
  };
}
