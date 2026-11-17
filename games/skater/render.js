// Stick-Skater – Rendering: Kamera, Parallax-Hintergründe, Strecke, Hindernisse, Figur, Effekte
// (Speedlines, Funken, Comic-Schriftzüge, Glitch, RGB-Split), Parallelwelt-Stile mit Papier-Riss-Übergang
// und das HUD im Comic-Look. Zeichnet in logischen Pixeln (Höhe ≈ 540), skaliert auf die echte Auflösung.
import { flaecheY, grindY, presseUnten, PRESSE_HUB, zufall } from "./strecke.js";
import { TRICKS, zugX, hindBox, aufgabeStand, aufgabeErfuellt } from "./logik.js";
import { palette, malEbene, muster, TILE_W, TILE_H, STIL_NAME, glitchCacheLeeren } from "./welten.js";
import { poseAus, zeichneFigur, zeichneRagdoll } from "./figur.js";

export const BILDER = 18; // Animationsbilder pro Sekunde für Figur und Tuschelinien
const FONT = "Bangers, 'Comic Sans MS', Impact, sans-serif";
const RUFE_COMBO = ["", "", "NICE!", "SICK!", "RAD!", "WOW!", "MEGA!", "IRRE!", "LEGENDÄR!"];
const GLITCH_FILTER = { noir: "grayscale(1) contrast(1.6) brightness(0.75)", manga: "grayscale(1) contrast(1.3) brightness(1.6)", zine: "sepia(0.7) contrast(1.3) brightness(1.15)", pixel: "saturate(1.8) contrast(1.2)" };

export function erstelleRenderer(canvas, einst) {
  const ctx = canvas.getContext("2d", { alpha: false });
  const grob = matchMedia("(pointer: coarse)").matches;
  const r = {
    canvas,
    ctx,
    W: 960,
    H: 540,
    k: 1,
    kam: { x: 0, y: 0 },
    tiles: new Map(),
    teile: [],
    popups: [],
    shake: 0,
    glitchT: 0,
    uebergang: null,
    flackerT: 0,
    flackerNaechste: 6,
    strobo: 0,
    box: null,
    zeit: 0,
    frame: 0,
    welt: -1,
    tonEv: [],
    hud: true,
    hochkant: false,
    presseZustand: new Map(),
    sliceT: 0,
    randRechts: 0,
    einst,
  };
  const tmp = document.createElement("canvas");
  const tmp2 = document.createElement("canvas");
  const snap = document.createElement("canvas");
  const klein = document.createElement("canvas");
  const effekt = () => r.einst.effektStaerke ?? 1;
  const ruhig = () => !!r.einst.blitzeReduziert;

  // ---------- Größe ----------
  r.groesse = function () {
    const box = canvas.getBoundingClientRect();
    const cw = Math.max(1, box.width);
    const ch = Math.max(1, box.height);
    const asp = cw / ch;
    r.W = Math.max(600, Math.min(1280, 540 * asp));
    r.H = r.W / asp;
    r.hochkant = asp < 1;
    const dpr = Math.min(window.devicePixelRatio || 1, grob ? 1.5 : 2);
    const pw = Math.round(cw * dpr);
    const ph = Math.round(ch * dpr);
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw;
      canvas.height = ph;
      for (const c of [tmp, tmp2, snap]) {
        c.width = pw;
        c.height = ph;
      }
    }
    // rechts oben liegt im Querformat-Vollbild das ✕ der Seite
    r.randRechts = canvas.closest(".stage.vollbild") && asp > 1 ? (110 * r.W) / cw : 0;
    const neuK = pw / r.W;
    if (Math.abs(neuK - r.k) > 0.2) r.tiles.clear();
    r.k = neuK;
  };

  // ---------- Hintergrund-Kacheln ----------
  function tile(welt, stil, ebene) {
    const key = `${welt}|${stil || ""}|${ebene}`;
    let t = r.tiles.get(key);
    if (!t) {
      const sk = Math.min(1.25, r.k);
      if (welt === 5 && stil) {
        // Glitch-Welt: die normale Collage mit Stil-Filter
        const basis = tile(5, null, ebene);
        t = document.createElement("canvas");
        t.width = basis.width;
        t.height = basis.height;
        const g = t.getContext("2d");
        g.filter = GLITCH_FILTER[stil];
        g.drawImage(basis, 0, 0);
        g.filter = "none";
        if (stil === "noir" || stil === "manga") {
          g.globalCompositeOperation = "source-atop";
          g.globalAlpha = 0.4;
          g.fillStyle = muster(g, stil === "noir" ? "kreuz" : "punkte", "#000", 8);
          g.fillRect(0, 0, t.width, t.height);
        }
      } else t = malEbene(welt, stil, ebene, sk);
      r.tiles.set(key, t);
    }
    return t;
  }
  r.vorbereiten = function (welt, stile = []) {
    if (welt !== r.welt) {
      r.tiles.clear();
      glitchCacheLeeren();
      r.welt = welt;
    }
    for (const e of ["fern", "mitte"]) {
      tile(welt, null, e);
      for (const st of stile) tile(welt, st, e);
    }
  };

  // ---------- Effekte von außen ----------
  r.erzaehl = (text, dauer = 3.2) => {
    r.box = { text, t: 0, dauer };
  };
  r.zuruecksetzen = () => {
    r.teile = [];
    r.popups = [];
    r.uebergang = null;
    r.glitchT = 0;
    r.shake = 0;
    r.kam.init = false;
  };
  function popup(text, x, y, o = {}) {
    r.popups.push({ text, x, y, t: 0, dauer: o.dauer || 0.9, farbe: o.farbe || "#ffe600", groesse: o.groesse || 34, rot: o.rot ?? (Math.random() - 0.5) * 0.3 - 0.08, welt: o.welt !== false, steig: o.steig ?? 50 });
  }
  function teil(typ, x, y, vx, vy, leben, farbe, gr = 3) {
    if (r.teile.length > 260) return;
    r.teile.push({ typ, x, y, vx, vy, t: 0, leben, farbe, gr });
  }
  function schnappschuss() {
    const g = snap.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(canvas, 0, 0);
  }

  // Ereignisse aus der Logik in Bilder übersetzen
  r.ereignisse = function (s, liste) {
    const P = palette(s.welt, s.par?.stil, s.t);
    for (const e of liste) {
      switch (e.typ) {
        case "ollie":
          for (let i = 0; i < 5; i++) teil("staub", e.x - 10 + Math.random() * 20, e.y - 2, -60 - Math.random() * 80, -20 - Math.random() * 40, 0.4, P.papier, 4);
          break;
        case "land":
          for (let i = 0; i < 7; i++) teil("tinte", e.x + (Math.random() - 0.5) * 30, e.y - 2, (Math.random() - 0.5) * 220, -60 - Math.random() * 120, 0.45, P.tinte, 3);
          if (e.hart) r.shake = Math.max(r.shake, 4);
          break;
        case "trick":
          popup(TRICKS[e.art].ruf, e.x + 10, e.y - 90, { farbe: [P.a1, P.a2, "#ffe600"][Math.floor(Math.random() * 3)], groesse: 36 });
          break;
        case "grind":
          popup("GRIND!", e.x, e.y - 80, { farbe: P.a2 === "#7a7a7a" ? "#fff" : P.a2, groesse: 34 });
          break;
        case "combo":
          if (e.n >= 2) popup(`${RUFE_COMBO[Math.min(8, e.n)]} +${e.gewinn.toLocaleString("de-DE")}`, e.x + 30, e.y - 120, { farbe: "#ffe600", groesse: 30 + Math.min(20, e.n * 3), dauer: 1.2 });
          else popup(`+${e.gewinn}`, e.x + 20, e.y - 100, { farbe: "#fff", groesse: 24 });
          break;
        case "tropfen":
          for (let i = 0; i < 4; i++) teil("funke", e.x, e.y, (Math.random() - 0.5) * 160, (Math.random() - 0.5) * 160, 0.3, e.bonus ? "#ffe600" : P.a2, 2.5);
          break;
        case "riss":
          schnappschuss();
          r.uebergang = { t: 0, dauer: 0.8, rein: true };
          r.shake = Math.max(r.shake, 10);
          popup(`${STIL_NAME[e.stil]}!`, r.W / 2, r.H * 0.3, { welt: false, groesse: 64, farbe: "#fff", dauer: 1.3, rot: -0.1, steig: 10 });
          break;
        case "zurueck":
          schnappschuss();
          r.uebergang = { t: 0, dauer: 0.7, rein: false };
          r.shake = Math.max(r.shake, 6);
          break;
        case "sturz":
          r.glitchT = 0.4;
          r.shake = Math.max(r.shake, 12);
          popup("OUCH!", e.x, e.y - 90, { farbe: "#ff3b3b", groesse: 58, dauer: 1.3, rot: -0.15 });
          for (let i = 0; i < 9; i++) teil("stern", e.x, e.y - 40, (Math.random() - 0.5) * 300, -100 - Math.random() * 250, 0.9, i % 2 ? "#ffe600" : P.papier, 6);
          break;
        case "knack":
          popup("KRACK!", e.x + 30, e.y - 40, { farbe: P.papier, groesse: 26, dauer: 0.6 });
          break;
        case "ziel":
          popup("ZIEL!", e.x + 80, e.y - 120, { farbe: "#ffe600", groesse: 70, dauer: 2, rot: -0.12 });
          for (let i = 0; i < 40; i++) teil("konfetti", e.x + 100 + Math.random() * 200, e.y - 300 - Math.random() * 100, (Math.random() - 0.5) * 200, Math.random() * 100, 2.5, [P.a1, P.a2, "#ffe600", P.papier][i % 4], 5);
          break;
        case "wiederAuf":
          popup("WEITER!", e.x ?? s.p.x, s.p.y - 100, { farbe: P.papier, groesse: 30 });
          break;
        default:
      }
    }
  };

  // ---------- Hauptbild ----------
  r.zeichne = function (s, dt, opt = {}) {
    r.zeit += dt;
    const q = Math.floor(r.zeit * BILDER);
    const neuerFrame = q !== r.frame;
    r.frame = q;
    const g = ctx;
    const W = r.W;
    const H = r.H;
    const stil = s.par?.stil || null;
    const P = palette(s.welt, stil, s.t);
    const p = s.p;

    // Kamera
    let ziel = p;
    if (p.zustand === "sturz" && p.ragdoll) ziel = { x: p.ragdoll.pts.huefte.x, y: Math.min(p.ragdoll.pts.huefte.y + 30, s.tiefster + 60) };
    const bodenRef = p.zustand === "luft" ? s.tiefster : ziel.y;
    const zielY = Math.min(bodenRef - H * (r.hochkant ? 0.6 : 0.7), ziel.y - 210);
    const zielX = ziel.x - W * (r.hochkant ? 0.3 : 0.28);
    if (!r.kam.init) {
      r.kam.x = zielX;
      r.kam.y = zielY;
      r.kam.init = true;
    }
    r.kam.x += (zielX - r.kam.x) * Math.min(1, dt * (p.zustand === "sturz" ? 3 : 12));
    r.kam.y += (zielY - r.kam.y) * Math.min(1, dt * (zielY < r.kam.y - 4 ? 9 : 4));
    r.shake = Math.max(0, r.shake - dt * 30);
    if (s.par && s.par.dauer - s.par.t < 2) r.shake = Math.max(r.shake, (2 - (s.par.dauer - s.par.t)) * 3.5);
    const st = effekt();
    const sh = r.shake * st;
    const sx = neuerFrame || !r._sx ? (r._sx = [(Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh]) : r._sx;
    const kx = r.kam.x + sx[0];
    const ky = r.kam.y + sx[1];

    g.setTransform(r.k, 0, 0, r.k, 0, 0);
    g.imageSmoothingEnabled = true;

    // Himmel
    const hg = g.createLinearGradient(0, 0, 0, H);
    hg.addColorStop(0, P.himmel[0]);
    hg.addColorStop(0.55, P.himmel[1]);
    hg.addColorStop(1, P.himmel[2]);
    g.fillStyle = hg;
    g.fillRect(0, 0, W, H);

    // Parallax-Ebenen
    const basisY = s.tiefster - ky; // Bodenhöhe auf dem Bildschirm
    const fernY = (basisY - 470) * 0.35 + (H - 540) * 0.2 + 30;
    ebene(tile(s.welt, stil, "fern"), kx * 0.12, fernY);
    // Flackern: kurz blitzt eine Parallelwelt im Hintergrund auf
    r.flackerT -= dt;
    if (!s.par && opt.flackern !== false) {
      r.flackerNaechste -= dt;
      if (r.flackerNaechste <= 0) {
        r.flackerNaechste = 6 + Math.random() * 8;
        r.flackerT = ruhig() ? 0.22 : 0.12;
        r.flackerStil = ["noir", "manga", "zine", "pixel"][Math.floor(Math.random() * 4)];
        r.tonEv.push("flacker");
      }
      if (r.flackerT > 0 && r.tiles.has(`${s.welt}|${r.flackerStil}|fern`)) {
        g.save();
        g.globalAlpha = (ruhig() ? 0.25 : 0.7) * st;
        const jit = ruhig() ? 0 : (Math.random() - 0.5) * 20 * st;
        ebene(tile(s.welt, r.flackerStil, "fern"), kx * 0.12 + jit, fernY);
        g.restore();
      }
    }
    const mitteY = (basisY - 500) * 0.6 + (H - 540) * 0.35 + 40;
    ebene(tile(s.welt, stil, "mitte"), kx * 0.38, mitteY);
    hintergrundLeben(g, s, P, kx, ky, dt);

    // Welt
    g.save();
    g.translate(-kx, -ky);
    zeichneGruben(g, s, P, kx, ky);
    zeichneSchwer(g, s, P, kx);
    zeichneZuege(g, s, P, kx);
    zeichneBoden(g, s, P, kx, ky);
    zeichneGrinds(g, s, P, kx, ky);
    zeichneHindernisse(g, s, P, kx);
    zeichnePressen(g, s, P, kx, ky);
    zeichneZiel(g, s, P);
    zeichneTropfen(g, s, P, kx);
    zeichneRisse(g, s, P, kx);
    // Figur
    // Figur etwas größer als die Kollisionsbox, damit man Brett und Tricks gut sieht
    const figOpt = { P, kostuem: opt.kostuem, board: opt.board, frame: r.frame, zeit: r.zeit, groesse: 1.15 };
    if (p.zustand === "sturz" && p.ragdoll) {
      const h = p.ragdoll.pts.huefte;
      g.save();
      g.translate(h.x, h.y);
      g.scale(1.15, 1.15);
      g.translate(-h.x, -h.y);
      zeichneRagdoll(g, p.ragdoll, figOpt);
      g.restore();
    }
    else if (!(p.unverw > 0 && Math.floor(r.zeit * 14) % 2 === 0)) {
      // Pose nur 18× pro Sekunde neu: leicht ruckeliger Comic-Look, Kamera bleibt flüssig
      if (neuerFrame || !r.pose) r.pose = poseAus(s, r.frame / BILDER);
      zeichneBewegung(g, s, P);
      if (opt.kostuem === "glitch") glitchFigur(g, p, r.pose, figOpt);
      zeichneFigur(g, p.x, p.y, r.pose, figOpt);
      if (p.zustand === "grind") funken(s, P);
    }
    // Fabrik: Funkenregen von der Decke
    if (s.welt === 2 && dt > 0 && Math.random() < 0.35) teil("funke", kx + Math.random() * W, ky - 10, (Math.random() - 0.5) * 60, 120 + Math.random() * 160, 1.1, Math.random() < 0.5 ? "#ffd31a" : "#ff8a1f", 2.5);
    zeichneTeile(g, P, dt);
    zeichnePopups(g, dt, true);
    g.restore();

    // Stil-Überlagerungen
    overlays(g, s, P, stil, dt);
    if (s.welt === 3 && !stil) strobo(g, dt);
    if (stil === "pixel") pixeln();
    if (s.welt === 5) glitchSlices(dt);
    if (r.glitchT > 0) {
      r.glitchT -= dt;
      rgbSplit(Math.round(10 * st * (r.glitchT / 0.4) * r.k));
    }
    if (r.uebergang) uebergang(dt);
    g.setTransform(r.k, 0, 0, r.k, 0, 0);
    zeichnePopups(g, dt, false);
    if (r.hud && opt.hud !== false) hud(g, s, P, opt);
    if (r.box) erzaehlBox(g, dt);
  };

  function ebene(t, versatz, y) {
    const g = ctx;
    const w = TILE_W;
    let x0 = -((versatz % w) + w) % w;
    for (let x = x0; x < r.W; x += w) g.drawImage(t, x, y, w, TILE_H);
    // nach unten auffüllen (Hochformat)
    if (y + TILE_H < r.H) {
      g.fillStyle = "rgba(0,0,0,0.35)";
      g.fillRect(0, y + TILE_H, r.W, r.H - y - TILE_H);
    }
  }

  // Kleine Lebewesen und Dinge im Hintergrund (Ratten, Vögel, ein vorbeifahrender Zug)
  function hintergrundLeben(g, s, P, kx, ky, dt) {
    r.hl = r.hl || { x: -200, t: 3 };
    const h = r.hl;
    h.t -= dt;
    if (h.t <= 0 && h.x < -150) {
      h.x = r.W + 100;
      h.t = 4 + Math.random() * 6;
      h.y = s.tiefster - ky - 20 - Math.random() * 30;
    }
    if (h.x > -150) {
      const speed = s.welt === 3 ? 900 : s.welt === 4 ? 160 : 260;
      h.x -= speed * dt;
      g.save();
      g.globalAlpha = 0.75;
      g.fillStyle = P.tinte;
      if (s.welt === 1 || s.welt === 5) {
        // Ratte huscht vorbei
        const b = Math.floor(r.zeit * 12) % 2;
        g.beginPath();
        g.ellipse(h.x, h.y + 6, 14, 6, 0, 0, 7);
        g.fill();
        g.beginPath();
        g.arc(h.x - 13, h.y + 3, 5, 0, 7);
        g.fill();
        g.strokeStyle = P.tinte;
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(h.x + 13, h.y + 6);
        g.quadraticCurveTo(h.x + 26, h.y - 2 + b * 4, h.x + 34, h.y + 4);
        g.stroke();
        g.fillStyle = P.a1;
        g.fillRect(h.x - 16, h.y + 1, 2, 2);
      } else if (s.welt === 4) {
        // Vögel
        g.strokeStyle = P.tinte;
        g.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          const bx = h.x + i * 26;
          const by = h.y - 200 + i * 8;
          const f = Math.floor(r.zeit * 12 + i) % 2 ? 5 : -3;
          g.beginPath();
          g.moveTo(bx - 8, by + f);
          g.lineTo(bx, by);
          g.lineTo(bx + 8, by + f);
          g.stroke();
        }
      } else if (s.welt === 3) {
        // Zug im Hintergrund
        g.globalAlpha = 0.5;
        g.fillStyle = P.wand;
        g.fillRect(h.x, h.y - 70, 600, 60);
        g.fillStyle = P.licht;
        for (let wx = h.x + 20; wx < h.x + 580; wx += 50) g.fillRect(wx, h.y - 60, 30, 18);
      } else if (s.welt === 2) {
        g.fillStyle = P.a3;
        for (let i = 0; i < 4; i++) g.fillRect(h.x + i * 30, h.y - 160 + Math.sin(r.zeit * 10 + i) * 8, 3, 3);
      }
      g.restore();
    }
  }

  // ---------- Strecke ----------
  const sichtbar = (x0, x1, kx) => x1 > kx - 80 && x0 < kx + r.W + 80;
  function bodenYbei(st, x) {
    let best = null;
    for (const b of st.boden) {
      if (b.x0 > x) break;
      if (x <= b.x1) {
        const y = flaecheY(b, x);
        if (best == null || y < best) best = y;
      }
    }
    return best;
  }

  function zeichneGruben(g, s, P, kx, ky) {
    const st = s.st;
    const unten = ky + r.H + 40;
    let vor = null;
    for (const b of st.boden) {
      if (b.x1 < kx - 300) {
        vor = b;
        continue;
      }
      if (b.x0 > kx + r.W + 300) break;
      if (vor && b.x0 > vor.x1 + 1) {
        const x0 = vor.x1;
        const x1 = b.x0;
        const y = Math.max(vor.y, b.y);
        grube(g, s, P, x0, x1, y, unten);
      }
      vor = b;
    }
  }
  function grube(g, s, P, x0, x1, y, unten) {
    const w = x1 - x0;
    switch (s.welt) {
      case 1: {
        // giftgrün leuchtendes Wasser
        const wy = y + 70;
        const gl = g.createLinearGradient(0, wy - 60, 0, wy + 40);
        gl.addColorStop(0, "rgba(0,0,0,0)");
        gl.addColorStop(1, P.grube);
        g.globalAlpha = 0.35;
        g.fillStyle = gl;
        g.fillRect(x0, wy - 60, w, 100);
        g.globalAlpha = 1;
        g.fillStyle = P.grube;
        g.beginPath();
        g.moveTo(x0, unten);
        for (let x = x0; x <= x1; x += 12) g.lineTo(x, wy + Math.sin(x * 0.05 + r.zeit * 4) * 3);
        g.lineTo(x1, unten);
        g.fill();
        g.globalAlpha = 0.5;
        g.fillStyle = muster(g, "grobpunkte", "#003b1a", 7, r.k);
        g.fillRect(x0, wy + 4, w, unten - wy);
        g.globalAlpha = 1;
        break;
      }
      case 2: {
        const gl = g.createLinearGradient(0, y + 40, 0, y + 240);
        gl.addColorStop(0, "rgba(0,0,0,0)");
        gl.addColorStop(1, P.grube);
        g.fillStyle = gl;
        g.fillRect(x0, y + 40, w, unten - y);
        break;
      }
      case 3: {
        // Gleise
        g.fillStyle = P.grube;
        g.fillRect(x0, y + 10, w, unten - y);
        g.strokeStyle = P.a3;
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(x0, y + 74);
        g.lineTo(x1, y + 74);
        g.stroke();
        g.fillStyle = "#3a2a1a";
        for (let x = x0 + 10; x < x1; x += 34) g.fillRect(x, y + 76, 18, 6);
        break;
      }
      case 4:
        // tief unten die Straße
        g.fillStyle = "rgba(20,10,30,0.55)";
        g.fillRect(x0, y + 120, w, unten - y);
        g.fillStyle = P.licht;
        for (let x = x0 + 14; x < x1; x += 40) g.fillRect(x, y + 230 + ((x * 7) % 30), 3, 3);
        break;
      default:
        g.fillStyle = P.grube;
        g.globalAlpha = 0.85;
        g.fillRect(x0, y + 30, w, unten - y);
        g.globalAlpha = 1;
    }
  }

  function zeichneBoden(g, s, P, kx, ky) {
    const st = s.st;
    const unten = ky + r.H + 40;
    const rnd = zufall(r.frame);
    for (const b of st.boden) {
      if (b.x1 < kx - 80) continue;
      if (b.x0 > kx + r.W + 80) break;
      const dy = b.dy || 0;
      const y = b.y + dy;
      const x0 = Math.max(b.x0, kx - 80);
      const x1 = Math.min(b.x1, kx + r.W + 80);
      if (b.art === "treppe") {
        treppe(g, b, P, unten, rnd);
        continue;
      }
      const w = x1 - x0;
      // Block
      g.fillStyle = b.art === "dach" ? P.mitte : P.wand;
      g.fillRect(x0, y, w, unten - y);
      // Oberfläche
      g.fillStyle = P.boden;
      g.fillRect(x0, y, w, b.art === "dach" ? 10 : 16);
      if (b.art === "dach") {
        // Fassade mit Fenstern
        g.fillStyle = P.licht;
        for (let fx = Math.floor(b.x0 / 1) + 24; fx < b.x1 - 20; fx += 46) {
          if (fx < x0 - 40 || fx > x1) continue;
          for (let fy = y + 40; fy < unten; fy += 56) {
            const an = ((fx * 13 + fy * 7) % 10) < 4;
            g.globalAlpha = an ? 0.8 : 0.18;
            g.fillRect(fx, fy, 18, 26);
          }
        }
        g.globalAlpha = 1;
        g.fillStyle = P.wand;
        g.fillRect(x0, y - 8, w, 8);
      }
      // Halftone + Schraffur als Schatten
      g.globalAlpha = 0.28;
      g.fillStyle = muster(g, "punkte", P.tinte, 8, r.k);
      g.fillRect(x0, y + 16, w, unten - y);
      g.globalAlpha = 0.45;
      g.fillStyle = muster(g, "schraffur", P.tinte, 7, r.k);
      if (b.x0 >= x0) g.fillRect(b.x0, y + 16, 26, unten - y);
      g.fillRect(x0, y + 120, w, unten - y);
      g.globalAlpha = 1;
      // Kantenstreifen
      g.fillStyle = P.kante;
      g.fillRect(x0, y + (b.art === "dach" ? -8 : 0), w, 3.5);
      if (b.art === "band") laufband(g, b, P, y, x0, x1);
      if (b.art === "panel") panel(g, b, P, y, unten);
      if (s.welt === 3 && b.art === "boden") {
        // Bahnsteigkante mit Riffelstreifen
        g.fillStyle = P.kante;
        g.globalAlpha = 0.85;
        g.fillRect(x0, y + 4, w, 6);
        g.globalAlpha = 1;
      }
      if (s.welt === 1) {
        g.fillStyle = P.a1;
        for (let x = Math.ceil(x0 / 37) * 37; x < x1; x += 37) {
          const l = 6 + ((x * 13) % 14);
          g.fillRect(x, y + 14, 3, l);
        }
      }
      // Tusche-Kontur
      g.strokeStyle = P.tinte;
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(x0, y + (rnd() - 0.5));
      for (let x = x0 + 60; x < x1; x += 60) g.lineTo(x, y + (rnd() - 0.5) * 1.2);
      g.lineTo(x1, y);
      g.stroke();
      g.lineWidth = 3.5;
      if (b.x0 >= x0) {
        g.beginPath();
        g.moveTo(b.x0, y + (b.art === "dach" ? -8 : 0));
        g.lineTo(b.x0 + (rnd() - 0.5), unten);
        g.stroke();
      }
      if (b.x1 <= x1) {
        g.beginPath();
        g.moveTo(b.x1, y + (b.art === "dach" ? -8 : 0));
        g.lineTo(b.x1 + (rnd() - 0.5), unten);
        g.stroke();
      }
      if (b.art === "dach") {
        g.lineWidth = 2.5;
        g.beginPath();
        g.moveTo(x0, y - 8);
        g.lineTo(x1, y - 8);
        g.stroke();
      }
    }
    // Deko
    for (const d of st.deko) {
      if (!sichtbar(d.x, d.x + 80, kx)) continue;
      if (d.art === "wassertank") {
        g.fillStyle = P.wand;
        g.strokeStyle = P.tinte;
        g.lineWidth = 3;
        g.fillRect(d.x, d.y - 110, 64, 60);
        g.strokeRect(d.x, d.y - 110, 64, 60);
        g.beginPath();
        g.moveTo(d.x - 5, d.y - 110);
        g.lineTo(d.x + 32, d.y - 136);
        g.lineTo(d.x + 69, d.y - 110);
        g.fill();
        g.stroke();
        g.beginPath();
        g.moveTo(d.x + 8, d.y - 50);
        g.lineTo(d.x + 2, d.y);
        g.moveTo(d.x + 56, d.y - 50);
        g.lineTo(d.x + 62, d.y);
        g.stroke();
      }
    }
  }
  function treppe(g, b, P, unten, rnd) {
    const n = b.stufen || 6;
    const sw = (b.x1 - b.x0) / n;
    const sh = (b.y1 - b.y) / n;
    g.fillStyle = P.wand;
    g.beginPath();
    g.moveTo(b.x0, b.y);
    for (let i = 0; i < n; i++) {
      g.lineTo(b.x0 + i * sw, b.y + (i + 1) * sh);
      g.lineTo(b.x0 + (i + 1) * sw, b.y + (i + 1) * sh);
    }
    g.lineTo(b.x1, unten);
    g.lineTo(b.x0, unten);
    g.closePath();
    g.fill();
    g.save();
    g.clip();
    g.globalAlpha = 0.5;
    g.fillStyle = muster(g, "schraffur", P.tinte, 6, r.k);
    g.fillRect(b.x0, b.y, b.x1 - b.x0, unten - b.y);
    g.restore();
    g.strokeStyle = P.tinte;
    g.lineWidth = 3.5;
    g.beginPath();
    g.moveTo(b.x0, b.y);
    for (let i = 0; i < n; i++) {
      g.lineTo(b.x0 + i * sw + (rnd() - 0.5), b.y + (i + 1) * sh);
      g.lineTo(b.x0 + (i + 1) * sw, b.y + (i + 1) * sh + (rnd() - 0.5));
    }
    g.stroke();
    g.fillStyle = P.kante;
    for (let i = 0; i < n; i++) g.fillRect(b.x0 + i * sw, b.y + (i + 1) * sh, sw, 2.5);
  }
  function laufband(g, b, P, y, x0, x1) {
    const v = b.v;
    const off = (r.zeit * v) % 40;
    g.fillStyle = P.tinte;
    g.fillRect(x0, y, x1 - x0, 12);
    g.fillStyle = v > 0 ? P.a3 : P.a2;
    for (let x = Math.floor(b.x0 / 40) * 40 + off; x < x1; x += 40) {
      if (x < x0 - 20) continue;
      const d = v > 0 ? 1 : -1;
      g.beginPath();
      g.moveTo(x, y + 2);
      g.lineTo(x + 10 * d, y + 6);
      g.lineTo(x, y + 10);
      g.fill();
    }
    g.strokeStyle = P.tinte;
    g.lineWidth = 2.5;
    g.fillStyle = P.a2;
    for (let x = b.x0 + 15; x < b.x1; x += 30) {
      if (x < x0 - 10 || x > x1 + 10) continue;
      g.beginPath();
      g.arc(x, y + 20, 7, 0, 7);
      g.fill();
      g.stroke();
      const a = (r.zeit * v) / 7;
      g.beginPath();
      g.moveTo(x, y + 20);
      g.lineTo(x + Math.cos(a) * 6, y + 20 + Math.sin(a) * 6);
      g.stroke();
    }
  }
  function panel(g, b, P, y, unten) {
    // Comic-Panel mit weißem Rand; bricht nach dem Berühren
    g.strokeStyle = P.papier;
    g.lineWidth = 6;
    g.strokeRect(b.x0 + 5, y + 5, b.x1 - b.x0 - 10, Math.min(160, unten - y));
    g.strokeStyle = P.tinte;
    g.lineWidth = 2.5;
    g.strokeRect(b.x0 + 9, y + 9, b.x1 - b.x0 - 18, Math.min(152, unten - y));
    if (b.kt != null) {
      const rnd = zufall(Math.floor(b.x0));
      g.lineWidth = 2.5;
      g.beginPath();
      for (let i = 0; i < 3; i++) {
        let cx = b.x0 + 30 + rnd() * (b.x1 - b.x0 - 60);
        let cy = y;
        g.moveTo(cx, cy);
        for (let k = 0; k < 4; k++) {
          cx += (rnd() - 0.5) * 30;
          cy += 14 + rnd() * 20;
          g.lineTo(cx, cy);
        }
      }
      g.stroke();
    }
  }

  function zeichneGrinds(g, s, P, kx, ky) {
    for (const seg of s.st.grinds) {
      if (!sichtbar(seg.x0, seg.x1, kx)) continue;
      const a = seg.art;
      const metall = P.papier === "#ffffff" ? "#888" : "#c8d0da";
      if (a === "kante" || a === "bahnsteig") {
        const h = a === "kante" ? 30 : 32;
        const by = seg.y0 + h;
        g.fillStyle = P.wand;
        g.fillRect(seg.x0, seg.y0, seg.x1 - seg.x0, h);
        g.globalAlpha = 0.4;
        g.fillStyle = muster(g, "punkte", P.tinte, 6, r.k);
        g.fillRect(seg.x0, seg.y0, seg.x1 - seg.x0, h);
        g.globalAlpha = 1;
        g.fillStyle = a === "bahnsteig" ? P.a1 : metall;
        g.fillRect(seg.x0, seg.y0, seg.x1 - seg.x0, 5);
        offsetStrich(g, P, () => g.strokeRect(seg.x0, seg.y0, seg.x1 - seg.x0, by - seg.y0), 3);
        continue;
      }
      if (a === "tafel") {
        g.fillStyle = P.papier;
        g.fillRect(seg.x0, seg.y0, seg.x1 - seg.x0, 50);
        g.fillStyle = P.a1;
        g.fillRect(seg.x0 + 12, seg.y0 + 10, (seg.x1 - seg.x0) * 0.4, 30);
        g.fillStyle = P.a3;
        g.beginPath();
        g.arc(seg.x0 + (seg.x1 - seg.x0) * 0.72, seg.y0 + 25, 16, 0, 7);
        g.fill();
        g.strokeStyle = P.tinte;
        g.lineWidth = 3;
        g.strokeRect(seg.x0, seg.y0, seg.x1 - seg.x0, 50);
        for (const lx of [seg.x0 + 30, seg.x1 - 30]) {
          const by = bodenYbei(s.st, lx) ?? seg.y0 + 88;
          g.beginPath();
          g.moveTo(lx, seg.y0 + 50);
          g.lineTo(lx, by);
          g.stroke();
        }
      }
      // Stützen
      if (a === "gelaender" || a === "rohr" || a === "traeger") {
        g.strokeStyle = P.tinte;
        g.lineWidth = a === "traeger" ? 8 : 4;
        const schritt = a === "traeger" ? seg.x1 - seg.x0 - 30 : 70;
        for (let x = seg.x0 + 15; x <= seg.x1 - 10; x += schritt) {
          const yy = grindY(seg, x);
          const by = bodenYbei(s.st, x);
          if (by == null || by < yy) continue;
          g.beginPath();
          g.moveTo(x, yy);
          g.lineTo(x, by);
          g.stroke();
        }
      }
      if (a === "kette" || a === "kran") {
        // hängt von oben
        g.strokeStyle = P.tinte;
        g.lineWidth = 2;
        for (const x of [seg.x0 + 10, seg.x1 - 10]) {
          g.beginPath();
          g.moveTo(x, grindY(seg, x));
          g.lineTo(x + (a === "kran" ? 0 : -8), ky - 10);
          g.stroke();
        }
      }
      const dicke = { gelaender: 5, rohr: 13, kette: 6, traeger: 12, kran: 12, tafel: 4 }[a] || 5;
      const farbe = { gelaender: metall, rohr: s.welt === 1 ? P.a3 : P.a2, kette: "#8c8c8c", traeger: P.a2, kran: P.a3 === "#8a4fd0" ? "#ffcc33" : P.a3, tafel: metall }[a] || metall;
      const pfad = () => {
        g.beginPath();
        g.moveTo(seg.x0, seg.y0);
        g.lineTo(seg.x1, seg.y1);
      };
      g.lineCap = "round";
      offsetStrich(g, P, () => {
        pfad();
        g.stroke();
      }, dicke + 4);
      g.strokeStyle = farbe;
      g.lineWidth = dicke;
      pfad();
      g.stroke();
      if (a === "kette") {
        g.strokeStyle = P.tinte;
        g.lineWidth = 1.5;
        const n = Math.floor((seg.x1 - seg.x0) / 10);
        for (let i = 0; i < n; i++) {
          const x = seg.x0 + i * 10;
          g.beginPath();
          g.ellipse(x + 5, grindY(seg, x + 5), 5, 3, Math.atan2(seg.y1 - seg.y0, seg.x1 - seg.x0), 0, 7);
          g.stroke();
        }
      } else if (a === "traeger" || a === "kran") {
        g.strokeStyle = P.tinte;
        g.lineWidth = 1.5;
        for (let x = seg.x0 + 10; x < seg.x1; x += 16) {
          const yy = grindY(seg, x);
          g.beginPath();
          g.moveTo(x, yy - dicke / 2);
          g.lineTo(x + 8, yy + dicke / 2);
          g.stroke();
        }
      } else {
        g.strokeStyle = "rgba(255,255,255,0.6)";
        g.lineWidth = Math.max(1.2, dicke * 0.25);
        g.beginPath();
        g.moveTo(seg.x0 + 4, seg.y0 - dicke * 0.2);
        g.lineTo(seg.x1 - 4, seg.y1 - dicke * 0.2);
        g.stroke();
      }
    }
  }
  // Tuschekontur mit verrutschtem Farbdruck (Cyan/Magenta) darunter
  function offsetStrich(g, P, pfad, breite) {
    const druck = P.papier !== "#ffffff";
    if (druck) {
      g.lineWidth = breite;
      g.save();
      g.translate(-2, -1);
      g.strokeStyle = "rgba(0,229,255,0.6)";
      pfad();
      g.translate(4, 2.2);
      g.strokeStyle = "rgba(255,43,214,0.6)";
      pfad();
      g.restore();
    }
    g.strokeStyle = P.tinte;
    g.lineWidth = breite;
    pfad();
  }

  function zeichneHindernisse(g, s, P, kx) {
    for (const h of s.st.hind) {
      if (h.typ === "kante") continue;
      const [x0, y0, x1, y1] = hindBox(s, h);
      if (!sichtbar(x0, x1, kx)) continue;
      const art = s.par && h.alt ? h.alt : h.art;
      hindernis(g, art, x0, y0, x1 - x0, y1 - y0, P, s);
    }
  }
  function hindernis(g, art, x, y, w, h, P, s) {
    const t = P.tinte;
    const rnd = zufall(Math.floor(x) + r.frame * 7);
    g.lineJoin = "round";
    g.lineWidth = 3;
    const umriss = (pfad) => {
      offsetStrich(g, P, () => {
        pfad();
        g.stroke();
      }, 3);
    };
    // Schatten
    g.fillStyle = "rgba(0,0,0,0.3)";
    g.beginPath();
    g.ellipse(x + w / 2, y + h, w * 0.7, 4, 0, 0, 7);
    g.fill();
    switch (art) {
      case "hydrant": {
        const f = P.a1;
        const pf = () => {
          g.beginPath();
          g.moveTo(x + 6, y + h);
          g.lineTo(x + 6, y + 12);
          g.quadraticCurveTo(x + w / 2, y - 4, x + w - 6, y + 12);
          g.lineTo(x + w - 6, y + h);
          g.closePath();
        };
        g.fillStyle = f;
        pf();
        g.fill();
        g.fillRect(x, y + 16, w, 8);
        g.globalAlpha = 0.35;
        g.fillStyle = muster(g, "punkte", t, 5, r.k);
        g.fillRect(x + w / 2, y, w / 2, h);
        g.globalAlpha = 1;
        umriss(pf);
        umriss(() => {
          g.beginPath();
          g.rect(x, y + 16, w, 8);
        });
        break;
      }
      case "tonne":
      case "fass": {
        const f = art === "fass" ? (s.welt === 1 ? "#2f6b3a" : P.a2) : "#7a8590";
        const pf = () => {
          g.beginPath();
          g.moveTo(x + 2, y + 4);
          g.lineTo(x + w - 2, y + 4);
          g.lineTo(x + w - 4, y + h);
          g.lineTo(x + 4, y + h);
          g.closePath();
        };
        g.fillStyle = f;
        pf();
        g.fill();
        g.globalAlpha = 0.4;
        g.fillStyle = muster(g, "schraffur", t, 5, r.k);
        g.fillRect(x + w * 0.6, y, w * 0.4, h);
        g.globalAlpha = 1;
        umriss(pf);
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(x + 3, y + h * 0.4);
        g.lineTo(x + w - 3, y + h * 0.4);
        g.moveTo(x + 3, y + h * 0.7);
        g.lineTo(x + w - 3, y + h * 0.7);
        g.stroke();
        if (art === "fass") {
          // Gift-Symbol: einfacher Kreis mit Punkt
          g.fillStyle = s.welt === 1 ? P.a1 : P.licht;
          g.beginPath();
          g.arc(x + w / 2, y + h * 0.55, 6, 0, 7);
          g.fill();
          if (s.welt === 1) {
            g.globalAlpha = 0.3;
            g.beginPath();
            g.arc(x + w / 2, y + 2, 14 + Math.sin(r.zeit * 5) * 3, 0, 7);
            g.fill();
            g.globalAlpha = 1;
          }
        } else {
          g.fillStyle = "#7a8590";
          g.fillRect(x - 2, y, w + 4, 6);
          g.strokeRect(x - 2, y, w + 4, 6);
        }
        break;
      }
      case "kegel": {
        const pf = () => {
          g.beginPath();
          g.moveTo(x + w / 2 - 3, y);
          g.lineTo(x + w / 2 + 3, y);
          g.lineTo(x + w - 2, y + h - 5);
          g.lineTo(x + 2, y + h - 5);
          g.closePath();
        };
        g.fillStyle = "#ff7a1a";
        pf();
        g.fill();
        g.fillStyle = P.papier;
        g.fillRect(x + w * 0.25, y + h * 0.4, w * 0.5, 6);
        g.fillStyle = "#ff7a1a";
        g.fillRect(x - 3, y + h - 6, w + 6, 6);
        umriss(pf);
        g.strokeRect(x - 3, y + h - 6, w + 6, 6);
        break;
      }
      case "kiste":
      case "koffer":
      case "block":
      case "luefter": {
        const f = art === "kiste" ? "#b0773a" : art === "koffer" ? P.a1 : art === "luefter" ? "#8a95a3" : "#9a9a9a";
        g.fillStyle = f;
        g.fillRect(x, y, w, h);
        g.globalAlpha = 0.35;
        g.fillStyle = muster(g, art === "block" ? "punkte" : "schraffur", t, 6, r.k);
        g.fillRect(x + w * 0.55, y, w * 0.45, h);
        g.globalAlpha = 1;
        umriss(() => {
          g.beginPath();
          g.rect(x, y, w, h);
        });
        g.lineWidth = 2;
        g.strokeStyle = t;
        g.beginPath();
        if (art === "kiste") {
          g.moveTo(x, y);
          g.lineTo(x + w, y + h);
          g.moveTo(x + w, y);
          g.lineTo(x, y + h);
        } else if (art === "koffer") {
          g.moveTo(x + w * 0.35, y);
          g.lineTo(x + w * 0.35, y - 6);
          g.lineTo(x + w * 0.65, y - 6);
          g.lineTo(x + w * 0.65, y);
          g.moveTo(x, y + h * 0.5);
          g.lineTo(x + w, y + h * 0.5);
        } else if (art === "luefter") {
          const a = r.zeit * 12;
          for (let i = 0; i < 3; i++) {
            g.moveTo(x + w / 2, y + h / 2);
            g.lineTo(x + w / 2 + Math.cos(a + i * 2.1) * h * 0.38, y + h / 2 + Math.sin(a + i * 2.1) * h * 0.38);
          }
          g.moveTo(x + w / 2 + h * 0.42, y + h / 2);
          g.arc(x + w / 2, y + h / 2, h * 0.42, 0, 7);
        } else {
          g.moveTo(x + 6, y + 10);
          g.lineTo(x + 14, y + 16);
        }
        g.stroke();
        break;
      }
      case "schild":
      case "antenne": {
        g.strokeStyle = t;
        g.lineWidth = 4;
        g.beginPath();
        g.moveTo(x + w / 2, y + h);
        g.lineTo(x + w / 2, y + 6);
        g.stroke();
        if (art === "schild") {
          g.fillStyle = P.a1;
          g.beginPath();
          g.arc(x + w / 2, y + 10, 13, 0, 7);
          g.fill();
          umriss(() => {
            g.beginPath();
            g.arc(x + w / 2, y + 10, 13, 0, 7);
          });
          g.fillStyle = P.papier;
          g.fillRect(x + w / 2 - 8, y + 8, 16, 4);
        } else {
          g.lineWidth = 2.5;
          g.beginPath();
          g.moveTo(x - 8, y + 12);
          g.lineTo(x + w + 8, y + 12);
          g.moveTo(x - 4, y + 24);
          g.lineTo(x + w + 4, y + 24);
          g.stroke();
          g.fillStyle = Math.floor(r.zeit * 2) % 2 ? "#ff3b3b" : t;
          g.beginPath();
          g.arc(x + w / 2, y + 3, 3.5, 0, 7);
          g.fill();
        }
        break;
      }
      case "ratte": {
        const b = Math.floor(r.zeit * 12) % 2;
        g.fillStyle = "#5a4e5e";
        const pf = () => {
          g.beginPath();
          g.ellipse(x + w * 0.55, y + h * 0.55, w * 0.38, h * 0.45, 0, 0, 7);
        };
        pf();
        g.fill();
        umriss(pf);
        g.beginPath();
        g.arc(x + 7, y + h * 0.5, 6, 0, 7);
        g.fillStyle = "#5a4e5e";
        g.fill();
        g.stroke();
        g.fillStyle = "#ff3b3b";
        g.fillRect(x + 3, y + h * 0.4, 2.5, 2.5);
        g.strokeStyle = t;
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(x + w * 0.9, y + h * 0.6);
        g.quadraticCurveTo(x + w + 10, y + (b ? 0 : h), x + w + 18, y + h * 0.4);
        g.moveTo(x + w * 0.4, y + h);
        g.lineTo(x + w * 0.4 + (b ? 5 : -5), y + h + 2);
        g.moveTo(x + w * 0.7, y + h);
        g.lineTo(x + w * 0.7 + (b ? -5 : 5), y + h + 2);
        g.stroke();
        break;
      }
      default: {
        // Schrott
        g.fillStyle = "#6b5a4a";
        const pf = () => {
          g.beginPath();
          g.moveTo(x, y + h);
          g.lineTo(x + w * 0.2, y + h * 0.3);
          g.lineTo(x + w * 0.45, y + h * 0.5);
          g.lineTo(x + w * 0.6, y);
          g.lineTo(x + w * 0.85, y + h * 0.4);
          g.lineTo(x + w, y + h);
          g.closePath();
        };
        pf();
        g.fill();
        umriss(pf);
      }
    }
    void rnd;
  }

  function zeichnePressen(g, s, P, kx, ky) {
    for (const p of s.st.pressen) {
      if (!sichtbar(p.x - 20, p.x + p.w + 20, kx)) continue;
      const [x0, y0, x1, y1] = presseBox(s, p);
      const d = presseUnten(p, s.t);
      // Stempel-Stange
      g.fillStyle = "#7a7f88";
      g.fillRect(x0 + p.w / 2 - 10, ky - 20, 20, y0 - ky + 20);
      g.strokeStyle = P.tinte;
      g.lineWidth = 3;
      g.strokeRect(x0 + p.w / 2 - 10, ky - 20, 20, y0 - ky + 20);
      // Kopf mit Warnstreifen
      g.save();
      g.beginPath();
      g.rect(x0, y0, x1 - x0, y1 - y0);
      g.clip();
      g.fillStyle = P.a3 === "#ffd31a" ? P.a3 : "#ffd31a";
      g.fillRect(x0, y0, x1 - x0, y1 - y0);
      g.fillStyle = P.tinte;
      for (let x = x0 - 40; x < x1; x += 22) {
        g.beginPath();
        g.moveTo(x, y1);
        g.lineTo(x + 11, y1);
        g.lineTo(x + 51, y0);
        g.lineTo(x + 40, y0);
        g.fill();
      }
      g.restore();
      offsetStrich(g, P, () => g.strokeRect(x0, y0, x1 - x0, y1 - y0), 4);
      // Aufprall
      const vorher = r.presseZustand.get(p) || 0;
      if (d >= 1 && vorher < 1) {
        for (let i = 0; i < 8; i++) teil("staub", x0 + Math.random() * p.w, p.y - 4, (Math.random() - 0.5) * 300, -Math.random() * 90, 0.5, P.papier, 5);
        if (Math.abs(p.x - s.p.x) < r.W) {
          r.shake = Math.max(r.shake, 3);
          r.tonEv.push("presse");
          popup("STAMPF!", p.x + p.w / 2, p.y - 70, { farbe: "#ffd31a", groesse: 26, dauer: 0.5 });
        }
      }
      r.presseZustand.set(p, d);
      // Warnlicht
      if (d === 0) {
        const bald = ((s.t + p.phase) % p.periode) / p.periode > 0.85;
        g.fillStyle = bald ? "#ff3b3b" : "#3bff6a";
        g.beginPath();
        g.arc(x0 + p.w / 2, y0 - 10, 5, 0, 7);
        g.fill();
      }
    }
  }
  function presseBox(s, p) {
    const d = presseUnten(p, s.t);
    const yb = p.y - PRESSE_HUB * (1 - d);
    return [p.x, yb - 60, p.x + p.w, yb];
  }

  function zeichneZuege(g, s, P, kx) {
    for (const z of s.st.zuege) {
      const x = zugX(s, z);
      if (!sichtbar(x, x + z.len, kx)) continue;
      const y = z.y;
      const unten = z.boden + 70;
      g.fillStyle = P.mitte === "#e8eef7" ? "#c9d3e2" : P.mitte;
      g.fillRect(x, y, z.len, unten - y);
      g.fillStyle = P.a2;
      g.fillRect(x, y + 36, z.len, 10);
      // Fenster mit Licht (flackert)
      const an = Math.floor(r.zeit * 10 + x * 0.01) % 7 !== 0;
      g.fillStyle = an ? P.licht : P.wand;
      for (let wx = x + 30; wx < x + z.len - 60; wx += 56) g.fillRect(wx, y + 52, 34, 22);
      // Türen
      g.strokeStyle = P.tinte;
      g.lineWidth = 2.5;
      for (let tx = x + 120; tx < x + z.len - 80; tx += 230) g.strokeRect(tx, y + 48, 36, unten - y - 48);
      // Front
      g.fillStyle = P.a1;
      g.fillRect(x + z.len - 30, y + 6, 26, 40);
      g.fillStyle = "#fff8c0";
      g.beginPath();
      g.arc(x + z.len - 8, y + 60, 6, 0, 7);
      g.fill();
      g.globalAlpha = 0.2;
      g.beginPath();
      g.moveTo(x + z.len - 4, y + 54);
      g.lineTo(x + z.len + 160, y + 30);
      g.lineTo(x + z.len + 160, y + 100);
      g.closePath();
      g.fill();
      g.globalAlpha = 1;
      // Dach
      g.fillStyle = "#9aa3b0";
      g.fillRect(x, y, z.len, 6);
      g.globalAlpha = 0.35;
      g.fillStyle = muster(g, "punkte", P.tinte, 7, r.k);
      g.fillRect(x, y + 8, z.len, unten - y);
      g.globalAlpha = 1;
      offsetStrich(g, P, () => {
        g.beginPath();
        g.moveTo(x, unten);
        g.lineTo(x, y + 6);
        g.quadraticCurveTo(x, y, x + 8, y);
        g.lineTo(x + z.len - 14, y);
        g.quadraticCurveTo(x + z.len, y, x + z.len, y + 16);
        g.lineTo(x + z.len, unten);
        g.stroke();
      }, 4);
    }
  }

  function zeichneSchwer(g, s, P, kx) {
    for (const z of s.st.schwer) {
      if (!sichtbar(z.x0, z.x1, kx)) continue;
      g.save();
      g.globalAlpha = 0.14;
      g.fillStyle = P.a2;
      g.fillRect(z.x0, r.kam.y - 40, z.x1 - z.x0, r.H + 80);
      g.globalAlpha = 0.6;
      g.fillStyle = P.papier;
      for (let i = 0; i < 26; i++) {
        const x = z.x0 + ((i * 97) % (z.x1 - z.x0));
        const y = r.kam.y + r.H - ((r.zeit * 60 + i * 53) % (r.H + 40));
        g.fillRect(x, y, 3, 3);
      }
      g.restore();
      g.fillStyle = P.papier;
      g.font = `22px ${FONT}`;
      g.textAlign = "center";
      g.fillText("SCHWERKRAFT GESTÖRT", (z.x0 + z.x1) / 2, r.kam.y + 70);
    }
  }

  function zeichneZiel(g, s, P) {
    const z = s.st.ziel;
    if (!isFinite(z) || !sichtbar(z - 40, z + 140, r.kam.x)) return;
    const y = bodenYbei(s.st, z) ?? s.st.cy;
    g.strokeStyle = P.tinte;
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(z, y);
    g.lineTo(z, y - 170);
    g.moveTo(z + 120, y);
    g.lineTo(z + 120, y - 170);
    g.stroke();
    for (let i = 0; i < 12; i++)
      for (let k = 0; k < 2; k++) {
        g.fillStyle = (i + k) % 2 ? P.tinte : P.papier;
        g.fillRect(z + i * 10, y - 170 + k * 10 + Math.sin(r.zeit * 4 + i * 0.6) * 3, 10, 10);
      }
    comicText(g, "ZIEL", z + 60, y - 190, 34, "#ffe600", -0.06);
  }

  function zeichneTropfen(g, s, P, kx) {
    const bob = Math.sin(r.zeit * 5) * 3;
    for (const t of s.st.tropfen) {
      if (t.weg || t.x < kx - 30) continue;
      if (t.x > kx + r.W + 30) break;
      if (t.dim === 1 && !s.par) continue;
      const x = t.x;
      const y = t.y + bob;
      const farbe = t.dim === 1 ? "#ffe600" : P.a2 === "#7a7a7a" ? "#222" : P.a2;
      g.beginPath();
      g.moveTo(x, y - 12);
      g.quadraticCurveTo(x + 9, y - 1, x + 7, y + 4);
      g.arc(x, y + 3, 7, 0.1, Math.PI - 0.1);
      g.quadraticCurveTo(x - 9, y - 1, x, y - 12);
      g.fillStyle = farbe;
      g.fill();
      g.strokeStyle = P.tinte;
      g.lineWidth = 2.2;
      g.stroke();
      g.fillStyle = "rgba(255,255,255,0.8)";
      g.fillRect(x - 3.5, y - 1, 2.5, 4);
    }
  }

  function zeichneRisse(g, s, P, kx) {
    const rnd = zufall(r.frame * 3 + 1);
    for (const ri of s.st.risse) {
      if (!sichtbar(ri.x - 60, ri.x + 60, kx)) continue;
      if (ri.weg) continue;
      const hoehe = ri.r * 2.3;
      const pts = [];
      const n = 11;
      for (let i = 0; i <= n; i++) {
        const f = i / n;
        const breite = Math.sin(f * Math.PI) * (13 + Math.sin(r.zeit * 9) * 3);
        pts.push([ri.x + (rnd() - 0.5) * 6, ri.y - hoehe / 2 + f * hoehe, breite]);
      }
      const pfad = (dehn) => {
        g.beginPath();
        pts.forEach(([x, y, b], i) => (i ? g.lineTo(x + b * dehn + (i % 2 ? 4 : -2), y) : g.moveTo(x, y)));
        for (let i = pts.length - 1; i >= 0; i--) {
          const [x, y, b] = pts[i];
          g.lineTo(x - b * dehn + (i % 2 ? -3 : 3), y);
        }
        g.closePath();
      };
      // Leuchten
      const gl = g.createRadialGradient(ri.x, ri.y, 4, ri.x, ri.y, hoehe * 0.8);
      gl.addColorStop(0, "rgba(255,255,255,0.55)");
      gl.addColorStop(0.4, s.welt === 1 ? "rgba(57,255,136,0.25)" : "rgba(255,43,214,0.25)");
      gl.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gl;
      g.fillRect(ri.x - hoehe, ri.y - hoehe, hoehe * 2, hoehe * 2);
      g.save();
      g.translate(-3, 0);
      g.fillStyle = "rgba(0,229,255,0.8)";
      pfad(1.5);
      g.fill();
      g.translate(6, 0);
      g.fillStyle = "rgba(255,43,214,0.8)";
      pfad(1.5);
      g.fill();
      g.restore();
      g.fillStyle = "#fff";
      pfad(1.15);
      g.fill();
      g.fillStyle = "#0a0014";
      pfad(0.65);
      g.fill();
      // Blick in die andere Welt: Raster im Spalt
      g.save();
      pfad(0.65);
      g.clip();
      g.globalAlpha = 0.6;
      g.fillStyle = muster(g, "kreuz", "#ffffff", 6, r.k);
      g.fillRect(ri.x - 30, ri.y - hoehe / 2, 60, hoehe);
      g.restore();
      g.strokeStyle = P.tinte;
      g.lineWidth = 2.5;
      pfad(1.15);
      g.stroke();
      // Funken
      for (let i = 0; i < 3; i++) {
        g.fillStyle = i % 2 ? "#00e5ff" : "#ff2bd6";
        g.fillRect(ri.x + (rnd() - 0.5) * 50, ri.y + (rnd() - 0.5) * hoehe, 3, 3);
      }
    }
  }

  // ---------- Figur-Extras ----------
  function zeichneBewegung(g, s, P) {
    const p = s.p;
    if (p.vx < s.st.tempo * 1.15 && p.zustand !== "grind") return;
    // gezeichnete Bewegungsstriche hinter der Figur
    const rnd = zufall(r.frame);
    g.strokeStyle = P.tinte;
    g.lineWidth = 2.5;
    g.globalAlpha = 0.7;
    for (let i = 0; i < 4; i++) {
      const y = p.y - 12 - i * 14 - rnd() * 4;
      const l = 22 + rnd() * 30;
      g.beginPath();
      g.moveTo(p.x - 22 - rnd() * 6, y);
      g.lineTo(p.x - 22 - l, y);
      g.stroke();
    }
    g.globalAlpha = 1;
  }
  function glitchFigur(g, p, pose, figOpt) {
    const rnd = zufall(r.frame * 5);
    g.save();
    g.globalAlpha = 0.6;
    for (const f of ["#00ffd0", "#ff00a8"]) {
      const P2 = { ...figOpt.P, tinte: f, papier: "rgba(0,0,0,0)" };
      zeichneFigur(g, p.x + (rnd() - 0.5) * 10, p.y + (rnd() - 0.5) * 4, pose, { ...figOpt, P: P2, druck: false });
    }
    g.restore();
  }
  function funken(s, P) {
    const p = s.p;
    if (Math.random() < 0.7) teil("funke", p.x - 8, p.y - 2, -100 - Math.random() * 150, -60 - Math.random() * 120, 0.35, Math.random() < 0.5 ? "#ffe600" : "#ff8a1f", 2.5);
  }

  function zeichneTeile(g, P, dt) {
    for (const t of r.teile) {
      t.t += dt;
      t.vy += (t.typ === "konfetti" ? 120 : t.typ === "staub" ? -20 : 700) * dt;
      t.x += t.vx * dt;
      t.y += t.vy * dt;
      const a = 1 - t.t / t.leben;
      if (a <= 0) continue;
      g.globalAlpha = Math.min(1, a * 1.5);
      g.fillStyle = t.farbe;
      if (t.typ === "staub") {
        g.beginPath();
        g.arc(t.x, t.y, t.gr * (1 + t.t * 4), 0, 7);
        g.fill();
        g.strokeStyle = P.tinte;
        g.lineWidth = 1.2;
        g.stroke();
      } else if (t.typ === "stern") {
        comicStern(g, t.x, t.y, t.gr, t.farbe, P.tinte, t.t * 8);
      } else if (t.typ === "konfetti") {
        g.save();
        g.translate(t.x, t.y);
        g.rotate(t.t * 6 + t.x);
        g.fillRect(-t.gr / 2, -t.gr / 4, t.gr, t.gr / 2);
        g.restore();
      } else {
        g.fillRect(t.x - t.gr / 2, t.y - t.gr / 2, t.gr, t.gr);
      }
    }
    g.globalAlpha = 1;
    r.teile = r.teile.filter((t) => t.t < t.leben);
  }
  function comicStern(g, x, y, gr, farbe, tinte, rotW) {
    g.save();
    g.translate(x, y);
    g.rotate(rotW);
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const rr = i % 2 ? gr * 0.45 : gr;
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    g.closePath();
    g.fillStyle = farbe;
    g.fill();
    g.strokeStyle = tinte;
    g.lineWidth = 1.5;
    g.stroke();
    g.restore();
  }

  // ---------- Comic-Schrift ----------
  function comicText(g, text, x, y, groesse, farbe, rotW = -0.08, skal = 1, schief = -0.18) {
    g.save();
    g.translate(x, y);
    g.rotate(rotW);
    g.transform(1, 0, schief, 1, 0, 0);
    g.scale(skal, skal);
    g.font = `${groesse}px ${FONT}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.lineJoin = "round";
    g.lineWidth = groesse * 0.24;
    g.strokeStyle = "#0b0a10";
    g.fillStyle = "#ff2bd6";
    g.strokeText(text, 3, 4);
    g.fillText(text, 3, 4);
    g.strokeText(text, 0, 0);
    g.fillStyle = farbe;
    g.fillText(text, 0, 0);
    g.restore();
  }
  r.comicText = comicText;
  function zeichnePopups(g, dt, welt) {
    for (const pp of r.popups) {
      if (pp.welt !== welt) continue;
      pp.t += dt;
      const f = pp.t / pp.dauer;
      if (f >= 1) continue;
      const pop = f < 0.15 ? 0.4 + (f / 0.15) * 0.9 : f < 0.25 ? 1.3 - ((f - 0.15) / 0.1) * 0.3 : 1;
      g.globalAlpha = f > 0.75 ? 1 - (f - 0.75) / 0.25 : 1;
      comicText(g, pp.text, pp.x, pp.y - f * pp.steig, pp.groesse, pp.farbe, pp.rot, pop);
    }
    g.globalAlpha = 1;
    r.popups = r.popups.filter((pp) => pp.t < pp.dauer);
  }

  // ---------- Überlagerungen der Parallel-Stile ----------
  function overlays(g, s, P, stil, dt) {
    g.setTransform(r.k, 0, 0, r.k, 0, 0);
    const W = r.W;
    const H = r.H;
    const rnd = zufall(r.frame * 11);
    const p = s.p;
    const px = p.x - r.kam.x;
    const py = p.y - 40 - r.kam.y;
    // Speedlines bei hohem Tempo (und in Manga immer)
    const schnell = p.vx > s.st.tempo * 1.2;
    if (stil === "manga" || schnell) {
      g.save();
      g.fillStyle = stil === "manga" ? "#000" : P.papier;
      g.globalAlpha = stil === "manga" ? 0.55 : 0.45;
      const n = stil === "manga" ? 36 : 14;
      for (let i = 0; i < n; i++) {
        if (stil === "manga") {
          const a = rnd() * Math.PI * 2;
          const r0 = 200 + rnd() * 120;
          const r1 = Math.max(W, H);
          const b = 0.012 + rnd() * 0.02;
          g.beginPath();
          g.moveTo(px + Math.cos(a) * r0, py + Math.sin(a) * r0);
          g.lineTo(px + Math.cos(a - b) * r1, py + Math.sin(a - b) * r1);
          g.lineTo(px + Math.cos(a + b) * r1, py + Math.sin(a + b) * r1);
          g.fill();
        } else {
          const y = rnd() * H;
          const x = rnd() * W;
          g.fillRect(x, y, 80 + rnd() * 160, 2);
        }
      }
      g.restore();
    }
    if (stil === "noir") {
      // Regen + Vignette
      g.strokeStyle = "rgba(255,255,255,0.35)";
      g.lineWidth = 1.5;
      g.beginPath();
      for (let i = 0; i < 70; i++) {
        const x = rnd() * (W + 100);
        const y = rnd() * H;
        g.moveTo(x, y);
        g.lineTo(x - 10, y + 26);
      }
      g.stroke();
      const v = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.7);
      v.addColorStop(0, "rgba(0,0,0,0)");
      v.addColorStop(1, "rgba(0,0,0,0.7)");
      g.fillStyle = v;
      g.fillRect(0, 0, W, H);
    } else if (stil === "zine") {
      // Fotokopie-Rauschen und ausgerissene Papierkanten am Rand
      g.save();
      g.globalAlpha = 0.6;
      g.translate(-rnd() * 64, -rnd() * 64);
      g.fillStyle = muster(g, "rauschen", "#000", 64);
      g.fillRect(0, 0, W + 64, H + 64);
      g.restore();
      g.fillStyle = P.papier;
      g.beginPath();
      g.moveTo(0, 0);
      for (let x = 0; x <= W; x += 24) g.lineTo(x, 8 + rnd() * 10);
      g.lineTo(W, 0);
      g.fill();
      g.beginPath();
      g.moveTo(0, H);
      for (let x = 0; x <= W; x += 24) g.lineTo(x, H - 8 - rnd() * 10);
      g.lineTo(W, H);
      g.fill();
    } else if (stil === "manga") {
      g.save();
      g.globalAlpha = 0.18;
      g.fillStyle = muster(g, "punkte", "#000", 5, r.k);
      g.fillRect(0, H * 0.75, W, H * 0.25);
      g.restore();
    }
    void dt;
  }
  function strobo(g, dt) {
    // flackerndes Tunnellicht, ab und zu stroboskopartig
    r.strobo -= dt;
    if (r.strobo < -4 - Math.random() * 4) r.strobo = 0.6;
    let a = 0;
    if (ruhig()) a = 0.06 + Math.sin(r.zeit * 2) * 0.04;
    else if (r.strobo > 0) a = Math.floor(r.zeit * 16) % 2 ? 0.35 * effekt() : 0;
    else a = Math.random() < 0.03 ? 0.2 * effekt() : 0;
    if (a > 0) {
      g.fillStyle = `rgba(0,0,10,${a})`;
      g.fillRect(0, 0, r.W, r.H);
    }
  }
  function pixeln() {
    const f = 4;
    const w = Math.ceil(canvas.width / (f * r.k));
    const h = Math.ceil(canvas.height / (f * r.k));
    if (klein.width !== w || klein.height !== h) {
      klein.width = w;
      klein.height = h;
    }
    const kg = klein.getContext("2d");
    kg.imageSmoothingEnabled = true;
    kg.drawImage(canvas, 0, 0, w, h);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(klein, 0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
  }
  // Glitch-Welt: ab und zu verrutschen waagrechte Streifen
  function glitchSlices(dt) {
    r.sliceT -= dt;
    if (r.sliceT < -1.5 - Math.random() * 2) r.sliceT = 0.12;
    if (r.sliceT <= 0 || ruhig()) return;
    const g = ctx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    const t2 = tmp.getContext("2d");
    t2.setTransform(1, 0, 0, 1, 0, 0);
    t2.drawImage(canvas, 0, 0);
    for (let i = 0; i < 4; i++) {
      const y = Math.random() * canvas.height;
      const h = 10 + Math.random() * 40 * r.k;
      const d = (Math.random() - 0.5) * 60 * r.k * effekt();
      g.drawImage(tmp, 0, y, canvas.width, h, d, y, canvas.width, h);
    }
  }
  // RGB-Split: Rot- und Grün/Blau-Kanal getrennt verschieben
  function rgbSplit(d) {
    if (d < 1) return;
    const g = ctx;
    const w = canvas.width;
    const h = canvas.height;
    const a = tmp.getContext("2d");
    const b = tmp2.getContext("2d");
    for (const [c, farbe] of [[a, "#ff0000"], [b, "#00ffff"]]) {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalCompositeOperation = "source-over";
      c.drawImage(canvas, 0, 0);
      c.globalCompositeOperation = "multiply";
      c.fillStyle = farbe;
      c.fillRect(0, 0, w, h);
      c.globalCompositeOperation = "source-over";
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = "#000";
    g.fillRect(0, 0, w, h);
    g.drawImage(tmp2, -d, 0);
    g.globalCompositeOperation = "lighter";
    g.drawImage(tmp, d, Math.round(d * 0.3));
    g.globalCompositeOperation = "source-over";
  }

  // Übergang: Bild reißt wie Papier, RGB-Split, dann Comic-Panels setzen sich neu zusammen
  function uebergang(dt) {
    const u = r.uebergang;
    u.t += dt;
    const f = u.t / u.dauer;
    if (f >= 1) {
      r.uebergang = null;
      return;
    }
    const g = ctx;
    const w = canvas.width;
    const h = canvas.height;
    const st = effekt();
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (f < 0.5) {
      const e = f / 0.5;
      const ee = e * e;
      const rnd = zufall(77);
      const naht = [];
      for (let y = 0; y <= h + 20; y += 22 * r.k) naht.push([w * 0.5 + (rnd() - 0.5) * 50 * r.k, y]);
      for (const seite of [-1, 1]) {
        g.save();
        g.translate((seite * ee * w * 0.6 * Math.max(0.4, st)), ee * 40 * r.k);
        g.rotate(seite * ee * 0.12);
        g.beginPath();
        g.moveTo(seite < 0 ? 0 : w, 0);
        for (const [x, y] of naht) g.lineTo(x, y);
        g.lineTo(seite < 0 ? 0 : w, h + 20);
        g.closePath();
        g.save();
        g.clip();
        g.drawImage(snap, 0, 0);
        g.restore();
        // weiße Papierkante
        g.strokeStyle = "#fff8e7";
        g.lineWidth = 10 * r.k;
        g.beginPath();
        naht.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
        g.stroke();
        g.strokeStyle = "#0b0a10";
        g.lineWidth = 2.5 * r.k;
        g.stroke();
        g.restore();
      }
      rgbSplit(Math.round((1 - e) * 14 * st * r.k));
      if (!ruhig() && e < 0.15) {
        g.fillStyle = `rgba(255,255,255,${0.6 * (1 - e / 0.15) * st})`;
        g.fillRect(0, 0, w, h);
      }
    } else {
      // Comic-Panels setzen sich zusammen
      const e = (f - 0.5) / 0.5;
      const ein = 1 - Math.pow(1 - e, 3);
      const t2 = tmp.getContext("2d");
      t2.setTransform(1, 0, 0, 1, 0, 0);
      t2.drawImage(canvas, 0, 0);
      g.fillStyle = "#fff8e7";
      g.fillRect(0, 0, w, h);
      const panels = [[0, 0, 0.42, 0.55], [0.42, 0, 0.58, 0.55], [0, 0.55, 0.6, 0.45], [0.6, 0.55, 0.4, 0.45]];
      const rand = (1 - ein) * 10 * r.k;
      panels.forEach(([px, py, pw, ph], i) => {
        const dx = (1 - ein) * (i % 2 ? 1 : -1) * 90 * r.k * st;
        const dy = (1 - ein) * (i < 2 ? -1 : 1) * 60 * r.k * st;
        const x = px * w + rand;
        const y = py * h + rand;
        const ww = pw * w - rand * 2;
        const hh = ph * h - rand * 2;
        g.save();
        g.translate(x + ww / 2 + dx, y + hh / 2 + dy);
        g.rotate((1 - ein) * (i % 2 ? 0.05 : -0.05) * st);
        g.drawImage(tmp, x, y, ww, hh, -ww / 2, -hh / 2, ww, hh);
        g.strokeStyle = "#0b0a10";
        g.lineWidth = 4 * r.k * (1 - ein * 0.7);
        g.strokeRect(-ww / 2, -hh / 2, ww, hh);
        g.restore();
      });
    }
  }

  // ---------- HUD ----------
  function sticker(g, x, y, w, h, farbe, rotW = -0.03) {
    g.save();
    g.translate(x + w / 2, y + h / 2);
    g.rotate(rotW);
    g.fillStyle = "rgba(0,0,0,0.45)";
    g.fillRect(-w / 2 + 4, -h / 2 + 5, w, h);
    g.fillStyle = farbe;
    g.fillRect(-w / 2, -h / 2, w, h);
    g.strokeStyle = "#0b0a10";
    g.lineWidth = 3;
    g.strokeRect(-w / 2, -h / 2, w, h);
    g.restore();
  }
  r.sticker = sticker;
  function hud(g, s, P, opt) {
    const W = r.W;
    const kompakt = W < 760;
    // Punkte
    sticker(g, 12, 10, kompakt ? 150 : 180, 50, "#fff8e7", -0.035);
    g.save();
    g.translate(22, 20);
    g.rotate(-0.035);
    g.fillStyle = "#0b0a10";
    g.font = `13px ${FONT}`;
    g.fillText(s.par ? "PUNKTE ×2" : "PUNKTE", 0, 8);
    g.font = `30px ${FONT}`;
    g.fillText(Math.floor(s.punkte).toLocaleString("de-DE"), 0, 36);
    g.restore();
    // Tropfen und Leben
    sticker(g, 14, 66, 116, 30, "#0b0a10", 0.02);
    g.fillStyle = "#00e5ff";
    g.beginPath();
    g.moveTo(30, 72);
    g.quadraticCurveTo(38, 82, 36, 86);
    g.arc(30, 85, 6, 0.1, Math.PI - 0.1);
    g.quadraticCurveTo(22, 82, 30, 72);
    g.fill();
    g.fillStyle = "#fff";
    g.font = `20px ${FONT}`;
    g.fillText(String(s.tropfen), 44, 89);
    for (let i = 0; i < 3; i++) {
      const hx = 92 + i * 12;
      g.fillStyle = i < s.leben ? "#ff3b6b" : "#444";
      g.beginPath();
      g.arc(hx - 2.5, 78, 3.2, 0, 7);
      g.arc(hx + 2.5, 78, 3.2, 0, 7);
      g.moveTo(hx - 5.6, 79);
      g.lineTo(hx, 86);
      g.lineTo(hx + 5.6, 79);
      g.fill();
    }
    // Fortschritt
    const bx = kompakt ? 180 : 220;
    const bw = W - bx - (kompakt ? 70 : 230) - r.randRechts * 0.5;
    if (!s.endlos && isFinite(s.st.ziel)) {
      const f = Math.max(0, Math.min(1, s.p.x / s.st.ziel));
      g.fillStyle = "rgba(0,0,0,0.5)";
      g.fillRect(bx, 18, bw, 10);
      g.fillStyle = P.a2 === "#7a7a7a" ? "#fff" : P.a2;
      g.fillRect(bx, 18, bw * f, 10);
      g.strokeStyle = "#0b0a10";
      g.lineWidth = 2.5;
      g.strokeRect(bx, 18, bw, 10);
      g.fillStyle = "#fff";
      g.beginPath();
      g.arc(bx + bw * f, 23, 6, 0, 7);
      g.fill();
      g.stroke();
      // Zielflagge
      for (let i = 0; i < 3; i++)
        for (let k = 0; k < 2; k++) {
          g.fillStyle = (i + k) % 2 ? "#0b0a10" : "#fff";
          g.fillRect(bx + bw + 4 + i * 4, 14 + k * 4, 4, 4);
        }
    } else if (s.endlos) {
      g.fillStyle = "#fff";
      g.font = `18px ${FONT}`;
      g.fillText(`${Math.floor(s.p.x / 40)} m`, bx, 30);
    }
    // Parallelwelt-Leiste
    if (s.par) {
      const rest = 1 - s.par.t / s.par.dauer;
      const zit = s.par.dauer - s.par.t < 2 ? (Math.random() - 0.5) * 4 * effekt() : 0;
      g.save();
      g.translate(zit, 0);
      sticker(g, bx, 36, Math.min(260, bw), 26, "#0b0a10", 0.01);
      g.fillStyle = "#ff2bd6";
      g.fillRect(bx + 4, 40, (Math.min(260, bw) - 8) * rest, 18);
      g.fillStyle = "#fff";
      g.font = `16px ${FONT}`;
      g.fillText(`${STIL_NAME[s.par.stil]}-DIMENSION`, bx + 10, 55);
      g.restore();
    }
    // Combo-Panel
    if (s.combo.n > 0) {
      const cw = kompakt ? 170 : 210;
      const cx = W / 2 - cw / 2;
      const cy = r.hochkant ? 120 : r.box && r.W < 900 ? 200 : 76;
      const wackel = Math.sin(r.zeit * 14) * 0.02;
      g.save();
      g.translate(cx + cw / 2, cy + 30);
      g.rotate(-0.06 + wackel);
      g.transform(1, 0, -0.12, 1, 0, 0);
      g.fillStyle = "rgba(0,0,0,0.5)";
      g.fillRect(-cw / 2 + 5, -27, cw, 60);
      g.fillStyle = "#ffe600";
      g.fillRect(-cw / 2, -32, cw, 60);
      g.strokeStyle = "#0b0a10";
      g.lineWidth = 3.5;
      g.strokeRect(-cw / 2, -32, cw, 60);
      g.fillStyle = "#0b0a10";
      g.textAlign = "center";
      g.font = `30px ${FONT}`;
      g.fillText(`COMBO ×${s.combo.n}`, 0, -2);
      g.font = `16px ${FONT}`;
      const liste = s.combo.liste.slice(-3).join(" + ");
      g.fillText(`${Math.round(s.combo.sum).toLocaleString("de-DE")} · ${liste}`, 0, 20);
      g.restore();
      g.textAlign = "left";
    }
    // Grind-Balance
    if (s.p.zustand === "grind") {
      const bal = s.p.grind.bal;
      const mx = s.p.x - r.kam.x;
      const my = s.p.y - r.kam.y - 108;
      g.strokeStyle = "#0b0a10";
      g.lineWidth = 7;
      g.beginPath();
      g.arc(mx, my + 40, 40, Math.PI * 1.2, Math.PI * 1.8);
      g.stroke();
      g.strokeStyle = "#fff";
      g.lineWidth = 4;
      g.stroke();
      g.strokeStyle = Math.abs(bal) > 0.7 ? "#ff3b3b" : "#39ff88";
      g.lineWidth = 4;
      const a = Math.PI * 1.5 + bal * Math.PI * 0.3;
      g.beginPath();
      g.moveTo(mx, my + 40);
      g.lineTo(mx + Math.cos(a) * 44, my + 40 + Math.sin(a) * 44);
      g.stroke();
    }
    // Aufgaben (rechts oben)
    if (opt.aufgaben && !kompakt) {
      const ax = W - 220 - r.randRechts;
      opt.aufgaben.forEach((a, i) => {
        const ok = opt.sterneVorher?.[i] || aufgabeErfuellt(s, a);
        const y = 74 + i * 22;
        g.fillStyle = "rgba(11,10,16,0.65)";
        g.fillRect(ax, y - 15, 206, 20);
        comicStern(g, ax + 11, y - 5, 7, ok ? "#ffe600" : "#555", "#0b0a10", 0);
        g.fillStyle = ok ? "#ffe600" : "#fff";
        const stand = a.typ === "ohneSturz" ? "" : ` (${Math.min(a.n, Math.floor(aufgabeStand(s, a))).toLocaleString("de-DE")}/${a.n.toLocaleString("de-DE")})`;
        const text = a.text + stand;
        g.font = `14px ${FONT}`;
        const b = g.measureText(text).width;
        if (b > 178) g.font = `${Math.max(10, Math.floor((14 * 178) / b))}px ${FONT}`;
        g.fillText(text, ax + 23, y);
      });
    }
  }

  // Erzählbox wie im Comic (gelbes Kästchen)
  function erzaehlBox(g, dt) {
    const b = r.box;
    b.t += dt;
    if (b.t > b.dauer) {
      r.box = null;
      return;
    }
    const f = b.t / b.dauer;
    const ein = Math.min(1, b.t / 0.25);
    const aus = f > 0.85 ? 1 - (f - 0.85) / 0.15 : 1;
    const breite = Math.min(r.W - 28, r.W < 760 ? 520 : 440);
    g.save();
    g.globalAlpha = aus;
    g.translate(14, (r.hochkant ? 160 : 108) - (1 - ein) * 30);
    g.rotate(-0.025);
    g.font = `22px ${FONT}`;
    const zeilen = umbrechen(g, b.text, breite - 32);
    const hh = 20 + zeilen.length * 26;
    g.fillStyle = "rgba(0,0,0,0.5)";
    g.fillRect(6, 6, breite, hh);
    g.fillStyle = "#ffe066";
    g.fillRect(0, 0, breite, hh);
    g.strokeStyle = "#0b0a10";
    g.lineWidth = 3;
    g.strokeRect(0, 0, breite, hh);
    g.fillStyle = "#0b0a10";
    const zeichen = Math.floor(b.t * 40);
    let rest = zeichen;
    zeilen.forEach((z, i) => {
      g.fillText(z.slice(0, Math.max(0, rest)), 16, 30 + i * 26);
      rest -= z.length;
    });
    g.restore();
  }
  function umbrechen(g, text, max) {
    const woerter = text.split(" ");
    const zeilen = [];
    let z = "";
    for (const w of woerter) {
      const t = z ? `${z} ${w}` : w;
      if (g.measureText(t).width > max && z) {
        zeilen.push(z);
        z = w;
      } else z = t;
    }
    if (z) zeilen.push(z);
    return zeilen;
  }

  r.groesse();
  return r;
}
