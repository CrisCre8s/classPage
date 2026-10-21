// Leistungskontrollen kommen aus lks.json. Der Status (heute / bald / offen /
// erledigt) wird automatisch aus dem Datum berechnet.
import lks from "./lks.json";

const MONATE = ["JAN", "FEB", "MÄR", "APR", "MAI", "JUN", "JUL", "AUG", "SEP", "OKT", "NOV", "DEZ"];
const BALD_TAGE = 3; // ab wie vielen Tagen vorher es rot wird
const ERLEDIGT_ANZEIGEN_TAGE = 14; // vergangene LKs so lange noch ausgegraut zeigen

function heute() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDatum(s) {
  const [y, m, d] = String(s).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function tageBis(datum) {
  return Math.round((datum - heute()) / 86400000);
}

function relativ(tage) {
  if (tage === 0) return "heute";
  if (tage === 1) return "morgen";
  if (tage === -1) return "gestern";
  if (tage > 1) return `in ${tage} Tagen`;
  return `vor ${-tage} Tagen`;
}

function status(tage) {
  if (tage < 0) return { key: "done", label: "ERLEDIGT" };
  if (tage === 0) return { key: "today", label: "HEUTE" };
  if (tage <= BALD_TAGE) return { key: "soon", label: "BALD" };
  return { key: "open", label: "OFFEN" };
}

function esc(s = "") {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

export function getLks() {
  return lks
    .map((lk) => ({ ...lk, datumObj: parseDatum(lk.datum) }))
    .filter((lk) => lk.datumObj)
    .map((lk) => ({ ...lk, tage: tageBis(lk.datumObj) }))
    .filter((lk) => lk.tage >= -ERLEDIGT_ANZEIGEN_TAGE)
    // Anstehende zuerst (nächste oben), erledigte ans Ende (zuletzt erledigte oben)
    .sort((a, b) => {
      const aDone = a.tage < 0, bDone = b.tage < 0;
      if (aDone !== bDone) return aDone ? 1 : -1;
      return aDone ? b.datumObj - a.datumObj : a.datumObj - b.datumObj;
    });
}

function renderNaechste(lks) {
  const el = document.getElementById("next-lk");
  if (!el) return;
  const next = lks.find((lk) => lk.tage >= 0);

  if (!next) {
    el.classList.add("next--leer");
    el.innerHTML = `
      <ion-icon name="checkmark-circle-outline" aria-hidden="true"></ion-icon>
      <div class="next-body">
        <p class="next-label"><span class="c-dim">&gt;</span> nächste leistungskontrolle</p>
        <p class="next-titel">null <span class="next-art">nichts angekündigt, entspannt bleiben</span></p>
      </div>`;
    return;
  }

  const st = status(next.tage);
  el.classList.add(`next--${st.key}`);
  el.innerHTML = `
    <div class="next-countdown">
      <span class="next-zahl">${next.tage === 0 ? "!" : next.tage}</span>
      <span class="next-einheit">${next.tage === 0 ? "HEUTE" : next.tage === 1 ? "TAG" : "TAGE"}</span>
    </div>
    <div class="next-body">
      <p class="next-label"><span class="c-dim">&gt;</span> nächste leistungskontrolle <span class="c-dim">·</span> <span class="next-rel">${relativ(next.tage)}</span></p>
      <p class="next-titel">${esc(next.fach)}${next.art ? ` <span class="next-art">${esc(next.art)}</span>` : ""}</p>
      ${next.thema ? `<p class="next-thema"><span class="c-dim">#</span> ${esc(next.thema)}</p>` : ""}
    </div>`;
}

function renderListe(lks) {
  const list = document.getElementById("lk-list");
  if (!list) return;

  if (lks.length === 0) {
    list.innerHTML = `<li class="empty"><span class="c-dim">[]</span> // zurzeit keine anstehenden leistungskontrollen</li>`;
    return;
  }

  list.innerHTML = lks
    .map((lk) => {
      const st = status(lk.tage);
      const d = lk.datumObj;
      return `
      <li class="lk lk--${st.key}">
        <div class="lk-date">
          <span class="lk-day">${String(d.getDate()).padStart(2, "0")}</span>
          <span class="lk-month">${MONATE[d.getMonth()]}</span>
        </div>
        <div class="lk-info">
          <span class="lk-fach">${esc(lk.fach)}</span>
          <span class="lk-meta">${esc(lk.art || "")}${lk.art && lk.thema ? " · " : ""}${esc(lk.thema || "")}</span>
        </div>
        <span class="tag tag--${st.key}" title="${relativ(lk.tage)}">${st.label}</span>
      </li>`;
    })
    .join("");
}

export function initLks() {
  const liste = getLks();
  renderNaechste(liste);
  renderListe(liste);
}
