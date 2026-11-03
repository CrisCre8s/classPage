// Pfand-Wurf: Pfandflaschen und Dosen mit einem Wisch in die Getränkekiste werfen.
// Der Ventilator macht Wind, leichte PET-Flaschen fliegen weiter ab als schweres Glas.
// Punkte = gesammeltes Pfand in Cent. 3 Fehlwürfe, dann ist Schluss.
import { overlayKlick } from "./eingabe.js";

export const HILFE = "Von der Flasche nach oben wischen: Richtung = Ziel, Länge = Kraft · Tastatur: ← → zielen, Leertaste halten = Kraft, loslassen = werfen · Wind beachten!";

const W = 480;
const H = 640;
const HORIZONT = 250; // Bildschirmhöhe des Horizonts
const F = 420; // Brennweite der Kamera
const KAM_Y = 1.45; // Augenhöhe in Metern
const G = 9.81;
const START = { x: 0, y: 1.05, z: 0.9 };
const KISTE = { b: 0.46, t: 0.34, h: 0.3 }; // Breite, Tiefe, Höhe in Metern
const LEBEN = 3;

// Flaschensorten: Pfand in Cent, Windempfindlichkeit, Aussehen
const SORTEN = [
  { id: "pet", name: "PET-Flasche", pfand: 25, wind: 1.45, farbe: "rgba(120, 200, 255, 0.75)", deckel: "#2f7de1", glas: false, hoehe: 0.3 },
  { id: "bier", name: "Bierflasche", pfand: 8, wind: 0.6, farbe: "#7a4a12", deckel: "#d9d9d9", glas: true, hoehe: 0.25 },
  { id: "wasser", name: "Glasflasche", pfand: 15, wind: 0.85, farbe: "rgba(90, 170, 110, 0.85)", deckel: "#d9d9d9", glas: true, hoehe: 0.28 },
  { id: "dose", name: "Dose", pfand: 25, wind: 1.2, farbe: "#c0c4cc", deckel: "#e5566f", glas: false, hoehe: 0.12 },
];
const STUFEN = {
  leicht: { wind: 1.2, start: 3.2, plus: 0.35, max: 6.5, wandert: false },
  mittel: { wind: 2.6, start: 3.8, plus: 0.45, max: 8, wandert: false },
  schwer: { wind: 4.2, start: 4.4, plus: 0.5, max: 9.5, wandert: true },
};
const euro = (c) => `${(c / 100).toFixed(2).replace(".", ",")} €`;

export function start({ canvas, stufe, passeCanvas, status, nachricht, ergebnis }) {
  const S = STUFEN[stufe] || STUFEN.mittel;
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

  let zustand, raf, zuletzt, punkte, leben, treffer, serie, kiste, wind, sorte, flasche, ziel, laden, effekte, scherben, wackel, meldung, zeit;

  // ---------- Projektion ----------
  const proj = (x, y, z) => {
    const zz = Math.max(0.2, z);
    return { x: W / 2 + (x * F) / zz, y: HORIZONT + ((KAM_Y - y) * F) / zz, s: F / zz };
  };

  function neu() {
    punkte = 0;
    leben = LEBEN;
    treffer = 0;
    serie = 0;
    effekte = [];
    scherben = [];
    wackel = 0;
    zeit = 0;
    neueRunde(true);
  }
  function entfernung() {
    return Math.min(S.max, S.start + Math.floor(treffer / 3) * S.plus);
  }
  function neueRunde(erste = false) {
    const z = entfernung();
    kiste = { x: S.wandert && treffer >= 6 ? (Math.random() - 0.5) * 1.4 : 0, z, wackel: 0 };
    // Wind wird mit der Zeit stärker, Richtung zufällig
    const staerke = S.wind * (0.35 + Math.random() * 0.65) * Math.min(1, 0.45 + treffer * 0.07);
    wind = Math.round((Math.random() < 0.5 ? -1 : 1) * staerke * 10) / 10;
    if (erste && stufe === "leicht") wind = 0;
    sorte = SORTEN[Math.floor(Math.random() * SORTEN.length)];
    flasche = null;
    ziel = { winkel: 0, kraft: 0 };
    laden = null;
    zeigeStatus();
  }
  const zeigeStatus = () => status(`${euro(punkte)} · ${"♥".repeat(Math.max(0, leben))} · ${treffer} Treffer`);

  // ---------- Wurf ----------
  // winkel: seitlich in Radiant, kraft 0 … 1
  function wirf(winkel, kraft) {
    if (zustand !== "laeuft" || flasche) return;
    // Kraft 0,5 trifft genau die Kistenmitte; ±0,5 Kraft = ±10 % Weite. Je weiter weg, desto genauer muss es sein.
    const steigung = 0.78; // ca. 45°
    const L = (kiste.z - START.z) * (0.9 + 0.2 * kraft);
    const dy = START.y - KISTE.h;
    const v = Math.sqrt((G * L * L) / (2 * Math.cos(steigung) ** 2 * (dy + L * Math.tan(steigung))));
    const vz = v * Math.cos(steigung);
    flasche = {
      ...START,
      vx: vz * Math.tan(Math.max(-0.55, Math.min(0.55, winkel))),
      vy: v * Math.sin(steigung),
      vz,
      dreh: 0,
      drehV: (6 + Math.random() * 4) * (Math.random() < 0.5 ? -1 : 1),
      phase: "flug",
    };
  }
  function schritt(dt) {
    zeit += dt;
    for (const e of effekte) e.t += dt;
    effekte = effekte.filter((e) => e.t < e.dauer);
    for (const s of scherben) {
      s.x += s.vx * dt;
      s.z += s.vz * dt;
      s.y = Math.max(0, s.y + s.vy * dt);
      s.vy -= G * dt;
      if (s.y === 0) {
        s.vx *= 0.9;
        s.vz *= 0.9;
        s.vy = 0;
      }
      s.t -= dt;
    }
    scherben = scherben.filter((s) => s.t > 0);
    if (wackel > 0) wackel -= dt;
    if (kiste.wackel > 0) kiste.wackel -= dt;
    // Kraft aufladen mit der Leertaste (pendelt hin und her)
    if (laden) {
      laden.t += dt;
      ziel.kraft = 0.5 - 0.5 * Math.cos(laden.t * 2.6);
    }
    if (!flasche) return;
    const f = flasche;
    if (f.phase === "flug") {
      const teile = 4;
      for (let i = 0; i < teile; i++) {
        const h = dt / teile;
        f.vx += wind * sorte.wind * 0.42 * h;
        f.vy -= G * h;
        const altY = f.y;
        const altZ = f.z;
        f.x += f.vx * h;
        f.y += f.vy * h;
        f.z += f.vz * h;
        f.dreh += f.drehV * h;
        const vorne = kiste.z - KISTE.t / 2;
        const hinten = kiste.z + KISTE.t / 2;
        const links = kiste.x - KISTE.b / 2;
        const rechts = kiste.x + KISTE.b / 2;
        const r = 0.035;
        // von oben in die Kiste?
        if (altY > KISTE.h && f.y <= KISTE.h && f.vy < 0) {
          const innen = f.x > links + r && f.x < rechts - r && f.z > vorne + r && f.z < hinten - r;
          const rand = f.x > links - r && f.x < rechts + r && f.z > vorne - r && f.z < hinten + r;
          if (innen) return getroffen();
          if (rand) return abprallen("Kistenrand!");
        }
        // gegen die Vorderwand der Kiste
        if (altZ < vorne && f.z >= vorne && f.y < KISTE.h && f.x > links && f.x < rechts) return abprallen("Gegen die Kiste!");
        if (f.y <= 0) return daneben(f.z < vorne ? "Zu kurz!" : f.z > hinten ? "Zu weit!" : f.x < links ? "Zu weit links!" : "Zu weit rechts!");
      }
    } else if (f.phase === "rein" || f.phase === "raus") {
      f.t += dt;
      f.vy -= G * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.z += f.vz * dt;
      f.dreh += f.drehV * dt;
      if (f.phase === "rein") f.y = Math.max(0.05, f.y);
      if (f.phase === "raus" && f.y <= 0) {
        f.y = 0;
        f.vy = Math.abs(f.vy) * 0.3;
        f.vx *= 0.6;
        f.vz *= 0.6;
        f.drehV *= 0.6;
      }
      if (f.t > (f.phase === "rein" ? 0.55 : 0.9)) {
        flasche = null;
        if (zustand === "laeuft") neueRunde();
      }
    }
  }
  function getroffen() {
    const f = flasche;
    treffer++;
    serie++;
    // Serienbonus: ab 3 Treffern in Folge doppeltes Pfand
    const bonus = serie >= 3 ? 2 : 1;
    const plus = sorte.pfand * bonus;
    punkte += plus;
    f.phase = "rein";
    f.t = 0;
    f.vx = 0;
    f.vz = 0;
    f.vy = -1.5;
    kiste.wackel = 0.35;
    effekte.push({ art: "text", text: `+${plus} ct`, unter: bonus > 1 ? `${serie}er-Serie: doppelt!` : sorte.glas ? "Klirr!" : "Plopp!", x: kiste.x, y: KISTE.h + 0.25, z: kiste.z, t: 0, dauer: 1.1, farbe: "#7fe0b0" });
    for (let i = 0; i < 10; i++) effekte.push({ art: "funke", x: kiste.x + (Math.random() - 0.5) * KISTE.b, y: KISTE.h, z: kiste.z, vx: (Math.random() - 0.5) * 1.2, vy: 1 + Math.random() * 1.8, t: 0, dauer: 0.6 });
    if (treffer % 3 === 0 && entfernung() < S.max + 0.01 && treffer > 0) effekte.push({ art: "banner", text: "Weiter weg!", t: 0, dauer: 1.3 });
    zeigeStatus();
  }
  function abprallen(text) {
    const f = flasche;
    f.phase = "raus";
    f.t = 0;
    f.vz = -Math.abs(f.vz) * 0.35;
    f.vy = 1.8;
    f.vx = (f.x < kiste.x ? -1 : 1) * 0.8;
    kiste.wackel = 0.25;
    verfehlt(text);
  }
  function daneben(text) {
    const f = flasche;
    f.y = 0;
    if (sorte.glas) {
      // Glas zerspringt auf dem Boden
      for (let i = 0; i < 14; i++) scherben.push({ x: f.x, y: 0.02, z: f.z, vx: (Math.random() - 0.5) * 2, vy: 0.5 + Math.random() * 1.6, vz: (Math.random() - 0.5) * 2, t: 1.4, farbe: sorte.farbe });
      flasche = null;
      wackel = 0.2;
      verfehlt(`${text} Scherben!`);
      setTimeout(() => zustand === "laeuft" && !flasche && neueRunde(), 700);
      return;
    }
    f.phase = "raus";
    f.t = 0;
    f.vy = 1.2;
    f.vz *= 0.4;
    f.vx *= 0.4;
    verfehlt(text);
  }
  function verfehlt(text) {
    serie = 0;
    leben--;
    effekte.push({ art: "text", text, unter: leben > 0 ? `noch ${leben} ${leben === 1 ? "Versuch" : "Versuche"}` : "", x: flasche ? flasche.x : kiste.x, y: 0.6, z: flasche ? Math.max(1.5, flasche.z) : kiste.z, t: 0, dauer: 1.1, farbe: "#ff8fa3" });
    zeigeStatus();
    if (leben <= 0) setTimeout(ende, 900);
  }
  function ende() {
    zustand = "ende";
    flasche = null;
    const neuer = ergebnis({ punkte });
    nachricht(`<p class="big">Feierabend!</p><p>${euro(punkte)} Pfand gesammelt · ${treffer} Treffer${neuer ? " · neuer Highscore!" : ""}</p><p class="small">Leertaste oder Klick für eine neue Runde</p>`);
  }

  // ---------- Zeichnen ----------
  function boden() {
    // Wand
    const wand = ctx.createLinearGradient(0, 0, 0, HORIZONT);
    wand.addColorStop(0, "#2a2438");
    wand.addColorStop(1, "#3a3150");
    ctx.fillStyle = wand;
    ctx.fillRect(0, 0, W, HORIZONT + 2);
    // Fenster mit Abendhimmel
    const fx = 300;
    const fy = 60;
    const fen = ctx.createLinearGradient(0, fy, 0, fy + 110);
    fen.addColorStop(0, "#3b4a8a");
    fen.addColorStop(1, "#e0785a");
    ctx.fillStyle = "#1c1a23";
    ctx.fillRect(fx - 6, fy - 6, 142, 122);
    ctx.fillStyle = fen;
    ctx.fillRect(fx, fy, 130, 110);
    ctx.fillStyle = "#1c1a23";
    ctx.fillRect(fx + 63, fy, 4, 110);
    ctx.fillRect(fx, fy + 53, 130, 4);
    // Plakat
    ctx.fillStyle = "#f5d97a";
    ctx.fillRect(40, 70, 90, 110);
    ctx.fillStyle = "#3a0f22";
    ctx.font = '9px "Press Start 2P", monospace';
    ctx.textAlign = "center";
    ctx.fillText("PFAND", 85, 110);
    ctx.fillText("GEHÖRT", 85, 128);
    ctx.fillText("DANEBEN!", 85, 146);
    // Boden mit Fliesen in Perspektive
    const bg = ctx.createLinearGradient(0, HORIZONT, 0, H);
    bg.addColorStop(0, "#2b2934");
    bg.addColorStop(1, "#4a4558");
    ctx.fillStyle = bg;
    ctx.fillRect(0, HORIZONT, W, H - HORIZONT);
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let z = 1; z < 14; z += 0.6) {
      const p = proj(0, 0, z);
      ctx.beginPath();
      ctx.moveTo(0, p.y);
      ctx.lineTo(W, p.y);
      ctx.stroke();
    }
    for (let x = -6; x <= 6; x += 0.6) {
      const a = proj(x, 0, 0.6);
      const b = proj(x, 0, 30);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.fillStyle = "#1c1a23";
    ctx.fillRect(0, HORIZONT - 2, W, 4);
  }
  function quader(x, z, b, t, h, farben) {
    // Kiste als Quader: Front, Oberseite (Öffnung), Seiten
    const vl = proj(x - b / 2, 0, z - t / 2);
    const vr = proj(x + b / 2, 0, z - t / 2);
    const vlo = proj(x - b / 2, h, z - t / 2);
    const vro = proj(x + b / 2, h, z - t / 2);
    const hlo = proj(x - b / 2, h, z + t / 2);
    const hro = proj(x + b / 2, h, z + t / 2);
    const hl = proj(x - b / 2, 0, z + t / 2);
    const hr = proj(x + b / 2, 0, z + t / 2);
    const poly = (pts, f) => {
      ctx.fillStyle = f;
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.closePath();
      ctx.fill();
    };
    // Schatten
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse((vl.x + vr.x) / 2, vl.y + 2, (vr.x - vl.x) * 0.62, (vl.y - hl.y) * 0.9 + 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Seiten (sichtbar je nach Lage)
    if (vl.x > W / 2) poly([vl, vlo, hlo, hl], farben.seite);
    if (vr.x < W / 2) poly([vr, vro, hro, hr], farben.seite);
    // Innenraum (dunkel) und Fächer
    poly([vlo, vro, hro, hlo], "#1a0d08");
    ctx.strokeStyle = farben.steg;
    ctx.lineWidth = Math.max(1, vro.s * 0.012);
    for (let i = 1; i < 4; i++) {
      const a = proj(x - b / 2 + (b * i) / 4, h, z - t / 2);
      const c = proj(x - b / 2 + (b * i) / 4, h, z + t / 2);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(c.x, c.y);
      ctx.stroke();
    }
    for (let i = 1; i < 3; i++) {
      const a = proj(x - b / 2, h, z - t / 2 + (t * i) / 3);
      const c = proj(x + b / 2, h, z - t / 2 + (t * i) / 3);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(c.x, c.y);
      ctx.stroke();
    }
    // Hälse der Flaschen, die schon drin stehen
    return { vl, vr, vlo, vro, hlo, hro, poly };
  }
  function zeichneKiste(vorne) {
    const wk = kiste.wackel > 0 ? Math.sin(zeit * 60) * kiste.wackel * 0.04 : 0;
    const x = kiste.x + wk;
    const farben = { front: "#c6354e", seite: "#8f2338", steg: "#6b1a2a" };
    const k = quader(x, kiste.z, KISTE.b, KISTE.t, KISTE.h, farben);
    if (!vorne) return;
    // Front mit Griffloch und Aufschrift
    k.poly([k.vl, k.vr, k.vro, k.vlo], farben.front);
    const bH = k.vl.y - k.vlo.y;
    const bB = k.vr.x - k.vl.x;
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(k.vlo.x, k.vlo.y, bB, bH * 0.12);
    ctx.fillStyle = "#1a0d08";
    ctx.beginPath();
    ctx.roundRect(k.vlo.x + bB * 0.36, k.vlo.y + bH * 0.2, bB * 0.28, bH * 0.16, bH * 0.08);
    ctx.fill();
    ctx.fillStyle = "#ffd5dc";
    ctx.font = `700 ${Math.max(7, bH * 0.24)}px "Public Sans", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("PFAND", (k.vl.x + k.vr.x) / 2, k.vlo.y + bH * 0.66);
  }
  function zeichneFlasche(x, y, z, dreh, s = sorte, alpha = 1) {
    const p = proj(x, y, z);
    const hoehe = s.hoehe * p.s;
    const breite = (s.id === "dose" ? 0.065 : 0.07) * p.s;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(p.x, p.y);
    ctx.rotate(dreh);
    if (s.id === "dose") {
      ctx.fillStyle = s.farbe;
      ctx.beginPath();
      ctx.roundRect(-breite / 2, -hoehe / 2, breite, hoehe, breite * 0.2);
      ctx.fill();
      ctx.fillStyle = s.deckel;
      ctx.fillRect(-breite / 2, -hoehe * 0.15, breite, hoehe * 0.35);
      ctx.fillStyle = "#9a9ea8";
      ctx.fillRect(-breite / 2, -hoehe / 2, breite, hoehe * 0.08);
    } else {
      // Körper, Schulter, Hals, Deckel
      ctx.fillStyle = s.farbe;
      ctx.beginPath();
      ctx.roundRect(-breite / 2, -hoehe * 0.2, breite, hoehe * 0.7, breite * 0.25);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-breite / 2, -hoehe * 0.15);
      ctx.quadraticCurveTo(-breite / 2, -hoehe * 0.32, -breite * 0.18, -hoehe * 0.36);
      ctx.lineTo(breite * 0.18, -hoehe * 0.36);
      ctx.quadraticCurveTo(breite / 2, -hoehe * 0.32, breite / 2, -hoehe * 0.15);
      ctx.fill();
      ctx.fillRect(-breite * 0.18, -hoehe * 0.47, breite * 0.36, hoehe * 0.12);
      ctx.fillStyle = s.deckel;
      ctx.fillRect(-breite * 0.22, -hoehe * 0.52, breite * 0.44, hoehe * 0.06);
      // Etikett und Glanz
      ctx.fillStyle = s.id === "pet" ? "#f5d97a" : "#efe9dc";
      ctx.fillRect(-breite / 2, hoehe * 0.02, breite, hoehe * 0.2);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(-breite * 0.32, -hoehe * 0.15, breite * 0.12, hoehe * 0.6);
    }
    ctx.restore();
  }
  function zeichneWind() {
    // Ventilator oben links und Windanzeige
    const vx = 52;
    const vy = 214;
    ctx.fillStyle = "#c9cbd4";
    ctx.fillRect(vx - 3, vy, 6, 34);
    ctx.fillRect(vx - 16, vy + 32, 32, 6);
    ctx.save();
    ctx.translate(vx, vy);
    ctx.strokeStyle = "#8a8698";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.rotate(zeit * (4 + Math.abs(wind) * 6) * Math.sign(wind || 1));
    ctx.fillStyle = "#e9e6ef";
    for (let i = 0; i < 3; i++) {
      ctx.rotate((Math.PI * 2) / 3);
      ctx.beginPath();
      ctx.ellipse(0, -10, 6, 11, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // Pfeil und Stärke
    const bx = W / 2 - 40;
    const by = 36;
    ctx.fillStyle = "rgba(15,14,19,0.65)";
    ctx.beginPath();
    ctx.roundRect(bx - 92, by - 20, 184, 40, 8);
    ctx.fill();
    ctx.fillStyle = "#f2f2f3";
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`WIND ${Math.abs(wind).toFixed(1).replace(".", ",")}`, bx - 22, by + 1);
    if (wind) {
      const r = Math.sign(wind);
      const len = 14 + Math.abs(wind) * 6;
      const ax = bx + 50;
      ctx.strokeStyle = Math.abs(wind) > 3 ? "#e5566f" : Math.abs(wind) > 1.5 ? "#f0a35e" : "#5fc39c";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(ax - (r * len) / 2, by);
      ctx.lineTo(ax + (r * len) / 2, by);
      ctx.moveTo(ax + (r * len) / 2, by);
      ctx.lineTo(ax + (r * len) / 2 - r * 7, by - 6);
      ctx.moveTo(ax + (r * len) / 2, by);
      ctx.lineTo(ax + (r * len) / 2 - r * 7, by + 6);
      ctx.stroke();
    }
    // Windlinien im Raum
    if (wind) {
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const y = 150 + i * 55;
        const x = ((zeit * wind * 60 + i * 97) % (W + 80) + W + 80) % (W + 80) - 40;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.sign(wind) * 40, y);
        ctx.stroke();
      }
    }
  }
  function zeichne() {
    ctx.setTransform(skala, 0, 0, skala, 0, 0);
    ctx.save();
    if (wackel > 0) ctx.translate((Math.random() - 0.5) * 10 * wackel, (Math.random() - 0.5) * 10 * wackel);
    boden();
    zeichneWind();
    // Entfernungsmarke
    const m = proj(kiste.x, 0, kiste.z - KISTE.t / 2 - 0.15);
    ctx.fillStyle = "rgba(245,217,122,0.7)";
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = "center";
    ctx.fillText(`${kiste.z.toFixed(1).replace(".", ",")} m`, m.x, m.y + 14);
    // Reihenfolge nach Tiefe: Flasche hinter der Kiste zuerst
    const f = flasche;
    const hinterKiste = f && f.z > kiste.z + KISTE.t / 2;
    const inKiste = f && f.phase === "rein";
    if (f && hinterKiste) zeichneFlasche(f.x, f.y, f.z, f.dreh);
    zeichneKiste(false);
    if (inKiste) {
      // fällt in die Kiste: wird von der Vorderwand verdeckt, also vor der Front zeichnen und kürzen
      zeichneFlasche(f.x, Math.max(KISTE.h * 0.6, f.y), f.z, f.dreh, sorte, Math.max(0, 1 - f.t * 2));
    }
    zeichneKiste(true);
    // Scherben
    for (const s of scherben) {
      const p = proj(s.x, s.y, s.z);
      ctx.globalAlpha = Math.min(1, s.t);
      ctx.fillStyle = s.farbe;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - p.s * 0.02);
      ctx.lineTo(p.x + p.s * 0.015, p.y + p.s * 0.01);
      ctx.lineTo(p.x - p.s * 0.012, p.y + p.s * 0.012);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (f && !hinterKiste && !inKiste) {
      // Schatten auf dem Boden
      const sp = proj(f.x, 0, f.z);
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.ellipse(sp.x, sp.y, sp.s * 0.05, sp.s * 0.015, 0, 0, Math.PI * 2);
      ctx.fill();
      zeichneFlasche(f.x, f.y, f.z, f.dreh);
    }
    // Flasche in der Hand (vor dem Wurf)
    if (!f && zustand !== "ende") {
      const wackeln = Math.sin(zeit * 2) * 0.01;
      zeichneFlasche(START.x, START.y - 0.35, START.z, ziel.winkel * 0.6 + wackeln);
      // Ziel-Pfeil und Kraftbalken (Tastatur oder Wischen)
      if (ziel.zeigen) {
        const p = proj(START.x, START.y - 0.2, START.z);
        ctx.save();
        ctx.translate(p.x, p.y - 70);
        ctx.rotate(ziel.winkel);
        ctx.strokeStyle = "rgba(245,217,122,0.85)";
        ctx.lineWidth = 4;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -60 - ziel.kraft * 90);
        ctx.stroke();
        ctx.restore();
        ctx.setLineDash([]);
        ctx.fillStyle = "rgba(15,14,19,0.6)";
        ctx.fillRect(W - 34, H - 190, 16, 150);
        const kf = ziel.kraft;
        ctx.fillStyle = kf > 0.8 ? "#e5566f" : kf > 0.5 ? "#f0a35e" : "#5fc39c";
        ctx.fillRect(W - 34, H - 40 - 150 * kf, 16, 150 * kf);
      }
      // Sorte und Pfand
      // links unten, damit die Flasche in der Hand nichts verdeckt
      ctx.fillStyle = "rgba(15,14,19,0.6)";
      ctx.beginPath();
      ctx.roundRect(10, H - 62, 170, 50, 8);
      ctx.fill();
      ctx.fillStyle = "#f2f2f3";
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.textAlign = "left";
      ctx.fillText(sorte.name.toUpperCase(), 20, H - 42);
      ctx.fillStyle = "#7fe0b0";
      ctx.fillText(`${sorte.pfand} CT PFAND`, 20, H - 28);
      ctx.fillStyle = "#8a8698";
      ctx.font = '6px "Press Start 2P", monospace';
      ctx.fillText(sorte.wind > 1.1 ? "LEICHT: WIND WIRKT STARK" : sorte.wind < 0.8 ? "SCHWER: WIND WIRKT KAUM" : "WIND WIRKT NORMAL", 20, H - 16);
    }
    // Effekte
    for (const e of effekte) {
      const k = e.t / e.dauer;
      if (e.art === "funke") {
        const p = proj(e.x + e.vx * e.t, e.y + e.vy * e.t - 4 * e.t * e.t, e.z);
        ctx.globalAlpha = 1 - k;
        ctx.fillStyle = "#f5d97a";
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
      } else if (e.art === "text") {
        const p = proj(e.x, e.y + k * 0.4, e.z);
        ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
        ctx.textAlign = "center";
        ctx.font = '14px "Press Start 2P", monospace';
        ctx.lineWidth = 5;
        ctx.strokeStyle = "#0f0e13";
        ctx.strokeText(e.text, p.x, p.y);
        ctx.fillStyle = e.farbe;
        ctx.fillText(e.text, p.x, p.y);
        if (e.unter) {
          ctx.font = '8px "Press Start 2P", monospace';
          ctx.strokeText(e.unter, p.x, p.y + 18);
          ctx.fillStyle = "#f2f2f3";
          ctx.fillText(e.unter, p.x, p.y + 18);
        }
      } else if (e.art === "banner") {
        ctx.globalAlpha = k < 0.15 ? k / 0.15 : k > 0.75 ? (1 - k) / 0.25 : 1;
        ctx.fillStyle = "rgba(15,14,19,0.7)";
        ctx.fillRect(0, 96, W, 44);
        ctx.fillStyle = "#f5d97a";
        ctx.font = '14px "Press Start 2P", monospace';
        ctx.textAlign = "center";
        ctx.fillText(e.text, W / 2, 124);
      }
    }
    ctx.globalAlpha = 1;
    // Anzeige oben rechts
    // oben rechts neben der Windanzeige, mit eigenem Hintergrund
    ctx.fillStyle = "rgba(15,14,19,0.65)";
    ctx.beginPath();
    ctx.roundRect(W - 128, 16, 118, serie >= 2 ? 62 : 46, 8);
    ctx.fill();
    ctx.fillStyle = "#f5d97a";
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.textAlign = "right";
    ctx.fillText(euro(punkte), W - 18, 36);
    ctx.fillStyle = "#e5566f";
    ctx.font = "14px sans-serif";
    ctx.fillText("♥".repeat(Math.max(0, leben)) + "♡".repeat(Math.max(0, LEBEN - leben)), W - 18, 56);
    if (serie >= 2) {
      ctx.fillStyle = "#7fe0b0";
      ctx.font = '7px "Press Start 2P", monospace';
      ctx.fillText(serie >= 3 ? `SERIE ${serie} · ×2` : `SERIE ${serie}`, W - 18, 71);
    }
    ctx.restore();
  }

  function loop(t) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.034, (t - (zuletzt || t)) / 1000);
    zuletzt = t;
    if (zustand === "laeuft") schritt(dt);
    else zeit += dt;
    zeichne();
  }
  function los() {
    if (zustand === "laeuft") return;
    if (zustand === "ende") neu();
    zustand = "laeuft";
    nachricht(null);
  }
  function pause() {
    if (zustand !== "laeuft") return;
    zustand = "pause";
    nachricht(`<p class="big">Pause</p><p class="small">Leertaste oder Klick zum Weiterwerfen</p>`);
  }

  // ---------- Eingabe ----------
  // Wischen: vom unteren Bereich nach oben ziehen und loslassen
  const punkt = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H, t: performance.now() };
  };
  let wisch = null;
  const onDown = (e) => {
    if (zustand !== "laeuft") return los();
    if (flasche) return;
    wisch = { start: punkt(e), id: e.pointerId };
    canvas.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e) => {
    if (!wisch || e.pointerId !== wisch.id) return;
    const p = punkt(e);
    const dx = p.x - wisch.start.x;
    const dy = wisch.start.y - p.y;
    ziel.zeigen = dy > 10;
    ziel.winkel = Math.atan2(dx, Math.max(1, dy));
    ziel.kraft = Math.max(0, Math.min(1, Math.hypot(dx, dy) / 320));
  };
  const onUp = (e) => {
    if (!wisch || e.pointerId !== wisch.id) return;
    const p = punkt(e);
    const dx = p.x - wisch.start.x;
    const dy = wisch.start.y - p.y;
    wisch = null;
    ziel.zeigen = false;
    if (dy < 25) return; // zu kurz oder nach unten: kein Wurf
    wirf(Math.atan2(dx, dy), Math.max(0, Math.min(1, Math.hypot(dx, dy) / 320)));
  };
  const onKey = (e) => {
    const k = e.key;
    const runter = e.type === "keydown";
    if ((k === "p" || k === "P" || k === "Escape") && runter) return zustand === "laeuft" ? pause() : null;
    if (k === " " || k === "Enter") {
      e.preventDefault();
      if (zustand !== "laeuft") return runter && los();
      if (runter && !e.repeat && !flasche && !laden) {
        laden = { t: 0 };
        ziel.zeigen = true;
      } else if (!runter && laden) {
        const kraft = ziel.kraft;
        laden = null;
        ziel.zeigen = false;
        wirf(ziel.winkel, kraft);
      }
    } else if ((k === "ArrowLeft" || k === "ArrowRight" || k === "a" || k === "d" || k === "A" || k === "D") && runter && zustand === "laeuft") {
      e.preventDefault();
      ziel.winkel = Math.max(-0.5, Math.min(0.5, ziel.winkel + (k === "ArrowLeft" || k === "a" || k === "A" ? -0.03 : 0.03)));
      ziel.zeigen = true;
    }
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", () => (wisch = null));
  window.addEventListener("keydown", onKey);
  window.addEventListener("keyup", onKey);
  const aus = overlayKlick(() => zustand !== "laeuft" && los());

  zustand = "bereit";
  neu();
  passeAufloesung();
  nachricht(`<p class="big">Pfand-Wurf</p><p>Wirf die Flaschen und Dosen in die Pfandkiste. Achte auf den Ventilator: Leichte PET-Flaschen treibt der Wind weit ab, schweres Glas kaum. Alle 3 Treffer rückt die Kiste weiter weg.</p><p class="small">Nach oben wischen (Richtung + Länge = Kraft) · oder ← → zielen und Leertaste halten · 3 Fehlwürfe, dann Feierabend<br>Klick oder Leertaste zum Start</p>`);
  raf = requestAnimationFrame(loop);
  document.fonts?.load('10px "Press Start 2P"');

  return {
    pause,
    stop() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      aus();
    },
  };
}
