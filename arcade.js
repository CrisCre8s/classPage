// Spiele auf dem Hub: zwei Schiebetüren, die sich öffnen und wieder schließen lassen.
// Ein Klick auf ein Spiel zeigt zuerst die Schwierigkeitsauswahl.
import { zeichneVorschau } from "./games/vorschau.js";
import { KATALOG } from "./games/katalog.js";

const STUFEN = [
  ["leicht", "Leicht"],
  ["mittel", "Mittel"],
  ["schwer", "Schwer"],
];

function gemerkteStufe(spiel) {
  try {
    return JSON.parse(localStorage.getItem("spiele:stufe:" + spiel)) || "mittel";
  } catch {
    return "mittel";
  }
}

export function initArcade() {
  const abteil = document.getElementById("arcade");
  const oeffnen = document.getElementById("arcade-open");
  const schliessen = document.getElementById("arcade-close");
  const liste = document.getElementById("arcade-games");
  if (!abteil || !oeffnen || !liste) return;

  // Kacheln aus dem Katalog
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  liste.innerHTML = KATALOG.map(
    (s, i) => `
    <li style="--i: ${i}">
      <a class="arcade-game" href="/spiele.html#${s.id}">
        <canvas class="arcade-art" data-art="${s.id}" aria-hidden="true"></canvas>
        <span class="arcade-name">${esc(s.name)}${s.kat === "lernen" ? ' <span class="arcade-tag">Lernen</span>' : ""}</span>
        <span class="arcade-text">${esc(s.kurz)}</span>
        <span class="arcade-go">Spielen <svg class="i"><use href="#i-out" /></svg></span>
      </a>
    </li>`,
  ).join("");
  const zaehler = document.getElementById("arcade-count");
  if (zaehler) zaehler.textContent = KATALOG.length;
  const vorschau = () => abteil.querySelectorAll("[data-art]").forEach((c) => zeichneVorschau(c, c.dataset.art));
  vorschau();
  document.fonts?.load('16px "Press Start 2P"').then(vorschau); // Texte in den Vorschauen brauchen die Pixelschrift
  liste.inert = true; // hinter geschlossenen Türen nicht per Tab erreichbar

  // ---------- Schwierigkeitsauswahl pro Spiel ----------
  const schliesseAuswahl = (ausser) =>
    liste.querySelectorAll("li.picking").forEach((li) => {
      if (li === ausser) return;
      li.classList.remove("picking");
      li.querySelector(".arcade-pick").hidden = true;
      li.querySelector(".arcade-game").inert = false;
    });

  liste.querySelectorAll(".arcade-game").forEach((karte) => {
    const li = karte.closest("li");
    const spiel = karte.getAttribute("href").split("#")[1];
    const name = KATALOG.find((s) => s.id === spiel)?.name || "";
    const auswahl = document.createElement("div");
    auswahl.className = "arcade-pick";
    auswahl.hidden = true;
    auswahl.setAttribute("role", "group");
    auswahl.setAttribute("aria-label", `Schwierigkeit für ${name}`);
    auswahl.innerHTML = `
      <p class="arcade-pick-title">${name}</p>
      <p class="arcade-pick-sub">Wähle die Schwierigkeit</p>
      <div class="arcade-pick-list">
        ${STUFEN.map(([id, label]) => `<a class="arcade-pick-btn" data-level="${id}" href="/spiele.html?stufe=${id}#${spiel}">${label}</a>`).join("")}
      </div>
      <button class="more arcade-pick-back" type="button">Zurück</button>`;
    li.appendChild(auswahl);

    karte.addEventListener("click", (e) => {
      e.preventDefault();
      schliesseAuswahl(li);
      const zuletzt = gemerkteStufe(spiel);
      auswahl.querySelectorAll(".arcade-pick-btn").forEach((b) => b.classList.toggle("is-last", b.dataset.level === zuletzt));
      auswahl.hidden = false;
      li.classList.add("picking");
      karte.inert = true;
      auswahl.querySelector(`[data-level="${zuletzt}"]`)?.focus({ preventScroll: true });
    });
    auswahl.querySelector(".arcade-pick-back").addEventListener("click", () => {
      schliesseAuswahl();
      karte.focus({ preventScroll: true });
    });
    auswahl.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        schliesseAuswahl();
        karte.focus({ preventScroll: true });
      }
    });
  });

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
      schliesseAuswahl();
    }, 220);
    spaeter(() => {
      abteil.classList.remove("closing");
      oeffnen.focus({ preventScroll: true });
    }, 1100);
  });
}
