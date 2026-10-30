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

  let feld, stein, naechste, beutel, halten, gehalten, punkte, reihen, level, zustand, raf, zuletzt, fallAkku, lockZeit, lockResets, blitz, aufloesung, teilchen, popups, wackeln;

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
    aufloesung = null;
    teilchen = [];
    popups = [];
    wackeln = 0;
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
    stein = null;
    if (volle.length) {
      // Reihen erst auflösen lassen (Effekt), danach entfernen
      aufloesung = { reihen: volle, t: 0, dauer: 0.5 };
      sprenge(volle);
      zeigeStatus();
      return;
    }
    zeigeStatus();
    neuerStein();
  }
  // Effekt „Datenzerfall“: Die Reihe blitzt auf, zerfällt von der Mitte aus in Pixel
  // und Nullen/Einsen, die nach oben wegfliegen. Mehr Reihen = mehr Wumms.
  const NAMEN_REIHEN = ["", "REIHE!", "DOPPEL!", "TRIPEL!", "VIERER!"];
  function sprenge(volle) {
    const n = volle.length;
    for (const y of volle)
      for (let x = 0; x < SP; x++) {
        const farbe = FARBEN[feld[y][x]];
        const mx = BX + x * Z + Z / 2;
        const my = BY + y * Z + Z / 2;
        const verzoegerung = Math.abs(x - (SP - 1) / 2) * 0.03;
        for (let k = 0; k < 3 + n; k++)
          teilchen.push({ x: mx, y: my, vx: (x - (SP - 1) / 2) * 30 + (Math.random() - 0.5) * 260, vy: -80 - Math.random() * 260 * (0.6 + n * 0.25), t: 0.9 + Math.random() * 0.5, warte: 0.12 + verzoegerung, farbe, gr: 3 + Math.random() * 3 });
        if (Math.random() < 0.5 + n * 0.1) teilchen.push({ x: mx, y: my, vx: (Math.random() - 0.5) * 60, vy: -60 - Math.random() * 80, t: 1.2, warte: 0.12 + verzoegerung, farbe: "#7fe0b0", text: Math.random() < 0.5 ? "0" : "1" });
      }
    const mitte = volle.reduce((a, b) => a + b, 0) / n;
    const plus = PUNKTE_REIHEN[n] * level;
    popups.push({ text: NAMEN_REIHEN[n], unter: `+${plus}`, x: BX + (SP * Z) / 2, y: BY + mitte * Z + Z / 2, t: 0, dauer: 1.2, farbe: n === 4 ? "#f5d97a" : "#f4f1f8", gross: n === 4 });
    wackeln = n >= 4 ? 0.35 : n === 3 ? 0.18 : 0;
  }
  function aufloesungFertig() {
    const volle = aufloesung.reihen;
    aufloesung = null;
    for (const i of volle) {
      feld.splice(i, 1);
      feld.unshift(Array(SP).fill(null));
    }
    reihen += volle.length;
    punkte += PUNKTE_REIHEN[volle.length] * level;
    const neuLevel = (STARTLEVEL[stufe] || 4) + Math.floor(reihen / 10);
    if (neuLevel > level) {
      level = neuLevel;
      popups.push({ text: `LEVEL ${level}`, unter: "schneller!", x: BX + (SP * Z) / 2, y: BY + ZE * Z * 0.3, t: 0, dauer: 1.4, farbe: "#b48ef0" });
    }
    zeigeStatus();
    neuerStein();
  }
  function effekteSchritt(dt) {
    for (const p of teilchen) {
      if (p.warte > 0) {
        p.warte -= dt;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (p.text ? 40 : 700) * dt;
      p.t -= dt;
    }
    teilchen = teilchen.filter((p) => p.t > 0 && p.y < H + 20);
    for (const p of popups) p.t += dt;
    popups = popups.filter((p) => p.t < p.dauer);
    if (wackeln > 0) wackeln -= dt;
    if (aufloesung && (aufloesung.t += dt) >= aufloesung.dauer) aufloesungFertig();
  }
  function schritt(dt) {
    effekteSchritt(dt);
    if (!stein) return;
    const weich = tasten.runter;
    fallAkku += dt;
    // gedrückt halten: zügig nach unten, aber sichtbar Reihe für Reihe (ca. 12 Reihen pro Sekunde)
    const takt = weich ? Math.min(0.085, fallZeit()) : fallZeit();
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
    ctx.save();
    if (wackeln > 0) ctx.translate((Math.random() - 0.5) * 14 * wackeln, (Math.random() - 0.5) * 14 * wackeln);
    for (let y = 0; y < ZE; y++) {
      const loest = aufloesung?.reihen.includes(y);
      for (let x = 0; x < SP; x++) {
        if (!feld[y][x]) continue;
        if (!loest) {
          kaestchen(BX + x * Z, BY + y * Z, FARBEN[feld[y][x]]);
          continue;
        }
        // Auflösung: erst weiß aufblitzen, dann von der Mitte nach außen zusammenschrumpfen
        const t = aufloesung.t;
        const start = 0.12 + Math.abs(x - (SP - 1) / 2) * 0.03;
        const k = Math.max(0, Math.min(1, (t - start) / 0.16));
        if (k >= 1) continue;
        const g = (Z - 2) * (1 - k);
        const cx = BX + x * Z + Z / 2;
        const cy = BY + y * Z + Z / 2;
        ctx.fillStyle = t < 0.12 ? "#ffffff" : FARBEN[feld[y][x]];
        ctx.fillRect(cx - g / 2, cy - g / 2, g, g);
      }
      if (loest && aufloesung.t < 0.3) {
        // Lichtstreifen über die ganze Reihe
        const a = 1 - aufloesung.t / 0.3;
        ctx.fillStyle = `rgba(255,255,255,${0.55 * a})`;
        ctx.fillRect(BX - 6, BY + y * Z + Z / 2 - 3 - a * 8, SP * Z + 12, 6 + a * 16);
      }
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
    // Teilchen und Einblendungen
    for (const p of teilchen) {
      if (p.warte > 0) continue;
      ctx.globalAlpha = Math.min(1, p.t * 1.6);
      ctx.fillStyle = p.farbe;
      if (p.text) {
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.textAlign = "center";
        ctx.fillText(p.text, p.x, p.y);
      } else ctx.fillRect(p.x - p.gr / 2, p.y - p.gr / 2, p.gr, p.gr);
    }
    ctx.globalAlpha = 1;
    for (const p of popups) {
      const k = p.t / p.dauer;
      const rein = Math.min(1, p.t / 0.15);
      const skala = (p.gross ? 1.3 : 1) * (0.6 + 0.4 * rein + (p.gross ? Math.sin(p.t * 18) * 0.05 * (1 - k) : 0));
      ctx.save();
      ctx.translate(p.x, p.y - k * 30);
      ctx.scale(skala, skala);
      ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      ctx.textAlign = "center";
      ctx.font = '16px "Press Start 2P", monospace';
      ctx.lineWidth = 5;
      ctx.strokeStyle = "#0f0e13";
      ctx.strokeText(p.text, 0, 0);
      ctx.fillStyle = p.farbe;
      ctx.fillText(p.text, 0, 0);
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.strokeText(p.unter, 0, 20);
      ctx.fillStyle = "#7fe0b0";
      ctx.fillText(p.unter, 0, 20);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
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
