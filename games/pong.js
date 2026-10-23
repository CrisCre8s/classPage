// Ping-Pong gegen den Computer. Wer zuerst 7 Punkte hat, gewinnt.

export const HILFE = "Maus/Finger bewegen oder W/S bzw. ↑/↓ · Leertaste: Start/Pause";

const W = 800;
const H = 480;
const ZIEL = 7;
const SCHLAEGER_H = 84;
const SCHLAEGER_B = 12;
const BALL = 12;

// Schwierigkeitsstufen: Tempo des Computers, wie ungenau er zielt,
// ab wo er reagiert, Ballgeschwindigkeit und wie stark der Ball beschleunigt
const STUFEN = {
  leicht: { cpu: 4.2, fehler: 46, reagiertAb: 0.5, ball: 5.5, beschl: 1.03, max: 9, vorhersage: false },
  mittel: { cpu: 6.0, fehler: 22, reagiertAb: 0.3, ball: 6.5, beschl: 1.05, max: 11.5, vorhersage: false },
  schwer: { cpu: 8.2, fehler: 9, reagiertAb: 0, ball: 7.5, beschl: 1.06, max: 14, vorhersage: true },
};

export function start({ canvas, stufe, passeCanvas, status, nachricht, ergebnis }) {
  const S = STUFEN[stufe] || STUFEN.mittel;
  const ctx = passeCanvas(canvas, W, H);

  const spieler = { y: H / 2 - SCHLAEGER_H / 2, ziel: null };
  const cpu = { y: H / 2 - SCHLAEGER_H / 2, versatz: 0 };
  const ball = { x: W / 2, y: H / 2, vx: 0, vy: 0 };
  let punkte = [0, 0];
  let zustand = "bereit"; // bereit | laeuft | pause | punkt | ende
  let aufschlagNach = 1; // 1 = Richtung Computer
  let tasten = { hoch: false, runter: false };
  let raf = 0;
  let zuletzt = 0;
  let wartenBis = 0;

  function neuerVersatz() {
    cpu.versatz = (Math.random() * 2 - 1) * S.fehler;
  }

  function aufschlag() {
    ball.x = W / 2;
    ball.y = H / 2;
    const winkel = (Math.random() * 0.8 - 0.4) * Math.PI * 0.5;
    ball.vx = Math.cos(winkel) * S.ball * aufschlagNach;
    ball.vy = Math.sin(winkel) * S.ball;
    neuerVersatz();
  }

  function zeigeStand() {
    status(`${punkte[0]} : ${punkte[1]}`);
  }

  // Wo kommt der Ball auf der Computerseite an? (für „Schwer“, mit Bandenabprallern)
  function vorhersageY() {
    if (ball.vx <= 0) return H / 2;
    const zielX = W - 36 - BALL;
    const t = (zielX - ball.x) / ball.vx;
    let y = ball.y + ball.vy * t;
    const spanne = H - BALL;
    y = ((y % (2 * spanne)) + 2 * spanne) % (2 * spanne);
    return y > spanne ? 2 * spanne - y : y;
  }

  function treffer(schlaegerY, richtung) {
    const mitte = schlaegerY + SCHLAEGER_H / 2;
    const rel = (ball.y + BALL / 2 - mitte) / (SCHLAEGER_H / 2); // -1 … 1
    const tempo = Math.min(Math.hypot(ball.vx, ball.vy) * S.beschl, S.max);
    const winkel = rel * (Math.PI / 3.2);
    ball.vx = Math.cos(winkel) * tempo * richtung;
    ball.vy = Math.sin(winkel) * tempo;
    neuerVersatz();
  }

  function punkt(fuer) {
    punkte[fuer]++;
    zeigeStand();
    if (punkte[fuer] >= ZIEL) {
      zustand = "ende";
      const gewonnen = fuer === 0;
      ergebnis({ gewonnen });
      nachricht(
        `<p class="big">${gewonnen ? "Gewonnen!" : "Verloren"}</p><p>${punkte[0]} : ${punkte[1]}</p><p class="small">Leertaste oder Klick für ein neues Spiel</p>`,
      );
      return;
    }
    aufschlagNach = fuer === 0 ? 1 : -1;
    zustand = "punkt";
    wartenBis = performance.now() + 800;
    ball.vx = ball.vy = 0;
    ball.x = W / 2;
    ball.y = H / 2;
  }

  function schritt(dt) {
    // Spieler: Maus/Finger folgen weich, Tasten bewegen direkt
    const tempo = 9 * dt;
    if (tasten.hoch) spieler.y -= tempo;
    if (tasten.runter) spieler.y += tempo;
    if (spieler.ziel != null) spieler.y += (spieler.ziel - SCHLAEGER_H / 2 - spieler.y) * Math.min(1, 0.35 * dt);
    spieler.y = Math.max(0, Math.min(H - SCHLAEGER_H, spieler.y));

    // Computer
    let zielY = H / 2;
    const kommt = ball.vx > 0 && ball.x > W * S.reagiertAb;
    if (kommt) zielY = (S.vorhersage ? vorhersageY() : ball.y) + BALL / 2 + cpu.versatz;
    const diff = zielY - (cpu.y + SCHLAEGER_H / 2);
    const max = S.cpu * dt * (kommt ? 1 : 0.5);
    cpu.y += Math.max(-max, Math.min(max, diff));
    cpu.y = Math.max(0, Math.min(H - SCHLAEGER_H, cpu.y));

    if (zustand !== "laeuft") return;

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    if (ball.y <= 0) {
      ball.y = 0;
      ball.vy = Math.abs(ball.vy);
    }
    if (ball.y >= H - BALL) {
      ball.y = H - BALL;
      ball.vy = -Math.abs(ball.vy);
    }

    // Spielerschläger (links)
    const sx = 24;
    if (ball.vx < 0 && ball.x <= sx + SCHLAEGER_B && ball.x >= sx - BALL && ball.y + BALL >= spieler.y && ball.y <= spieler.y + SCHLAEGER_H) {
      ball.x = sx + SCHLAEGER_B;
      treffer(spieler.y, 1);
    }
    // Computerschläger (rechts)
    const cx = W - 36;
    if (ball.vx > 0 && ball.x + BALL >= cx && ball.x <= cx + SCHLAEGER_B && ball.y + BALL >= cpu.y && ball.y <= cpu.y + SCHLAEGER_H) {
      ball.x = cx - BALL;
      treffer(cpu.y, -1);
    }

    if (ball.x < -BALL) punkt(1);
    else if (ball.x > W) punkt(0);
  }

  function zeichne() {
    ctx.fillStyle = "#0f0e13";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#2a292f";
    for (let y = 8; y < H; y += 24) ctx.fillRect(W / 2 - 3, y, 6, 12);

    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.font = '48px "Press Start 2P", monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(String(punkte[0]), W / 2 - 90, 28);
    ctx.fillText(String(punkte[1]), W / 2 + 90, 28);

    ctx.fillStyle = "#f2f2f3";
    ctx.fillRect(24, Math.round(spieler.y), SCHLAEGER_B, SCHLAEGER_H);
    ctx.fillRect(W - 36, Math.round(cpu.y), SCHLAEGER_B, SCHLAEGER_H);

    if (zustand === "laeuft" || zustand === "pause") {
      ctx.fillStyle = "#f5d97a";
      ctx.fillRect(Math.round(ball.x), Math.round(ball.y), BALL, BALL);
    }
  }

  function loop(t) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(3, (t - (zuletzt || t)) / (1000 / 60)); // 1 = ein Bild bei 60 fps
    zuletzt = t;
    if (zustand === "punkt" && t >= wartenBis) {
      zustand = "laeuft";
      aufschlag();
    }
    if (zustand !== "pause") schritt(dt);
    zeichne();
  }

  function los() {
    if (zustand === "bereit") {
      zustand = "laeuft";
      nachricht(null);
      aufschlag();
    } else if (zustand === "pause") {
      zustand = "laeuft";
      nachricht(null);
    } else if (zustand === "ende") {
      punkte = [0, 0];
      zeigeStand();
      aufschlagNach = 1;
      zustand = "laeuft";
      nachricht(null);
      aufschlag();
    }
  }

  function pause() {
    if (zustand !== "laeuft") return;
    zustand = "pause";
    nachricht(`<p class="big">Pause</p><p class="small">Leertaste oder Klick zum Weiterspielen</p>`);
  }

  // ---------- Eingabe ----------
  function zeigerY(e) {
    const r = canvas.getBoundingClientRect();
    return ((e.clientY - r.top) / r.height) * H;
  }
  const onMove = (e) => {
    spieler.ziel = zeigerY(e);
  };
  const onDown = (e) => {
    spieler.ziel = zeigerY(e);
    if (zustand !== "laeuft" && zustand !== "punkt") los();
  };
  const onKey = (e) => {
    const runter = e.type === "keydown";
    if (["ArrowUp", "w", "W"].includes(e.key)) {
      tasten.hoch = runter;
      spieler.ziel = null;
      e.preventDefault();
    } else if (["ArrowDown", "s", "S"].includes(e.key)) {
      tasten.runter = runter;
      spieler.ziel = null;
      e.preventDefault();
    } else if (e.key === " " && runter) {
      e.preventDefault();
      zustand === "laeuft" ? pause() : los();
    }
  };
  const msg = document.getElementById("stage-msg");
  const onMsg = () => (zustand === "laeuft" ? null : los());

  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerdown", onDown);
  canvas.style.touchAction = "none";
  window.addEventListener("keydown", onKey);
  window.addEventListener("keyup", onKey);
  msg.addEventListener("click", onMsg);

  zeigeStand();
  nachricht(`<p class="big">Ping-Pong</p><p>Erster bei ${ZIEL} Punkten gewinnt</p><p class="small">Leertaste oder Klick zum Start</p>`);
  raf = requestAnimationFrame(loop);

  return {
    pause,
    stop() {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      msg.removeEventListener("click", onMsg);
    },
  };
}
