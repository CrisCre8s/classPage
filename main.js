import "./style.css";
import { initCanvas, startCanvas, stopCanvas } from "./canvas.js";
import { initVoid } from "./void.js";
import { initBerichte } from "./berichte.js";
import { initLks } from "./lks.js";

const TAGE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const MONATE = ["Jan", "Feb", "März", "Apr", "Mai", "Juni", "Juli", "Aug", "Sep", "Okt", "Nov", "Dez"];

function isoWoche(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const tag = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - tag);
  const jahrStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - jahrStart) / 86400000 + 1) / 7);
}

function initDatum() {
  const el = document.getElementById("today");
  if (!el) return;
  const d = new Date();
  el.textContent = `${TAGE[d.getDay()]}, ${d.getDate()}. ${MONATE[d.getMonth()]} · KW ${isoWoche(d)}`;
}

// Sternenfeld im Hintergrund — Ein/Aus über den Power-Button im Header
function initPower() {
  const btn = document.getElementById("power-btn");
  if (!btn) return;

  let an = false;
  try {
    an = localStorage.getItem("sterne") === "an";
  } catch {}

  const setze = (wert) => {
    an = wert;
    btn.setAttribute("aria-pressed", String(an));
    btn.classList.toggle("is-on", an);
    if (an) startCanvas();
    else stopCanvas();
    try {
      localStorage.setItem("sterne", an ? "an" : "aus");
    } catch {}
  };

  btn.addEventListener("click", () => setze(!an));

  const reduziert = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (an && !reduziert) setze(true);
}

document.addEventListener("DOMContentLoaded", () => {
  initDatum();
  initLks();
  initBerichte();

  if (initCanvas()) {
    initPower();
    initVoid();
  }
});
