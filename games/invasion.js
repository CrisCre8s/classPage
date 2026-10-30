// Bug-Invasion: Bugs rücken in Reihen an, du schießt sie mit dem Debugger ab. Firewalls schützen dich, bis sie zerbröseln.
import { overlayKlick } from "./eingabe.js";

export const HILFE = "← → oder A/D bewegen · Leertaste schießen (gedrückt halten geht auch) · P Pause · Handy: Finger aufs Feld legen, der Debugger folgt und schießt";

const W = 480;
const H = 560;
const PX = 3; // Pixelgröße der Bugs
const SPALTEN = 8;
const REIHEN = 5;
const ABST_X = 46;
const ABST_Y = 36;
const SPIELER_Y = H - 48;
const SPIELER_B = 36;

// eigene Pixel-Bugs, je zwei Bilder für die Beinchen
const BILDER = {
  kaefer: [
    ["...XXXXX...", "X.XXXXXXX.X", ".XXXX.XXXX.", "XXXXX.XXXXX", ".XXXX.XXXX.", "X.XXX.XXX.X", "...XXXXX...", "....XXX....", "...X...X..."],
    ["...XXXXX...", ".XXXXXXXXX.", "XXXXX.XXXXX", ".XXXX.XXXX.", "XXXXX.XXXXX", ".XXXX.XXXX.", "...XXXXX...", "....XXX....", "..X.....X.."],
  ],
  spinne: [
    ["X..X...X..X", ".X..XXX..X.", "..XXXXXXX..", "X..XX.XX..X", ".X.XXXXX.X.", "...XXXXX...", ".X..XXX..X.", "X...X.X...X"],
    [".X.X...X.X.", "X...XXX...X", "..XXXXXXX..", ".X.XX.XX.X.", "X..XXXXX..X", "...XXXXX...", "X...XXX...X", ".X..X.X..X."],
  ],
  raupe: [
    ["XX.........", "XXX.XXX.XXX", "XXXXXXXXXXX", "XXX.XXX.XXX", "X.X.X.X.X.X"],
    ["XX.........", "XXX.XXX.XXX", "XXXXXXXXXXX", "XXX.XXX.XXX", ".X.X.X.X.X."],
  ],
};
const TYPEN = [
  { bild: "spinne", farbe: "#e5566f", wert: 30 },
  { bild: "kaefer", farbe: "#f0a35e", wert: 20 },
  { bild: "kaefer", farbe: "#f5d97a", wert: 20 },
  { bild: "raupe", farbe: "#5fc39c", wert: 10 },
  { bild: "raupe", farbe: "#5fc39c", wert: 10 },
];
const STUFEN = {
  leicht: { leben: 4, tempo: 22, feuer: 1.6, schuss: 170 },
  mittel: { leben: 3, tempo: 30, feuer: 1.05, schuss: 210 },
  schwer: { leben: 3, tempo: 38, feuer: 0.7, schuss: 250 },
};

export function start({ canvas, stufe, passeCanvas, status, nachricht, ergebnis }) {
  const S = STUFEN[stufe] || STUFEN.mittel;
  const ctx = passeCanvas(canvas, W, H);
  let bugs, fx, fy, richtung, spieler, schuesse, fehler, firewall, punkte, leben, welle, zustand, raf, zuletzt;
  let feuerTimer, cooldown, bildTakt, bild, bonus, bonusTimer, treffer, schutz;
  const tasten = { l: false, r: false, feuer: false };
  let zielX = null;
  let finger = false;

  function neueWelle() {
    bugs = [];
    for (let r = 0; r < REIHEN; r++) for (let c = 0; c < SPALTEN; c++) bugs.push({ r, c, ...TYPEN[r] });
    fx = (W - (SPALTEN - 1) * ABST_X - 33) / 2;
    fy = 70 + Math.min(welle - 1, 4) * 14;
    richtung = 1;
    schuesse = [];
    fehler = [];
    feuerTimer = S.feuer;
    bonusTimer = 14 + Math.random() * 10;
    bonus = null;
  }
  function baueFirewall() {
    firewall = [];
    const form = ["..XXXXXX..", ".XXXXXXXX.", "XXXXXXXXXX", "XXXXXXXXXX", "XXX....XXX", "XX......XX"];
    const z = 6;
    for (let i = 0; i < 4; i++) {
      const ox = 40 + i * ((W - 80 - 60) / 3);
      form.forEach((zeile, y) => [...zeile].forEach((ch, x) => ch === "X" && firewall.push({ x: ox + x * z, y: SPIELER_Y - 70 + y * z, z })));
    }
  }
  function neu() {
    punkte = 0;
    leben = S.leben;
    welle = 1;
    spieler = { x: W / 2 - SPIELER_B / 2 };
    cooldown = 0;
    bildTakt = 0;
    bild = 0;
    treffer = [];
    schutz = 0;
    neueWelle();
    baueFirewall();
    zeigeStatus();
  }
  const zeigeStatus = () => status(`${punkte} Pkt · ${"♥".repeat(Math.max(0, leben))} · Welle ${welle}`);
  const bugX = (b) => fx + b.c * ABST_X;
  const bugY = (b) => fy + b.r * ABST_Y;

  function schiessen() {
    if (cooldown > 0 || schuesse.length >= 2) return;
    schuesse.push({ x: spieler.x + SPIELER_B / 2 - 2, y: SPIELER_Y - 10 });
    cooldown = 0.32;
  }
  function trifftFirewall(x, y, w, h) {
    for (let i = 0; i < firewall.length; i++) {
      const f = firewall[i];
      if (x < f.x + f.z && x + w > f.x && y < f.y + f.z && y + h > f.y) {
        firewall.splice(i, 1);
        // Splitter: ein Nachbarstück bröselt mit
        const n = firewall.findIndex((g) => Math.abs(g.x - f.x) <= f.z && Math.abs(g.y - f.y) <= f.z && Math.random() < 0.5);
        if (n >= 0) firewall.splice(n, 1);
        return true;
      }
    }
    return false;
  }
  function explosion(x, y, farbe) {
    for (let i = 0; i < 10; i++) treffer.push({ x, y, vx: (Math.random() - 0.5) * 220, vy: (Math.random() - 0.5) * 220, t: 0.45, farbe });
  }

  function schritt(dt) {
    // Spieler
    const v = 260 * dt;
    if (tasten.l) spieler.x -= v;
    if (tasten.r) spieler.x += v;
    if (zielX != null) {
      const d = zielX - SPIELER_B / 2 - spieler.x;
      spieler.x += Math.sign(d) * Math.min(Math.abs(d), 340 * dt);
    }
    spieler.x = Math.max(6, Math.min(W - SPIELER_B - 6, spieler.x));
    cooldown -= dt;
    if (tasten.feuer || finger) schiessen();
    if (schutz > 0) schutz -= dt;

    // Formation: je weniger Bugs, desto schneller
    const anteil = bugs.length / (REIHEN * SPALTEN);
    const tempo = S.tempo * (1 + (welle - 1) * 0.12) * (1 + (1 - anteil) * 3.2);
    fx += richtung * tempo * dt;
    const xs = bugs.map(bugX);
    if (richtung > 0 && Math.max(...xs) + 33 > W - 8) {
      richtung = -1;
      fy += 14;
    } else if (richtung < 0 && Math.min(...xs) < 8) {
      richtung = 1;
      fy += 14;
    }
    bildTakt += dt * (1 + (1 - anteil) * 3);
    if (bildTakt > 0.45) {
      bildTakt = 0;
      bild = 1 - bild;
    }
    // Bugs fressen sich durch die Firewall und dürfen nicht unten ankommen
    for (const b of bugs) {
      trifftFirewall(bugX(b), bugY(b), 33, 24);
      if (bugY(b) + 24 >= SPIELER_Y) return verloren("Die Bugs haben das System erreicht!");
    }

    // Bugs schießen: immer der unterste einer zufälligen Spalte
    feuerTimer -= dt;
    if (feuerTimer <= 0) {
      feuerTimer = S.feuer * (0.6 + Math.random() * 0.8) / (1 + (welle - 1) * 0.1);
      const spalten = [...new Set(bugs.map((b) => b.c))];
      // gern die Spalte über dem Spieler
      const ueber = spalten.filter((c) => Math.abs(fx + c * ABST_X + 16 - (spieler.x + SPIELER_B / 2)) < 60);
      const c = ueber.length && Math.random() < 0.5 ? ueber[0] : spalten[Math.floor(Math.random() * spalten.length)];
      const unterster = bugs.filter((b) => b.c === c).sort((a, b) => b.r - a.r)[0];
      if (unterster) fehler.push({ x: bugX(unterster) + 15, y: bugY(unterster) + 24, t: 0 });
    }

    // Bonus-Bug oben
    bonusTimer -= dt;
    if (!bonus && bonusTimer <= 0) {
      const links = Math.random() < 0.5;
      bonus = { x: links ? -40 : W + 10, v: links ? 110 : -110, wert: [50, 100, 150, 300][Math.floor(Math.random() * 4)] };
      bonusTimer = 18 + Math.random() * 10;
    }
    if (bonus) {
      bonus.x += bonus.v * dt;
      if (bonus.x < -60 || bonus.x > W + 30) bonus = null;
    }

    // eigene Schüsse
    for (const s of schuesse) {
      s.y -= 560 * dt;
      if (trifftFirewall(s.x, s.y, 4, 10)) {
        s.weg = true;
        continue;
      }
      for (const b of bugs) {
        const x = bugX(b);
        const y = bugY(b);
        if (s.x + 4 > x && s.x < x + 33 && s.y < y + 24 && s.y + 10 > y) {
          b.weg = true;
          s.weg = true;
          punkte += b.wert;
          explosion(x + 16, y + 12, b.farbe);
          break;
        }
      }
      if (bonus && !s.weg && s.x + 4 > bonus.x && s.x < bonus.x + 36 && s.y < 52 && s.y + 10 > 32) {
        punkte += bonus.wert;
        explosion(bonus.x + 18, 42, "#c8a2ff");
        treffer.push({ text: `+${bonus.wert}`, x: bonus.x + 18, y: 42, t: 1 });
        bonus = null;
        s.weg = true;
      }
      if (s.y < -12) s.weg = true;
    }
    if (schuesse.some((s) => s.weg) || bugs.some((b) => b.weg)) {
      schuesse = schuesse.filter((s) => !s.weg);
      bugs = bugs.filter((b) => !b.weg);
      zeigeStatus();
    }
    // Fehler-Blitze der Bugs
    for (const f of fehler) {
      f.y += S.schuss * (1 + (welle - 1) * 0.06) * dt;
      f.t += dt;
      if (trifftFirewall(f.x - 3, f.y, 6, 12)) f.weg = true;
      else if (schutz <= 0 && f.y + 12 > SPIELER_Y && f.y < SPIELER_Y + 22 && f.x > spieler.x && f.x < spieler.x + SPIELER_B) {
        f.weg = true;
        getroffen();
      } else if (f.y > H) f.weg = true;
    }
    fehler = fehler.filter((f) => !f.weg);
    for (const t of treffer) {
      if (!t.text) {
        t.x += t.vx * dt;
        t.y += t.vy * dt;
      } else t.y -= 20 * dt;
      t.t -= dt;
    }
    treffer = treffer.filter((t) => t.t > 0);

    if (!bugs.length) {
      punkte += 100 * welle;
      welle++;
      neueWelle();
      zeigeStatus();
      treffer.push({ text: `WELLE ${welle}`, x: W / 2, y: H / 2, t: 1.4 });
    }
  }
  function getroffen() {
    leben--;
    explosion(spieler.x + SPIELER_B / 2, SPIELER_Y + 10, "#c8a2ff");
    zeigeStatus();
    if (leben <= 0) return verloren("Der Debugger ist abgestürzt.");
    schutz = 1.5;
    fehler = [];
  }
  function verloren(grund) {
    zustand = "ende";
    const neuer = ergebnis({ punkte });
    nachricht(`<p class="big">Game Over</p><p>${grund}</p><p>${punkte} Punkte · Welle ${welle}${neuer ? " · neuer Highscore!" : ""}</p><p class="small">Leertaste oder Klick für ein neues Spiel</p>`);
  }

  // ---------- Zeichnen ----------
  function pixelBild(zeilen, x, y, farbe) {
    ctx.fillStyle = farbe;
    y += Math.round(((8 - zeilen.length) * PX) / 2); // kleinere Bugs mittig
    zeilen.forEach((z, yy) => {
      for (let xx = 0; xx < z.length; xx++) if (z[xx] === "X") ctx.fillRect(x + xx * PX, y + yy * PX, PX, PX);
    });
  }
  function zeichneDebugger() {
    if (schutz > 0 && Math.floor(schutz * 10) % 2) return;
    const x = Math.round(spieler.x);
    const y = SPIELER_Y;
    // Sockel
    ctx.fillStyle = "#c8a2ff";
    ctx.fillRect(x, y + 12, SPIELER_B, 10);
    ctx.fillStyle = "#8a63d2";
    ctx.fillRect(x, y + 19, SPIELER_B, 3);
    ctx.fillStyle = "#e9e6ef";
    ctx.fillRect(x + 6, y + 6, SPIELER_B - 12, 7);
    // Lupe als Lauf
    ctx.strokeStyle = "#f5d97a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x + SPIELER_B / 2, y - 2, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#f5d97a";
    ctx.fillRect(x + SPIELER_B / 2 - 1.5, y + 3, 3, 4);
  }
  function zeichne(t) {
    ctx.fillStyle = "#0f0e13";
    ctx.fillRect(0, 0, W, H);
    // dezentes Code-Raster im Hintergrund
    ctx.fillStyle = "#15141b";
    for (let y = 30; y < H - 60; y += 22) for (let x = 14; x < W; x += 60) ctx.fillRect(x + ((y * 7) % 30), y, 18 + ((x + y) % 24), 3);
    for (const f of firewall) {
      ctx.fillStyle = "#44a282";
      ctx.fillRect(f.x, f.y, f.z, f.z);
    }
    for (const b of bugs) pixelBild(BILDER[b.bild][bild], Math.round(bugX(b)), Math.round(bugY(b)), b.farbe);
    if (bonus) {
      pixelBild(BILDER.spinne[Math.floor(t * 6) % 2], Math.round(bonus.x), 30, "#c8a2ff");
    }
    // Breakpoints (eigene Schüsse)
    for (const s of schuesse) {
      ctx.fillStyle = "#e5566f";
      ctx.beginPath();
      ctx.arc(s.x + 2, s.y + 4, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    // Fehler-Blitze
    ctx.strokeStyle = "#f5d97a";
    ctx.lineWidth = 2;
    for (const f of fehler) {
      const z = Math.sin(f.t * 30) * 3;
      ctx.beginPath();
      ctx.moveTo(f.x + z, f.y);
      ctx.lineTo(f.x - z, f.y + 4);
      ctx.lineTo(f.x + z, f.y + 8);
      ctx.lineTo(f.x - z, f.y + 12);
      ctx.stroke();
    }
    if (zustand !== "ende" || leben > 0) zeichneDebugger();
    for (const tr of treffer) {
      ctx.globalAlpha = Math.min(1, tr.t * 2);
      if (tr.text) {
        ctx.fillStyle = "#f2f2f3";
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.textAlign = "center";
        ctx.fillText(tr.text, tr.x, tr.y);
      } else {
        ctx.fillStyle = tr.farbe;
        ctx.fillRect(tr.x, tr.y, 3, 3);
      }
    }
    ctx.globalAlpha = 1;
    // Bodenlinie und Leben
    ctx.fillStyle = "#3a3550";
    ctx.fillRect(0, H - 22, W, 2);
    ctx.fillStyle = "#8a8698";
    ctx.font = '9px "Press Start 2P", monospace';
    ctx.textAlign = "left";
    ctx.fillText(`${punkte}`, 10, H - 7);
    ctx.textAlign = "right";
    ctx.fillText(`WELLE ${welle}  ${"♥".repeat(Math.max(0, leben))}`, W - 10, H - 7);
  }

  function loop(t) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.034, (t - (zuletzt || t)) / 1000);
    zuletzt = t;
    if (zustand === "laeuft") schritt(dt);
    zeichne(t / 1000);
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

  // ---------- Eingabe ----------
  const onKey = (e) => {
    const runter = e.type === "keydown";
    const k = e.key;
    if (k === "ArrowLeft" || k === "a" || k === "A") {
      tasten.l = runter;
      zielX = null;
      e.preventDefault();
    } else if (k === "ArrowRight" || k === "d" || k === "D") {
      tasten.r = runter;
      zielX = null;
      e.preventDefault();
    } else if (k === " " || k === "ArrowUp") {
      e.preventDefault();
      if (runter && zustand !== "laeuft") return los();
      tasten.feuer = runter;
    } else if ((k === "p" || k === "P" || k === "Escape") && runter) {
      if (zustand === "laeuft") pause();
    }
  };
  const xVon = (e) => {
    const r = canvas.getBoundingClientRect();
    return ((e.clientX - r.left) / r.width) * W;
  };
  const onDown = (e) => {
    if (zustand !== "laeuft") return los();
    zielX = xVon(e);
    if (e.pointerType === "mouse") schiessen();
    else finger = true;
  };
  const onMove = (e) => {
    if (e.pointerType === "mouse" || finger) zielX = xVon(e);
  };
  const onUp = () => (finger = false);
  window.addEventListener("keydown", onKey);
  window.addEventListener("keyup", onKey);
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  const aus = overlayKlick(() => zustand !== "laeuft" && los());

  zustand = "bereit";
  neu();
  nachricht(`<p class="big">Bug-Invasion</p><p>Die Bugs rücken Reihe für Reihe an. Setz ihnen mit dem Debugger Breakpoints, bevor sie unten ankommen. Die grünen Firewalls halten eine Weile.</p><p class="small">${S.leben} Leben · ← → und Leertaste · Handy: Finger aufs Feld<br>Leertaste oder Klick zum Start</p>`);
  raf = requestAnimationFrame(loop);
  document.fonts?.load('10px "Press Start 2P"');

  return {
    pause,
    stop() {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      aus();
    },
  };
}
