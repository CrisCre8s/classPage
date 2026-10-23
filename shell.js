// Gemeinsamer Rahmen für alle Seiten: Sternenfeld, POWER-Schalter und Void-Funktion.
import { initCanvas, startCanvas } from "./canvas.js";
import { initVoid } from "./void.js";

const listeners = [];

// Andere Module können reagieren, wenn die Seite aus- oder eingeschaltet wird
export function onPower(fn) {
  listeners.push(fn);
}

function initPower() {
  const btn = document.getElementById("power-btn");
  if (!btn) return;
  let an = true;

  btn.addEventListener("click", () => {
    an = !an;
    btn.setAttribute("aria-pressed", String(an));
    btn.classList.toggle("is-on", an);
    document.body.classList.toggle("power-off", !an);
    document.body.classList.toggle("power-on", an);
    if (!an) window.scrollTo({ top: 0, behavior: "smooth" }); // Schalter bleibt erreichbar (Handy)
    listeners.forEach((fn) => fn(an));
  });
}

export function initShell() {
  initPower();
  if (initCanvas()) {
    startCanvas();
    initVoid();
  }
}
