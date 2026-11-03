// Hotte-Casino: Spielautomat, Glücksrad, Blackjack und Roulette mit Hotte-Dollar (Spielgeld),
// dazu ein Shop, in dem man die Dollar gegen Preise auf der Seite eintauscht.
import * as K from "./casino-konto.js";
import { KATEGORIEN as SHOP_KAT, DATEN } from "./preise.js";

export const DOM = true;
export const HILFE = "Spielgeld: Hotte-Dollar kann man weder kaufen noch in echtes Geld tauschen · Dollar gibt's als Tagesbonus und für gute Runden in den anderen Spielen · Leertaste: drehen/ziehen";

const TABS = [
  { id: "automat", name: "Automat", laden: () => import("./casino-automat.js") },
  { id: "rad", name: "Glücksrad", laden: () => import("./casino-rad.js") },
  { id: "blackjack", name: "Blackjack", laden: () => import("./casino-blackjack.js") },
  { id: "roulette", name: "Roulette", laden: () => import("./casino-roulette.js") },
  { id: "shop", name: "Preise" },
];
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

export function start({ dom, status, nachricht, ergebnis }) {
  dom.innerHTML = `
    <div class="casino">
      <div class="casino-kopf">
        <div class="casino-stand"><span class="casino-label">Kontostand</span><b class="num" data-stand></b></div>
        <div class="casino-bonus-platz"></div>
        <p class="casino-spielgeld">Spielgeld · nicht kaufbar · nicht in echtes Geld tauschbar</p>
      </div>
      <div class="casino-tabs" role="tablist" aria-label="Casino-Spiele">${TABS.map((t) => `<button type="button" role="tab" class="casino-tab" data-tab="${t.id}" aria-selected="false">${t.name}</button>`).join("")}</div>
      <div class="casino-inhalt" role="tabpanel"></div>
    </div>`;
  const el = (s) => dom.querySelector(s);
  const inhalt = el(".casino-inhalt");
  let aktiv = null;
  let laufend = null;
  let anfrage = 0;

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
    // nach jeder Runde: Rekord-Kontostand als Highscore merken
    runde() {
      ergebnis({ punkte: K.stand() });
    },
    // kurze Einblendung oben im Casino
    meldung(text, art = "") {
      const m = document.createElement("div");
      m.className = `casino-toast ${art}`;
      m.textContent = text;
      el(".casino").appendChild(m);
      setTimeout(() => m.classList.add("weg"), 1800);
      setTimeout(() => m.remove(), 2300);
    },
  };

  async function zeigeTab(id) {
    if (aktiv === id) return;
    aktiv = id;
    laufend?.stop?.();
    laufend = null;
    dom.querySelectorAll(".casino-tab").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === id)));
    inhalt.innerHTML = "";
    const tab = TABS.find((t) => t.id === id);
    if (id === "shop") {
      laufend = shop(inhalt, api);
      return;
    }
    const nr = ++anfrage;
    const modul = await tab.laden();
    if (nr !== anfrage) return;
    laufend = modul.baue(inhalt, api);
  }
  el(".casino-tabs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-tab]");
    if (b) zeigeTab(b.dataset.tab);
  });

  zeigeStand();
  nachricht(null);
  zeigeTab("automat");

  return {
    pause() {},
    stop() {
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
