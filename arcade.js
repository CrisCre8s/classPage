// Spieleabteil auf dem Hub: zwei Schiebetüren, die sich beim Klick öffnen
import { zeichneVorschau } from "./games/vorschau.js";

export function initArcade() {
  const abteil = document.getElementById("arcade");
  const knopf = document.getElementById("arcade-open");
  const liste = document.getElementById("arcade-games");
  if (!abteil || !knopf || !liste) return;

  abteil.querySelectorAll("[data-art]").forEach((c) => zeichneVorschau(c, c.dataset.art));
  liste.inert = true; // hinter geschlossenen Türen nicht per Tab erreichbar

  knopf.addEventListener("click", () => {
    abteil.classList.add("opening"); // Spalt leuchtet kurz auf
    setTimeout(() => {
      abteil.classList.add("open");
      knopf.setAttribute("aria-expanded", "true");
      liste.inert = false;
    }, 160);
    setTimeout(() => liste.querySelector("a")?.focus({ preventScroll: true }), 900);
  });
}
