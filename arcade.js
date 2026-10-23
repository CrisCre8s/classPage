// Spiele auf dem Hub: zwei Schiebetüren, die sich öffnen und wieder schließen lassen.
// Dahinter eine kleine Auswahl der Lernspiele; die ganze Fläche führt zur Spieleseite.
import { zeichneVorschau } from "./games/vorschau.js";
import { KATALOG } from "./games/katalog.js";

const AUF_DEM_HUB = ["binaer", "subnetz", "ports"];

export function initArcade() {
  const abteil = document.getElementById("arcade");
  const oeffnen = document.getElementById("arcade-open");
  const schliessen = document.getElementById("arcade-close");
  const liste = document.getElementById("arcade-games");
  const link = document.getElementById("arcade-link");
  if (!abteil || !oeffnen || !liste || !link) return;

  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  liste.innerHTML = AUF_DEM_HUB.map((id) => KATALOG.find((s) => s.id === id))
    .map(
      (s, i) => `
    <li class="arcade-game" style="--i: ${i}">
      <canvas class="arcade-art" data-art="${s.id}" aria-hidden="true"></canvas>
      <span class="arcade-name">${esc(s.name)}</span>
      <span class="arcade-text">${esc(s.kurz)}</span>
    </li>`,
    )
    .join("");
  const label = link.querySelector(".arcade-all-label");
  if (label) label.innerHTML = `Alle ${KATALOG.length} Spiele ansehen <svg class="i"><use href="#i-out" /></svg>`;
  link.setAttribute("aria-label", `Zur Spieleseite: ${KATALOG.length} Spiele, zuerst die Lernspiele`);
  const zaehler = document.getElementById("arcade-count");
  if (zaehler) zaehler.textContent = KATALOG.length;
  const vorschau = () => abteil.querySelectorAll("[data-art]").forEach((c) => zeichneVorschau(c, c.dataset.art));
  vorschau();
  document.fonts?.load('16px "Press Start 2P"').then(vorschau); // Texte in den Vorschauen brauchen die Pixelschrift
  link.inert = true; // hinter geschlossenen Türen nicht per Tab erreichbar

  // ---------- Türen ----------
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
      link.inert = false;
      if (schliessen) schliessen.hidden = false;
    }, 160);
    spaeter(() => link.focus({ preventScroll: true }), 900);
  });

  schliessen?.addEventListener("click", () => {
    abbrechen();
    // erst verschwinden die Spiele, dann gleiten die Türen zurück
    abteil.classList.add("closing");
    link.inert = true;
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
