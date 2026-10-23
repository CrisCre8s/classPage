import "./style.css";
import { initShell, onPower } from "./shell.js";

// Spiele werden erst geladen, wenn man sie startet (der Hub bleibt schnell)
const SPIELE = {
  pong: { name: "Ping-Pong", laden: () => import("./games/pong.js"), wertung: "siege" },
  schach: { name: "Schach", laden: () => import("./games/schach.js"), wertung: "siege" },
  bits: { name: "Bits & Bugs", laden: () => import("./games/bits.js"), wertung: "punkte" },
};
const STUFEN = { leicht: "Leicht", mittel: "Mittel", schwer: "Schwer" };

// ---------- Bestwerte (pro Gerät) ----------
function lese(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}
function schreibe(key, wert) {
  try {
    localStorage.setItem(key, JSON.stringify(wert));
  } catch {}
}
const bestKey = (spiel, stufe) => `spiele:${spiel}:${stufe}`;

// ---------- Canvas-Helfer für die Spiele ----------
// Setzt eine feste logische Größe und skaliert scharf auf das Display
export function passeCanvas(canvas, w, h) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.aspectRatio = `${w} / ${h}`;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

// ---------- Vorschaubilder auf den Karten ----------
function zeichneVorschau(canvas, spiel) {
  const ctx = passeCanvas(canvas, 240, 120);
  ctx.fillStyle = "#0f0e13";
  ctx.fillRect(0, 0, 240, 120);
  const weiss = "#f2f2f3";
  const gelb = "#f5d97a";
  const lila = "#c8a2ff";

  if (spiel === "pong") {
    ctx.fillStyle = "#2a292f";
    for (let y = 6; y < 120; y += 14) ctx.fillRect(118, y, 4, 8);
    ctx.fillStyle = weiss;
    ctx.fillRect(16, 34, 6, 40);
    ctx.fillRect(218, 52, 6, 40);
    ctx.fillStyle = gelb;
    ctx.fillRect(150, 44, 7, 7);
    ctx.fillStyle = "rgba(245,217,122,0.25)";
    ctx.fillRect(138, 48, 7, 5);
    ctx.fillRect(127, 52, 7, 4);
  }
  if (spiel === "schach") {
    const z = 15;
    const ox = 60;
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        ctx.fillStyle = (r + c) % 2 ? "#1c1b20" : "#34323b";
        ctx.fillRect(ox + c * z, r * z, z, z);
      }
    ctx.fillStyle = weiss;
    [[4, 6], [3, 6], [6, 7], [4, 4]].forEach(([c, r]) => ctx.fillRect(ox + c * z + 4, r * z + 4, 7, 7));
    ctx.fillStyle = lila;
    [[4, 1], [2, 2], [5, 3], [1, 0]].forEach(([c, r]) => ctx.fillRect(ox + c * z + 4, r * z + 4, 7, 7));
  }
  if (spiel === "bits") {
    ctx.fillStyle = "#3a3550";
    const wand = [
      [10, 10, 220, 4], [10, 106, 220, 4], [10, 10, 4, 100], [226, 10, 4, 100],
      [40, 34, 60, 4], [140, 34, 60, 4], [40, 80, 60, 4], [140, 80, 60, 4], [118, 34, 4, 50],
    ];
    wand.forEach((w) => ctx.fillRect(...w));
    ctx.fillStyle = "#8a8c92";
    for (let x = 26; x < 220; x += 14) ctx.fillRect(x, 57, 3, 3);
    ctx.fillStyle = gelb;
    ctx.fillRect(56, 52, 12, 10);
    ctx.fillStyle = "#e5566f";
    ctx.fillRect(170, 52, 10, 10);
    ctx.fillStyle = "#5fc39c";
    ctx.fillRect(190, 20, 10, 10);
  }
}

// ---------- Seite ----------
let laufendes = null; // { spiel, stufe, inst }

function karte(spiel) {
  return document.querySelector(`.game-card[data-game="${spiel}"]`);
}

function stufeVon(spiel) {
  return karte(spiel)?.querySelector('[aria-checked="true"]')?.dataset.level || "mittel";
}

function zeigeBest(spiel) {
  const k = karte(spiel);
  const stufe = stufeVon(spiel);
  const best = lese(bestKey(spiel, stufe), 0);
  const p = k.querySelector(".best");
  const label = SPIELE[spiel].wertung === "siege" ? "Siege" : "Highscore";
  p.innerHTML = `${label} (${STUFEN[stufe]}) <span class="num">${best}</span>`;
}

function nachricht(html) {
  const el = document.getElementById("stage-msg");
  if (!html) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }
  el.hidden = false;
  el.innerHTML = html;
}

function status(text) {
  document.getElementById("stage-status").textContent = text || "";
}

function beenden() {
  laufendes?.inst?.stop();
  laufendes = null;
  document.getElementById("stage").hidden = true;
  document.getElementById("games").hidden = false;
  document.body.classList.remove("game-on");
  nachricht(null);
}

async function starten(spiel) {
  beenden();
  const stufe = stufeVon(spiel);
  schreibe("spiele:stufe:" + spiel, stufe);

  const stage = document.getElementById("stage");
  document.getElementById("stage-title").textContent = SPIELE[spiel].name;
  document.getElementById("stage-level").textContent = STUFEN[stufe];
  document.getElementById("games").hidden = true;
  stage.hidden = false;
  stage.dataset.game = spiel;
  document.body.classList.add("game-on");
  status("lädt …");

  const modul = await SPIELE[spiel].laden();
  const canvas = document.getElementById("game-canvas");
  canvas.setAttribute("aria-label", `${SPIELE[spiel].name} – Spielfeld`);
  canvas.style.touchAction = "none";
  document.getElementById("stage-help").textContent = modul.HILFE || "";
  stage.scrollIntoView({ behavior: "smooth", block: "start" });

  const inst = modul.start({
    canvas,
    stufe,
    passeCanvas,
    status,
    nachricht,
    // Ergebnis melden: bei Siegen +1, bei Punkten nur, wenn neuer Highscore
    ergebnis({ gewonnen, punkte }) {
      const key = bestKey(spiel, stufe);
      const alt = lese(key, 0);
      if (SPIELE[spiel].wertung === "siege" && gewonnen) schreibe(key, alt + 1);
      if (SPIELE[spiel].wertung === "punkte" && punkte > alt) schreibe(key, punkte);
      zeigeBest(spiel);
      return SPIELE[spiel].wertung === "punkte" && punkte > alt;
    },
  });
  laufendes = { spiel, stufe, inst };
  canvas.focus({ preventScroll: true });
}

function initKarten() {
  document.querySelectorAll(".game-card").forEach((k) => {
    const spiel = k.dataset.game;
    zeichneVorschau(k.querySelector(".game-art"), spiel);

    // zuletzt gewählte Stufe merken
    const gemerkt = lese("spiele:stufe:" + spiel, "mittel");
    const radios = [...k.querySelectorAll('[role="radio"]')];
    const waehle = (btn) => {
      radios.forEach((r) => r.setAttribute("aria-checked", String(r === btn)));
      zeigeBest(spiel);
    };
    radios.forEach((r) => {
      r.addEventListener("click", () => waehle(r));
      r.addEventListener("keydown", (e) => {
        const i = radios.indexOf(r);
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          e.preventDefault();
          const n = radios[(i + (e.key === "ArrowRight" ? 1 : radios.length - 1)) % radios.length];
          waehle(n);
          n.focus();
        }
      });
    });
    waehle(radios.find((r) => r.dataset.level === gemerkt) || radios[1]);

    k.querySelector(".play").addEventListener("click", () => starten(spiel));
  });

  document.getElementById("stage-close").addEventListener("click", beenden);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) laufendes?.inst?.pause?.();
  });
  onPower((an) => {
    if (!an) laufendes?.inst?.pause?.();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initShell();
  initKarten();
});
