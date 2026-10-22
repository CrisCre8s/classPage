// Leistungskontrollen kommen aus lks.json. Status und Countdown werden aus dem Datum berechnet.
import lks from "./lks.json";

const WOCHENTAGE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const WOCHENTAGE_LANG = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const BALD_TAGE = 3; // bis hierhin wird es rot markiert
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

const pad = (n) => String(n).padStart(2, "0");
const kurz = (d) => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.`;

export function relativ(tage) {
  if (tage === 0) return "heute";
  if (tage === 1) return "morgen";
  if (tage === 2) return "übermorgen";
  if (tage > 2) return `in ${tage} Tagen`;
  if (tage === -1) return "gestern";
  return `vor ${-tage} Tagen`;
}

function esc(s = "") {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

export function getLks() {
  const h = heute();
  return lks
    .map((lk) => ({ ...lk, datumObj: parseDatum(lk.datum) }))
    .filter((lk) => lk.datumObj && lk.fach)
    .map((lk) => ({ ...lk, tage: Math.round((lk.datumObj - h) / 86400000) }))
    .filter((lk) => lk.tage >= -ERLEDIGT_ANZEIGEN_TAGE)
    .sort((a, b) => {
      const aDone = a.tage < 0;
      const bDone = b.tage < 0;
      if (aDone !== bDone) return aDone ? 1 : -1;
      return aDone ? b.datumObj - a.datumObj : a.datumObj - b.datumObj;
    });
}

// Ein Satz für die Zeile unter dem Titel
export function naechsteLkSatz(liste = getLks()) {
  const next = liste.find((lk) => lk.tage >= 0);
  if (!next) return "Keine Leistungskontrolle angekündigt";
  // mehrere LKs am selben Tag: alle Fächer nennen
  const gleicherTag = liste.filter((lk) => lk.tage === next.tage);
  if (gleicherTag.length > 1) {
    const faecher = gleicherTag.map((lk) => lk.fach);
    const aufzaehlung = faecher.slice(0, -1).join(", ") + " und " + faecher.at(-1);
    return `${aufzaehlung} ${relativ(next.tage)}`;
  }
  const was = next.art ? `${next.art} in ${next.fach}` : next.fach;
  return `${was} ${relativ(next.tage)}`;
}

function renderLead(next) {
  const el = document.getElementById("lk-lead");
  if (!el) return;

  if (!next) {
    el.innerHTML = `<p class="empty">Nichts angekündigt. Neue Leistungskontrollen über „Eintragen“ hinzufügen.</p>`;
    return;
  }

  const d = next.datumObj;
  const zahl = next.tage === 0 ? "Heute" : `${next.tage}<small>${next.tage === 1 ? "Tag" : "Tage"}</small>`;
  const pill =
    next.tage <= BALD_TAGE ? `<span class="pill neg">${relativ(next.tage)}</span>` : `<span class="pill neu">${relativ(next.tage)}</span>`;

  el.innerHTML = `
    <div class="lead">
      <div>
        <div class="lead-count">${zahl}</div>
        <div class="lead-when">${WOCHENTAGE_LANG[d.getDay()]}, ${kurz(d)}</div>
      </div>
      <div>
        <div class="lead-what">${esc(next.fach)}</div>
        <div class="lead-detail">${esc([next.art, next.thema].filter(Boolean).join(" · ")) || "&nbsp;"}</div>
      </div>
      ${pill}
    </div>`;
}

function renderListe(rest) {
  const list = document.getElementById("lk-list");
  if (!list) return;

  list.innerHTML = rest
    .map((lk) => {
      const d = lk.datumObj;
      const done = lk.tage < 0;
      const rechts = done
        ? `<span class="pill neu">erledigt</span>`
        : lk.tage <= BALD_TAGE
          ? `<span class="pill neg">${relativ(lk.tage)}</span>`
          : `<span class="r num">${relativ(lk.tage)}</span>`;
      const detail = [lk.art, lk.thema].filter(Boolean).join(" · ");
      return `
      <li class="row lk-row${done ? " done" : ""}">
        <div class="lk-date">${kurz(d)}<span>${WOCHENTAGE[d.getDay()]}</span></div>
        <div><span class="t">${esc(lk.fach)}</span>${detail ? `<span class="d">${esc(detail)}</span>` : ""}</div>
        ${rechts}
      </li>`;
    })
    .join("");
}

export function initLks() {
  const liste = getLks();
  const offen = liste.filter((lk) => lk.tage >= 0);
  const next = offen[0];

  const count = document.getElementById("lk-count");
  if (count) count.textContent = `${offen.length} offen`;

  // Ganz leer → anderes Raster, damit kein Loch neben der Tankstelle entsteht
  document.getElementById("board")?.classList.toggle("lk-leer", liste.length === 0);

  renderLead(next);
  renderListe(liste.filter((lk) => lk !== next));
  return liste;
}
