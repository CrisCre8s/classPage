// Spielautomat: 3 Walzen, eine Gewinnlinie in der Mitte. Auszahlungsquote ca. 97 % (durchgerechnet).

// Symbole mit Gewicht auf jeder Walze (Summe 23) und Gewinn für drei gleiche (Vielfaches vom Einsatz)
export const SYMBOLE = [
  { id: "bug", zeichen: "🐛", name: "Bug", gewicht: 7, drei: 5 },
  { id: "kaffee", zeichen: "☕", name: "Kaffee", gewicht: 6, drei: 8 },
  { id: "disk", zeichen: "💾", name: "Diskette", gewicht: 4, drei: 15 },
  { id: "server", zeichen: "🖥️", name: "Server", gewicht: 3, drei: 30 },
  { id: "hotte", zeichen: "🔥", name: "Hotte", gewicht: 2, drei: 60 },
  { id: "sieben", zeichen: "7️⃣", name: "Sieben", gewicht: 1, drei: 250 },
];
const SUMME = SYMBOLE.reduce((a, s) => a + s.gewicht, 0);
const zufall = () => {
  let r = Math.random() * SUMME;
  for (const s of SYMBOLE) if ((r -= s.gewicht) < 0) return s;
  return SYMBOLE[0];
};

// Gewinnregeln: 3 gleiche → Tabelle · 2× Hotte irgendwo → 6× · erste zwei gleich → Einsatz zurück · 1× Hotte → Einsatz zurück
export function auswerten([a, b, c]) {
  if (a.id === b.id && b.id === c.id) return { faktor: a.drei, text: `3× ${a.name}` };
  const hotte = [a, b, c].filter((s) => s.id === "hotte").length;
  if (hotte === 2) return { faktor: 6, text: "2× Hotte" };
  if (a.id === b.id) return { faktor: 1, text: `2× ${a.name}: Einsatz zurück` };
  if (hotte === 1) return { faktor: 1, text: "Hotte: Einsatz zurück" };
  return { faktor: 0, text: "" };
}

export function baue(ziel, api) {
  ziel.innerHTML = `
    <div class="automat">
      <div class="automat-gehaeuse">
        <div class="automat-schild">HOTTE-O-MAT</div>
        <div class="automat-fenster">
          ${[0, 1, 2].map((i) => `<div class="walze" data-w="${i}"><div class="walze-band"></div></div>`).join("")}
          <div class="automat-linie" aria-hidden="true"></div>
        </div>
        <p class="automat-ergebnis" aria-live="polite">&nbsp;</p>
      </div>
      <div class="casino-steuerung">
        <div class="einsatz-platz"></div>
        <button type="button" class="btn casino-los" data-los>Drehen</button>
      </div>
      <details class="casino-regeln"><summary>Gewinnplan</summary>
        <table class="casino-plan">${SYMBOLE.slice().reverse().map((s) => `<tr><td>${s.zeichen.repeat(3)}</td><td class="num">${s.drei}×</td></tr>`).join("")}
        <tr><td>🔥🔥 irgendwo</td><td class="num">6×</td></tr>
        <tr><td>erste zwei gleich</td><td class="num">1× (zurück)</td></tr>
        <tr><td>ein 🔥 irgendwo</td><td class="num">1× (zurück)</td></tr></table>
        <p class="casino-klein">Ausgezahlt werden im Schnitt etwa 97 % der Einsätze. Auf Dauer gewinnt also der Automat, wie bei echten Automaten auch.</p>
      </details>
    </div>`;
  const el = (s) => ziel.querySelector(s);
  const einsatz = api.einsatzWahl(el(".einsatz-platz"));
  const walzen = [...ziel.querySelectorAll(".walze-band")];
  const ergebnisEl = el(".automat-ergebnis");
  const los = el("[data-los]");
  let dreht = false;
  let offen = null; // { neu, e, timer } während die Walzen laufen
  let aktuell = [zufall(), zufall(), zufall()];
  const H = () => ziel.querySelector(".walze").clientHeight / 3; // Höhe eines Symbols

  // Band: oben/mitte/unten sichtbar, Mitte = Gewinnlinie
  function setzeBand(band, symbole) {
    band.innerHTML = symbole.map((s) => `<span class="walze-symbol">${s.zeichen}</span>`).join("");
  }
  walzen.forEach((b, i) => {
    setzeBand(b, [zufall(), aktuell[i], zufall()]);
    b.style.transform = "translateY(0)";
  });

  function drehen() {
    if (dreht) return;
    const e = einsatz.wert();
    if (!api.setze(e)) return api.meldung("Zu wenig Guthaben für diesen Einsatz.");
    dreht = true;
    los.disabled = true;
    einsatz.sperre(true);
    ergebnisEl.innerHTML = "&nbsp;";
    ergebnisEl.className = "automat-ergebnis";
    el(".automat-fenster").classList.remove("gewinnt");
    const neu = [zufall(), zufall(), zufall()];
    const h = H();
    walzen.forEach((band, i) => {
      // langes Band: altes Bild oben, viele Zufallssymbole, am Ende das neue Bild
      const laenge = 18 + i * 6;
      const symbole = [zufall(), aktuell[i], zufall(), ...Array.from({ length: laenge }, zufall), zufall(), neu[i], zufall()];
      band.style.transition = "none";
      setzeBand(band, symbole);
      band.style.transform = "translateY(0)";
      void band.offsetHeight;
      band.style.transition = `transform ${1.1 + i * 0.45}s cubic-bezier(0.15, 0.6, 0.25, 1.02)`;
      band.style.transform = `translateY(${-(symbole.length - 3) * h}px)`;
    });
    const timer = setTimeout(() => fertig(neu, e), 1100 + 2 * 450 + 150);
    offen = { neu, e, timer };
  }
  function fertig(neu, e, still = false) {
    offen = null;
    {
      const r = auswerten(neu);
      const gewinn = Math.round(e * r.faktor);
      if (still) {
        if (gewinn) api.gutschrift(gewinn);
        api.runde();
        return;
      }
      aktuell = neu;
      // Band auf die drei sichtbaren Symbole kürzen
      walzen.forEach((band, i) => {
        const sym = [...band.children];
        band.style.transition = "none";
        band.innerHTML = sym.slice(-3).map((s) => s.outerHTML).join("");
        band.style.transform = "translateY(0)";
      });
      if (gewinn) api.gutschrift(gewinn);
      if (r.faktor > 1) {
        ergebnisEl.textContent = `${r.text}: +${api.fmt(gewinn)}`;
        ergebnisEl.className = `automat-ergebnis gewinn${r.faktor >= 30 ? " gross" : ""}`;
        el(".automat-fenster").classList.add("gewinnt");
        if (r.faktor >= 30) api.meldung(`JACKPOT! +${api.fmt(gewinn)}`, "gewinn");
      } else if (r.faktor === 1) {
        ergebnisEl.textContent = r.text;
        ergebnisEl.className = "automat-ergebnis zurueck";
      } else {
        ergebnisEl.textContent = "Leider nichts. Nochmal?";
        ergebnisEl.className = "automat-ergebnis nichts";
      }
      api.runde();
      dreht = false;
      los.disabled = false;
      einsatz.sperre(false);
    }
  }
  los.addEventListener("click", drehen);
  const onKey = (e) => {
    if (e.key === " " && !e.target.closest?.("input, textarea, select, button")) {
      e.preventDefault();
      drehen();
    }
  };
  window.addEventListener("keydown", onKey);
  return {
    stop() {
      window.removeEventListener("keydown", onKey);
      // Tab gewechselt, während die Walzen laufen: Gewinn trotzdem gutschreiben
      if (offen) {
        clearTimeout(offen.timer);
        fertig(offen.neu, offen.e, true);
      }
      einsatz.aus();
    },
  };
}
