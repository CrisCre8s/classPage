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

// Ein Modus: alle 10 Serverschränke beginnt ein neuer Abschnitt, schneller und mit engeren Lücken
const PRO_ABSCHNITT = 10;
const BANNER_DAUER = 1.1; // Sekunden, die der Abschnitts-Hinweis sichtbar ist
function werte(a) {
  return {
    luecke: Math.max(118, 178 - a * 9),
    tempo: Math.min(300, 140 + a * 20),
    abstand: Math.max(200, 250 - a * 7),
    schwerkraft: Math.min(1700, 1300 + a * 60),
    sprung: Math.max(-450, -400 - a * 8),
  };
}
const ABSCHNITT_FARBE = ["#5fc39c", "#7fb8ff", "#f5d97a", "#f0a35e", "#e5566f", "#c8a2ff"];

// Flatter-PC zeichnet glatt und in hoher Auflösung (mindestens doppelt, bis dreifach) statt in groben Pixeln
function hdCanvas(ctx, canvas) {
  const dpr = Math.min(3, Math.max(2, window.devicePixelRatio || 1));
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
  return ctx;
}
// fester Zufall: gleiche Zahl rein, gleiche Zahl raus (damit Hintergrund-Schränke beim Scrollen gleich bleiben)
function zufall(i, s = 0) {
  const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return x - Math.floor(x);
}
function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}
// schwebende Staub-/Datenteilchen im Rechenzentrum
const STAUB = Array.from({ length: 46 }, (_, i) => ({ x: zufall(i, 7) * (W + 20), y: 40 + zufall(i, 8) * (BODEN - 60), z: 0.2 + zufall(i, 9) * 0.8, ph: zufall(i, 10) * 6.28, tw: 0.6 + zufall(i, 11) * 1.8 }));

export function start({ canvas, passeCanvas, status, nachricht, ergebnis }) {
  let S = werte(0);
  let abschnitt = 0;
  let banner = null;
  const ctx = hdCanvas(passeCanvas(canvas, W, H), canvas);
  let pc, racks, punkte, zustand, raf, zuletzt, boden, funken, wackel;
  // Animationen: zurückgelegte Strecke (Parallaxe), Datenspur, Strecken beim Flattern, Freude beim Punkt
  let welt = 0;
  let spur = [];
  let stauch = 0;
  let freude = 0;
  let blinzeln = 2;
  let absturzZeit = 0;

  function neu() {
    pc = { y: H / 2 - 40, v: 0 };
    racks = [];
    punkte = 0;
    boden = 0;
    funken = [];
    wackel = 0;
    spur = [];
    stauch = 0;
    freude = 0;
    abschnitt = 0;
    S = werte(0);
    banner = null;
    for (let i = 0; i < 3; i++) neuesRack(W + 120 + i * S.abstand);
    zeigeStatus();
  }
  function neuesRack(x) {
    const rand = 70;
    const luecke = S.luecke;
    const mitte = rand + luecke / 2 + Math.random() * (BODEN - 2 * rand - luecke);
    // jede Hälfte bekommt eigene blinkende Lämpchen
    const leds = Array.from({ length: 24 }, () => ({ an: Math.random() < 0.6, takt: 0.3 + Math.random() * 1.4, farbe: Math.random() < 0.8 ? ABSCHNITT_FARBE[abschnitt % ABSCHNITT_FARBE.length] : "#f2f2f3" }));
    racks.push({ x, mitte, luecke: S.luecke, gezaehlt: false, leds, farbe: ABSCHNITT_FARBE[abschnitt % ABSCHNITT_FARBE.length] });
  }
  const zeigeStatus = () => status(`${punkte} Pkt · Abschnitt ${abschnitt + 1}`);

  function flattern() {
    if (zustand !== "laeuft") return los();
    pc.v = S.sprung;
    stauch = 1;
  }

  function schritt(dt) {
    pc.v = Math.min(pc.v + S.schwerkraft * dt, 620);
    pc.y += pc.v * dt;
    boden = (boden + S.tempo * dt) % 32;
    // mit der Zeit etwas schneller
    const tempo = S.tempo * (1 + (punkte % PRO_ABSCHNITT) * 0.006);
    welt += tempo * dt;
    spur.push({ y: pc.y + PC_H / 2 + 2, t: 0 });
    for (const p of spur) {
      p.t += dt;
      p.x = PC_X - 2 - p.t * tempo;
    }
    spur = spur.filter((p) => p.t < 0.32);
    for (const r of racks) {
      r.x -= tempo * dt;
      if (!r.gezaehlt && r.x + RACK_B < PC_X) {
        r.gezaehlt = true;
        punkte++;
        if (punkte % PRO_ABSCHNITT === 0) {
          abschnitt++;
          S = werte(abschnitt);
          banner = { t: 0, text: `ABSCHNITT ${abschnitt + 1} · SCHNELLER` };
        }
        zeigeStatus();
        freude = 0.5;
        for (let i = 0; i < 8; i++) funken.push({ x: PC_X, y: pc.y + PC_H / 2, vx: -40 - Math.random() * 90, vy: (Math.random() - 0.5) * 140, t: 0.55, farbe: "#f5d97a" });
      }
    }
    if (racks[0].x < -RACK_B - 10) {
      racks.shift();
      neuesRack(racks[racks.length - 1].x + S.abstand);
    }
    // Kollision (etwas nachsichtig: 3 px Rand)
    const k = 3;
    if (pc.y < -40) pc.y = -40;
    if (pc.y + PC_H >= BODEN) return crash();
    for (const r of racks) {
      if (PC_X + PC_B - k < r.x || PC_X + k > r.x + RACK_B) continue;
      if (pc.y + k < r.mitte - r.luecke / 2 || pc.y + PC_H - k > r.mitte + r.luecke / 2) return crash();
    }
  }
  function crash() {
    zustand = "ende";
    wackel = 0.3;
    absturzZeit = 0;
    spur = [];
    for (let i = 0; i < 18; i++) {
      const w = Math.random() * Math.PI * 2;
      const v = 60 + Math.random() * 140;
      funken.push({ x: PC_X + PC_B / 2, y: pc.y + PC_H / 2, vx: Math.cos(w) * v, vy: Math.sin(w) * v, t: 0.7, farbe: i % 3 ? "#e5566f" : "#f5d97a" });
    }
    const neuer = ergebnis({ punkte });
    nachricht(`<p class="big">Absturz!</p><p>${punkte} ${punkte === 1 ? "Serverschrank" : "Serverschränke"} geschafft · Abschnitt ${abschnitt + 1}${neuer ? " · neuer Highscore!" : ""}</p><p class="small">Leertaste oder Klick für einen neuen Flug</p>`);
  }

  // ---------- Zeichnen ----------
  // Hintergrund: Rechenzentrum mit Tiefe (zwei Schrank-Reihen, Kabeltrasse, Lampen, schwebender Staub)
  function zeichneHintergrund(t, farbe) {
    const g = ctx.createLinearGradient(0, 0, 0, BODEN);
    g.addColorStop(0, "#08070d");
    g.addColorStop(0.55, "#110f18");
    g.addColorStop(1, "#1a1724");
    ctx.fillStyle = g;
    ctx.fillRect(-10, -10, W + 20, BODEN + 20);
    // farbiges Leuchten des aktuellen Abschnitts
    const glow = ctx.createRadialGradient(W / 2, BODEN * 0.62, 10, W / 2, BODEN * 0.62, 340);
    glow.addColorStop(0, rgba(farbe, 0.13));
    glow.addColorStop(1, rgba(farbe, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, BODEN);

    // hintere Schrankreihe (langsam)
    let off = welt * 0.12;
    for (let i = Math.floor(off / 46) - 1; i * 46 - off < W + 46; i++) {
      const x = i * 46 - off;
      const oben = 170 + zufall(i, 1) * 100;
      ctx.fillStyle = "#13121a";
      ctx.beginPath();
      ctx.roundRect(x, oben, 34, BODEN - oben, [3, 3, 0, 0]);
      ctx.fill();
      for (let k = 0; oben + 10 + k * 11 < BODEN - 8; k++) {
        if (zufall(i * 31 + k, 2) < 0.55) continue;
        const an = Math.sin(t * (0.6 + zufall(i + k, 3) * 2) + i + k) > -0.3;
        ctx.fillStyle = an ? rgba(zufall(i * 7 + k, 4) < 0.75 ? farbe : "#f2f2f3", 0.35) : "rgba(255,255,255,0.05)";
        ctx.fillRect(x + 5, oben + 10 + k * 11, 2, 2);
      }
    }
    // Dunst zwischen den Reihen
    const dunst = ctx.createLinearGradient(0, BODEN - 220, 0, BODEN);
    dunst.addColorStop(0, "rgba(30,27,42,0)");
    dunst.addColorStop(1, "rgba(30,27,42,0.55)");
    ctx.fillStyle = dunst;
    ctx.fillRect(0, BODEN - 220, W, 220);

    // vordere Schrankreihe (mittleres Tempo)
    off = welt * 0.34;
    for (let i = Math.floor(off / 84) - 1; i * 84 - off < W + 84; i++) {
      const x = i * 84 - off + 14;
      const oben = 120 + zufall(i, 5) * 90;
      const sg = ctx.createLinearGradient(x, 0, x + 54, 0);
      sg.addColorStop(0, "#1d1b27");
      sg.addColorStop(1, "#16141e");
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.roundRect(x, oben, 54, BODEN - oben, [4, 4, 0, 0]);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      ctx.fillRect(x, oben + 4, 1.5, BODEN - oben - 4);
      for (let k = 0; oben + 14 + k * 14 < BODEN - 10; k++) {
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.fillRect(x + 6, oben + 10 + k * 14, 42, 10);
        if (zufall(i * 17 + k, 6) < 0.4) continue;
        const an = Math.sin(t * (0.8 + zufall(i + k, 12) * 2.5) + k * 1.7 + i) > 0;
        if (!an) continue;
        const c = zufall(i * 3 + k, 13) < 0.7 ? farbe : "#f2f2f3";
        ctx.fillStyle = rgba(c, 0.12);
        ctx.fillRect(x + 8, oben + 12 + k * 14, 8, 6);
        ctx.fillStyle = rgba(c, 0.6);
        ctx.fillRect(x + 10, oben + 14 + k * 14, 3, 2);
      }
    }

    // Luftperspektive: beide Hintergrund-Reihen etwas zurücknehmen, damit die echten Hindernisse klar vorne stehen
    ctx.fillStyle = "rgba(9,8,13,0.42)";
    ctx.fillRect(0, 0, W, BODEN);

    // Kabeltrasse und Deckenlampen
    ctx.fillStyle = "#0d0c12";
    ctx.fillRect(0, 0, W, 16);
    ctx.fillStyle = "#1c1a25";
    ctx.fillRect(0, 16, W, 2);
    ctx.strokeStyle = "#1a1823";
    ctx.lineWidth = 2.5;
    off = welt * 0.34;
    for (let i = Math.floor(off / 60) - 1; i * 60 - off < W + 60; i++) {
      const x = i * 60 - off;
      const tief = 10 + zufall(i, 14) * 14;
      ctx.beginPath();
      ctx.moveTo(x, 17);
      ctx.quadraticCurveTo(x + 30, 17 + tief, x + 60, 17);
      ctx.stroke();
    }
    for (let i = Math.floor(off / 170) - 1; i * 170 - off < W + 170; i++) {
      const x = i * 170 - off + 60;
      const flacker = 0.85 + 0.15 * Math.sin(t * 2 + i * 3);
      const kegel = ctx.createLinearGradient(0, 18, 0, 260);
      kegel.addColorStop(0, `rgba(220,215,255,${0.07 * flacker})`);
      kegel.addColorStop(1, "rgba(220,215,255,0)");
      ctx.fillStyle = kegel;
      ctx.beginPath();
      ctx.moveTo(x - 10, 20);
      ctx.lineTo(x + 10, 20);
      ctx.lineTo(x + 70, 260);
      ctx.lineTo(x - 70, 260);
      ctx.fill();
      ctx.fillStyle = `rgba(235,232,255,${0.55 * flacker})`;
      ctx.beginPath();
      ctx.roundRect(x - 12, 17, 24, 3, 1.5);
      ctx.fill();
    }

    // schwebender Staub
    for (const p of STAUB) {
      const x = ((((p.x - welt * p.z * 0.5 - t * 6) % (W + 20)) + W + 20) % (W + 20)) - 10;
      const y = p.y + Math.sin(t * 0.5 + p.ph) * 6;
      ctx.fillStyle = `rgba(230,225,255,${(0.08 + 0.22 * (0.5 + 0.5 * Math.sin(t * p.tw + p.ph))) * p.z})`;
      ctx.beginPath();
      ctx.arc(x, y, 0.6 + p.z * 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function zeichneBoden(farbe) {
    const g = ctx.createLinearGradient(0, BODEN, 0, H);
    g.addColorStop(0, "#221f2d");
    g.addColorStop(1, "#110f17");
    ctx.fillStyle = g;
    ctx.fillRect(-10, BODEN, W + 20, H - BODEN + 10);
    // Spiegelung des Abschnitt-Leuchtens
    const sp = ctx.createRadialGradient(PC_X + 20, BODEN, 0, PC_X + 20, BODEN, 160);
    sp.addColorStop(0, rgba(farbe, 0.12));
    sp.addColorStop(1, rgba(farbe, 0));
    ctx.fillStyle = sp;
    ctx.fillRect(0, BODEN, W, H - BODEN);
    // Doppelboden-Platten mit leichter Perspektive
    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.lineWidth = 1.5;
    for (let x = -boden - 32; x < W + 32; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, BODEN + 2);
      ctx.lineTo(x + (x - W / 2) * 0.35, H);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(0, BODEN + 18);
    ctx.lineTo(W, BODEN + 18);
    ctx.stroke();
    // Kante mit Lichtkante
    ctx.fillStyle = rgba(farbe, 0.55);
    ctx.fillRect(0, BODEN, W, 1.5);
    const kante = ctx.createLinearGradient(0, BODEN - 14, 0, BODEN);
    kante.addColorStop(0, rgba(farbe, 0));
    kante.addColorStop(1, rgba(farbe, 0.1));
    ctx.fillStyle = kante;
    ctx.fillRect(0, BODEN - 14, W, 14);
  }

  function zeichneRack(x, y, h, oben, r, t) {
    const g = ctx.createLinearGradient(x, 0, x + RACK_B, 0);
    g.addColorStop(0, "#34303f");
    g.addColorStop(0.15, "#2c2937");
    g.addColorStop(1, "#211f29");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, RACK_B, h);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(x + 1, y, 1.5, h);
    // Abschlussblende an der Lücke, mit feiner Lichtkante
    const by = oben ? y + h - 14 : y;
    ctx.fillStyle = "#3f3a4c";
    ctx.beginPath();
    ctx.roundRect(x - 4, by, RACK_B + 8, 14, 3);
    ctx.fill();
    ctx.fillStyle = rgba(r.farbe, 0.7);
    ctx.fillRect(x - 2, oben ? by + 12 : by + 1, RACK_B + 4, 1);
    // Einschübe mit Lämpchen
    const start = oben ? y + h - 14 - 18 : y + 14 + 4;
    let i = 0;
    for (let yy = start; oben ? yy > y : yy < y + h - 14; yy += oben ? -18 : 18) {
      ctx.fillStyle = "#18161e";
      ctx.beginPath();
      ctx.roundRect(x + 8, yy, RACK_B - 16, 14, 2);
      ctx.fill();
      const led = r.leds[i++ % r.leds.length];
      const an = led.an !== (Math.floor(t / led.takt) % 2 === 0);
      if (an) {
        ctx.fillStyle = rgba(led.farbe, 0.18);
        ctx.beginPath();
        ctx.arc(x + 14, yy + 7, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = an ? led.farbe : "#2d3a34";
      ctx.beginPath();
      ctx.arc(x + 14, yy + 7, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#34303f";
      ctx.fillRect(x + 22, yy + 6, RACK_B - 36, 2);
    }
  }

  // Flügel aus Lüftergitter-Lamellen, am hinteren Gehäuse befestigt
  function fluegel(winkel, hell) {
    ctx.save();
    ctx.translate(-14, -2);
    ctx.rotate(winkel);
    const lamellen = [[15, -1], [12, 3], [8.5, 7]];
    for (const [l, yy] of lamellen) {
      const g = ctx.createLinearGradient(-l, 0, 0, 0);
      g.addColorStop(0, hell ? "#e4d4ff" : "#8f74c4");
      g.addColorStop(1, hell ? "#b48cf5" : "#6c55a0");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(-l, yy - 1.8, l + 2, 3.6, 1.8);
      ctx.fill();
    }
    ctx.restore();
  }

  // Der Bildschirm: ohne Standfuß, leicht nach rechts gedreht (man sieht links die Gehäuseseite)
  function zeichnePC(t) {
    const kaputt = zustand === "ende";
    const steigt = zustand === "laeuft" && pc.v < -120;

    // Datenspur hinter dem Bildschirm
    for (const p of spur) {
      const k = 1 - p.t / 0.32;
      ctx.fillStyle = `rgba(200,162,255,${0.35 * k})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 0.8 + 3 * k, 0, Math.PI * 2);
      ctx.fill();
    }

    const neig = Math.max(-0.45, Math.min(0.7, pc.v / 700));
    ctx.save();
    ctx.translate(PC_X + PC_B / 2, pc.y + PC_H / 2);
    ctx.rotate(neig);
    // beim Flattern kurz in die Höhe strecken
    const e = Math.sin(stauch * Math.PI);
    ctx.scale(1 - e * 0.08, 1 + e * 0.1);
    // weicher Schatten/Glow ums Gerät
    ctx.shadowColor = kaputt ? "rgba(229,86,111,0.5)" : "rgba(127,224,176,0.28)";
    ctx.shadowBlur = 14;

    const schlag = steigt ? Math.sin(t * 38) * 0.75 - 0.15 : zustand === "laeuft" ? -0.25 + Math.sin(t * 5) * 0.08 : Math.sin(t * 4) * 0.25;
    // hinterer Flügel
    ctx.save();
    ctx.translate(2, -4);
    fluegel(schlag * 0.8 - 0.25, false);
    ctx.restore();

    // Gehäuseseite (perspektivisch, schmaler nach hinten)
    const sg = ctx.createLinearGradient(-21, 0, -12, 0);
    sg.addColorStop(0, "#8e88a0");
    sg.addColorStop(1, "#b2acc2");
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.moveTo(-12, -14);
    ctx.lineTo(-20, -10);
    ctx.quadraticCurveTo(-21.5, 0, -20, 10);
    ctx.lineTo(-12, 14);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    // Lüftungsschlitze an der Seite
    ctx.strokeStyle = "rgba(60,55,75,0.55)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(-18.5, -5 + i * 3.2);
      ctx.lineTo(-14, -5.6 + i * 3.6);
      ctx.stroke();
    }

    // Front-Rahmen
    ctx.shadowBlur = 10;
    const rg = ctx.createLinearGradient(0, -15, 0, 15);
    rg.addColorStop(0, "#fbfaff");
    rg.addColorStop(1, "#cbc6d8");
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.roundRect(-13, -15, 33, 30, 6);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-8, -14.3);
    ctx.lineTo(15, -14.3);
    ctx.stroke();

    // Bildschirm
    const schirm = [-10, -12, 27, 21, 4];
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(...schirm);
    ctx.clip();
    const bg = ctx.createLinearGradient(0, -12, 0, 9);
    bg.addColorStop(0, kaputt ? "#3a1420" : "#173049");
    bg.addColorStop(1, kaputt ? "#1c0a10" : "#0b1521");
    ctx.fillStyle = bg;
    ctx.fillRect(-10, -12, 27, 21);
    // Gesicht leuchtet
    const gesicht = kaputt ? "#e5566f" : "#7fe0b0";
    const flimmer = kaputt ? (absturzZeit < 0.5 && Math.sin(absturzZeit * 60) > 0 ? 0.35 : 1) : 1;
    ctx.globalAlpha = flimmer;
    ctx.shadowColor = gesicht;
    ctx.shadowBlur = 6;
    ctx.fillStyle = gesicht;
    ctx.strokeStyle = gesicht;
    ctx.lineCap = "round";
    // Blick folgt der Flugrichtung; Augen sitzen rechts von der Mitte (schaut nach rechts)
    const blick = Math.max(-1.6, Math.min(1.6, pc.v / 350));
    const ex = [3, 11.5];
    const ey = -5 + blick;
    if (kaputt) {
      ctx.lineWidth = 1.6;
      for (const x of ex) {
        ctx.beginPath();
        ctx.moveTo(x - 2, ey - 2);
        ctx.lineTo(x + 2, ey + 2);
        ctx.moveTo(x + 2, ey - 2);
        ctx.lineTo(x - 2, ey + 2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(7.3, 7 + blick * 0.3, 3, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    } else if (freude > 0) {
      // glückliche ^ ^ Augen nach einem Punkt
      ctx.lineWidth = 1.6;
      for (const x of ex) {
        ctx.beginPath();
        ctx.moveTo(x - 2, ey + 1);
        ctx.lineTo(x, ey - 1.5);
        ctx.lineTo(x + 2, ey + 1);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(7.3, 1 + blick * 0.5, 3.5, Math.PI * 0.1, Math.PI * 0.9);
      ctx.stroke();
    } else {
      const auf = blinzeln < 0 ? 0.15 : 1;
      for (const x of ex) {
        ctx.beginPath();
        ctx.roundRect(x - 1.6, ey - 2.6 * auf, 3.2, 5.2 * auf, 1.6);
        ctx.fill();
      }
      ctx.lineWidth = 1.5;
      if (steigt) {
        // kleines "o" vor Anstrengung
        ctx.beginPath();
        ctx.ellipse(7.3, 3 + blick * 0.5, 1.6, 2, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(7.3, 0.5 + blick * 0.5, 3.5, Math.PI * 0.18, Math.PI * 0.82);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    // Bäckchen
    if (!kaputt) {
      ctx.fillStyle = "rgba(255,140,170,0.22)";
      for (const x of [-1, 15]) {
        ctx.beginPath();
        ctx.ellipse(x, 1.5, 2.2, 1.3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Bildzeilen und wandernder Lichtschimmer
    ctx.fillStyle = "rgba(0,0,0,0.13)";
    for (let y = -12; y < 9; y += 2) ctx.fillRect(-10, y, 27, 0.7);
    const sx = ((t * 30) % 90) - 30;
    const sh = ctx.createLinearGradient(sx - 6, 0, sx + 6, 0);
    sh.addColorStop(0, "rgba(255,255,255,0)");
    sh.addColorStop(0.5, "rgba(255,255,255,0.09)");
    sh.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sh;
    ctx.save();
    ctx.transform(1, 0, -0.5, 1, 0, 0);
    ctx.fillRect(sx - 6, -12, 12, 21);
    ctx.restore();
    // Glasspiegelung oben links
    const gl = ctx.createLinearGradient(-10, -12, 4, 2);
    gl.addColorStop(0, "rgba(255,255,255,0.14)");
    gl.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gl;
    ctx.fillRect(-10, -12, 27, 21);
    ctx.restore();
    ctx.strokeStyle = "rgba(40,36,55,0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(...schirm);
    ctx.stroke();

    // Betriebslämpchen unten rechts, pulsiert
    const puls = kaputt ? 0.6 : 0.55 + 0.45 * Math.sin(t * 3);
    ctx.fillStyle = kaputt ? "#e5566f" : `rgba(127,224,176,${puls})`;
    ctx.shadowColor = kaputt ? "#e5566f" : "#7fe0b0";
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.arc(15.5, 12, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // vorderer Flügel über der Gehäuseseite
    fluegel(schlag, true);
    ctx.restore();
  }

  function zeichne(t) {
    ctx.save();
    if (wackel > 0) ctx.translate((Math.random() - 0.5) * 8 * wackel * 3, (Math.random() - 0.5) * 8 * wackel * 3);
    const farbe = ABSCHNITT_FARBE[abschnitt % ABSCHNITT_FARBE.length];
    zeichneHintergrund(t, farbe);
    for (const r of racks) {
      const oben = r.mitte - r.luecke / 2;
      const unten = r.mitte + r.luecke / 2;
      zeichneRack(r.x, -10, oben + 10, true, r, t);
      zeichneRack(r.x, unten, BODEN - unten, false, r, t + 0.7);
    }
    zeichneBoden(farbe);
    for (const f of funken) {
      ctx.globalAlpha = Math.min(1, f.t * 2);
      ctx.fillStyle = rgba(f.farbe, 0.25);
      ctx.beginPath();
      ctx.arc(f.x, f.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = f.farbe;
      ctx.beginPath();
      ctx.arc(f.x, f.y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    zeichnePC(t);
    // Vignette
    const v = ctx.createRadialGradient(W / 2, H / 2, 180, W / 2, H / 2, 430);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,0.5)");
    ctx.fillStyle = v;
    ctx.fillRect(-10, -10, W + 20, H + 20);
    // Punkte groß oben
    ctx.fillStyle = "#f2f2f3";
    ctx.font = '28px "Press Start 2P", monospace';
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 8;
    ctx.fillText(String(punkte), W / 2, 60);
    ctx.shadowBlur = 0;
    // Fortschritt bis zum nächsten Abschnitt
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.roundRect(W / 2 - 60, 74, 120, 4, 2);
    ctx.fill();
    ctx.fillStyle = farbe;
    ctx.beginPath();
    ctx.roundRect(W / 2 - 60, 74, Math.max(4, (120 * (punkte % PRO_ABSCHNITT)) / PRO_ABSCHNITT), 4, 2);
    ctx.fill();
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillStyle = banner ? farbe : "#8a8698";
    ctx.fillText(`ABSCHNITT ${abschnitt + 1}`, W / 2, 94);
    if (banner) {
      // Abschnitts-Hinweis unter der Fortschrittsanzeige: springt kurz auf, leuchtet, Glanz läuft durch, Funken stieben seitlich weg
      const k = banner.t / BANNER_DAUER;
      const a = k < 0.12 ? k / 0.12 : k > 0.7 ? (1 - k) / 0.3 : 1;
      const p = Math.min(1, k / 0.2);
      const pop = 1 + 2.2 * Math.pow(p - 1, 3) + 1.2 * Math.pow(p - 1, 2); // leichtes Überschwingen
      const y = 118;
      // Fortschrittsleiste blitzt in der neuen Farbe auf, ein Ring weitet sich
      if (k < 0.45) {
        const r = k / 0.45;
        ctx.strokeStyle = rgba(farbe, 0.6 * (1 - r));
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(W / 2 - 60 - r * 14, 74 - r * 6, 120 + r * 28, 4 + r * 12, 4 + r * 6);
        ctx.stroke();
      }
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(W / 2, y - 4);
      ctx.scale(0.7 + 0.3 * pop, 0.7 + 0.3 * pop);
      ctx.font = '9px "Press Start 2P", monospace';
      const b = ctx.measureText(banner.text).width + 24;
      // Pille mit Glühen und feinem Rand in der Abschnittsfarbe
      ctx.shadowColor = farbe;
      ctx.shadowBlur = 14 * (1 - k * 0.6);
      ctx.fillStyle = "rgba(15,14,19,0.78)";
      ctx.beginPath();
      ctx.roundRect(-b / 2, -10, b, 20, 10);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = rgba(farbe, 0.65);
      ctx.lineWidth = 1;
      ctx.stroke();
      // Glanz, der einmal durchläuft
      if (k > 0.12 && k < 0.6) {
        ctx.save();
        ctx.clip();
        const gx = -b / 2 - 20 + ((k - 0.12) / 0.48) * (b + 40);
        const gl = ctx.createLinearGradient(gx - 14, 0, gx + 14, 0);
        gl.addColorStop(0, "rgba(255,255,255,0)");
        gl.addColorStop(0.5, "rgba(255,255,255,0.22)");
        gl.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = gl;
        ctx.fillRect(-b / 2, -10, b, 20);
        ctx.restore();
      }
      ctx.fillStyle = farbe;
      ctx.shadowColor = farbe;
      ctx.shadowBlur = 6;
      ctx.fillText(banner.text, 0, 4);
      ctx.shadowBlur = 0;
      // kleine Funken an beiden Enden
      for (let i = 0; i < 8; i++) {
        const seite = i % 2 ? 1 : -1;
        const w = (i * 0.9 + 0.3) % 1.4 - 0.7;
        const d = Math.min(1, k * 2.2);
        const fx = seite * (b / 2 + 2 + d * (14 + (i % 3) * 6));
        const fy = w * d * 18;
        ctx.globalAlpha = a * (1 - d) * 0.9;
        ctx.fillStyle = i % 3 ? farbe : "#f2f2f3";
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-1.5, -1.5, 3, 3);
        ctx.restore();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  function loop(t) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.034, (t - (zuletzt || t)) / 1000);
    zuletzt = t;
    if (zustand === "laeuft") schritt(dt);
    else if (zustand === "bereit") {
      pc.y = H / 2 - 40 + Math.sin(t / 300) * 8;
      welt += 24 * dt; // Hintergrund zieht im Startbildschirm langsam vorbei
    }
    if (zustand !== "pause") {
      for (const f of funken) {
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.vy += 160 * dt;
        f.t -= dt;
      }
      funken = funken.filter((f) => f.t > 0);
      stauch = Math.max(0, stauch - dt * 6);
      freude = Math.max(0, freude - dt);
      blinzeln -= dt;
      if (blinzeln < -0.14) blinzeln = 2 + Math.random() * 2.5;
      if (zustand === "ende") absturzZeit += dt;
    }
    if (wackel > 0) wackel -= dt;
    if (banner && zustand === "laeuft" && (banner.t += dt) > BANNER_DAUER) banner = null;
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
  nachricht(`<p class="big">Flatter-PC</p><p>Halt den kleinen Computer in der Luft und flieg durch die Lücken zwischen den Serverschränken. Jeder Schrank gibt einen Punkt, alle 10 Schränke beginnt ein neuer Abschnitt: schneller und mit engeren Lücken.</p><p class="small">Leertaste, Klick oder Tippen zum Start</p>`);
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
