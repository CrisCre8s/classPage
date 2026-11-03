// Hotte-Dollar (H$): Spielgeld der Seite. Es lässt sich weder kaufen noch in echtes Geld tauschen,
// nur gegen Preise im Shop (Skins, Farben, Abzeichen). Gespeichert im Browser (localStorage).
//
// Woher die Dollar kommen:
//  - Startguthaben 500 H$
//  - Tagesbonus 200 H$ (einmal pro Kalendertag)
//  - Notgroschen 50 H$, wenn man pleite ist (höchstens einmal pro Stunde)
//  - gute Runden in den anderen Spielen (siehe verdienAusSpiel), höchstens 300 H$ pro Tag

const KEY = "casino:konto-v1";
export const START = 500;
export const TAGESBONUS = 200;
export const NOTGROSCHEN = 50;
export const SPIELE_PRO_TAG = 300;
const EVENT = "hotte-dollar";

const heute = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function leer() {
  return { stand: START, bonusTag: "", notZeit: 0, verdientTag: "", verdient: 0, besitz: [], aktiv: {}, rekord: START, gesamtGewonnen: 0, gesamtEingesetzt: 0 };
}
function lade() {
  try {
    const k = JSON.parse(localStorage.getItem(KEY));
    if (k && typeof k.stand === "number") return { ...leer(), ...k };
  } catch {}
  return leer();
}
function sichere(k) {
  try {
    localStorage.setItem(KEY, JSON.stringify(k));
  } catch {}
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { stand: k.stand } }));
}
function aendereKonto(fn) {
  const k = lade();
  const r = fn(k);
  k.stand = Math.max(0, Math.round(k.stand));
  k.rekord = Math.max(k.rekord || 0, k.stand);
  sichere(k);
  return r;
}

export const fmt = (n) => `${Math.round(n).toLocaleString("de-DE")} H$`;
export const konto = () => lade();
export const stand = () => lade().stand;
export const beiAenderung = (fn) => {
  const h = (e) => fn(e.detail.stand);
  window.addEventListener(EVENT, h);
  return () => window.removeEventListener(EVENT, h);
};

// Einsatz abziehen; false, wenn das Guthaben nicht reicht
export function setze(betrag) {
  return aendereKonto((k) => {
    if (betrag <= 0 || k.stand < betrag) return false;
    k.stand -= betrag;
    k.gesamtEingesetzt = (k.gesamtEingesetzt || 0) + betrag;
    return true;
  });
}
export function gutschrift(betrag) {
  if (!(betrag > 0)) return stand();
  return aendereKonto((k) => {
    k.stand += betrag;
    k.gesamtGewonnen = (k.gesamtGewonnen || 0) + betrag;
    return k.stand;
  });
}

export const bonusDa = () => lade().bonusTag !== heute();
export function holeTagesbonus() {
  return aendereKonto((k) => {
    if (k.bonusTag === heute()) return 0;
    k.bonusTag = heute();
    k.stand += TAGESBONUS;
    return TAGESBONUS;
  });
}
// Notgroschen: nur wenn (fast) pleite und der Tagesbonus schon weg ist
export function notgroschenIn() {
  const k = lade();
  if (k.stand >= 10 || k.bonusTag !== heute()) return null;
  return Math.max(0, k.notZeit + 3600e3 - Date.now());
}
export function holeNotgroschen() {
  return aendereKonto((k) => {
    if (k.stand >= 10 || Date.now() - k.notZeit < 3600e3) return 0;
    k.notZeit = Date.now();
    k.stand += NOTGROSCHEN;
    return NOTGROSCHEN;
  });
}

// Dollar für Runden in den anderen Spielen: +5 pro Runde, +20 bei Sieg/geschafft, +30 bei neuem Bestwert
export function verdienAusSpiel({ gewonnen, neu, punkte, wertung }) {
  let plus = 5;
  if ((wertung === "siege" || wertung === "zeit") && gewonnen) plus += 20;
  if (wertung === "punkte" && !(punkte > 0)) plus = 0;
  if (neu) plus += 30;
  if (!plus) return 0;
  return aendereKonto((k) => {
    if (k.verdientTag !== heute()) {
      k.verdientTag = heute();
      k.verdient = 0;
    }
    const rest = Math.max(0, SPIELE_PRO_TAG - k.verdient);
    const p = Math.min(plus, rest);
    k.verdient += p;
    k.stand += p;
    return p;
  });
}
export function heuteVerdient() {
  const k = lade();
  return k.verdientTag === heute() ? k.verdient : 0;
}

// ---------- Shop ---------- (Besitz wird als "kategorie:id" gespeichert)
export const besitzt = (id) => lade().besitz.includes(id);
export function kaufe(id, preis) {
  return aendereKonto((k) => {
    if (k.besitz.includes(id)) return "schon";
    if (k.stand < preis) return "zuwenig";
    k.stand -= preis;
    k.besitz.push(id);
    return "ok";
  });
}
export const aktiv = (kat) => lade().aktiv[kat] || "standard";
export function waehle(kat, id) {
  aendereKonto((k) => {
    if (id !== "standard" && !k.besitz.includes(`${kat}:${id}`)) return;
    k.aktiv = { ...k.aktiv, [kat]: id };
  });
}
