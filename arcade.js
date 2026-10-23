// Spiele auf dem Hub: zwei Schiebetüren, die sich öffnen und wieder schließen lassen
import { zeichneVorschau } from "./games/vorschau.js";

export function initArcade() {
  const abteil = document.getElementById("arcade");
  const oeffnen = document.getElementById("arcade-open");
  const schliessen = document.getElementById("arcade-close");
  const liste = document.getElementById("arcade-games");
  if (!abteil || !oeffnen || !liste) return;

  abteil.querySelectorAll("[data-art]").forEach((c) => zeichneVorschau(c, c.dataset.art));
  liste.inert = true; // hinter geschlossenen Türen nicht per Tab erreichbar
  let timer = [];
  const spaeter = (fn, ms) => timer.push(setTimeout(fn, ms));
  const abbrechen = () => {
    timer.forEach(clearTimeout);
    timer = [];
  };

  oeffnen.addEventListener("click", () => {
    abbrechen();
    abteil.classList.remove("closing");
    abteil.classList.add("opening"); // Spalt leuchtet kurz auf
    spaeter(() => {
      abteil.classList.add("open");
      oeffnen.setAttribute("aria-expanded", "true");
      liste.inert = false;
      if (schliessen) schliessen.hidden = false;
    }, 160);
    spaeter(() => liste.querySelector("a")?.focus({ preventScroll: true }), 900);
  });

  schliessen?.addEventListener("click", () => {
    abbrechen();
    // erst verschwinden die Spiele, dann gleiten die Türen zurück
    abteil.classList.add("closing");
    liste.inert = true;
    schliessen.hidden = true;
    spaeter(() => {
      abteil.classList.remove("open", "opening");
      oeffnen.setAttribute("aria-expanded", "false");
    }, 220);
    spaeter(() => {
      abteil.classList.remove("closing");
      oeffnen.focus({ preventScroll: true });
    }, 1100);
  });
}
