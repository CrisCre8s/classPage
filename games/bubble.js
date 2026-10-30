// Bubble Shooter: Blasen ins Feld schießen, ab drei gleichen Farben platzen sie. Was danach nicht mehr an der Decke hängt,
// fällt herunter und gibt Extrapunkte. Nach einigen Fehlschüssen schiebt sich oben eine neue Reihe ins Feld.
import { overlayKlick } from "./eingabe.js";

export const HILFE = "Zielen: Maus oder Finger · Schießen: Klick oder loslassen · Nächste Blase tauschen: antippen oder X · Tastatur: ← → zielen, Leertaste schießen · P: Pause";

const W = 480;
const H = 640;
const R = 16;
const SPALTEN = 14;
const L = (W - SPALTEN * 2 * R) / 2;
const REIHE_H = R * Math.sqrt(3);
const DECKE = 58;
const LINIE = 540;
const KANONE = { x: W / 2, y: 598 };
const TEMPO = 1150;
const FARBEN = ["#e5566f", "#f5d97a", "#5fc39c", "#7fb8ff", "#c8a2ff", "#f0a35e"];

const STUFEN = {
  leicht: { farben: 4, reihen: 5, fehlschuesse: 7, hilfe: "voll" },
  mittel: { farben: 5, reihen: 6, fehlschuesse: 5, hilfe: "bande" },
  schwer: { farben: 6, reihen: 7, fehlschuesse: 4, hilfe: "kurz" },
};

function hdCanvas(ctx, canvas) {
  const dpr = Math.min(3, Math.max(2, window.devicePixelRatio || 1));
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
  return ctx;
}
const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
};
const heller = (hex, f) => {
  const n = parseInt(hex.slice(1), 16);
  const k = (v) => Math.round(v + (255 - v) * f);
  return `rgb(${k(n >> 16)},${k((n >> 8) & 255)},${k(n & 255)})`;
};
const dunkler = (hex, f) => {
  const n = parseInt(hex.slice(1), 16);
  const k = (v) => Math.round(v * (1 - f));
  return `rgb(${k(n >> 16)},${k((n >> 8) & 255)},${k(n & 255)})`;
};
// Lichtpunkte im Hintergrund
const LICHTER = Array.from({ length: 14 }, (_, i) => ({ x: ((i * 97) % 480) + 10, y: ((i * 173) % 520) + 40, r: 30 + ((i * 37) % 60), f: FARBEN[i % 6], ph: i * 1.3 }));

export function start({ canvas, stufe, passeCanvas, status, nachricht, ergebnis }) {
  const S = STUFEN[stufe] || STUFEN.mittel;
  const ctx = hdCanvas(passeCanvas(canvas, W, H), canvas);

  let feld, versatz, einschub, schuss, aktuell, naechste, winkel, punkte, fehl, level, zustand, raf, zuletzt, t;
  let effekte = [];
  let fallend = [];
  let texte = [];
  let banner = null;
  let endeZeit = 0;
  let endeText = null;
  let tasten = { l: false, r: false };

  // ---------- Raster ----------
  const versetzt = (r) => (r + versatz) % 2 === 1;
  const laenge = (r) => (versetzt(r) ? SPALTEN - 1 : SPALTEN);
  const xVon = (r, c) => L + R + c * 2 * R + (versetzt(r) ? R : 0);
  const yVon = (r) => DECKE + R + r * REIHE_H + einschub;
  function nachbarn(r, c) {
    const v = versetzt(r);
    const liste = [[r, c - 1], [r, c + 1]];
    for (const rr of [r - 1, r + 1]) {
      if (v) liste.push([rr, c], [rr, c + 1]);
      else liste.push([rr, c - 1], [rr, c]);
    }
    return liste.filter(([rr, cc]) => rr >= 0 && cc >= 0 && cc < laenge(rr));
  }
  const zelle = (r, c) => feld[r]?.[c] ?? null;
  function reihe(r) {
    while (feld.length <= r) feld.push(new Array(laenge(feld.length)).fill(null));
    return feld[r];
  }
  const farbenImFeld = () => {
    const da = new Set();
    for (const reihe of feld) for (const f of reihe) if (f != null) da.add(f);
    return [...da];
  };
  const anzahlFarben = () => Math.min(FARBEN.length, S.farben + Math.floor((level - 1) / 3));
  function zufallsFarbe() {
    const da = farbenImFeld();
    const auswahl = da.length ? da : Array.from({ length: anzahlFarben() }, (_, i) => i);
    return auswahl[Math.floor(Math.random() * auswahl.length)];
  }

  function neuesFeld() {
    feld = [];
    versatz = 0;
    einschub = 0;
    const reihen = Math.min(10, S.reihen + level - 1);
    for (let r = 0; r < reihen; r++) {
      const zeile = [];
      for (let c = 0; c < laenge(r); c++) {
        // etwas Zusammenhang: oft dieselbe Farbe wie links oder oben
        const links = zeile[c - 1];
        const oben = r > 0 ? feld[r - 1][Math.min(c, feld[r - 1].length - 1)] : null;
        const z = Math.random();
        zeile.push(z < 0.3 && links != null ? links : z < 0.5 && oben != null ? oben : Math.floor(Math.random() * anzahlFarben()));
      }
      feld.push(zeile);
    }
    aktuell = zufallsFarbe();
    naechste = zufallsFarbe();
    fehl = 0;
  }

  function neu() {
    punkte = 0;
    level = 1;
    winkel = -Math.PI / 2;
    schuss = null;
    effekte = [];
    fallend = [];
    texte = [];
    banner = null;
    endeText = null;
    t = 0;
    neuesFeld();
    zeigeStatus();
  }
  const zeigeStatus = () => status(`${punkte} Punkte · Feld ${level}`);

  // ---------- Schießen ----------
  function schiessen() {
    if (zustand !== "laeuft" || schuss) return;
    schuss = { x: KANONE.x, y: KANONE.y, vx: Math.cos(winkel) * TEMPO, vy: Math.sin(winkel) * TEMPO, f: aktuell };
    aktuell = naechste;
    naechste = zufallsFarbe();
    rueckstoss = 1;
  }
  let rueckstoss = 0;
  function tauschen() {
    if (zustand !== "laeuft") return;
    [aktuell, naechste] = [naechste, aktuell];
    tauschAnim = 1;
  }
  let tauschAnim = 0;

  function bewegeSchuss(dt) {
    const teile = Math.ceil((TEMPO * dt) / 4);
    for (let i = 0; i < teile; i++) {
      const s = schuss;
      s.x += (s.vx * dt) / teile;
      s.y += (s.vy * dt) / teile;
      if (s.x < L + R) {
        s.x = L + R;
        s.vx = Math.abs(s.vx);
        effekte.push({ art: "wand", x: L, y: s.y, t: 0 });
      }
      if (s.x > W - L - R) {
        s.x = W - L - R;
        s.vx = -Math.abs(s.vx);
        effekte.push({ art: "wand", x: W - L, y: s.y, t: 0 });
      }
      if (s.y - R <= DECKE + einschub) return andocken(null);
      for (let r = 0; r < feld.length; r++) {
        const y = yVon(r);
        if (Math.abs(y - s.y) > 2 * R) continue;
        for (let c = 0; c < feld[r].length; c++) {
          if (feld[r][c] == null) continue;
          if ((xVon(r, c) - s.x) ** 2 + (y - s.y) ** 2 < (2 * R * 0.86) ** 2) return andocken([r, c]);
        }
      }
    }
  }

  function zelleBei(x, y) {
    const r = Math.max(0, Math.round((y - DECKE - R - einschub) / REIHE_H));
    const v = (r + versatz) % 2 === 1;
    const n = v ? SPALTEN - 1 : SPALTEN;
    const c = Math.max(0, Math.min(n - 1, Math.round((x - L - R - (v ? R : 0)) / (2 * R))));
    return [r, c];
  }

  function andocken(treffer) {
    const s = schuss;
    schuss = null;
    let ziel = null;
    const [r0, c0] = zelleBei(s.x, s.y);
    const passt = (r, c) => zelle(r, c) == null && (r === 0 || nachbarn(r, c).some(([a, b]) => zelle(a, b) != null));
    if (passt(r0, c0)) ziel = [r0, c0];
    else {
      // nächstgelegene freie Nachbarzelle der getroffenen Blase (oder der Zelle unter der Decke)
      const basis = treffer ? nachbarn(...treffer) : nachbarn(r0, c0).concat([[r0, c0]]);
      let best = Infinity;
      for (const [r, c] of basis) {
        if (zelle(r, c) != null || (r > 0 && !nachbarn(r, c).some(([a, b]) => zelle(a, b) != null) && !treffer)) continue;
        const d = (xVon(r, c) - s.x) ** 2 + (yVon(r) - s.y) ** 2;
        if (d < best) {
          best = d;
          ziel = [r, c];
        }
      }
    }
    if (!ziel) ziel = [r0, c0];
    const [r, c] = ziel;
    reihe(r)[c] = s.f;
    effekte.push({ art: "andock", r, c, t: 0 });
    werteAus(r, c);
  }

  function werteAus(r, c) {
    const farbe = feld[r][c];
    // gleiche Farbe zusammenhängend suchen
    const gruppe = [];
    const gesehen = new Set([`${r},${c}`]);
    const stapel = [[r, c]];
    while (stapel.length) {
      const [a, b] = stapel.pop();
      gruppe.push([a, b]);
      for (const [x, y] of nachbarn(a, b)) {
        const k = `${x},${y}`;
        if (!gesehen.has(k) && zelle(x, y) === farbe) {
          gesehen.add(k);
          stapel.push([x, y]);
        }
      }
    }
    if (gruppe.length >= 3) {
      gruppe.forEach(([a, b], i) => {
        effekte.push({ art: "platzt", x: xVon(a, b), y: yVon(a), f: feld[a][b], t: -i * 0.025 });
        feld[a][b] = null;
      });
      // alles, was nicht mehr mit der Decke verbunden ist, fällt
      const haengt = new Set();
      const q = [];
      if (feld[0]) feld[0].forEach((f, b) => f != null && (haengt.add(`0,${b}`), q.push([0, b])));
      while (q.length) {
        const [a, b] = q.pop();
        for (const [x, y] of nachbarn(a, b)) {
          const k = `${x},${y}`;
          if (!haengt.has(k) && zelle(x, y) != null) {
            haengt.add(k);
            q.push([x, y]);
          }
        }
      }
      let gefallen = 0;
      feld.forEach((zeile, a) =>
        zeile.forEach((f, b) => {
          if (f != null && !haengt.has(`${a},${b}`)) {
            fallend.push({ x: xVon(a, b), y: yVon(a), vx: (Math.random() - 0.5) * 90, vy: -60 - Math.random() * 120, f, t: 0 });
            feld[a][b] = null;
            gefallen++;
          }
        }),
      );
      const plus = gruppe.length * 10 + gefallen * 20;
      punkte += plus;
      texte.push({ x: xVon(r, c), y: yVon(r), text: `+${plus}`, t: 0, gross: gefallen >= 5 });
      if (gefallen >= 5) banner = { text: gefallen >= 12 ? "Lawine!" : "Abgeräumt!", t: 0 };
      fehl = Math.max(0, fehl - 1);
    } else {
      fehl++;
    }
    while (feld.length && feld[feld.length - 1].every((f) => f == null)) feld.pop();
    if (!feld.length) {
      const bonus = 500 * level;
      punkte += bonus;
      level++;
      banner = { text: `Feld geräumt! +${bonus}`, t: 0, lang: true };
      neuesFeld();
      einschub = -REIHE_H * 3;
      zeigeStatus();
      return;
    }
    if (fehl >= S.fehlschuesse) neueReihe();
    zeigeStatus();
    pruefeEnde();
  }

  function neueReihe() {
    fehl = 0;
    versatz ^= 1;
    const zeile = [];
    const da = farbenImFeld();
    for (let c = 0; c < laenge(0); c++) zeile.push(da.length && Math.random() < 0.85 ? da[Math.floor(Math.random() * da.length)] : Math.floor(Math.random() * anzahlFarben()));
    feld.unshift(zeile);
    einschub = -REIHE_H;
    effekte.push({ art: "reihe", t: 0 });
  }

  function pruefeEnde() {
    for (let r = feld.length - 1; r >= 0; r--) {
      if (!feld[r].some((f) => f != null)) continue;
      if (DECKE + R + r * REIHE_H + R > LINIE) return verloren();
      return;
    }
  }
  function verloren() {
    zustand = "ende";
    endeZeit = 0;
    const neuer = ergebnis({ punkte });
    endeText = `<p class="big">Über die Linie!</p><p>${punkte} Punkte · Feld ${level}${neuer ? " · neuer Highscore!" : ""}</p><p class="small">Leertaste oder Klick für ein neues Spiel</p>`;
  }

  // ---------- Hilfslinie ----------
  function bahn() {
    const punkteListe = [];
    let x = KANONE.x;
    let y = KANONE.y;
    let vx = Math.cos(winkel);
    let vy = Math.sin(winkel);
    const max = S.hilfe === "voll" ? 1400 : S.hilfe === "bande" ? 900 : 170;
    let weg = 0;
    let banden = 0;
    let landet = null;
    while (weg < max) {
      x += vx * 4;
      y += vy * 4;
      weg += 4;
      if (x < L + R || x > W - L - R) {
        vx = -vx;
        x = Math.max(L + R, Math.min(W - L - R, x));
        banden++;
        if (S.hilfe === "bande" && banden > 1) break;
      }
      if (weg % 16 === 0) punkteListe.push([x, y]);
      let stopp = y - R <= DECKE + einschub;
      if (!stopp)
        for (let r = 0; r < feld.length && !stopp; r++) {
          const yy = yVon(r);
          if (Math.abs(yy - y) > 2 * R) continue;
          for (let c = 0; c < feld[r].length; c++)
            if (feld[r][c] != null && (xVon(r, c) - x) ** 2 + (yy - y) ** 2 < (2 * R * 0.86) ** 2) {
              stopp = true;
              break;
            }
        }
      if (stopp) {
        landet = [x, y];
        break;
      }
    }
    return { punkteListe, landet };
  }

  // ---------- Eingabe ----------
  const punkt = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };
  const zielAuf = (p) => {
    const w = Math.atan2(p.y - KANONE.y, p.x - KANONE.x);
    // nur nach oben, nicht ganz waagerecht
    winkel = w > 0 ? (p.x < KANONE.x ? -Math.PI + 0.16 : -0.16) : Math.max(-Math.PI + 0.16, Math.min(-0.16, w));
  };
  const naechsteOrt = { x: KANONE.x - 78, y: KANONE.y + 2 };
  let gedrueckt = false;
  const onMove = (e) => {
    if (zustand !== "laeuft") return;
    if (e.pointerType === "mouse" || gedrueckt) zielAuf(punkt(e));
  };
  const onDown = (e) => {
    e.preventDefault();
    canvas.focus({ preventScroll: true });
    if (zustand !== "laeuft") return;
    const p = punkt(e);
    if (Math.hypot(p.x - naechsteOrt.x, p.y - naechsteOrt.y) < R + 10 || Math.hypot(p.x - KANONE.x, p.y - KANONE.y) < R + 6) {
      tauschen();
      return;
    }
    gedrueckt = true;
    zielAuf(p);
    canvas.setPointerCapture?.(e.pointerId);
  };
  const onUp = (e) => {
    if (!gedrueckt) return;
    gedrueckt = false;
    if (zustand !== "laeuft") return;
    const p = punkt(e);
    if (p.y < KANONE.y - 10) {
      zielAuf(p);
      schiessen();
    }
  };
  const onKey = (e) => {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") tasten.l = e.type === "keydown";
    else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") tasten.r = e.type === "keydown";
    else if (e.type !== "keydown") return;
    else if (e.key === " " || e.key === "ArrowUp" || e.key === "Enter") {
      if (zustand === "laeuft") schiessen();
      else los();
    } else if (e.key === "x" || e.key === "X" || e.key === "c" || e.key === "C") tauschen();
    else if (e.key === "p" || e.key === "P" || e.key === "Escape") pause();
    else return;
    e.preventDefault();
  };
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", () => (gedrueckt = false));
  window.addEventListener("keydown", onKey);
  window.addEventListener("keyup", onKey);
  const aus = overlayKlick(() => los());

  function los() {
    if (zustand === "laeuft") return;
    if (zustand === "ende") {
      if (endeText) return; // kurze Pause nach dem Verlieren
      neu();
    }
    zustand = "laeuft";
    nachricht(null);
  }
  function pause() {
    if (zustand !== "laeuft") return;
    zustand = "pause";
    nachricht(`<p class="big">Pause</p><p class="small">Leertaste oder Klick zum Weiterspielen</p>`);
  }

  // ---------- Ablauf ----------
  function loop(ms) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.033, (ms - (zuletzt || ms)) / 1000);
    zuletzt = ms;
    if (zustand !== "pause") aktualisiere(dt);
    zeichne();
  }
  function aktualisiere(dt) {
    t += dt;
    if (zustand === "laeuft") {
      if (tasten.l) winkel = Math.max(-Math.PI + 0.16, winkel - dt * 1.6);
      if (tasten.r) winkel = Math.min(-0.16, winkel + dt * 1.6);
      if (schuss) bewegeSchuss(dt);
    }
    if (einschub < 0) einschub = Math.min(0, einschub + dt * REIHE_H * (einschub < -REIHE_H ? 9 : 5));
    rueckstoss = Math.max(0, rueckstoss - dt * 7);
    tauschAnim = Math.max(0, tauschAnim - dt * 6);
    for (const e of effekte) e.t += dt;
    effekte = effekte.filter((e) => e.t < 0.6);
    for (const f of fallend) {
      f.t += dt;
      f.vy += 1500 * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
    }
    fallend = fallend.filter((f) => f.y < H + 40);
    for (const x of texte) x.t += dt;
    texte = texte.filter((x) => x.t < 1);
    if (banner && (banner.t += dt) > (banner.lang ? 1.8 : 1.1)) banner = null;
    if (zustand === "ende") {
      endeZeit += dt;
      if (endeText && endeZeit > 1.2) {
        nachricht(endeText);
        endeText = null;
      }
    }
  }

  // ---------- Zeichnen ----------
  function zeichneBlase(x, y, f, r = R, grau = false) {
    const farbe = grau ? "#6d6a78" : FARBEN[f];
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, heller(farbe, 0.55));
    g.addColorStop(0.45, farbe);
    g.addColorStop(1, dunkler(farbe, 0.45));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r - 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgba("#000000", 0.25);
    ctx.lineWidth = 1;
    ctx.stroke();
    // Zeichen je Farbe, damit man die Farben auch ohne Farbsehen unterscheiden kann
    if (!grau) {
      ctx.save();
      ctx.translate(x, y + 1);
      ctx.fillStyle = rgba("#000000", 0.18);
      ctx.strokeStyle = rgba("#000000", 0.18);
      ctx.lineWidth = r * 0.14;
      const s = r * 0.32;
      ctx.beginPath();
      switch (f) {
        case 0: ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.fill(); break;
        case 1: ctx.moveTo(0, -s * 1.1); ctx.lineTo(s * 1.05, s * 0.75); ctx.lineTo(-s * 1.05, s * 0.75); ctx.closePath(); ctx.fill(); break;
        case 2: ctx.rect(-s * 0.85, -s * 0.85, s * 1.7, s * 1.7); ctx.fill(); break;
        case 3: ctx.moveTo(0, -s * 1.15); ctx.lineTo(s, 0); ctx.lineTo(0, s * 1.15); ctx.lineTo(-s, 0); ctx.closePath(); ctx.fill(); break;
        case 4: ctx.moveTo(-s, 0); ctx.lineTo(s, 0); ctx.moveTo(0, -s); ctx.lineTo(0, s); ctx.stroke(); break;
        default:
          for (let i = 0; i < 5; i++) {
            const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5;
            ctx[i ? "lineTo" : "moveTo"](Math.cos(a) * s * 1.1, Math.sin(a) * s * 1.1);
          }
          ctx.closePath();
          ctx.fill();
      }
      ctx.restore();
    }
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.beginPath();
    ctx.ellipse(x - r * 0.38, y - r * 0.42, r * 0.28, r * 0.16, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.arc(x + r * 0.42, y + r * 0.38, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }

  function zeichneHintergrund() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0c0b12");
    g.addColorStop(1, "#171424");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    for (const l of LICHTER) {
      const x = l.x + Math.sin(t * 0.3 + l.ph) * 14;
      const y = l.y + Math.cos(t * 0.25 + l.ph) * 10;
      const rg = ctx.createRadialGradient(x, y, 0, x, y, l.r);
      rg.addColorStop(0, rgba(l.f, 0.07));
      rg.addColorStop(1, rgba(l.f, 0));
      ctx.fillStyle = rg;
      ctx.fillRect(x - l.r, y - l.r, l.r * 2, l.r * 2);
    }
    // feines Wabenmuster
    ctx.strokeStyle = "rgba(255,255,255,0.025)";
    ctx.lineWidth = 1;
    for (let r = 0; r < 20; r++)
      for (let c = 0; c < 15; c++) {
        const x = L + R + c * 2 * R + (r % 2 ? R : 0);
        const y = DECKE + R + r * REIHE_H;
        if (y > LINIE) continue;
        ctx.beginPath();
        ctx.arc(x, y, R - 3, 0, Math.PI * 2);
        ctx.stroke();
      }
    // Seitenwände aus Glas
    for (const x of [0, W - L]) {
      const wg = ctx.createLinearGradient(x, 0, x + L, 0);
      wg.addColorStop(0, "rgba(200,162,255,0.06)");
      wg.addColorStop(1, "rgba(200,162,255,0.14)");
      ctx.fillStyle = wg;
      ctx.fillRect(x, DECKE, L, H - DECKE);
    }
    ctx.fillStyle = "rgba(200,162,255,0.35)";
    ctx.fillRect(L - 1, DECKE, 1, H - DECKE);
    ctx.fillRect(W - L, DECKE, 1, H - DECKE);
  }

  function zeichneDecke() {
    const y = DECKE + einschub;
    const g = ctx.createLinearGradient(0, 0, 0, y);
    g.addColorStop(0, "#1b1926");
    g.addColorStop(1, "#2a2638");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, Math.max(DECKE, y));
    ctx.fillStyle = "#3d3949";
    ctx.fillRect(0, Math.max(DECKE, y) - 4, W, 4);
    // Anzeige: so viele Fehlschüsse noch, dann kommt eine neue Reihe
    const n = S.fehlschuesse;
    for (let i = 0; i < n; i++) {
      const x = W / 2 - ((n - 1) * 14) / 2 + i * 14;
      const voll = i < n - fehl;
      ctx.fillStyle = voll ? "#5fc39c" : "#3d3949";
      if (!voll || fehl === n - 1) ctx.globalAlpha = fehl === n - 1 && voll ? 0.6 + 0.4 * Math.sin(t * 10) : 1;
      ctx.beginPath();
      ctx.arc(x, 40, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.font = "600 13px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillStyle = "#f2f2f3";
    ctx.fillText(`${punkte}`, 16, 26);
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillStyle = "#8a8698";
    ctx.fillText("Punkte", 16, 42);
    ctx.textAlign = "right";
    ctx.font = "600 13px system-ui, sans-serif";
    ctx.fillStyle = "#f2f2f3";
    ctx.fillText(`Feld ${level}`, W - 16, 26);
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillStyle = "#8a8698";
    ctx.fillText(`${anzahlFarben()} Farben`, W - 16, 42);
    ctx.textAlign = "center";
    ctx.fillText("neue Reihe in", W / 2, 22);
  }

  function zeichneLinie() {
    let tiefste = 0;
    for (let r = feld.length - 1; r >= 0; r--)
      if (feld[r].some((f) => f != null)) {
        tiefste = yVon(r) + R;
        break;
      }
    const nah = Math.max(0, Math.min(1, (tiefste - (LINIE - REIHE_H * 3)) / (REIHE_H * 3)));
    ctx.strokeStyle = rgba("#e5566f", 0.25 + nah * (0.45 + 0.3 * Math.sin(t * 8)));
    ctx.lineWidth = 1.5 + nah;
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = -t * 12;
    ctx.beginPath();
    ctx.moveTo(L, LINIE);
    ctx.lineTo(W - L, LINIE);
    ctx.stroke();
    ctx.setLineDash([]);
    if (nah > 0) {
      const g = ctx.createLinearGradient(0, LINIE - 40, 0, LINIE);
      g.addColorStop(0, rgba("#e5566f", 0));
      g.addColorStop(1, rgba("#e5566f", 0.12 * nah));
      ctx.fillStyle = g;
      ctx.fillRect(L, LINIE - 40, W - 2 * L, 40);
    }
  }

  function zeichneKanone() {
    const { x, y } = KANONE;
    // Sockel
    const sg = ctx.createRadialGradient(x, y + 10, 4, x, y + 10, 46);
    sg.addColorStop(0, "#3d3949");
    sg.addColorStop(1, "#1b1926");
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.ellipse(x, y + 22, 50, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    // Rohr
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(winkel + Math.PI / 2);
    const zurueck = rueckstoss * 6;
    const rg = ctx.createLinearGradient(-12, 0, 12, 0);
    rg.addColorStop(0, "#4b4560");
    rg.addColorStop(0.45, "#a39cc0");
    rg.addColorStop(1, "#3a3550");
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.roundRect(-11, -48 + zurueck, 22, 40, [6, 6, 2, 2]);
    ctx.fill();
    ctx.fillStyle = "#c8a2ff";
    ctx.fillRect(-11, -46 + zurueck, 22, 3);
    ctx.restore();
    // Ring um die aktuelle Blase
    ctx.strokeStyle = "rgba(200,162,255,0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, R + 5, 0, Math.PI * 2);
    ctx.stroke();
    const k = 1 - tauschAnim;
    if (aktuell != null && zustand !== "ende") zeichneBlase(x + (naechsteOrt.x - x) * (1 - k), y + (naechsteOrt.y - y) * (1 - k), aktuell);
    // nächste Blase
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.beginPath();
    ctx.arc(naechsteOrt.x, naechsteOrt.y, R * 0.8 + 6, 0, Math.PI * 2);
    ctx.fill();
    if (naechste != null && zustand !== "ende") zeichneBlase(naechsteOrt.x + (x - naechsteOrt.x) * (1 - k), naechsteOrt.y + (y - naechsteOrt.y) * (1 - k), naechste, R * (0.8 + 0.2 * (1 - k)));
    ctx.font = "10px system-ui, sans-serif";
    ctx.fillStyle = "#8a8698";
    ctx.textAlign = "center";
    ctx.fillText("tauschen", naechsteOrt.x, naechsteOrt.y + R + 10);
  }

  function zeichne() {
    ctx.save();
    zeichneHintergrund();
    zeichneLinie();
    // Hilfslinie
    if (zustand === "laeuft" && !schuss) {
      const { punkteListe, landet } = bahn();
      punkteListe.forEach(([x, y], i) => {
        const a = 0.55 * (1 - i / (punkteListe.length + 6));
        ctx.fillStyle = rgba(FARBEN[aktuell], a);
        ctx.beginPath();
        ctx.arc(x, y, 2.4 - ((t * 4 + i) % 1) * 0.6, 0, Math.PI * 2);
        ctx.fill();
      });
      if (landet && S.hilfe === "voll") {
        ctx.strokeStyle = rgba(FARBEN[aktuell], 0.6);
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(landet[0], landet[1], R - 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    // Feld
    const ende = zustand === "ende";
    feld.forEach((zeile, r) => {
      const y = yVon(r);
      zeile.forEach((f, c) => {
        if (f == null) return;
        let x = xVon(r, c);
        let yy = y;
        // eingedockte Blase federt kurz nach
        for (const e of effekte) if (e.art === "andock" && e.r === r && e.c === c) yy -= Math.sin(Math.min(1, e.t / 0.2) * Math.PI) * 3;
        // Wackeln, kurz bevor eine neue Reihe kommt
        if (fehl === S.fehlschuesse - 1 && zustand === "laeuft") x += Math.sin(t * 40 + r) * 0.8;
        const grau = ende && endeZeit > (feld.length - r) * 0.05;
        zeichneBlase(x, yy, f, R, grau);
      });
    });
    zeichneDecke();
    for (const f of fallend) {
      ctx.globalAlpha = Math.max(0, 1 - f.t * 0.8);
      zeichneBlase(f.x, f.y, f.f);
      ctx.globalAlpha = 1;
    }
    // Effekte
    for (const e of effekte) {
      if (e.t < 0) continue;
      if (e.art === "platzt") {
        const k = e.t / 0.4;
        if (k < 0.25) zeichneBlase(e.x, e.y, e.f, R * (1 + k));
        ctx.strokeStyle = rgba(FARBEN[e.f], Math.max(0, 0.8 * (1 - k)));
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, R * (0.8 + k * 1.2), 0, Math.PI * 2);
        ctx.stroke();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + e.x;
          const d = R * (0.6 + k * 1.8);
          ctx.fillStyle = rgba(FARBEN[e.f], Math.max(0, 1 - k));
          ctx.beginPath();
          ctx.arc(e.x + Math.cos(a) * d, e.y + Math.sin(a) * d, 3 * (1 - k * 0.6), 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (e.art === "wand") {
        ctx.fillStyle = rgba("#c8a2ff", Math.max(0, 0.5 - e.t));
        ctx.beginPath();
        ctx.ellipse(e.x, e.y, 4, 22 * (1 - e.t), 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (schuss) {
      ctx.fillStyle = rgba(FARBEN[schuss.f], 0.18);
      ctx.beginPath();
      ctx.arc(schuss.x - schuss.vx * 0.02, schuss.y - schuss.vy * 0.02, R * 0.8, 0, Math.PI * 2);
      ctx.fill();
      zeichneBlase(schuss.x, schuss.y, schuss.f);
    }
    zeichneKanone();
    for (const x of texte) {
      ctx.globalAlpha = Math.max(0, 1 - x.t);
      ctx.font = `700 ${x.gross ? 18 : 14}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillStyle = "#f5d97a";
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = 6;
      ctx.fillText(x.text, x.x, x.y - x.t * 36);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
    if (banner) {
      const dauer = banner.lang ? 1.8 : 1.1;
      const k = banner.t / dauer;
      const a = Math.min(1, k / 0.12, (1 - k) / 0.3);
      const p = Math.min(1, k / 0.18);
      const s = 0.7 + 0.3 * (1 + 2.2 * Math.pow(p - 1, 3) + 1.2 * Math.pow(p - 1, 2));
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(W / 2, 300);
      ctx.scale(s, s);
      ctx.font = "800 22px system-ui, sans-serif";
      ctx.textAlign = "center";
      const b = ctx.measureText(banner.text).width + 36;
      ctx.fillStyle = "rgba(15,14,19,0.82)";
      ctx.shadowColor = "#c8a2ff";
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.roundRect(-b / 2, -22, b, 40, 20);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(200,162,255,0.6)";
      ctx.stroke();
      ctx.fillStyle = "#f2f2f3";
      ctx.fillText(banner.text, 0, 6);
      ctx.restore();
    }
    ctx.restore();
  }

  zustand = "bereit";
  neu();
  nachricht(`<p class="big">Bubble Shooter</p><p>Schieß Blasen ins Feld. Ab drei gleichen Farben platzen sie, und alles, was danach nicht mehr oben hängt, fällt herunter und bringt Extrapunkte. Nach ${S.fehlschuesse} Fehlschüssen schiebt sich eine neue Reihe ins Feld. Keine Blase darf über die rote Linie.</p><p class="small">Klick oder Leertaste zum Start</p>`);
  raf = requestAnimationFrame(loop);

  return {
    pause,
    stop() {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      aus();
    },
  };
}
