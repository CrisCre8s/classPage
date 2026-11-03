// Hotte-Casino: Spielautomat, Glücksrad, Blackjack und Roulette mit Hotte-Dollar (Spielgeld),
// dazu ein Preis-Shop, in dem man die Dollar gegen Extras auf der Seite eintauscht.
import * as K from "./casino-konto.js";
import { KATEGORIEN as SHOP_KAT, DATEN } from "./preise.js";

// Jedes Casino-Spiel ist ein eigener Eintrag im Katalog. Gemeinsam sind Kontostand, Tagesbonus und Hilfen.
// Aufruf aus spiele.js: import("./games/casino.js").then((m) => m.fuer("automat"))
export const SPIELE = {
  automat: { laden: () => import("./casino-automat.js"), hilfe: "Einsatz wählen, dann Drehen (oder Leertaste) · 3 gleiche Symbole auf der roten Linie gewinnen, 🔥 bringt den Einsatz zurück" },
  gluecksrad: { laden: () => import("./casino-rad.js"), hilfe: "Einsatz wählen, dann Drehen (oder Leertaste) · das Feld unter dem Zeiger gibt den Multiplikator" },
  blackjack: { laden: () => import("./casino-blackjack.js"), hilfe: "Karten geben (Leertaste) · H = Karte, S = Halten, D = Verdoppeln · näher an 21 als die Bank, ohne drüber" },
  roulette: { laden: () => import("./casino-roulette.js"), hilfe: "Chip-Wert wählen, Felder antippen (mehrmals = mehr Einsatz), dann Drehen · Zahl 35:1, Dutzend 2:1, Farbe 1:1" },
  "casino-shop": { shop: true, hilfe: "Hotte-Dollar gegen Extras tauschen · gekaufte Sachen bleiben in diesem Browser gespeichert" },
};
export const IDS = Object.keys(SPIELE);
const SPIELGELD = "Spielgeld: Hotte-Dollar kann man weder kaufen noch in echtes Geld tauschen";

// liefert ein Spiel-Modul (DOM, HILFE, start) für spiele.js
export function fuer(id) {
  const def = SPIELE[id];
  return { DOM: true, HILFE: `${def.hilfe} · ${SPIELGELD}`, start: (opt) => start({ ...opt, id }) };
}

export const EINSAETZE = [10, 25, 50, 100, 250];
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// Einsatz-Auswahl, die jedes Spiel nutzt; merkt sich den Einsatz nur für diese Sitzung
let letzterEinsatz = 25;
export function einsatzWahl(el, { beiWahl } = {}) {
  const zeichne = () => {
    const st = K.stand();
    if (letzterEinsatz > st) letzterEinsatz = EINSAETZE.filter((e) => e <= st).pop() || EINSAETZE[0];
    el.innerHTML = `<span class="casino-label">Einsatz</span>${EINSAETZE.map((e) => `<button type="button" class="casino-chip${e === letzterEinsatz ? " an" : ""}" data-e="${e}" ${e > st ? "disabled" : ""}>${e}</button>`).join("")}`;
  };
  el.classList.add("casino-einsatz");
  el.addEventListener("click", (e) => {
    const b = e.target.closest("[data-e]");
    if (!b || b.disabled) return;
    letzterEinsatz = Number(b.dataset.e);
    zeichne();
    beiWahl?.(letzterEinsatz);
  });
  const aus = K.beiAenderung(zeichne);
  zeichne();
  return { wert: () => letzterEinsatz, zeichne, aus, sperre: (an) => el.querySelectorAll("button").forEach((b) => (b.disabled = an || Number(b.dataset.e) > K.stand())) };
}

function start({ dom, status, nachricht, ergebnis, id }) {
  const def = SPIELE[id];
  dom.innerHTML = `
    <div class="casino">
      <div class="casino-kopf">
        <div class="casino-stand"><span class="casino-label">Kontostand</span><b class="num" data-stand></b></div>
        <div class="casino-bonus-platz"></div>
        <p class="casino-spielgeld">Spielgeld · nicht kaufbar · nicht in echtes Geld tauschbar</p>
      </div>
      <div class="casino-inhalt"></div>
    </div>`;
  const el = (s) => dom.querySelector(s);
  const inhalt = el(".casino-inhalt");
  let laufend = null;
  let aktiv = true;

  function zeigeStand() {
    const st = K.stand();
    el("[data-stand]").textContent = K.fmt(st);
    status(`${K.fmt(st)} · heute aus Spielen ${K.heuteVerdient()}/${K.SPIELE_PRO_TAG} H$`);
    const platz = el(".casino-bonus-platz");
    if (K.bonusDa()) platz.innerHTML = `<button type="button" class="btn casino-bonus" data-bonus>Tagesbonus abholen +${K.TAGESBONUS} H$</button>`;
    else {
      const not = K.notgroschenIn();
      if (not === 0) platz.innerHTML = `<button type="button" class="btn casino-bonus" data-not>Pleite? Notgroschen +${K.NOTGROSCHEN} H$</button>`;
      else if (not) platz.innerHTML = `<span class="casino-info">Notgroschen in ${Math.ceil(not / 60000)} min · oder Dollar in den anderen Spielen verdienen</span>`;
      else platz.innerHTML = `<span class="casino-info">Tagesbonus abgeholt · morgen gibt's wieder ${K.TAGESBONUS} H$</span>`;
    }
  }
  el(".casino-bonus-platz").addEventListener("click", (e) => {
    if (e.target.closest("[data-bonus]")) {
      const b = K.holeTagesbonus();
      if (b) api.meldung(`+${b} H$ Tagesbonus!`, "gewinn");
    } else if (e.target.closest("[data-not]")) {
      const b = K.holeNotgroschen();
      if (b) api.meldung(`+${b} H$ Notgroschen. Viel Glück!`, "gewinn");
    }
  });
  const ausStand = K.beiAenderung(zeigeStand);
  const uhr = setInterval(zeigeStand, 30000);

  // gemeinsame Helfer für die Spiele
  const api = {
    ...K,
    einsatzWahl,
    // nach jeder Runde: Gewinn (Auszahlung minus Einsatz) melden; Highscore = größter Gewinn
    runde(netto) {
      ergebnis({ punkte: Math.max(0, Math.round(netto || 0)) });
    },
    // kurze Einblendung oben im Casino
    meldung(text, art = "") {
      const m = document.createElement("div");
      m.className = `casino-toast ${art}`;
      m.textContent = text;
      el(".casino")?.appendChild(m);
      setTimeout(() => m.classList.add("weg"), 1800);
      setTimeout(() => m.remove(), 2300);
    },
  };

  zeigeStand();
  nachricht(null);
  if (def.shop) laufend = shop(inhalt, api);
  else
    def.laden().then((modul) => {
      if (aktiv) laufend = modul.baue(inhalt, api);
    });

  return {
    pause() {},
    stop() {
      aktiv = false;
      laufend?.stop?.();
      ausStand();
      clearInterval(uhr);
      dom.innerHTML = "";
    },
  };
}

// ---------- Preise (Shop) ----------
function vorschau(kat, id, d) {
  if (kat === "snake") return `<span class="shop-vorschau shop-snake">${Array.from({ length: 6 }, (_, i) => `<i style="background:${d.glied(i, i * 0.4)}"></i>`).join("")}</span>`;
  if (kat === "bloecke") return `<span class="shop-vorschau shop-bloecke">${Object.values(d.farben).map((f) => `<i style="background:${f}"></i>`).join("")}</span>`;
  if (kat === "pong") {
    const spur = d.spur ? `linear-gradient(90deg, transparent, ${d.spur.join(", ")})` : "transparent";
    return `<span class="shop-vorschau shop-pong"><i class="spur" style="background:${spur}"></i><i class="ball" style="background:${d.ball}"></i></span>`;
  }
  return `<span class="shop-vorschau shop-abzeichen">${d.zeichen || "–"}</span>`;
}
function shop(ziel, api) {
  function zeichne() {
    const st = api.stand();
    ziel.innerHTML = `
      <div class="shop">
        <p class="shop-intro">Tausch deine Hotte-Dollar gegen Extras auf der Seite. Gekauftes gehört dir für immer (in diesem Browser), auswählen kannst du jederzeit neu.</p>
        ${SHOP_KAT.map(
          (k) => `
          <section class="shop-kat">
            <h3>${k.name} <small>${k.text}</small></h3>
            <div class="shop-reihe">${Object.entries(DATEN[k.id])
              .map(([id, d]) => {
                const hat = id === "standard" || api.besitzt(`${k.id}:${id}`);
                const an = api.aktiv(k.id) === id || (id === "standard" && !DATEN[k.id][api.aktiv(k.id)]);
                const knopf = an
                  ? `<span class="shop-an">Aktiv</span>`
                  : hat
                    ? `<button type="button" class="more" data-waehle="${k.id}:${id}">Auswählen</button>`
                    : `<button type="button" class="btn" data-kaufe="${k.id}:${id}" ${st < d.preis ? "disabled" : ""}>${api.fmt(d.preis)}</button>`;
                return `<div class="shop-item${an ? " an" : ""}">${vorschau(k.id, id, d)}<b>${esc(d.name)}</b>${knopf}</div>`;
              })
              .join("")}</div>
          </section>`,
        ).join("")}
      </div>`;
  }
  const onClick = (e) => {
    const k = e.target.closest("[data-kaufe]");
    const w = e.target.closest("[data-waehle]");
    if (k) {
      const [kat, id] = k.dataset.kaufe.split(":");
      const r = api.kaufe(`${kat}:${id}`, DATEN[kat][id].preis);
      if (r === "ok") {
        api.waehle(kat, id);
        api.meldung(`${DATEN[kat][id].name} gekauft und ausgewählt!`, "gewinn");
      } else if (r === "zuwenig") api.meldung("Dafür reicht dein Guthaben noch nicht.");
    } else if (w) {
      const [kat, id] = w.dataset.waehle.split(":");
      api.waehle(kat, id);
    }
  };
  ziel.addEventListener("click", onClick);
  const aus = api.beiAenderung(zeichne);
  zeichne();
  return {
    stop() {
      aus();
      ziel.removeEventListener("click", onClick);
    },
  };
}
