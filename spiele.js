import "./style.css";
import { initShell, onPower } from "./shell.js";
import { passeCanvas, zeichneVorschau } from "./games/vorschau.js";
import { KATALOG, KATEGORIEN, NACH_ID } from "./games/katalog.js";

// Spiele werden erst geladen, wenn man sie startet (der Hub bleibt schnell)
const LADER = {
  pong: () => import("./games/pong.js"),
  schach: () => import("./games/schach.js"),
  bits: () => import("./games/bits.js"),
  snake: () => import("./games/snake.js"),
  minen: () => import("./games/minen.js"),
  z2048: () => import("./games/z2048.js"),
  vier: () => import("./games/vier.js"),
  mauer: () => import("./games/mauer.js"),
  skate: () => import("./games/skate.js"),
  schlagzeug: () => import("./games/schlagzeug.js"),
  binaer: () => import("./games/binaer.js"),
  subnetz: () => import("./games/subnetz.js"),
  befehle: () => import("./games/befehle.js"),
  ports: () => import("./games/ports.js"),
  csharp: () => import("./games/csharp.js"),
  osi: () => import("./games/osi.js"),
  sql: () => import("./games/sql.js"),
  gatter: () => import("./games/gatter.js"),
  memory: () => import("./games/memory.js"),
};
const STUFEN = { lernen: "Lernen", leicht: "Leicht", mittel: "Mittel", schwer: "Schwer" };
// „Lernen“ gibt es nur bei Spielen, die einen Lernmodus haben (lernStufe im Katalog)
const stufenFuer = (info) => Object.entries(STUFEN).filter(([id]) => id !== "lernen" || info.lernStufe);

// ---------- Bestwerte (pro Gerät) ----------
function lese(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}
function schreibe(key, wert) {
  try {
    localStorage.setItem(key, JSON.stringify(wert));
  } catch {}
}
const bestKey = (spiel, stufe) => `spiele:${spiel}:${stufe}`;
// die letzten 5 Ergebnisse je Spiel (alle Stufen zusammen, neuestes zuerst)
const letzteKey = (spiel) => `spiele:${spiel}:letzte`;
const LETZTE_ANZAHL = 5;
const mitStufen = (spiel) => NACH_ID[spiel].stufen !== false;

export function formatZeit(sek) {
  const m = Math.floor(sek / 60);
  const s = Math.floor(sek % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ---------- Karten erzeugen ----------
function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

function karteHtml(s) {
  return `
    <section class="panel game-card" data-game="${s.id}" aria-labelledby="g-${s.id}">
      <canvas class="game-art" data-art="${s.id}" aria-hidden="true"></canvas>
      <h3 id="g-${s.id}">${esc(s.name)}</h3>
      <p class="game-desc">${esc(s.text)}</p>
      <p class="game-keys">${esc(s.tasten)}</p>
      <!-- Bedienelemente immer unten, damit sie in jeder Reihe auf gleicher Höhe stehen -->
      <div class="game-ctrl">
        ${s.stufenInfo ? `<p class="game-stufe-info num" aria-live="polite"></p>` : ""}
        ${s.kat === "lernen" ? `<button class="lern-toggle" type="button" aria-expanded="false" aria-controls="lern-${s.id}"><span>So geht's</span><svg class="i" aria-hidden="true"><use href="#i-chev" /></svg></button>` : ""}
        ${s.stufen === false ? "" : `<div class="seg" role="radiogroup" aria-label="Schwierigkeit für ${esc(s.name)}">
          <span class="seg-pill" aria-hidden="true"></span>
          ${stufenFuer(s).map(([id, l]) => `<button type="button" role="radio" aria-checked="${id === "mittel"}" data-level="${id}">${l}</button>`).join("")}
        </div>`}
        <div class="letzte" aria-label="Letzte ${LETZTE_ANZAHL} Ergebnisse"></div>
        <div class="game-foot">
          <p class="best"></p>
          <button class="btn play" type="button">Spielen</button>
        </div>
      </div>
    </section>`;
}

function baueKarten() {
  const ziel = document.getElementById("games");
  ziel.innerHTML = KATEGORIEN.map((k) => {
    const spiele = KATALOG.filter((s) => s.kat === k.id);
    return `
      <section class="kat" aria-labelledby="kat-${k.id}">
        <div class="kat-head">
          <h2 id="kat-${k.id}">${k.name}</h2>
          <span class="chip">${spiele.length}</span>
          <p class="kat-text">${k.text}</p>
        </div>
        <div class="games-grid">${spiele.map(karteHtml).join("")}</div>
      </section>`;
  }).join("");
}

// ---------- Seite ----------
let laufendes = null; // { spiel, stufe, inst }

function karte(spiel) {
  return document.querySelector(`.game-card[data-game="${spiel}"]`);
}

function stufeVon(spiel) {
  return karte(spiel)?.querySelector('[aria-checked="true"]')?.dataset.level || "mittel";
}

function zeigeBest(spiel) {
  const k = karte(spiel);
  const stufe = stufeVon(spiel);
  const w = NACH_ID[spiel].wertung;
  const best = lese(bestKey(spiel, stufe), w === "zeit" ? null : 0);
  const label = w === "siege" ? "Siege" : w === "zeit" ? "Bestzeit" : "Highscore";
  const wert = w === "zeit" ? (best == null ? "–" : formatZeit(best)) : best;
  const wo = mitStufen(spiel) ? STUFEN[stufe] : NACH_ID[spiel].bestText || "";
  k.querySelector(".best").innerHTML = `<span>${label}${wo ? ` (${wo})` : ""}</span><span class="num">${wert}</span>`;
  zeigeLetzte(spiel);
}

// ---------- Letzte 5 Ergebnisse ----------
function merkeErgebnis(spiel, stufe, { gewonnen, punkte, zeit }) {
  const w = NACH_ID[spiel].wertung;
  const eintrag = { s: stufe, t: Date.now() };
  if (w === "punkte") eintrag.p = punkte ?? 0;
  else {
    eintrag.g = Boolean(gewonnen);
    if (w === "zeit" && gewonnen) eintrag.z = Math.round(zeit);
  }
  const liste = [eintrag, ...lese(letzteKey(spiel), [])].slice(0, LETZTE_ANZAHL);
  schreibe(letzteKey(spiel), liste);
}
function wann(t) {
  const d = new Date(t);
  const heute = new Date();
  const gestern = new Date(Date.now() - 864e5);
  const uhr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  if (d.toDateString() === heute.toDateString()) return `heute ${uhr}`;
  if (d.toDateString() === gestern.toDateString()) return `gestern ${uhr}`;
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}. ${uhr}`;
}
function zeigeLetzte(spiel) {
  const el = karte(spiel)?.querySelector(".letzte");
  if (!el) return;
  const w = NACH_ID[spiel].wertung;
  const liste = lese(letzteKey(spiel), []);
  if (!liste.length) {
    el.innerHTML = `<span class="letzte-label">Letzte ${LETZTE_ANZAHL}</span><span class="letzte-leer">noch nichts gespielt</span>`;
    return;
  }
  // bestes der letzten Ergebnisse hervorheben
  const wert = (e) => (w === "punkte" ? e.p : w === "zeit" ? (e.g ? -e.z : -Infinity) : e.g ? 1 : 0);
  const bester = liste.reduce((a, e) => (wert(e) > wert(a) ? e : a), liste[0]);
  el.innerHTML =
    `<span class="letzte-label">Letzte ${LETZTE_ANZAHL}</span><ol class="letzte-liste">` +
    liste
      .map((e) => {
        const text = w === "punkte" ? e.p : w === "zeit" ? (e.g ? formatZeit(e.z) : "✗") : e.g ? "✓" : "✗";
        const art = w === "punkte" ? "" : e.g ? " sieg" : " niederlage";
        const top = e === bester && liste.length > 1 && (w === "punkte" ? e.p > 0 : e.g) ? " top" : "";
        const stufe = mitStufen(spiel) && STUFEN[e.s] ? `${STUFEN[e.s]}, ` : "";
        const was = w === "punkte" ? `${e.p} Punkte` : w === "zeit" ? (e.g ? `geschafft in ${formatZeit(e.z)}` : "verloren") : e.g ? "gewonnen" : "verloren";
        return `<li class="num${art}${top}" title="${was} · ${stufe}${wann(e.t)}">${text}</li>`;
      })
      .join("") +
    `</ol>`;
}

function nachricht(html) {
  const el = document.getElementById("stage-msg");
  if (!html) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }
  el.hidden = false;
  el.innerHTML = html;
}

function status(text) {
  document.getElementById("stage-status").textContent = text || "";
}

// Spielfeld so groß wie möglich, aber ganz sichtbar (ohne Scrollen)
function einpassen() {
  const canvas = document.getElementById("game-canvas");
  if (canvas.hidden) return;
  const box = document.getElementById("stage-body").getBoundingClientRect();
  if (!canvas.width || !box.width || !box.height) return;
  const verhaeltnis = canvas.width / canvas.height;
  let w = box.width;
  let h = w / verhaeltnis;
  if (h > box.height) {
    h = box.height;
    w = h * verhaeltnis;
  }
  canvas.style.width = `${Math.floor(w)}px`;
  canvas.style.height = `${Math.floor(h)}px`;
}

function beenden() {
  laufendes?.inst?.stop();
  laufendes = null;
  document.getElementById("stage").hidden = true;
  document.getElementById("games").hidden = false;
  document.body.classList.remove("game-on");
  const dom = document.getElementById("game-dom");
  dom.innerHTML = "";
  dom.hidden = true;
  const tools = document.getElementById("stage-tools");
  tools.innerHTML = "";
  tools.hidden = true;
  document.getElementById("game-canvas").hidden = false;
  nachricht(null);
}

async function starten(spiel) {
  beenden();
  const info = NACH_ID[spiel];
  const stufe = stufeVon(spiel);

  const stage = document.getElementById("stage");
  document.getElementById("stage-title").textContent = info.name;
  document.getElementById("stage-level").textContent = info.stufen === false ? info.stufeText || "" : STUFEN[stufe] + (info.stufenInfo ? ` · ${info.stufenInfo[stufe]}` : "");
  document.getElementById("stage-level").hidden = info.stufen === false && !info.stufeText;
  document.getElementById("games").hidden = true;
  stage.hidden = false;
  stage.dataset.game = spiel;
  document.body.classList.add("game-on");
  status("lädt …");

  const modul = await LADER[spiel]();
  const canvas = document.getElementById("game-canvas");
  const dom = document.getElementById("game-dom");
  // Lernspiele arbeiten mit normalem HTML statt mit dem Canvas
  canvas.hidden = !!modul.DOM;
  dom.hidden = !modul.DOM;
  canvas.setAttribute("aria-label", `${info.name} – Spielfeld`);
  canvas.style.touchAction = "none";
  document.getElementById("stage-help").textContent = modul.HILFE || "";
  window.scrollTo({ top: 0 });

  const inst = modul.start({
    canvas,
    dom,
    tools: document.getElementById("stage-tools"),
    stufe,
    passeCanvas,
    status,
    nachricht,
    einpassen,
    // Ergebnis melden. Rückgabe: true, wenn es ein neuer Bestwert ist
    ergebnis({ gewonnen, punkte, zeit }) {
      merkeErgebnis(spiel, stufe, { gewonnen, punkte, zeit });
      const key = bestKey(spiel, stufe);
      let neu = false;
      if (info.wertung === "siege" && gewonnen) schreibe(key, lese(key, 0) + 1);
      if (info.wertung === "punkte") {
        neu = punkte > lese(key, 0);
        if (neu) schreibe(key, punkte);
      }
      if (info.wertung === "zeit" && gewonnen) {
        const alt = lese(key, null);
        neu = alt == null || zeit < alt;
        if (neu) schreibe(key, Math.round(zeit));
      }
      zeigeBest(spiel);
      return neu;
    },
  });
  laufendes = { spiel, stufe, inst };
  einpassen();
  if (!modul.DOM) canvas.focus({ preventScroll: true });
}

// ---------- Lernhilfe: aufklappbare Erklärung unter einer Lernspiel-Karte ----------
let lernhilfe = null;
async function lernhilfeUmschalten(spiel, knopf) {
  const offen = document.querySelector(".lern-panel");
  const warOffen = offen?.dataset.game === spiel;
  if (offen) {
    offen.remove();
    document.querySelectorAll(".lern-toggle").forEach((b) => b.setAttribute("aria-expanded", "false"));
  }
  if (warOffen) return;
  lernhilfe ||= (await import("./games/lernhilfe.js")).LERNHILFE;
  const hilfe = lernhilfe[spiel];
  const info = NACH_ID[spiel];
  const panel = document.createElement("section");
  panel.className = "lern-panel";
  panel.id = `lern-${spiel}`;
  panel.dataset.game = spiel;
  panel.setAttribute("aria-label", `${info.name}: ${hilfe.titel}`);
  panel.innerHTML = `
    <div class="lern-head">
      <div>
        <p class="lern-kicker">${esc(info.name)}</p>
        <h3>${esc(hilfe.titel)}</h3>
      </div>
      <button class="more lern-zu" type="button">Zuklappen</button>
    </div>
    <div class="lh">${hilfe.inhalt()}</div>
    <div class="lern-foot">
      <p>Verstanden? Dann los:</p>
      <div class="lern-start">
        ${stufenFuer(info).map(([id, l]) => `<button class="btn${id === stufeVon(spiel) ? "" : " btn-ghost"}" type="button" data-level="${id}">${l}</button>`).join("")}
      </div>
    </div>`;
  karte(spiel).after(panel);
  knopf.setAttribute("aria-expanded", "true");
  panel.querySelector(".lern-zu").addEventListener("click", () => {
    lernhilfeUmschalten(spiel, knopf);
    knopf.focus({ preventScroll: true });
  });
  panel.querySelectorAll("[data-level]").forEach((b) =>
    b.addEventListener("click", () => {
      karte(spiel).querySelector(`.seg [data-level="${b.dataset.level}"]`).click();
      starten(spiel);
    }),
  );
  panel.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
}

function initKarten() {
  baueKarten();
  document.querySelectorAll(".game-card").forEach((k) => {
    const spiel = k.dataset.game;
    const art = k.querySelector(".game-art");
    zeichneVorschau(art, spiel);
    document.fonts?.load('16px "Press Start 2P"').then(() => zeichneVorschau(art, spiel));

    k.querySelector(".play").addEventListener("click", () => starten(spiel));
    const radios = [...k.querySelectorAll('[role="radio"]')];
    const seg = k.querySelector(".seg");
    if (!seg) {
      // Spiel ohne Schwierigkeitsgrade (z. B. Schlagzeug)
      zeigeBest(spiel);
      return;
    }
    const pill = seg.querySelector(".seg-pill");
    // Die Markierung gleitet unter den Knopf, auf dem die Maus ist,
    // und kehrt beim Verlassen zur gewählten Stufe zurück
    const pillZu = (btn) => {
      if (!btn.offsetWidth) return;
      pill.style.width = `${btn.offsetWidth}px`;
      pill.style.transform = `translateX(${btn.offsetLeft}px)`;
      radios.forEach((r) => r.classList.toggle("unter-pill", r === btn));
    };
    const gewaehlt = () => radios.find((r) => r.getAttribute("aria-checked") === "true");
    radios.forEach((r) => {
      r.addEventListener("pointerenter", (e) => e.pointerType === "mouse" && pillZu(r));
      r.addEventListener("focus", () => pillZu(r));
      r.addEventListener("blur", () => pillZu(gewaehlt()));
    });
    seg.addEventListener("pointerleave", () => pillZu(gewaehlt()));
    new ResizeObserver(() => pillZu(gewaehlt())).observe(seg);
    const waehle = (btn) => {
      radios.forEach((r) => r.setAttribute("aria-checked", String(r === btn)));
      pillZu(btn);
      zeigeBest(spiel);
      const info = k.querySelector(".game-stufe-info");
      if (info) info.textContent = btn.dataset.level === "lernen" ? "Lernen: Eröffnungen Zug für Zug am Brett üben" : `Stärke ${STUFEN[btn.dataset.level]}: ${NACH_ID[spiel].stufenInfo[btn.dataset.level]}`;
    };
    radios.forEach((r) => {
      r.addEventListener("click", () => waehle(r));
      r.addEventListener("keydown", (e) => {
        const i = radios.indexOf(r);
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          e.preventDefault();
          const n = radios[(i + (e.key === "ArrowRight" ? 1 : radios.length - 1)) % radios.length];
          waehle(n);
          n.focus();
        }
      });
    });
    waehle(radios.find((r) => r.dataset.level === "mittel") || radios[0]); // startet immer auf Mittel

    const lern = k.querySelector(".lern-toggle");
    lern?.addEventListener("click", () => lernhilfeUmschalten(spiel, lern));
  });

  document.getElementById("stage-close").addEventListener("click", () => {
    beenden();
    if (location.hash || location.search) history.replaceState(null, "", location.pathname);
  });
  new ResizeObserver(einpassen).observe(document.getElementById("stage-body"));

  // Link vom Hub (z. B. spiele.html?stufe=schwer#schach) startet das Spiel direkt,
  // mit der dort gewählten Schwierigkeit
  const vomHub = () => {
    const spiel = location.hash.slice(1);
    if (!LADER[spiel]) return;
    const stufe = new URLSearchParams(location.search).get("stufe");
    if (STUFEN[stufe]) karte(spiel)?.querySelector(`[data-level="${stufe}"]`)?.click();
    starten(spiel);
  };
  vomHub();
  window.addEventListener("hashchange", vomHub);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) laufendes?.inst?.pause?.();
  });
  onPower((an) => {
    if (!an) laufendes?.inst?.pause?.();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initShell();
  initKarten();
});
