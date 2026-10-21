import "./style.css";
import { initCanvas, startCanvas } from "./canvas.js";
import { initVoid } from "./void.js";
import { initBerichte } from "./berichte.js";
import { initLks } from "./lks.js";
import { initSprit } from "./sprit.js";

const TAGE = ["so", "mo", "di", "mi", "do", "fr", "sa"];
const reduziert = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function isoWoche(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const tag = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - tag);
  const jahrStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - jahrStart) / 86400000 + 1) / 7);
}

function initDatum() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const today = document.getElementById("today");
  const kw = document.getElementById("sb-kw");
  if (today) today.textContent = `${TAGE[d.getDay()]} ${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
  if (kw) kw.textContent = `KW ${isoWoche(d)}`;
}

// Tipp-Effekt im Hero
function initTyping() {
  const el = document.getElementById("typed");
  if (!el) return;
  const text = "./klassen-hub --schule sbsz-hermsdorf";
  if (reduziert) {
    el.textContent = text;
    return;
  }
  let i = 0;
  const tick = () => {
    el.textContent = text.slice(0, ++i);
    if (i < text.length) setTimeout(tick, 35 + Math.random() * 45);
  };
  setTimeout(tick, 500);
}

// POWER: schaltet die Seitenstruktur an/aus — die Sterne laufen immer weiter
function initPower() {
  const btn = document.getElementById("power-btn");
  if (!btn) return;
  let an = true;

  btn.addEventListener("click", () => {
    an = !an;
    btn.classList.toggle("is-on", an);
    btn.setAttribute("aria-pressed", String(an));
    document.body.classList.toggle("power-off", !an);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initDatum();
  initTyping();
  initLks();
  initBerichte();
  initSprit();
  initPower();

  if (initCanvas()) {
    startCanvas();
    initVoid();
  }
});
