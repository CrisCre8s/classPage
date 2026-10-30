// Sudoku: 9 × 9, jede Zahl einmal pro Zeile, Spalte und Block. Generator mit eindeutiger Lösung, drei Stufen.

export const DOM = true;
export const HILFE = "Feld antippen, dann Zahl wählen · Tastatur: Pfeile bewegen, 1–9 eintragen, Entf löschen, N Notizen an/aus";

const ZIEL_VORGABEN = { leicht: 40, mittel: 32, schwer: 26 };

// ---------- Generator ----------
const zeileVon = (i) => Math.floor(i / 9);
const spalteVon = (i) => i % 9;
const blockVon = (i) => Math.floor(zeileVon(i) / 3) * 3 + Math.floor(spalteVon(i) / 3);
const NACHBARN = Array.from({ length: 81 }, (_, i) => {
  const n = new Set();
  for (let j = 0; j < 81; j++) if (j !== i && (zeileVon(j) === zeileVon(i) || spalteVon(j) === spalteVon(i) || blockVon(j) === blockVon(i))) n.add(j);
  return [...n];
});
const mische = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
function moeglich(feld, i) {
  let maske = 0x3fe; // Bits 1–9
  for (const j of NACHBARN[i]) if (feld[j]) maske &= ~(1 << feld[j]);
  return maske;
}
const bits = (m) => {
  const z = [];
  for (let d = 1; d <= 9; d++) if (m & (1 << d)) z.push(d);
  return z;
};
// zählt Lösungen bis „grenze“; füllt optional zufällig (für das volle Raster)
function loese(feld, grenze = 2, zufall = false) {
  let best = -1;
  let bestM = 0;
  let bestN = 10;
  for (let i = 0; i < 81; i++) {
    if (feld[i]) continue;
    const m = moeglich(feld, i);
    const n = bits(m).length;
    if (n === 0) return 0;
    if (n < bestN) {
      best = i;
      bestM = m;
      bestN = n;
      if (n === 1) break;
    }
  }
  if (best < 0) return 1;
  let anzahl = 0;
  const ziffern = zufall ? mische(bits(bestM)) : bits(bestM);
  for (const d of ziffern) {
    feld[best] = d;
    anzahl += loese(feld, grenze - anzahl, zufall);
    if (anzahl >= grenze) {
      if (!zufall) feld[best] = 0;
      return anzahl;
    }
  }
  feld[best] = 0;
  return anzahl;
}
export function erzeuge(stufe) {
  const loesung = Array(81).fill(0);
  loese(loesung, 1, true);
  const raetsel = [...loesung];
  const ziel = ZIEL_VORGABEN[stufe] || 32;
  let vorgaben = 81;
  for (const i of mische([...Array(81).keys()])) {
    if (vorgaben <= ziel) break;
    const alt = raetsel[i];
    raetsel[i] = 0;
    if (loese([...raetsel], 2) !== 1) raetsel[i] = alt;
    else vorgaben--;
  }
  return { raetsel, loesung };
}

const formatZeit = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function start({ dom, stufe, status, nachricht, ergebnis }) {
  dom.innerHTML = `
    <div class="sudoku">
      <div class="sudoku-feld" role="grid" aria-label="Sudoku"></div>
      <div class="sudoku-pad">
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => `<button type="button" class="sudoku-taste num" data-d="${d}">${d}<small></small></button>`).join("")}
        <button type="button" class="sudoku-taste sudoku-weg" data-d="0" aria-label="Löschen">⌫</button>
        <button type="button" class="sudoku-taste sudoku-notiz" data-a="notiz" aria-pressed="false">Notizen</button>
      </div>
      <div class="sudoku-knoepfe"><button class="more" type="button" data-a="neu">Neues Sudoku</button></div>
    </div>`;
  const feldEl = dom.querySelector(".sudoku-feld");
  const pad = dom.querySelector(".sudoku-pad");
  let raetsel, loesung, werte, notizen, auswahl, notizModus, start0, pausiert, laeuft, timer, vergangen;

  feldEl.innerHTML = Array.from({ length: 81 }, (_, i) => `<button type="button" class="sudoku-zelle" data-i="${i}" role="gridcell"></button>`).join("");
  const zellen = [...feldEl.children];

  function neu() {
    ({ raetsel, loesung } = erzeuge(stufe));
    werte = [...raetsel];
    notizen = Array.from({ length: 81 }, () => new Set());
    auswahl = raetsel.findIndex((v) => !v);
    notizModus = false;
    vergangen = 0;
    start0 = performance.now();
    pausiert = false;
    laeuft = true;
    clearInterval(timer);
    timer = setInterval(zeigeStatus, 500);
    zeichne();
    zeigeStatus();
    nachricht(null);
  }
  const zeit = () => vergangen + (pausiert || !laeuft ? 0 : (performance.now() - start0) / 1000);
  function zeigeStatus() {
    const offen = werte.filter((v) => !v).length;
    status(`${formatZeit(zeit())} · noch ${offen} Felder`);
  }
  function konflikt(i) {
    const v = werte[i];
    return v && NACHBARN[i].some((j) => werte[j] === v);
  }
  function zeichne() {
    const sel = auswahl;
    const selWert = sel >= 0 ? werte[sel] : 0;
    zellen.forEach((z, i) => {
      const v = werte[i];
      z.className = "sudoku-zelle";
      if (raetsel[i]) z.classList.add("vorgabe");
      if (sel >= 0 && i !== sel && (zeileVon(i) === zeileVon(sel) || spalteVon(i) === spalteVon(sel) || blockVon(i) === blockVon(sel))) z.classList.add("bereich");
      if (selWert && v === selWert) z.classList.add("gleich");
      if (i === sel) z.classList.add("aktiv");
      if (!raetsel[i] && konflikt(i)) z.classList.add("konflikt");
      if (spalteVon(i) % 3 === 2 && spalteVon(i) < 8) z.classList.add("rand-r");
      if (zeileVon(i) % 3 === 2 && zeileVon(i) < 8) z.classList.add("rand-u");
      if (v) {
        z.textContent = v;
      } else if (notizen[i].size) {
        z.innerHTML = `<span class="sudoku-notizen">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => `<span>${notizen[i].has(d) ? d : ""}</span>`).join("")}</span>`;
      } else z.textContent = "";
      z.setAttribute("aria-label", `Zeile ${zeileVon(i) + 1}, Spalte ${spalteVon(i) + 1}: ${v || "leer"}`);
    });
    // wie oft ist jede Zahl schon gesetzt?
    for (const b of pad.querySelectorAll("[data-d]")) {
      const d = Number(b.dataset.d);
      if (!d) continue;
      const n = werte.filter((v) => v === d).length;
      b.classList.toggle("fertig", n >= 9);
      b.querySelector("small").textContent = n >= 9 ? "" : 9 - n;
    }
    pad.querySelector('[data-a="notiz"]').setAttribute("aria-pressed", String(notizModus));
    pad.querySelector('[data-a="notiz"]').classList.toggle("an", notizModus);
  }
  function setze(d) {
    if (!laeuft || pausiert || auswahl < 0 || raetsel[auswahl]) return;
    if (d === 0) {
      werte[auswahl] = 0;
      notizen[auswahl].clear();
    } else if (notizModus) {
      if (werte[auswahl]) return;
      notizen[auswahl].has(d) ? notizen[auswahl].delete(d) : notizen[auswahl].add(d);
    } else {
      werte[auswahl] = werte[auswahl] === d ? 0 : d;
      // Notizen mit dieser Zahl bei den Nachbarn aufräumen
      if (werte[auswahl]) for (const j of NACHBARN[auswahl]) notizen[j].delete(d);
    }
    zeichne();
    zeigeStatus();
    if (werte.every((v, i) => v === loesung[i])) fertig();
  }
  function fertig() {
    const sek = zeit();
    laeuft = false;
    clearInterval(timer);
    vergangen = sek;
    const neu = ergebnis({ gewonnen: true, zeit: sek });
    status(`Gelöst in ${formatZeit(sek)}`);
    feldEl.classList.add("geloest");
    nachricht(`<p class="big">Gelöst!</p><p>${formatZeit(sek)} min${neu ? " · neue Bestzeit!" : ""}</p><p><button class="btn" type="button" data-neu>Neues Sudoku</button></p>`);
    document.querySelector("#stage-msg [data-neu]")?.addEventListener("click", (e) => {
      e.stopPropagation();
      feldEl.classList.remove("geloest");
      neu();
    });
  }
  function waehle(i) {
    auswahl = Math.max(0, Math.min(80, i));
    zeichne();
  }
  feldEl.addEventListener("click", (e) => {
    const z = e.target.closest(".sudoku-zelle");
    if (z) waehle(Number(z.dataset.i));
  });
  pad.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.a === "notiz") {
      notizModus = !notizModus;
      zeichne();
    } else setze(Number(b.dataset.d));
  });
  dom.querySelector('[data-a="neu"]').addEventListener("click", () => {
    feldEl.classList.remove("geloest");
    neu();
  });
  const onKey = (e) => {
    if (!laeuft || pausiert) return;
    if (e.target.closest?.("input, textarea")) return;
    const k = e.key;
    const z = zeileVon(auswahl);
    const s = spalteVon(auswahl);
    if (k === "ArrowLeft") waehle(z * 9 + ((s + 8) % 9));
    else if (k === "ArrowRight") waehle(z * 9 + ((s + 1) % 9));
    else if (k === "ArrowUp") waehle(((z + 8) % 9) * 9 + s);
    else if (k === "ArrowDown") waehle(((z + 1) % 9) * 9 + s);
    else if (/^[1-9]$/.test(k)) setze(Number(k));
    else if (k === "Backspace" || k === "Delete" || k === "0") setze(0);
    else if (k === "n" || k === "N") {
      notizModus = !notizModus;
      zeichne();
    } else return;
    e.preventDefault();
  };
  window.addEventListener("keydown", onKey);

  status("Sudoku");
  nachricht(`<p class="big">Sudoku</p><p>Jede Zahl von 1 bis 9 genau einmal in jeder Zeile, jeder Spalte und jedem 3 × 3-Block. ${ZIEL_VORGABEN[stufe] || 32} Zahlen sind vorgegeben, es gibt genau eine Lösung.</p><p class="small">Doppelte Zahlen werden rot markiert · die Zeit läuft ab dem Start</p><p><button class="btn" type="button" data-start>Los geht's</button></p>`);
  document.querySelector("#stage-msg [data-start]")?.addEventListener("click", (e) => {
    e.stopPropagation();
    neu();
  });

  return {
    pause() {
      if (!laeuft || pausiert) return;
      vergangen = zeit();
      pausiert = true;
      feldEl.classList.add("verdeckt");
      nachricht(`<p class="big">Pause</p><p><button class="btn" type="button" data-weiter>Weiter</button></p>`);
      document.querySelector("#stage-msg [data-weiter]")?.addEventListener("click", (e) => {
        e.stopPropagation();
        pausiert = false;
        start0 = performance.now();
        feldEl.classList.remove("verdeckt");
        nachricht(null);
      });
    },
    stop() {
      laeuft = false;
      clearInterval(timer);
      window.removeEventListener("keydown", onKey);
      dom.innerHTML = "";
    },
  };
}
