// Enten-Weitschlag: Die Debug-Ente fällt vom Regal, im richtigen Moment mit der Tastatur wegschlagen.
// Timing bestimmt Kraft und Winkel. Bürostühle lassen sie hochspringen, Kaffeepfützen bremsen.
// 5 Versuche, der weiteste zählt. Punkte = Weite in Dezimetern.
import { overlayKlick } from "./eingabe.js";

export const HILFE = "1. Klick/Leertaste: Ente fallen lassen · 2. Klick/Leertaste: zuschlagen, wenn sie auf Hüfthöhe ist (grüne Zone) · 5 Versuche, der weiteste zählt";

const W = 640;
const H = 400;
const BODEN = 340; // Bildschirm-y des Bodens
const PX = 14; // Pixel pro Meter
const G = 9.81;
const VERSUCHE = 5;
const SCHLAG_X = 2.2; // wo die Tastatur trifft (Meter)
const FALL_START = 3.4; // Höhe des Regals
const SUESS = 1.05; // beste Schlaghöhe
const ZONE = 0.55; // ± um die beste Höhe

export function start({ canvas, passeCanvas, status, nachricht, ergebnis }) {
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

  let zustand, raf, zuletzt, ente, phase, kamera, versuch, weiten, schwung, texte, dinge, zeit, spur, wackel;

  function neu() {
    versuch = 0;
    weiten = [];
    neuerVersuch();
  }
  function neuerVersuch() {
    versuch++;
    phase = "bereit"; // bereit → faellt → fliegt → liegt
    ente = { x: SCHLAG_X + 0.15, y: FALL_START, vx: 0, vy: 0, dreh: 0, drehV: 0 };
    kamera = 0;
    schwung = 0;
    texte = [];
    spur = [];
    wackel = 0;
    // Hindernisse für diesen Versuch: Bürostühle (Sprung) und Kaffeepfützen (Bremse)
    dinge = [];
    let x = 18 + Math.random() * 10;
    while (x < 400) {
      dinge.push({ art: Math.random() < 0.55 ? "stuhl" : "pfuetze", x, benutzt: false });
      x += 14 + Math.random() * 26;
    }
    zeigeStatus();
  }
  const best = () => (weiten.length ? Math.max(...weiten) : 0);
  const m = (x) => `${x.toFixed(1).replace(".", ",")} m`;
  const zeigeStatus = () => status(`Versuch ${Math.min(versuch, VERSUCHE)}/${VERSUCHE} · Bestweite ${m(best())}`);

  function aktion() {
    if (zustand !== "laeuft") return los();
    if (phase === "bereit") {
      phase = "faellt";
      ente.vy = 0;
      return;
    }
    if (phase === "faellt" && schwung <= 0) {
      schwung = 0.22;
      const abstand = Math.abs(ente.y - SUESS);
      if (abstand > ZONE) {
        texte.push({ text: ente.y > SUESS ? "Zu früh!" : "Zu spät!", x: ente.x, y: 2.4, t: 0, farbe: "#ff8fa3" });
        return;
      }
      // Timing-Güte 0 … 1 bestimmt Tempo und Winkel
      const q = 1 - abstand / ZONE;
      const perfekt = q > 0.92;
      const v = 12 + q * 22 + (perfekt ? 5 : 0);
      const winkel = ((18 + q * 24 + (Math.random() - 0.5) * 4) * Math.PI) / 180;
      ente.vx = v * Math.cos(winkel);
      ente.vy = v * Math.sin(winkel);
      ente.drehV = -8 - q * 10;
      phase = "fliegt";
      wackel = perfekt ? 0.35 : 0.15;
      texte.push({ text: perfekt ? "PERFEKT!" : q > 0.6 ? "Guter Schlag!" : "Erwischt!", unter: "QUAK!", x: ente.x + 1, y: 2.6, t: 0, farbe: perfekt ? "#f5d97a" : "#7fe0b0", fix: true });
    }
  }

  function schritt(dt) {
    zeit += dt;
    if (schwung > 0) schwung -= dt;
    if (wackel > 0) wackel -= dt;
    for (const t of texte) t.t += dt;
    texte = texte.filter((t) => t.t < 1.3);
    if (phase === "faellt") {
      ente.vy -= G * 0.55 * dt; // etwas langsamer fallen, damit man reagieren kann
      ente.y += ente.vy * dt;
      ente.dreh += dt * 2;
      if (ente.y <= 0.12) {
        ente.y = 0.12;
        texte.push({ text: "Verpasst!", x: ente.x, y: 1.6, t: 0, farbe: "#ff8fa3" });
        ende(0);
      }
    } else if (phase === "fliegt") {
      const teile = 3;
      for (let i = 0; i < teile; i++) {
        const h = dt / teile;
        ente.vy -= G * h;
        ente.vx *= 1 - 0.015 * h; // Luftwiderstand
        ente.x += ente.vx * h;
        ente.y += ente.vy * h;
        ente.dreh += ente.drehV * h;
        // Hindernisse am Boden
        for (const d of dinge) {
          if (d.benutzt || Math.abs(ente.x - d.x) > (d.art === "stuhl" ? 0.6 : 1.4)) continue;
          if (d.art === "stuhl" && ente.y < 1.0 && ente.vy < 0) {
            d.benutzt = true;
            ente.vy = 9 + Math.random() * 4;
            ente.vx = Math.max(ente.vx, 6) * 1.12;
            ente.drehV = -14;
            texte.push({ text: "BOING!", x: d.x, y: 1.8, t: 0, farbe: "#7fb8ff" });
          } else if (d.art === "pfuetze" && ente.y < 0.2) {
            d.benutzt = true;
            ente.vx *= 0.45;
            texte.push({ text: "Platsch!", x: d.x, y: 1.2, t: 0, farbe: "#c99a6a" });
          }
        }
        if (ente.y <= 0.12) {
          ente.y = 0.12;
          if (ente.vy < -2.5) {
            // aufprallen und weiterhüpfen
            ente.vy = -ente.vy * 0.42;
            ente.vx *= 0.78;
            ente.drehV *= 0.7;
            if (Math.random() < 0.5) texte.push({ text: "quak", x: ente.x, y: 0.9, t: 0, farbe: "#f2f2f3", klein: true });
          } else {
            // rutschen
            ente.vy = 0;
            ente.vx *= 1 - 1.6 * h;
            ente.drehV *= 0.9;
            if (ente.vx < 0.25) return ende(ente.x - SCHLAG_X);
          }
        }
      }
      spur.push({ x: ente.x, y: ente.y });
      if (spur.length > 40) spur.shift();
    }
    // Kamera folgt der Ente
    const zielKamera = Math.max(0, ente.x - 10);
    kamera += (zielKamera - kamera) * Math.min(1, dt * 6);
  }
  function ende(weite) {
    phase = "liegt";
    const w = Math.max(0, weite);
    weiten.push(Math.round(w * 10) / 10);
    zeigeStatus();
    const neuBest = w > 0 && w >= best() - 1e-9;
    texte.push({ text: m(w), unter: neuBest && w > 0 ? "Bestweite!" : "", x: ente.x, y: 2.2, t: 0, farbe: "#f5d97a" });
    setTimeout(() => {
      if (zustand !== "laeuft") return;
      if (versuch >= VERSUCHE) return fertig();
      neuerVersuch();
    }, 1600);
  }
  function fertig() {
    zustand = "ende";
    const b = best();
    const neuer = ergebnis({ punkte: Math.round(b * 10) });
    nachricht(`<p class="big">${m(b)}</p><p>Weitester Schlag nach ${VERSUCHE} Versuchen${neuer ? " · neuer Rekord!" : ""}</p><p class="small">${weiten.map((w, i) => `${i + 1}. ${m(w)}`).join(" · ")}</p><p class="small">Klick oder Leertaste für eine neue Runde</p>`);
  }

  // ---------- Zeichnen ----------
  const sx = (x) => (x - kamera) * PX + 40;
  const sy = (y) => BODEN - y * PX * 1.6;
  function hintergrund() {
    const g = ctx.createLinearGradient(0, 0, 0, BODEN);
    g.addColorStop(0, "#2a3a7a");
    g.addColorStop(1, "#8fb8e8");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, BODEN);
    // Wolken (langsame Parallaxe)
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    for (let i = 0; i < 8; i++) {
      const x = ((i * 190 - kamera * PX * 0.15) % (W + 200) + W + 200) % (W + 200) - 100;
      const y = 40 + (i % 3) * 35;
      ctx.beginPath();
      ctx.ellipse(x, y, 36, 12, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 22, y - 6, 22, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Hügel und Häuser (mittlere Parallaxe)
    ctx.fillStyle = "#5a7fa8";
    for (let i = 0; i < 12; i++) {
      const x = ((i * 120 - kamera * PX * 0.35) % (W + 240) + W + 240) % (W + 240) - 120;
      const h = 40 + ((i * 37) % 50);
      ctx.fillRect(x, BODEN - 60 - h, 70, h + 60);
      ctx.fillStyle = "#f5d97a";
      for (let fy = BODEN - 50 - h; fy < BODEN - 70; fy += 18) for (let fx = x + 10; fx < x + 60; fx += 18) if ((fx + fy) % 3) ctx.fillRect(fx, fy, 6, 8);
      ctx.fillStyle = "#5a7fa8";
    }
    // Wiese
    ctx.fillStyle = "#4f9a4a";
    ctx.fillRect(0, BODEN, W, H - BODEN);
    ctx.fillStyle = "#3f8a3a";
    for (let x = -((kamera * PX) % 24); x < W; x += 24) ctx.fillRect(x, BODEN, 12, H - BODEN);
    ctx.fillStyle = "#6fbf5f";
    ctx.fillRect(0, BODEN, W, 3);
  }
  function markierungen() {
    ctx.textAlign = "center";
    ctx.font = '8px "Press Start 2P", monospace';
    const von = Math.floor(kamera / 10) * 10;
    for (let mm = Math.max(10, von); mm < kamera + W / PX + 10; mm += 10) {
      const x = sx(SCHLAG_X + mm);
      ctx.fillStyle = "#e9e6ef";
      ctx.fillRect(x - 1, BODEN - 18, 2, 18);
      ctx.fillStyle = "#1c1a23";
      ctx.fillRect(x - 16, BODEN - 32, 32, 14);
      ctx.fillStyle = "#f2f2f3";
      ctx.fillText(`${mm}`, x, BODEN - 22);
    }
    // Bestweite als Fahne
    const b = best();
    if (b > 0) {
      const x = sx(SCHLAG_X + b);
      ctx.fillStyle = "#f5d97a";
      ctx.fillRect(x - 1, BODEN - 50, 3, 50);
      ctx.beginPath();
      ctx.moveTo(x + 2, BODEN - 50);
      ctx.lineTo(x + 20, BODEN - 44);
      ctx.lineTo(x + 2, BODEN - 38);
      ctx.fill();
    }
  }
  function dingeZeichnen() {
    for (const d of dinge) {
      const x = sx(d.x);
      if (x < -60 || x > W + 60) continue;
      if (d.art === "stuhl") {
        // Bürostuhl: Sitz, Lehne, Säule, Rollen
        ctx.fillStyle = "#1c1a23";
        ctx.fillRect(x - 2, BODEN - 22, 4, 16);
        ctx.fillRect(x - 14, BODEN - 6, 28, 3);
        ctx.fillStyle = "#c9cbd4";
        ctx.beginPath();
        ctx.arc(x - 12, BODEN - 2, 2.5, 0, Math.PI * 2);
        ctx.arc(x + 12, BODEN - 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = d.benutzt ? "#8a63d2" : "#b48ef0";
        ctx.beginPath();
        ctx.roundRect(x - 14, BODEN - 28, 28, 7, 3);
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(x + 8, BODEN - 52, 7, 26, 3);
        ctx.fill();
      } else {
        // Kaffeepfütze mit umgekippter Tasse
        ctx.fillStyle = "#6b4226";
        ctx.beginPath();
        ctx.ellipse(x, BODEN + 4, 22, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#f2f2f3";
        ctx.save();
        ctx.translate(x + 16, BODEN - 4);
        ctx.rotate(1.3);
        ctx.fillRect(-6, -7, 12, 14);
        ctx.restore();
      }
    }
  }
  function entwickler() {
    // Strichmännchen mit Tastatur, links am Start
    const x = sx(SCHLAG_X) - 26;
    if (x < -80) return;
    // Regal mit Monitor, von dem die Ente fällt
    const rx = sx(SCHLAG_X + 0.15);
    ctx.fillStyle = "#8a6a4a";
    ctx.fillRect(rx - 22, sy(FALL_START) + 8, 44, 5);
    ctx.fillRect(rx + 18, sy(FALL_START) + 8, 4, BODEN - sy(FALL_START) - 8);
    ctx.strokeStyle = "#f2f2f3";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const hueft = { x, y: BODEN - 34 };
    ctx.beginPath();
    ctx.moveTo(hueft.x - 8, BODEN);
    ctx.lineTo(hueft.x, hueft.y);
    ctx.lineTo(hueft.x + 8, BODEN);
    ctx.moveTo(hueft.x, hueft.y);
    ctx.lineTo(hueft.x - 2, hueft.y - 28);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(hueft.x - 2, hueft.y - 38, 8, 0, Math.PI * 2);
    ctx.stroke();
    // Arme + Tastatur: Ausholen, dann Schwung nach vorn
    const k = schwung > 0 ? 1 - schwung / 0.22 : 0;
    const winkel = phase === "faellt" && schwung <= 0 ? -2.3 : -2.3 + k * 2.9;
    const schulter = { x: hueft.x - 2, y: hueft.y - 24 };
    const hand = { x: schulter.x + Math.cos(winkel) * 20, y: schulter.y + Math.sin(winkel) * 20 };
    ctx.beginPath();
    ctx.moveTo(schulter.x, schulter.y);
    ctx.lineTo(hand.x, hand.y);
    ctx.stroke();
    ctx.save();
    ctx.translate(hand.x, hand.y);
    ctx.rotate(winkel + Math.PI / 2);
    ctx.fillStyle = "#3a3550";
    ctx.fillRect(-4, -34, 10, 36);
    ctx.fillStyle = "#c9cbd4";
    for (let i = 0; i < 6; i++) ctx.fillRect(-2, -32 + i * 6, 6, 4);
    ctx.restore();
    // Schlagzone neben der Figur
    if (phase === "faellt" || phase === "bereit") {
      const zx = sx(SCHLAG_X + 0.15);
      ctx.fillStyle = "rgba(95,195,156,0.18)";
      ctx.fillRect(zx - 16, sy(SUESS + ZONE), 32, sy(SUESS - ZONE) - sy(SUESS + ZONE));
      ctx.fillStyle = "rgba(95,195,156,0.55)";
      ctx.fillRect(zx - 16, sy(SUESS) - 1, 32, 2);
    }
  }
  function zeichneEnte() {
    // Spur in der Luft
    for (let i = 0; i < spur.length; i += 2) {
      ctx.fillStyle = `rgba(255,255,255,${(i / spur.length) * 0.35})`;
      ctx.fillRect(sx(spur[i].x) - 1.5, sy(spur[i].y) - 1.5, 3, 3);
    }
    let x = sx(ente.x);
    let y = sy(ente.y);
    const hoch = y < 14;
    if (hoch) y = 14;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ente.dreh);
    // Körper, Kopf, Schnabel, Auge, Flügel
    ctx.fillStyle = "#ffd23f";
    ctx.beginPath();
    ctx.ellipse(0, 2, 11, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(6, -7, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff8c1a";
    ctx.beginPath();
    ctx.moveTo(11, -7);
    ctx.lineTo(17, -5);
    ctx.lineTo(11, -3);
    ctx.fill();
    ctx.fillStyle = "#1c1a23";
    ctx.beginPath();
    ctx.arc(7.5, -8.5, 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f0b81e";
    ctx.beginPath();
    ctx.ellipse(-3, 1, 5, 3.5, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (hoch) {
      ctx.fillStyle = "#f2f2f3";
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.textAlign = "center";
      ctx.fillText(`↑ ${Math.round(ente.y)} m`, x, 34);
    }
  }
  function zeichne() {
    ctx.setTransform(skala, 0, 0, skala, 0, 0);
    ctx.save();
    if (wackel > 0) ctx.translate((Math.random() - 0.5) * 12 * wackel, (Math.random() - 0.5) * 12 * wackel);
    hintergrund();
    markierungen();
    dingeZeichnen();
    entwickler();
    zeichneEnte();
    for (const t of texte) {
      const k = t.t / 1.3;
      ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      ctx.textAlign = "center";
      ctx.font = t.klein ? '8px "Press Start 2P", monospace' : '14px "Press Start 2P", monospace';
      ctx.lineWidth = 5;
      ctx.strokeStyle = "#0f0e13";
      const x = sx(t.x);
      const y = Math.max(30, sy(t.y) - k * 20);
      ctx.strokeText(t.text, x, y);
      ctx.fillStyle = t.farbe;
      ctx.fillText(t.text, x, y);
      if (t.unter) {
        ctx.font = '9px "Press Start 2P", monospace';
        ctx.strokeText(t.unter, x, y + 20);
        ctx.fillStyle = "#f2f2f3";
        ctx.fillText(t.unter, x, y + 20);
      }
    }
    ctx.globalAlpha = 1;
    // Anzeige oben: aktuelle Weite und Versuche
    ctx.fillStyle = "rgba(15,14,19,0.6)";
    ctx.beginPath();
    ctx.roundRect(10, 10, 220, 46, 8);
    ctx.fill();
    ctx.fillStyle = "#f5d97a";
    ctx.font = '14px "Press Start 2P", monospace';
    ctx.textAlign = "left";
    ctx.fillText(m(Math.max(0, phase === "fliegt" || phase === "liegt" ? ente.x - SCHLAG_X : 0)), 20, 32);
    ctx.fillStyle = "#c9cbd4";
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillText(`VERSUCH ${Math.min(versuch, VERSUCHE)}/${VERSUCHE} · BEST ${m(best())}`, 20, 48);
    if (phase === "bereit" && zustand === "laeuft") {
      ctx.textAlign = "center";
      ctx.fillStyle = "#f2f2f3";
      ctx.font = '9px "Press Start 2P", monospace';
      ctx.fillText("KLICK: ENTE FALLEN LASSEN", W / 2, 90);
    } else if (phase === "faellt") {
      ctx.textAlign = "center";
      ctx.fillStyle = "#7fe0b0";
      ctx.font = '9px "Press Start 2P", monospace';
      ctx.fillText("JETZT IN DER GRÜNEN ZONE SCHLAGEN!", W / 2, 90);
    }
    ctx.restore();
  }

  function loop(t) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.034, (t - (zuletzt || t)) / 1000);
    zuletzt = t;
    if (zustand === "laeuft") schritt(dt);
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
    nachricht(`<p class="big">Pause</p><p class="small">Leertaste oder Klick zum Weiterspielen</p>`);
  }
  const onKey = (e) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (!e.repeat) aktion();
    } else if ((e.key === "p" || e.key === "P" || e.key === "Escape") && zustand === "laeuft") pause();
  };
  const onDown = (e) => {
    e.preventDefault();
    aktion();
  };
  window.addEventListener("keydown", onKey);
  canvas.addEventListener("pointerdown", onDown);
  const aus = overlayKlick(() => zustand !== "laeuft" && los());

  zeit = 0;
  zustand = "bereit";
  neu();
  passeAufloesung();
  nachricht(`<p class="big">Enten-Weitschlag</p><p>Erst lässt du die Debug-Ente vom Regal fallen, dann haust du sie mit der Tastatur weg. Je näher an der grünen Linie, desto weiter fliegt sie. Bürostühle schleudern sie hoch, Kaffeepfützen bremsen.</p><p class="small">${VERSUCHE} Versuche · Klick, Tippen oder Leertaste<br>Los geht's mit Klick</p>`);
  raf = requestAnimationFrame(loop);
  document.fonts?.load('10px "Press Start 2P"');

  return {
    pause,
    stop() {
      zustand = "ende";
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("keydown", onKey);
      canvas.removeEventListener("pointerdown", onDown);
      aus();
    },
  };
}
