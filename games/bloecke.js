// Block-Stapler: fallende Steine zu vollen Reihen stapeln. Mit Vorschau, Halten, Geisterstein, Drehen mit Wandsprung.
// (Spielprinzip der bekannten Fallblock-Spiele, eigene Umsetzung und eigener Name)

export const HILFE = "← → schieben · ↑ oder X drehen, Z andersrum · ↓ schneller · Leertaste ganz runter · C halten · P Pause · Handy: tippen dreht, wischen schiebt, nach unten wischen lässt fallen";

const SP = 10;
const ZE = 20;
const Z = 24; // Kästchengröße
const W = 420;
const H = 500;
const BX = 20; // Brett links
const BY = 10;

const FARBEN = { I: "#7fb8ff", O: "#f5d97a", T: "#b48ef0", S: "#5fc39c", Z: "#e5566f", J: "#6a8cff", L: "#f0a35e" };
// Steine in 4 Drehlagen (Raster 4 × 4 bzw. 3 × 3), Drehsystem wie im Standard (SRS)
const FORMEN = {
  I: [[[0, 1], [1, 1], [2, 1], [3, 1]], [[2, 0], [2, 1], [2, 2], [2, 3]], [[0, 2], [1, 2], [2, 2], [3, 2]], [[1, 0], [1, 1], [1, 2], [1, 3]]],
  O: [[[1, 0], [2, 0], [1, 1], [2, 1]], [[1, 0], [2, 0], [1, 1], [2, 1]], [[1, 0], [2, 0], [1, 1], [2, 1]], [[1, 0], [2, 0], [1, 1], [2, 1]]],
  T: [[[1, 0], [0, 1], [1, 1], [2, 1]], [[1, 0], [1, 1], [2, 1], [1, 2]], [[0, 1], [1, 1], [2, 1], [1, 2]], [[1, 0], [0, 1], [1, 1], [1, 2]]],
  S: [[[1, 0], [2, 0], [0, 1], [1, 1]], [[1, 0], [1, 1], [2, 1], [2, 2]], [[1, 1], [2, 1], [0, 2], [1, 2]], [[0, 0], [0, 1], [1, 1], [1, 2]]],
  Z: [[[0, 0], [1, 0], [1, 1], [2, 1]], [[2, 0], [1, 1], [2, 1], [1, 2]], [[0, 1], [1, 1], [1, 2], [2, 2]], [[1, 0], [0, 1], [1, 1], [0, 2]]],
  J: [[[0, 0], [0, 1], [1, 1], [2, 1]], [[1, 0], [2, 0], [1, 1], [1, 2]], [[0, 1], [1, 1], [2, 1], [2, 2]], [[1, 0], [1, 1], [0, 2], [1, 2]]],
  L: [[[2, 0], [0, 1], [1, 1], [2, 1]], [[1, 0], [1, 1], [1, 2], [2, 2]], [[0, 1], [1, 1], [2, 1], [0, 2]], [[0, 0], [1, 0], [1, 1], [1, 2]]],
};
// Wandsprünge (SRS): [von-Lage] → Versuche für Drehung im Uhrzeigersinn; gegen den Uhrzeigersinn gespiegelt
const KICK = {
  normal: { "0>1": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]], "1>2": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]], "2>3": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]], "3>0": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]] },
  I: { "0>1": [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]], "1>2": [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]], "2>3": [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]], "3>0": [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]] },
};
const STARTLEVEL = { leicht: 1, mittel: 4, schwer: 8 };
const PUNKTE_REIHEN = [0, 100, 300, 500, 800];

export function start({ canvas, stufe, passeCanvas, status, nachricht, ergebnis }) {
  const ctx = passeCanvas(canvas, W, H);
  let skala = 1;
  function passeAufloesung() {
    const breite = canvas.getBoundingClientRect().width;
    if (!breite) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const px = Math.max(W, Math.round(breite * dpr));
    if (canvas.width !== px) {
      canvas.width = px;
      canvas.height = Math.round((px * H) / W);
    }
    skala = canvas.width / W;
  }
  const ro = new ResizeObserver(passeAufloesung);
  ro.observe(canvas);

  let feld, stein, naechste, beutel, halten, gehalten, punkte, reihen, level, zustand, raf, zuletzt, fallAkku, lockZeit, lockResets, blitz;

  const leer = () => Array.from({ length: ZE }, () => Array(SP).fill(null));
  function ausBeutel() {
    if (!beutel.length) {
      beutel = Object.keys(FORMEN);
      for (let i = beutel.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [beutel[i], beutel[j]] = [beutel[j], beutel[i]];
      }
    }
    return beutel.pop();
  }
  const zellen = (s, lage = s.lage, x = s.x, y = s.y) => FORMEN[s.typ][lage].map(([cx, cy]) => [x + cx, y + cy]);
  const frei = (s, lage, x, y) => zellen(s, lage, x, y).every(([cx, cy]) => cx >= 0 && cx < SP && cy < ZE && (cy < 0 || !feld[cy][cx]));
  function neuerStein(typ = naechste.shift()) {
    naechste.push(ausBeutel());
    stein = { typ, lage: 0, x: typ === "O" ? 3 : 3, y: typ === "I" ? -1 : 0 };
    halten = false;
    lockZeit = 0;
    lockResets = 0;
    if (!frei(stein, 0, stein.x, stein.y)) ende();
  }
  const fallZeit = () => Math.pow(0.8 - (level - 1) * 0.007, level - 1); // Sekunden pro Reihe

  function neu() {
    feld = leer();
    beutel = [];
    naechste = [ausBeutel(), ausBeutel(), ausBeutel()];
    gehalten = null;
    punkte = 0;
    reihen = 0;
    level = STARTLEVEL[stufe] || 4;
    fallAkku = 0;
    blitz = null;
    neuerStein();
    zeigeStatus();
  }
  const zeigeStatus = () => status(`${punkte} Pkt · Level ${level} · ${reihen} Reihen`);

  function bewege(dx) {
    if (zustand !== "laeuft" || !stein) return;
    if (frei(stein, stein.lage, stein.x + dx, stein.y)) {
      stein.x += dx;
      lockNeu();
    }
  }
  function drehe(richtung) {
    if (zustand !== "laeuft" || !stein || stein.typ === "O") return;
    const von = stein.lage;
    const nach = (von + richtung + 4) % 4;
    const tab = stein.typ === "I" ? KICK.I : KICK.normal;
    const versuche = richtung > 0 ? tab[`${von}>${nach}`] : tab[`${nach}>${von}`].map(([a, b]) => [-a, -b]);
    for (const [dx, dy] of versuche) {
      // SRS zählt y nach oben, unser Raster nach unten
      if (frei(stein, nach, stein.x + dx, stein.y - dy)) {
        stein.lage = nach;
        stein.x += dx;
        stein.y -= dy;
        lockNeu();
        return;
      }
    }
  }
  function lockNeu() {
    if (lockZeit > 0 && lockResets < 15) {
      lockZeit = 0;
      lockResets++;
    }
  }
  const amBoden = () => !frei(stein, stein.lage, stein.x, stein.y + 1);
  function fallen(weich) {
    if (!amBoden()) {
      stein.y++;
      if (weich) punkte++;
      return true;
    }
    return false;
  }
  function ganzRunter() {
    if (zustand !== "laeuft" || !stein) return;
    let n = 0;
    while (fallen(false)) n++;
    punkte += n * 2;
    festsetzen();
  }
  function halteStein() {
    if (zustand !== "laeuft" || !stein || halten) return;
    const typ = stein.typ;
    if (gehalten) neuerStein(gehalten);
    else neuerStein();
    gehalten = typ;
    halten = true;
  }
  function festsetzen() {
    for (const [x, y] of zellen(stein)) {
      if (y < 0) return ende();
      feld[y][x] = stein.typ;
    }
    const volle = feld.map((r, i) => (r.every(Boolean) ? i : -1)).filter((i) => i >= 0);
    if (volle.length) {
      blitz = { reihen: volle, t: 0.18 };
      for (const i of volle) {
        feld.splice(i, 1);
        feld.unshift(Array(SP).fill(null));
      }
      reihen += volle.length;
      punkte += PUNKTE_REIHEN[volle.length] * level;
      const neuLevel = (STARTLEVEL[stufe] || 4) + Math.floor(reihen / 10);
      if (neuLevel > level) level = neuLevel;
    }
    stein = null;
    zeigeStatus();
    neuerStein();
  }
  function schritt(dt) {
    if (!stein) return;
    const weich = tasten.runter;
    fallAkku += dt;
    const takt = weich ? Math.min(0.05, fallZeit() / 20) : fallZeit();
    while (fallAkku >= takt) {
      fallAkku -= takt;
      if (!fallen(weich)) break;
      lockZeit = 0;
    }
    if (amBoden()) {
      lockZeit += dt;
      if (lockZeit >= 0.5) festsetzen();
    }
    // gedrückt halten: wiederholt schieben (erst nach kurzer Pause)
    for (const r of ["links", "rechts"]) {
      if (!tasten[r]) continue;
      tasten[r] += dt;
      while (tasten[r] > 0.17 + 0.05) {
        bewege(r === "links" ? -1 : 1);
        tasten[r] -= 0.05;
      }
    }
    if (blitz && (blitz.t -= dt) <= 0) blitz = null;
  }

  function ende() {
    zustand = "ende";
    stein = null;
    const neuer = ergebnis({ punkte });
    nachricht(`<p class="big">Game Over</p><p>${punkte} Punkte · ${reihen} Reihen · Level ${level}${neuer ? " · neuer Highscore!" : ""}</p><p class="small">Leertaste oder Klick für ein neues Spiel</p>`);
  }

  // ---------- Zeichnen ----------
  function kaestchen(x, y, farbe, alpha = 1) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = farbe;
    ctx.fillRect(x + 1, y + 1, Z - 2, Z - 2);
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.fillRect(x + 1, y + 1, Z - 2, 4);
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(x + 1, y + Z - 5, Z - 2, 4);
    ctx.globalAlpha = 1;
  }
  function mini(typ, x, y, groesse = 16) {
    if (!typ) return;
    const zs = FORMEN[typ][0];
    const minX = Math.min(...zs.map((z) => z[0]));
    const maxX = Math.max(...zs.map((z) => z[0]));
    const minY = Math.min(...zs.map((z) => z[1]));
    const maxY = Math.max(...zs.map((z) => z[1]));
    const ox = x - ((maxX - minX + 1) * groesse) / 2;
    const oy = y - ((maxY - minY + 1) * groesse) / 2;
    for (const [cx, cy] of zs) {
      ctx.fillStyle = FARBEN[typ];
      ctx.fillRect(ox + (cx - minX) * groesse + 1, oy + (cy - minY) * groesse + 1, groesse - 2, groesse - 2);
    }
  }
  function zeichne() {
    ctx.setTransform(skala, 0, 0, skala, 0, 0);
    ctx.fillStyle = "#0f0e13";
    ctx.fillRect(0, 0, W, H);
    // Brett
    ctx.fillStyle = "#16141c";
    ctx.fillRect(BX, BY, SP * Z, ZE * Z);
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (let x = 1; x < SP; x++) {
      ctx.beginPath();
      ctx.moveTo(BX + x * Z + 0.5, BY);
      ctx.lineTo(BX + x * Z + 0.5, BY + ZE * Z);
      ctx.stroke();
    }
    for (let y = 1; y < ZE; y++) {
      ctx.beginPath();
      ctx.moveTo(BX, BY + y * Z + 0.5);
      ctx.lineTo(BX + SP * Z, BY + y * Z + 0.5);
      ctx.stroke();
    }
    for (let y = 0; y < ZE; y++) for (let x = 0; x < SP; x++) if (feld[y][x]) kaestchen(BX + x * Z, BY + y * Z, FARBEN[feld[y][x]]);
    if (blitz) {
      ctx.fillStyle = `rgba(255,255,255,${blitz.t * 3})`;
      ctx.fillRect(BX, BY, SP * Z, ZE * Z);
    }
    if (stein) {
      // Geisterstein: zeigt, wo der Stein landet
      let gy = stein.y;
      while (frei(stein, stein.lage, stein.x, gy + 1)) gy++;
      for (const [x, y] of zellen(stein, stein.lage, stein.x, gy)) if (y >= 0) {
        ctx.strokeStyle = FARBEN[stein.typ];
        ctx.globalAlpha = 0.45;
        ctx.lineWidth = 2;
        ctx.strokeRect(BX + x * Z + 2, BY + y * Z + 2, Z - 4, Z - 4);
        ctx.globalAlpha = 1;
      }
      for (const [x, y] of zellen(stein)) if (y >= 0) kaestchen(BX + x * Z, BY + y * Z, FARBEN[stein.typ]);
    }
    ctx.strokeStyle = "#3a3550";
    ctx.lineWidth = 2;
    ctx.strokeRect(BX - 1, BY - 1, SP * Z + 2, ZE * Z + 2);
    // Seitenleiste
    const sx = BX + SP * Z + 24;
    ctx.fillStyle = "#8a8698";
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.textAlign = "left";
    ctx.fillText("NÄCHSTE", sx, 30);
    ctx.fillStyle = "#16141c";
    ctx.fillRect(sx, 40, 120, 150);
    naechste.forEach((t, i) => mini(t, sx + 60, 70 + i * 46, i === 0 ? 18 : 14));
    ctx.fillStyle = "#8a8698";
    ctx.fillText("HALTEN (C)", sx, 220);
    ctx.fillStyle = "#16141c";
    ctx.fillRect(sx, 230, 120, 70);
    ctx.globalAlpha = halten ? 0.4 : 1;
    mini(gehalten, sx + 60, 265, 16);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#8a8698";
    ctx.fillText("PUNKTE", sx, 335);
    ctx.fillText("LEVEL", sx, 395);
    ctx.fillText("REIHEN", sx, 455);
    ctx.fillStyle = "#f4f1f8";
    ctx.font = '14px "Press Start 2P", monospace';
    ctx.fillText(String(punkte), sx, 358);
    ctx.fillText(String(level), sx, 418);
    ctx.fillText(String(reihen), sx, 478);
  }

  function loop(t) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (t - (zuletzt || t)) / 1000);
    zuletzt = t;
    if (zustand === "laeuft") schritt(dt);
    zeichne();
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
  const tasten = { links: 0, rechts: 0, runter: false };
  const onKeyDown = (e) => {
    const k = e.key;
    if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " "].includes(k)) e.preventDefault();
    if (k === "p" || k === "P" || k === "Escape") return zustand === "laeuft" ? pause() : null;
    if (zustand !== "laeuft") {
      if (k === " " || k === "Enter") los();
      return;
    }
    if (e.repeat) return;
    if (k === "ArrowLeft" || k === "a" || k === "A") {
      bewege(-1);
      tasten.links = 0.001;
    } else if (k === "ArrowRight" || k === "d" || k === "D") {
      bewege(1);
      tasten.rechts = 0.001;
    } else if (k === "ArrowDown" || k === "s" || k === "S") tasten.runter = true;
    else if (k === "ArrowUp" || k === "x" || k === "X" || k === "w" || k === "W") drehe(1);
    else if (k === "z" || k === "Z" || k === "y" || k === "Y" || k === "Control") drehe(-1);
    else if (k === " ") ganzRunter();
    else if (k === "c" || k === "C" || k === "Shift") halteStein();
  };
  const onKeyUp = (e) => {
    const k = e.key;
    if (k === "ArrowLeft" || k === "a" || k === "A") tasten.links = 0;
    if (k === "ArrowRight" || k === "d" || k === "D") tasten.rechts = 0;
    if (k === "ArrowDown" || k === "s" || k === "S") tasten.runter = false;
  };
  // Touch: tippen dreht, waagerecht ziehen schiebt (je Kästchenbreite), schnell nach unten wischen = ganz runter
  let finger = null;
  const onDown = (e) => {
    if (zustand !== "laeuft") return los();
    finger = { x: e.clientX, y: e.clientY, t: performance.now(), schritte: 0, runter: 0, bewegt: false };
  };
  const onMove = (e) => {
    if (!finger || zustand !== "laeuft") return;
    const r = canvas.getBoundingClientRect();
    const zellePx = (Z / W) * r.width;
    const dx = e.clientX - finger.x;
    const n = Math.trunc(dx / zellePx);
    while (finger.schritte < n) {
      bewege(1);
      finger.schritte++;
      finger.bewegt = true;
    }
    while (finger.schritte > n) {
      bewege(-1);
      finger.schritte--;
      finger.bewegt = true;
    }
    const dy = e.clientY - finger.y;
    const m = Math.trunc(dy / zellePx);
    while (finger.runter < m) {
      if (stein && fallen(true)) finger.runter++;
      else break;
      finger.bewegt = true;
    }
  };
  const onUp = (e) => {
    if (!finger) return;
    const dy = e.clientY - finger.y;
    const dauer = performance.now() - finger.t;
    if (dy > 60 && dauer < 250) ganzRunter();
    else if (!finger.bewegt && Math.abs(e.clientX - finger.x) < 10 && Math.abs(dy) < 10) drehe(1);
    finger = null;
  };
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", () => (finger = null));
  const msg = document.getElementById("stage-msg");
  const onMsg = (e) => {
    if (!e.target.closest("button") && zustand !== "laeuft") los();
  };
  msg.addEventListener("click", onMsg);

  zustand = "bereit";
  neu();
  passeAufloesung();
  nachricht(`<p class="big">Block-Stapler</p><p>Stapel die fallenden Steine so, dass volle Reihen entstehen. Mehrere Reihen auf einmal geben deutlich mehr Punkte.</p><p class="small">← → ↑ ↓ · Leertaste fallen lassen · C halten · Handy: tippen, wischen<br>Leertaste oder Klick zum Start</p>`);
  raf = requestAnimationFrame(loop);
  document.fonts?.load('10px "Press Start 2P"');

  return {
    pause,
    stop() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      msg.removeEventListener("click", onMsg);
    },
  };
}
