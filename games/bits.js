// Bits & Bugs: Sammle als Pixel-Computer alle Bits ein, weiche den Bugs aus.
// Mit einem Debugger kannst du die Bugs für kurze Zeit jagen.
// Eigenes Labyrinth im Platinen-Stil.

export const HILFE = "Pfeiltasten, WASD oder Wischen · Leertaste: Start/Pause";

// # Wand · . Bit · o Debugger · P Start · G Bug-Nest · - Nest-Ausgang · Leerzeichen = leer
const KARTE = [
  "#####################",
  "#o........#........o#",
  "#.###.###.#.###.###.#",
  "#.#.....#...#.....#.#",
  "#.#.###.#####.###.#.#",
  "#.....#.......#.....#",
  "###.#.#.##-##.#.#.###",
  "#...#...#GGG#...#...#",
  "#.###.#.#####.#.###.#",
  "#.....#...P...#.....#",
  "#.#.#####.#.#####.#.#",
  "#.#.......#.......#.#",
  "#.#.###.#####.###.#.#",
  "#...#.....#.....#...#",
  "#.###.###.#.###.###.#",
  "#o.................o#",
  "#####################",
];
export const KARTE_ROH = KARTE;

const SP = KARTE[0].length;
const ZE = KARTE.length;
const T = 24; // Kachelgröße
const W = SP * T;
const H = ZE * T;
const AUSGANG = { x: 10, y: 5 }; // hier kommen die Bugs aus dem Nest

const STUFEN = {
  leicht: { bugs: 2, tempo: 4.2, jagd: 0.45, debugger: 8, freilassen: [1.5, 6] },
  mittel: { bugs: 3, tempo: 5.0, jagd: 0.75, debugger: 6, freilassen: [1, 4, 8] },
  schwer: { bugs: 4, tempo: 5.7, jagd: 0.95, debugger: 4.5, freilassen: [0.5, 2.5, 5, 8] },
};
const SPIELER_TEMPO = 6;
const BUG_FARBEN = ["#e5566f", "#5fc39c", "#c8a2ff", "#f0a35e"];
const RICHTUNG = { hoch: { x: 0, y: -1 }, runter: { x: 0, y: 1 }, links: { x: -1, y: 0 }, rechts: { x: 1, y: 0 } };
const KEINE = { x: 0, y: 0 };

const COMPUTER = [".######.", "#......#", "#.####.#", "#.####.#", "#......#", ".######.", "...##...", ".######."];
const BUG = [".#....#.", "..#..#..", ".######.", "########", "#.####.#", "########", ".######.", "#.#..#.#"];

const wand = (x, y) => x < 0 || y < 0 || x >= SP || y >= ZE || "#-G".includes(KARTE[y][x]);

export function start({ canvas, stufe, passeCanvas, status, nachricht, ergebnis }) {
  const S = STUFEN[stufe] || STUFEN.mittel;
  const ctx = passeCanvas(canvas, W, H);

  let bits = new Set();
  let debugger_ = new Set();
  let spieler;
  let bugs = [];
  let punkte = 0;
  let leben = 3;
  let level = 1;
  let zustand = "bereit"; // bereit | laeuft | pause | tot | ende
  let gejagtBis = 0;
  let kombo = 0;
  let zeit = 0;
  let wartenBis = 0;
  let raf = 0;
  let zuletzt = 0;
  const startFeld = { x: 10, y: 9 };

  function fuelleBits() {
    bits = new Set();
    debugger_ = new Set();
    KARTE.forEach((zeile, y) =>
      [...zeile].forEach((ch, x) => {
        if (ch === ".") bits.add(y * SP + x);
        if (ch === "o") debugger_.add(y * SP + x);
      }),
    );
  }

  function aufstellen() {
    spieler = { x: startFeld.x, y: startFeld.y, dir: { ...KEINE }, wunsch: { ...KEINE } };
    bugs = Array.from({ length: S.bugs }, (_, i) => ({
      i,
      x: 9 + (i % 3),
      y: 7,
      dir: { ...KEINE },
      imNest: true,
      raus: zeit + S.freilassen[i],
      gefressenBis: 0,
    }));
    gejagtBis = 0;
  }

  function tempoFaktor() {
    return 1 + (level - 1) * 0.05;
  }

  function zeigeStatus() {
    status(`${punkte} Pkt · ${"♥".repeat(leben)}${"·".repeat(Math.max(0, 3 - leben))} · Level ${level}`);
  }

  // ---------- Bewegung auf dem Raster ----------
  function bewege(e, strecke, entscheide) {
    let sicherung = 0;
    while (strecke > 1e-6 && sicherung++ < 10) {
      const cx = Math.round(e.x);
      const cy = Math.round(e.y);
      const aufMitte = Math.abs(e.x - cx) < 1e-6 && Math.abs(e.y - cy) < 1e-6;
      let rest;
      if (aufMitte) {
        e.x = cx;
        e.y = cy;
        entscheide(e, cx, cy);
        if (!e.dir.x && !e.dir.y) return;
        if (wand(cx + e.dir.x, cy + e.dir.y)) {
          e.dir = { ...KEINE };
          return;
        }
        rest = 1;
      } else {
        const zielX = e.dir.x > 0 ? Math.floor(e.x) + 1 : e.dir.x < 0 ? Math.ceil(e.x) - 1 : e.x;
        const zielY = e.dir.y > 0 ? Math.floor(e.y) + 1 : e.dir.y < 0 ? Math.ceil(e.y) - 1 : e.y;
        rest = Math.abs(zielX - e.x) + Math.abs(zielY - e.y);
        if (rest < 1e-6) rest = 1;
      }
      const s = Math.min(strecke, rest);
      e.x += e.dir.x * s;
      e.y += e.dir.y * s;
      strecke -= s;
      if (Math.abs(e.x - Math.round(e.x)) < 1e-6) e.x = Math.round(e.x);
      if (Math.abs(e.y - Math.round(e.y)) < 1e-6) e.y = Math.round(e.y);
    }
  }

  function spielerEntscheidet(e, cx, cy) {
    if ((e.wunsch.x || e.wunsch.y) && !wand(cx + e.wunsch.x, cy + e.wunsch.y)) e.dir = { ...e.wunsch };
  }

  function bugZiel(bug) {
    const px = Math.round(spieler.x);
    const py = Math.round(spieler.y);
    if (bug.i === 1) return { x: px + spieler.dir.x * 4, y: py + spieler.dir.y * 4 }; // schneidet den Weg ab
    if (bug.i === 2) {
      const d = Math.hypot(bug.x - px, bug.y - py);
      return d > 6 ? { x: px, y: py } : { x: 1, y: ZE - 2 }; // scheu, wenn nah
    }
    return { x: px, y: py };
  }

  function bugEntscheidet(bug, cx, cy) {
    const optionen = Object.values(RICHTUNG).filter((d) => !wand(cx + d.x, cy + d.y));
    const ohneUmkehr = optionen.filter((d) => !(d.x === -bug.dir.x && d.y === -bug.dir.y));
    const wahl = ohneUmkehr.length ? ohneUmkehr : optionen;
    if (!wahl.length) return;
    const gejagt = zeit < gejagtBis;
    if (gejagt || Math.random() > S.jagd || (bug.i === 3 && Math.random() < 0.5)) {
      bug.dir = { ...wahl[Math.floor(Math.random() * wahl.length)] };
      return;
    }
    const z = bugZiel(bug);
    let beste = wahl[0];
    let besterAbstand = Infinity;
    for (const d of wahl) {
      const a = (cx + d.x - z.x) ** 2 + (cy + d.y - z.y) ** 2;
      if (a < besterAbstand) {
        besterAbstand = a;
        beste = d;
      }
    }
    bug.dir = { ...beste };
  }

  // ---------- Spielablauf ----------
  function schritt(dt) {
    zeit += dt;
    const f = tempoFaktor();

    bewege(spieler, SPIELER_TEMPO * f * dt, spielerEntscheidet);
    // sofort umdrehen ist auch zwischen zwei Feldern erlaubt
    if (spieler.wunsch.x === -spieler.dir.x && spieler.wunsch.y === -spieler.dir.y && (spieler.wunsch.x || spieler.wunsch.y)) spieler.dir = { ...spieler.wunsch };

    // einsammeln
    const k = Math.round(spieler.y) * SP + Math.round(spieler.x);
    if (bits.delete(k)) punkte += 10;
    if (debugger_.delete(k)) {
      punkte += 50;
      gejagtBis = zeit + S.debugger;
      kombo = 0;
      bugs.forEach((b) => {
        if (!b.imNest) b.dir = { x: -b.dir.x, y: -b.dir.y };
      });
    }

    const gejagt = zeit < gejagtBis;
    for (const bug of bugs) {
      if (bug.imNest) {
        if (zeit >= bug.raus) {
          bug.imNest = false;
          bug.x = AUSGANG.x;
          bug.y = AUSGANG.y;
          bug.dir = Math.random() < 0.5 ? { ...RICHTUNG.links } : { ...RICHTUNG.rechts };
        }
        continue;
      }
      const tempo = (gejagt ? 3 : S.tempo) * f;
      bewege(bug, tempo * dt, bugEntscheidet);

      if (Math.hypot(bug.x - spieler.x, bug.y - spieler.y) < 0.6) {
        if (gejagt) {
          kombo++;
          punkte += 100 * 2 ** kombo;
          bug.imNest = true;
          bug.x = 9 + (bug.i % 3);
          bug.y = 7;
          bug.raus = zeit + 3;
        } else {
          stirbt();
          return;
        }
      }
    }

    if (bits.size === 0 && debugger_.size === 0) {
      level++;
      punkte += 500;
      fuelleBits();
      zeit = 0;
      aufstellen();
      zustand = "tot";
      wartenBis = performance.now() + 1400;
      nachricht(`<p class="big">Level ${level}</p><p class="small">Die Bugs werden schneller …</p>`);
    }
    zeigeStatus();
  }

  function stirbt() {
    leben--;
    zeigeStatus();
    if (leben <= 0) {
      zustand = "ende";
      const neu = ergebnis({ punkte });
      nachricht(
        `<p class="big">Game Over</p><p>${punkte} Punkte · Level ${level}${neu ? " · neuer Highscore!" : ""}</p><p class="small">Leertaste oder Klick für ein neues Spiel</p>`,
      );
      return;
    }
    zustand = "tot";
    wartenBis = performance.now() + 1200;
    zeit = 0;
    aufstellen();
    nachricht(`<p class="big">Bug erwischt!</p><p class="small">Noch ${leben} ${leben === 1 ? "Leben" : "Leben"}</p>`);
  }

  // ---------- Zeichnen ----------
  function sprite(muster, x, y, groesse, farbe, loch) {
    const px = groesse / 8;
    muster.forEach((zeile, yy) =>
      [...zeile].forEach((ch, xx) => {
        if (ch === "#") {
          ctx.fillStyle = farbe;
          ctx.fillRect(x + xx * px, y + yy * px, px, px);
        } else if (loch) {
          ctx.fillStyle = loch;
          ctx.fillRect(x + xx * px, y + yy * px, px, px);
        }
      }),
    );
  }

  function zeichneKarte() {
    ctx.fillStyle = "#0f0e13";
    ctx.fillRect(0, 0, W, H);
    for (let y = 0; y < ZE; y++)
      for (let x = 0; x < SP; x++) {
        const ch = KARTE[y][x];
        const px = x * T;
        const py = y * T;
        if (ch === "#") {
          ctx.fillStyle = "#1d1a28";
          ctx.fillRect(px, py, T, T);
          // Leiterbahn-Kanten zu den Gängen
          ctx.fillStyle = "#4a4166";
          if (y > 0 && !wand(x, y - 1)) ctx.fillRect(px, py, T, 2);
          if (y < ZE - 1 && !wand(x, y + 1)) ctx.fillRect(px, py + T - 2, T, 2);
          if (x > 0 && !wand(x - 1, y)) ctx.fillRect(px, py, 2, T);
          if (x < SP - 1 && !wand(x + 1, y)) ctx.fillRect(px + T - 2, py, 2, T);
        } else if (ch === "G") {
          ctx.fillStyle = "#16141d";
          ctx.fillRect(px, py, T, T);
        } else if (ch === "-") {
          ctx.fillStyle = "#16141d";
          ctx.fillRect(px, py, T, T);
          ctx.fillStyle = "#c8a2ff";
          ctx.fillRect(px + 2, py + T / 2 - 1, T - 4, 2);
        }
      }
    // Lötpunkte auf den Wandecken für den Platinen-Look
    ctx.fillStyle = "#3a3550";
    for (let y = 1; y < ZE - 1; y++)
      for (let x = 1; x < SP - 1; x++)
        if (KARTE[y][x] === "#" && wand(x + 1, y) + wand(x - 1, y) + wand(x, y + 1) + wand(x, y - 1) <= 1) ctx.fillRect(x * T + T / 2 - 3, y * T + T / 2 - 3, 6, 6);
  }

  function zeichne(t) {
    zeichneKarte();
    ctx.fillStyle = "#9a9ca2";
    for (const k of bits) ctx.fillRect((k % SP) * T + T / 2 - 2, Math.floor(k / SP) * T + T / 2 - 2, 4, 4);
    const blink = Math.floor(t / 250) % 2;
    for (const k of debugger_) {
      const x = (k % SP) * T + T / 2;
      const y = Math.floor(k / SP) * T + T / 2;
      ctx.fillStyle = blink ? "#f5d97a" : "#a8923e";
      ctx.fillRect(x - 6, y - 6, 12, 12);
      ctx.fillStyle = "#0f0e13";
      ctx.fillRect(x - 3, y - 3, 6, 6);
    }

    const gejagt = zeit < gejagtBis;
    const bald = gejagt && gejagtBis - zeit < 1.5 && blink;
    for (const bug of bugs) {
      const farbe = gejagt ? (bald ? "#f2f2f3" : "#4a4166") : BUG_FARBEN[bug.i];
      sprite(BUG, bug.x * T + 4, bug.y * T + 4, 16, farbe, null);
    }

    if (spieler) {
      const x = spieler.x * T + 3;
      const y = spieler.y * T + 3;
      sprite(COMPUTER, x, y, 18, "#f2f2f3", null);
      ctx.fillStyle = "#f5d97a";
      ctx.fillRect(x + 2 * 2.25, y + 2 * 2.25, 4 * 2.25, 2 * 2.25);
    }
  }

  function loop(t) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (t - (zuletzt || t)) / 1000);
    zuletzt = t;
    if (zustand === "tot" && performance.now() >= wartenBis) {
      zustand = "laeuft";
      nachricht(null);
    }
    if (zustand === "laeuft") schritt(dt);
    zeichne(t);
  }

  function neuesSpiel() {
    punkte = 0;
    leben = 3;
    level = 1;
    zeit = 0;
    fuelleBits();
    aufstellen();
    zeigeStatus();
  }

  function los() {
    if (zustand === "bereit" || zustand === "pause") {
      zustand = "laeuft";
      nachricht(null);
    } else if (zustand === "ende") {
      neuesSpiel();
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
  const TASTEN = {
    ArrowUp: "hoch", w: "hoch", W: "hoch",
    ArrowDown: "runter", s: "runter", S: "runter",
    ArrowLeft: "links", a: "links", A: "links",
    ArrowRight: "rechts", d: "rechts", D: "rechts",
  };
  const onKey = (e) => {
    if (TASTEN[e.key]) {
      e.preventDefault();
      spieler.wunsch = { ...RICHTUNG[TASTEN[e.key]] };
      if (zustand === "bereit") los();
    } else if (e.key === " ") {
      e.preventDefault();
      zustand === "laeuft" ? pause() : los();
    }
  };
  let wischStart = null;
  const onDown = (e) => {
    wischStart = { x: e.clientX, y: e.clientY };
    if (zustand !== "laeuft" && zustand !== "tot") los();
  };
  const onMove = (e) => {
    if (!wischStart) return;
    const dx = e.clientX - wischStart.x;
    const dy = e.clientY - wischStart.y;
    if (Math.hypot(dx, dy) < 18) return;
    spieler.wunsch = Math.abs(dx) > Math.abs(dy) ? { ...RICHTUNG[dx > 0 ? "rechts" : "links"] } : { ...RICHTUNG[dy > 0 ? "runter" : "hoch"] };
    wischStart = { x: e.clientX, y: e.clientY };
  };
  const onUp = () => (wischStart = null);
  const msg = document.getElementById("stage-msg");
  const onMsg = () => (zustand === "laeuft" || zustand === "tot" ? null : los());

  window.addEventListener("keydown", onKey);
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  canvas.style.touchAction = "none";
  msg.addEventListener("click", onMsg);

  neuesSpiel();
  nachricht(`<p class="big">Bits &amp; Bugs</p><p>Sammle alle Bits. Ein Debugger (gelb) macht die Bugs kurz jagdbar.</p><p class="small">Pfeiltaste, Wischen oder Klick zum Start</p>`);
  raf = requestAnimationFrame(loop);

  return {
    pause,
    stop() {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      msg.removeEventListener("click", onMsg);
    },
  };
}
