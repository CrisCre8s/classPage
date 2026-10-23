import "./style.css";
import { initShell, onPower } from "./shell.js";
import { passeCanvas, zeichneVorschau } from "./games/vorschau.js";

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

// Spielfeld so groß wie möglich, aber ganz sichtbar (ohne Scrollen)
function einpassen() {
  const canvas = document.getElementById("game-canvas");
  const box = document.getElementById("stage-body").getBoundingClientRect();
  if (!canvas.width || !box.width || !box.height) return;
  const verhaeltnis = canvas.width / canvas.height;
  let w = box.width;
  let h = w / verhaeltnis;
  if (h > box.height) {
    h = box.height;
    w = h * verhaeltnis;
  }
  canvas.style.width = `${Math.floor(w)}px`;
  canvas.style.height = `${Math.floor(h)}px`;
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
  window.scrollTo({ top: 0 });

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
  einpassen();
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

  document.getElementById("stage-close").addEventListener("click", () => {
    beenden();
    if (location.hash) history.replaceState(null, "", location.pathname);
  });
  new ResizeObserver(einpassen).observe(document.getElementById("stage-body"));

  // Link vom Hub (z. B. spiele.html#schach) startet das Spiel direkt
  const ausLink = location.hash.slice(1);
  if (SPIELE[ausLink]) starten(ausLink);
  window.addEventListener("hashchange", () => {
    const spiel = location.hash.slice(1);
    if (SPIELE[spiel]) starten(spiel);
  });
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
