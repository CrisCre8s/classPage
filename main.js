import "./style.css";
import { initShell, onPower } from "./shell.js";
import { initBerichte } from "./berichte.js";
import { initLks, naechsteLkSatz } from "./lks.js";
import { initSprit } from "./sprit.js";
import { initTitel, bootTitel } from "./title.js";
import { initArcade } from "./arcade.js";

const TAGE = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

function isoWoche(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const tag = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - tag);
  const jahrStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - jahrStart) / 86400000 + 1) / 7);
}

// Zeile unter dem Titel: Datum, KW und die nächste LK als Satz
function initTitelzeile(liste) {
  const el = document.getElementById("today-line");
  if (!el) return;
  const d = new Date();
  const datum = `${TAGE[d.getDay()]}, ${d.getDate()}. ${MONATE[d.getMonth()]} · KW ${isoWoche(d)}`;
  const satz = naechsteLkSatz(liste);
  el.innerHTML = `${datum} · <strong></strong>`;
  el.querySelector("strong").textContent = satz;
}

document.addEventListener("DOMContentLoaded", () => {
  const liste = initLks();
  initTitelzeile(liste);
  initTitel();
  initBerichte();
  initSprit();
  initArcade();
  initShell();
  onPower((an) => {
    if (an) setTimeout(bootTitel, 250); // Titel nach dem Einschalten neu in den Framebuffer schreiben
  });
});
