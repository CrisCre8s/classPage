// Stick-Skater: Strichmännchen auf dem Skateboard. Springen, Tricks in der Luft,
// über Kegel, Kisten und Lücken, auf Geländern grinden, über Rampen fliegen.
import { overlayKlick } from "./eingabe.js";

export const HILFE = "Leertaste/↑ springen (halten = höher) · in der Luft: ↑ Kickflip · ↓ Shove-it · ← Backflip · Handy: tippen springt, wischen = Trick · P: Pause";

const W = 800;
const H = 400;
const BODEN = 330;
const SPIELER_X = 170; // feste Bildschirmposition
const SCHWERKRAFT = 2300;
const SPRUNG = 720;

const STUFEN = {
  leicht: { tempo: 290, max: 430, plus: 5, abstand: [1.6, 2.6], leben: 3, arten: { kegel: 4, kiste: 3, rail: 2, rampe: 2, luecke: 0 } },
  mittel: { tempo: 340, max: 520, plus: 7, abstand: [1.15, 2], leben: 2, arten: { kegel: 4, kiste: 3, rail: 3, rampe: 2, luecke: 2 } },
  schwer: { tempo: 400, max: 640, plus: 9, abstand: [0.85, 1.5], leben: 1, arten: { kegel: 3, kiste: 3, rail: 3, rampe: 2, luecke: 3 } },
};

const TRICKS = {
  kickflip: { name: "Kickflip", dauer: 0.42, punkte: 100 },
  shove: { name: "Shove-it", dauer: 0.38, punkte: 80 },
  backflip: { name: "Backflip", dauer: 0.72, punkte: 300 },
};

const zufall = (a, b) => a + Math.random() * (b - a);

export function start({ canvas, stufe, passeCanvas, status, nachricht, ergebnis }) {
  const S = STUFEN[stufe] || STUFEN.mittel;
  const ctx = passeCanvas(canvas, W, H);

  // Hintergrund einmal erzeugen: zwei Reihen Häuser, Sterne
  const haeuser = [0, 1].map((ebene) => {
    const liste = [];
    let x = 0;
    while (x < 1600) {
      const b = zufall(50, 110);
      liste.push({ x, b, h: ebene ? zufall(60, 150) : zufall(100, 210), fenster: Math.random() < 0.6 });
      x += b + zufall(4, 18);
    }
    return { liste, breite: x };
  });
  const sterne = Array.from({ length: 50 }, () => ({ x: Math.random() * W, y: Math.random() * 190, r: Math.random() < 0.2 ? 1.6 : 1 }));

  let zustand, raf, zuletzt;
  let kam, tempo, hindernisse, naechstesX, punkte, meter, leben, unverwundbar;
  let spieler; // { y, vy, amBoden, auf, gedrueckt, halten, trick, kombi, luftPunkte, sturz, grind }
  let popups, funken;

  function neu() {
    kam = 0;
    tempo = S.tempo;
    hindernisse = [];
    naechstesX = 700;
    punkte = 0;
    meter = 0;
    leben = S.leben;
    unverwundbar = 0;
    spieler = { y: BODEN, vy: 0, amBoden: true, auf: null, halten: 0, haltZeit: 0, trick: null, kombi: [], sturz: null, rampe: null };
    popups = [];
    funken = [];
    erzeuge();
    zeigeStatus();
  }

  // ---------- Strecke ----------
  function waehleArt() {
    const eintraege = Object.entries(S.arten).filter(([, g]) => g > 0);
    let r = Math.random() * eintraege.reduce((a, [, g]) => a + g, 0);
    for (const [art, g] of eintraege) if ((r -= g) <= 0) return art;
    return "kegel";
  }
  function erzeuge() {
    while (naechstesX < kam + W + 400) {
      const art = waehleArt();
      let f;
      if (art === "kegel") f = { art, x: naechstesX, w: 22, h: 30 };
      else if (art === "kiste") f = { art, x: naechstesX, w: zufall(70, 120), h: zufall(38, 52) };
      else if (art === "rail") f = { art, x: naechstesX, w: zufall(170, 270), h: 40 };
      else if (art === "rampe") f = { art, x: naechstesX, w: 90, h: 46 };
      else f = { art, x: naechstesX, w: zufall(80, 120) + tempo * 0.12 };
      hindernisse.push(f);
      let ende = f.x + f.w;
      // auf Schwer folgt hinter einer Rampe manchmal direkt eine Lücke
      if (art === "rampe" && S.arten.luecke && Math.random() < 0.5) {
        const l = { art: "luecke", x: ende + 40, w: zufall(110, 160) };
        hindernisse.push(l);
        ende = l.x + l.w;
      }
      naechstesX = ende + tempo * zufall(...S.abstand);
    }
    hindernisse = hindernisse.filter((f) => f.x + f.w > kam - 100);
  }

  // Oberflächen an Welt-Position x: [{ y, art, f }]
  function oberflaechen(x) {
    const liste = [];
    const luecke = hindernisse.some((f) => f.art === "luecke" && x > f.x && x < f.x + f.w);
    if (!luecke) liste.push({ y: BODEN, art: "boden" });
    for (const f of hindernisse) {
      if (x < f.x || x > f.x + f.w) continue;
      if (f.art === "kiste") liste.push({ y: BODEN - f.h, art: "kiste", f });
      else if (f.art === "rail") liste.push({ y: BODEN - f.h, art: "rail", f });
      else if (f.art === "rampe") liste.push({ y: BODEN - (f.h * (x - f.x)) / f.w, art: "rampe", f });
    }
    return liste;
  }

  // ---------- Spiel ----------
  function zeigeStatus() {
    status(`${Math.floor(punkte + meter)} Pkt · ${Math.floor(meter)} m · ${"♥".repeat(Math.max(0, leben))}`);
  }
  function popup(text, farbe = "#f5d97a") {
    popups.push({ text, x: SPIELER_X, y: spieler.y - 100, t: 0, farbe });
  }

  function springen() {
    const sp = spieler;
    if (zustand !== "laeuft" || sp.sturz) return;
    if (sp.amBoden) {
      sp.vy = -SPRUNG;
      sp.amBoden = false;
      sp.auf = null;
      sp.halten = true;
      sp.haltZeit = 0;
      sp.kombi = [];
    }
  }
  function trick(art) {
    const sp = spieler;
    if (zustand !== "laeuft" || sp.sturz || sp.amBoden || sp.trick) return;
    sp.trick = { art, t: 0 };
  }

  function sturz(grund) {
    const sp = spieler;
    if (sp.sturz || unverwundbar > 0) return;
    sp.sturz = { t: 0, grund, vy: -420, dreh: 0 };
    sp.trick = null;
    sp.kombi = [];
    leben--;
    zeigeStatus();
    popup(grund, "#ff6b81");
  }

  function landen(fl) {
    const sp = spieler;
    // Trick nicht fertig gedreht → Sturz
    if (sp.trick) {
      const tr = TRICKS[sp.trick.art];
      if (sp.trick.t / tr.dauer < 0.8) {
        if (unverwundbar <= 0) {
          sp.y = fl.y;
          sturz("Bail!");
          return;
        }
        // kurz nach dem Neustart: Trick verfällt, aber kein Sturz
      } else sp.kombi.push(sp.trick.art);
      sp.trick = null;
    }
    sp.y = fl.y;
    sp.vy = 0;
    sp.amBoden = true;
    sp.auf = fl;
    sp.halten = false;
    if (sp.kombi.length) {
      const summe = sp.kombi.reduce((a, k) => a + TRICKS[k].punkte, 0) * sp.kombi.length;
      punkte += summe;
      const namen = sp.kombi.map((k) => TRICKS[k].name).join(" + ");
      popup(`${namen}${sp.kombi.length > 1 ? ` ×${sp.kombi.length}` : ""} +${summe}`);
      sp.kombi = [];
      zeigeStatus();
    }
    if (fl.art === "rail") popup("Grind!", "#9fd0ff");
  }

  function schritt(dt) {
    const sp = spieler;
    tempo = Math.min(S.max, tempo + S.plus * dt);
    const vorher = kam;
    if (!sp.sturz || sp.sturz.t < 0.4) kam += tempo * dt * (sp.sturz ? 0.5 : 1);
    meter += (kam - vorher) / 40;
    unverwundbar = Math.max(0, unverwundbar - dt);
    erzeuge();
    const wx = kam + SPIELER_X;

    if (sp.sturz) {
      sp.sturz.t += dt;
      sp.sturz.vy += SCHWERKRAFT * dt;
      sp.y = Math.min(sp.y + sp.sturz.vy * dt, H + 80);
      const boden = oberflaechen(wx).sort((a, b) => a.y - b.y).find((o) => o.y >= sp.y - 4);
      if (boden && sp.y >= boden.y && sp.sturz.vy > 0) {
        sp.y = boden.y;
        sp.sturz.vy *= -0.3;
      }
      sp.sturz.dreh += dt * 7 * (sp.sturz.t < 0.6 ? 1 : 0.2);
      if (sp.sturz.t > 1.1) {
        if (leben <= 0) return ende();
        // weiter geht's: Strecke vor dem Spieler freiräumen
        hindernisse = hindernisse.filter((f) => f.x > wx + 420 || f.x + f.w < wx - 60);
        sp.sturz = null;
        sp.y = BODEN;
        sp.vy = 0;
        sp.amBoden = true;
        sp.auf = { y: BODEN, art: "boden" };
        unverwundbar = 1.6;
        tempo = Math.max(S.tempo, tempo * 0.85);
      }
      return;
    }

    // Tricks drehen sich weiter
    if (sp.trick) sp.trick.t += dt;
    if (sp.trick && sp.trick.t >= TRICKS[sp.trick.art].dauer && !sp.amBoden) {
      sp.kombi.push(sp.trick.art);
      sp.trick = null;
    }

    if (sp.amBoden) {
      // höchste Fläche, die man ohne Sprung erreicht (kleine Stufe nach oben, z. B. die Rampe hinauf)
      const passend = oberflaechen(wx)
        .filter((o) => o.y >= sp.y - 8 && o.y <= sp.y + 6)
        .sort((a, b) => a.y - b.y)[0];
      if (passend) {
        sp.y = passend.y;
        sp.auf = passend;
        if (passend.art === "rail") {
          punkte += Math.round(60 * dt * 10) / 10;
          if (Math.random() < 0.7) funken.push({ x: SPIELER_X - 8, y: sp.y, vx: -zufall(60, 200), vy: -zufall(40, 220), t: 0 });
        }
      } else if (sp.auf?.art === "rampe") {
        // Ende der Rampe: abheben
        sp.amBoden = false;
        sp.vy = -(260 + tempo * 0.9);
        sp.auf = null;
        sp.kombi = [];
        popup("Air!", "#9fd0ff");
      } else {
        sp.amBoden = false; // Kante: fallen
        sp.vy = 0;
        sp.auf = null;
        sp.kombi = [];
      }
    } else {
      const vorherY = sp.y;
      // gehaltene Sprungtaste = höher (kurze Zeit weniger Schwerkraft)
      sp.haltZeit += dt;
      const g = sp.halten && sp.vy < 0 && sp.haltZeit < 0.24 ? SCHWERKRAFT * 0.42 : SCHWERKRAFT;
      sp.vy += g * dt;
      sp.y += sp.vy * dt;
      if (sp.vy > 0) {
        const kandidaten = oberflaechen(wx).filter((o) => vorherY <= o.y + 2 && sp.y >= o.y).sort((a, b) => a.y - b.y);
        if (kandidaten.length) landen(kandidaten[0]);
      }
      if (sp.y > H + 40) {
        sturz("Abgestürzt!");
        return;
      }
    }

    // Zusammenstöße (seitlich)
    for (const f of hindernisse) {
      if (f.art === "kegel" && wx > f.x - 8 && wx < f.x + f.w + 8 && sp.y > BODEN - f.h + 4) sturz("Autsch!");
      if (f.art === "kiste" && wx > f.x - 6 && wx < f.x + f.w && sp.y > BODEN - f.h + 6) sturz("Autsch!");
      if (f.art === "rail" && wx > f.x && wx < f.x + f.w && sp.y > BODEN - f.h + 8 && sp.amBoden && sp.auf?.art === "boden") sturz("Autsch!");
    }
  }

  function ende() {
    zustand = "ende";
    const gesamt = Math.floor(punkte + meter);
    const neuer = ergebnis({ punkte: gesamt });
    nachricht(`<p class="big">Game Over</p><p>${gesamt} Punkte · ${Math.floor(meter)} m${neuer ? " · neuer Highscore!" : ""}</p><p class="small">Leertaste oder Klick für ein neues Spiel</p>`);
  }

  // ---------- Zeichnen ----------
  function zeichneHintergrund() {
    const g = ctx.createLinearGradient(0, 0, 0, BODEN);
    g.addColorStop(0, "#0d0b14");
    g.addColorStop(1, "#231c38");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    for (const s of sterne) ctx.fillRect(s.x, s.y, s.r, s.r);
    // Mond
    ctx.fillStyle = "#f5e6b8";
    ctx.beginPath();
    ctx.arc(650, 70, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a1528";
    ctx.beginPath();
    ctx.arc(660, 64, 20, 0, Math.PI * 2);
    ctx.fill();
    // Häuser in zwei Tiefen (Parallaxe)
    [[0, 0.15, "#1b1630"], [1, 0.4, "#2a2245"]].forEach(([e, f, farbe]) => {
      const { liste, breite } = haeuser[e];
      const off = (kam * f) % breite;
      for (const rep of [0, breite]) {
        for (const h of liste) {
          const x = h.x - off + rep;
          if (x > W || x + h.b < 0) continue;
          ctx.fillStyle = farbe;
          ctx.fillRect(x, BODEN - h.h, h.b, h.h);
          if (h.fenster && e === 1) {
            ctx.fillStyle = "rgba(245, 217, 122, 0.35)";
            for (let fy = BODEN - h.h + 12; fy < BODEN - 20; fy += 18) for (let fx = x + 8; fx < x + h.b - 10; fx += 16) if ((fx * 7 + fy * 3) % 5 < 2) ctx.fillRect(fx, fy, 6, 8);
          }
        }
      }
    });
  }

  function zeichneBoden() {
    ctx.fillStyle = "#17141f";
    ctx.fillRect(0, BODEN, W, H - BODEN);
    ctx.fillStyle = "#3a3550";
    ctx.fillRect(0, BODEN, W, 3);
    // Fugen im Asphalt
    ctx.fillStyle = "#221e2d";
    for (let x = -((kam * 1) % 80); x < W; x += 80) ctx.fillRect(x, BODEN + 3, 2, H - BODEN);
    // Lücken
    for (const f of hindernisse) {
      if (f.art !== "luecke") continue;
      const x = f.x - kam;
      ctx.fillStyle = "#07060a";
      ctx.fillRect(x, BODEN, f.w, H - BODEN);
      ctx.fillStyle = "#e5566f";
      ctx.fillRect(x - 3, BODEN - 2, 3, 8);
      ctx.fillRect(x + f.w, BODEN - 2, 3, 8);
    }
  }

  function zeichneHindernisse() {
    for (const f of hindernisse) {
      const x = f.x - kam;
      if (x > W + 50 || x + f.w < -50) continue;
      if (f.art === "kegel") {
        ctx.fillStyle = "#ff8a3d";
        ctx.beginPath();
        ctx.moveTo(x, BODEN);
        ctx.lineTo(x + f.w / 2, BODEN - f.h);
        ctx.lineTo(x + f.w, BODEN);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x + 6, BODEN - 16, f.w - 12, 4);
        ctx.fillStyle = "#c95a1c";
        ctx.fillRect(x - 3, BODEN - 3, f.w + 6, 3);
      } else if (f.art === "kiste") {
        ctx.fillStyle = "#8a6239";
        ctx.fillRect(x, BODEN - f.h, f.w, f.h);
        ctx.strokeStyle = "#5c3f22";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, BODEN - f.h + 1, f.w - 2, f.h - 2);
        ctx.beginPath();
        ctx.moveTo(x + 4, BODEN - f.h + 4);
        ctx.lineTo(x + f.w - 4, BODEN - 4);
        ctx.stroke();
        ctx.fillStyle = "#b08452";
        ctx.fillRect(x, BODEN - f.h, f.w, 4);
      } else if (f.art === "rail") {
        ctx.fillStyle = "#6c6880";
        for (const px of [x + 10, x + f.w - 14, x + f.w / 2]) ctx.fillRect(px, BODEN - f.h, 4, f.h);
        ctx.fillStyle = "#d4d2de";
        ctx.fillRect(x, BODEN - f.h - 3, f.w, 5);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x, BODEN - f.h - 3, f.w, 1.5);
      } else if (f.art === "rampe") {
        ctx.fillStyle = "#4a4166";
        ctx.beginPath();
        ctx.moveTo(x, BODEN);
        ctx.lineTo(x + f.w, BODEN - f.h);
        ctx.lineTo(x + f.w, BODEN);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#d4b8ff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, BODEN);
        ctx.lineTo(x + f.w, BODEN - f.h);
        ctx.stroke();
      }
    }
  }

  // Strichmännchen + Board. y = Oberkante Board (Füße)
  function zeichneFahrer(t) {
    const sp = spieler;
    const x = SPIELER_X;
    const y = sp.y;
    const blink = unverwundbar > 0 && Math.floor(t / 90) % 2;
    if (blink) return;

    // Pose
    const inLuft = !sp.amBoden && !sp.sturz;
    const grind = sp.amBoden && sp.auf?.art === "rail";
    let hocke = inLuft ? 12 : sp.amBoden && sp.halten ? 6 : 2;
    let drehen = 0;
    let boardX = 1;
    let boardY = 1;
    if (sp.trick) {
      const k = Math.min(1, sp.trick.t / TRICKS[sp.trick.art].dauer);
      if (sp.trick.art === "kickflip") boardY = Math.cos(k * Math.PI * 2);
      if (sp.trick.art === "shove") boardX = Math.cos(k * Math.PI * 2);
      if (sp.trick.art === "backflip") drehen = -k * Math.PI * 2;
    }
    // Board schräg auf der Rampe
    const neigung = sp.amBoden && sp.auf?.art === "rampe" ? -Math.atan2(sp.auf.f.h, sp.auf.f.w) : inLuft ? Math.max(-0.35, Math.min(0.35, sp.vy / 2400)) : 0;

    ctx.save();
    ctx.translate(x, y);
    if (sp.sturz) {
      // Brett fliegt weg, Männchen purzelt
      const s = sp.sturz;
      ctx.save();
      ctx.translate(60 * s.t + 20, -30 * Math.sin(Math.min(1, s.t * 2) * Math.PI));
      ctx.rotate(s.t * 9);
      zeichneBrett(1, 1);
      ctx.restore();
      ctx.translate(-10 * s.t, -18);
      ctx.rotate(-s.dreh);
      ctx.translate(0, 18);
      hocke = 8;
    } else {
      ctx.translate(0, -36);
      ctx.rotate(drehen + neigung);
      ctx.translate(0, 36);
      ctx.save();
      ctx.scale(boardX, 1);
      zeichneBrett(1, boardY);
      ctx.restore();
    }

    // Körper
    const wedeln = grind ? Math.sin(t / 90) * 8 : Math.sin(t / 260) * 2;
    const hy = -40 + hocke * 1.4;
    const sy = -64 + hocke * 1.5;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    // Beine
    ctx.moveTo(-9, -4);
    ctx.lineTo(-8, -22 + hocke);
    ctx.lineTo(0, hy);
    ctx.lineTo(9, -22 + hocke * 0.8);
    ctx.lineTo(10, -4);
    // Rumpf
    ctx.moveTo(0, hy);
    ctx.lineTo(4, sy);
    // Arme
    ctx.moveTo(3, sy + 5);
    ctx.lineTo(-10, sy + 14 - wedeln * 0.6);
    ctx.lineTo(-22, sy + 18 - wedeln);
    ctx.moveTo(4, sy + 5);
    ctx.lineTo(16, sy + 12 + wedeln * 0.6);
    ctx.lineTo(28, sy + 10 + wedeln);
    ctx.stroke();
    // Kopf mit Mütze
    ctx.fillStyle = "#0f0e13";
    ctx.beginPath();
    ctx.arc(7, sy - 11, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#b48ef0";
    ctx.beginPath();
    ctx.arc(7, sy - 13, 8.6, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(7, sy - 14.5, 12, 3);
    ctx.restore();
  }

  function zeichneBrett(sx, sy) {
    ctx.save();
    ctx.scale(sx, Math.abs(sy) < 0.15 ? 0.15 : sy);
    ctx.fillStyle = sy < 0 ? "#f5d97a" : "#b48ef0"; // Unterseite gelb, oben lila
    ctx.beginPath();
    ctx.moveTo(-24, -4);
    ctx.lineTo(24, -4);
    ctx.quadraticCurveTo(29, -4, 29, -8);
    ctx.lineTo(29, -1);
    ctx.lineTo(-29, -1);
    ctx.lineTo(-29, -8);
    ctx.quadraticCurveTo(-29, -4, -24, -4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#f5d97a";
    for (const wx of [-15, 15]) {
      ctx.beginPath();
      ctx.arc(wx, 3, 3.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function zeichneEffekte(dt) {
    // Funken beim Grinden
    funken = funken.filter((f) => (f.t += dt) < 0.35);
    for (const f of funken) {
      ctx.fillStyle = `rgba(255, ${200 + Math.random() * 55}, 120, ${1 - f.t / 0.35})`;
      ctx.fillRect(f.x + f.vx * f.t, f.y + f.vy * f.t + 600 * f.t * f.t, 2.5, 2.5);
    }
    // Punkte-Einblendungen
    popups = popups.filter((p) => (p.t += dt) < 1.1);
    ctx.textAlign = "center";
    ctx.font = '12px "Press Start 2P", monospace';
    for (const p of popups) {
      ctx.globalAlpha = 1 - Math.max(0, p.t - 0.7) / 0.4;
      ctx.fillStyle = "#0f0e13";
      ctx.fillText(p.text, p.x + 2, p.y - p.t * 40 + 2);
      ctx.fillStyle = p.farbe;
      ctx.fillText(p.text, p.x, p.y - p.t * 40);
      ctx.globalAlpha = 1;
    }
  }

  function zeichne(t, dt) {
    zeichneHintergrund();
    zeichneBoden();
    zeichneHindernisse();
    zeichneFahrer(t);
    zeichneEffekte(dt);
  }

  function loop(t) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.033, (t - (zuletzt || t)) / 1000);
    zuletzt = t;
    if (zustand === "laeuft") {
      schritt(dt);
      if (zustand === "laeuft") zeigeStatusSelten(t);
    }
    zeichne(t, zustand === "laeuft" ? dt : 0);
  }
  let statusZeit = 0;
  function zeigeStatusSelten(t) {
    if (t - statusZeit > 150) {
      statusZeit = t;
      zeigeStatus();
    }
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
    nachricht(`<p class="big">Pause</p><p class="small">Leertaste oder Klick zum Weiterfahren</p>`);
  }

  // ---------- Eingabe ----------
  const onKeyDown = (e) => {
    if (e.target.closest?.("input, select, textarea")) return;
    const k = e.key;
    if ([" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "W", "s", "S", "a", "A"].includes(k)) e.preventDefault();
    if (e.repeat) return;
    if (k === "p" || k === "P" || k === "Escape") return zustand === "laeuft" ? pause() : null;
    if (zustand !== "laeuft") {
      if (k === " " || k === "Enter" || k === "ArrowUp") los();
      return;
    }
    if (k === " " || k === "ArrowUp" || k === "w" || k === "W") {
      if (spieler.amBoden) springen();
      else trick("kickflip");
    } else if (k === "ArrowDown" || k === "s" || k === "S") trick("shove");
    else if (k === "ArrowLeft" || k === "a" || k === "A") trick("backflip");
  };
  const onKeyUp = (e) => {
    if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") spieler.halten = false;
  };
  // Touch/Maus: antippen springt (halten = höher), wischen in der Luft = Trick, Tippen in der Luft = Kickflip
  let zeiger = null;
  const onDown = (e) => {
    if (zustand !== "laeuft") return los();
    zeiger = { x: e.clientX, y: e.clientY, warAmBoden: spieler.amBoden, gewischt: false };
    if (spieler.amBoden) springen();
  };
  const onMove = (e) => {
    if (!zeiger || zeiger.gewischt) return;
    const dx = e.clientX - zeiger.x;
    const dy = e.clientY - zeiger.y;
    if (Math.hypot(dx, dy) < 26) return;
    zeiger.gewischt = true;
    if (Math.abs(dy) > Math.abs(dx)) trick(dy < 0 ? "kickflip" : "shove");
    else if (dx < 0) trick("backflip");
    else trick("kickflip");
  };
  const onUp = () => {
    if (zeiger && !zeiger.gewischt && !zeiger.warAmBoden) trick("kickflip");
    zeiger = null;
    spieler.halten = false;
  };
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  const ausOverlay = overlayKlick(() => zustand !== "laeuft" && los());

  zustand = "bereit";
  neu();
  nachricht(`<p class="big">Stick-Skater</p><p>Spring über Kegel, Kisten und Lücken, grinde auf Geländern und flieg über Rampen. Tricks in der Luft geben Punkte, aber nur, wenn du sie zu Ende drehst.</p><p class="small">${S.leben} ${S.leben === 1 ? "Leben" : "Leben"} · Leertaste, ↑ oder Klick zum Start</p>`);
  raf = requestAnimationFrame(loop);
  document.fonts?.load('12px "Press Start 2P"');

  return {
    pause,
    stop() {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      ausOverlay();
    },
  };
}
