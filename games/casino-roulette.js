// Roulette (europäisch, eine Null): Einsätze auf Zahlen, Farben, Gerade/Ungerade, Hälften und Dutzende.
// Auszahlung wie im echten Casino, Auszahlungsquote 97,3 % (die Null gehört der Bank).

export const RAD = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const ROT = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const farbe = (n) => (n === 0 ? "gruen" : ROT.has(n) ? "rot" : "schwarz");

// Wetten: Schlüssel → { name, gewinnt(n), faktor (Auszahlung inkl. Einsatz) }
export const WETTEN = {
  rot: { name: "Rot", gewinnt: (n) => farbe(n) === "rot", faktor: 2 },
  schwarz: { name: "Schwarz", gewinnt: (n) => farbe(n) === "schwarz", faktor: 2 },
  gerade: { name: "Gerade", gewinnt: (n) => n > 0 && n % 2 === 0, faktor: 2 },
  ungerade: { name: "Ungerade", gewinnt: (n) => n % 2 === 1, faktor: 2 },
  tief: { name: "1–18", gewinnt: (n) => n >= 1 && n <= 18, faktor: 2 },
  hoch: { name: "19–36", gewinnt: (n) => n >= 19, faktor: 2 },
  d1: { name: "1–12", gewinnt: (n) => n >= 1 && n <= 12, faktor: 3 },
  d2: { name: "13–24", gewinnt: (n) => n >= 13 && n <= 24, faktor: 3 },
  d3: { name: "25–36", gewinnt: (n) => n >= 25, faktor: 3 },
};
for (let n = 0; n <= 36; n++) WETTEN[`z${n}`] = { name: String(n), gewinnt: (x) => x === n, faktor: 36 };

export function baue(ziel, api) {
  // Zahlenfeld: am Desktop 3 Reihen × 12, am Handy 12 Reihen × 3 (Positionen per CSS-Variablen)
  const zahl = (n) => {
    const spalte = Math.ceil(n / 3) + 1;
    const reihe = 3 - ((n - 1) % 3);
    const mReihe = Math.ceil(n / 3) + 1;
    const mSpalte = ((n - 1) % 3) + 1;
    return `<button type="button" class="rl-feld ${farbe(n)}" data-w="z${n}" style="--c:${spalte};--r:${reihe};--mc:${mSpalte};--mr:${mReihe}">${n}<span class="rl-chip" hidden></span></button>`;
  };
  ziel.innerHTML = `
    <div class="rl">
      <div class="rl-oben">
        <div class="rl-buehne"><canvas class="rl-canvas" width="440" height="440" aria-label="Roulette-Kessel"></canvas><div class="rl-zahl" aria-live="polite"></div></div>
        <div class="rl-verlauf" aria-label="Letzte Zahlen"></div>
      </div>
      <div class="rl-brett">
        <button type="button" class="rl-feld gruen rl-null" data-w="z0">0<span class="rl-chip" hidden></span></button>
        ${Array.from({ length: 36 }, (_, i) => zahl(i + 1)).join("")}
      </div>
      <div class="rl-aussen">${["d1", "d2", "d3", "tief", "gerade", "rot", "schwarz", "ungerade", "hoch"].map((w) => `<button type="button" class="rl-feld ${w === "rot" ? "rot" : w === "schwarz" ? "schwarz" : "aussen"}" data-w="${w}">${WETTEN[w].name}<span class="rl-chip" hidden></span></button>`).join("")}</div>
      <p class="rl-ergebnis" aria-live="polite">Chips setzen: Feld antippen. Nochmal antippen erhöht den Einsatz.</p>
      <div class="casino-steuerung">
        <div class="einsatz-platz"></div>
        <div class="rl-knoepfe">
          <button type="button" class="more" data-a="loeschen">Einsätze zurück</button>
          <button type="button" class="more" data-a="wiederholen" hidden>Wie letztes Mal</button>
          <button type="button" class="btn casino-los" data-a="drehen" disabled>Drehen</button>
        </div>
      </div>
      <details class="casino-regeln"><summary>Auszahlungen</summary>
        <table class="casino-plan"><tr><td>Einzelne Zahl</td><td class="num">35:1</td></tr><tr><td>Dutzend (1–12, 13–24, 25–36)</td><td class="num">2:1</td></tr><tr><td>Rot/Schwarz, Gerade/Ungerade, 1–18/19–36</td><td class="num">1:1</td></tr></table>
        <p class="casino-klein">Bei der 0 verlieren alle Einsätze außer auf die 0 selbst. Deshalb kommen im Schnitt nur 97,3 % zurück.</p>
      </details>
    </div>`;
  const el = (s) => ziel.querySelector(s);
  const canvas = el(".rl-canvas");
  const ctx = canvas.getContext("2d");
  const einsatz = api.einsatzWahl(el(".einsatz-platz"));
  const ergebnisEl = el(".rl-ergebnis");
  const knopf = (a) => el(`[data-a="${a}"]`);
  let einsaetze = {}; // Wette → Betrag (schon vom Konto abgezogen)
  let letzte = null;
  let verlauf = [];
  let dreht = false;
  let winkel = 0;
  let kugel = null; // { winkel, radius }
  let raf = 0;
  let offen = null; // Ergebnis der laufenden Drehung
  const N = RAD.length;
  const SEG = (Math.PI * 2) / N;

  function zeichneKessel() {
    const r = 210;
    ctx.clearRect(0, 0, 440, 440);
    ctx.save();
    ctx.translate(220, 220);
    ctx.fillStyle = "#3a2a1a";
    ctx.beginPath();
    ctx.arc(0, 0, r + 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(winkel);
    for (let i = 0; i < N; i++) {
      const a = -Math.PI / 2 + i * SEG - SEG / 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, a, a + SEG);
      ctx.closePath();
      const f = farbe(RAD[i]);
      ctx.fillStyle = f === "gruen" ? "#1f9c63" : f === "rot" ? "#c6354e" : "#18161e";
      ctx.fill();
      ctx.strokeStyle = "#c9a227";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.save();
      ctx.rotate(a + SEG / 2);
      ctx.translate(r * 0.86, 0);
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = "#f2f2f3";
      ctx.font = '600 15px "Public Sans", sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(RAD[i]), 0, 0);
      ctx.restore();
    }
    // innerer Kegel
    const g = ctx.createRadialGradient(-20, -20, 10, 0, 0, r * 0.68);
    g.addColorStop(0, "#8a6a4a");
    g.addColorStop(1, "#3a2a1a");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#c9a227";
    ctx.lineWidth = 4;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos((i * Math.PI) / 2) * r * 0.45, Math.sin((i * Math.PI) / 2) * r * 0.45);
      ctx.stroke();
    }
    ctx.restore();
    if (kugel) {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(220 + Math.cos(kugel.winkel) * kugel.radius, 220 + Math.sin(kugel.winkel) * kugel.radius, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const summe = () => Object.values(einsaetze).reduce((a, b) => a + b, 0);
  function zeigeEinsaetze() {
    ziel.querySelectorAll(".rl-feld").forEach((f) => {
      const b = einsaetze[f.dataset.w];
      const chip = f.querySelector(".rl-chip");
      chip.hidden = !b;
      chip.textContent = b ? (b >= 1000 ? `${Math.round(b / 100) / 10}k` : b) : "";
    });
    knopf("drehen").disabled = dreht || !summe();
    knopf("loeschen").disabled = dreht || !summe();
    knopf("wiederholen").hidden = dreht || !letzte || summe() > 0;
    knopf("drehen").textContent = summe() ? `Drehen (${api.fmt(summe())})` : "Drehen";
  }
  function setzeChip(w, betrag) {
    if (dreht) return false;
    if (!api.setze(betrag)) {
      api.meldung("Zu wenig Guthaben für diesen Chip.");
      return false;
    }
    einsaetze[w] = (einsaetze[w] || 0) + betrag;
    zeigeEinsaetze();
    return true;
  }
  ziel.addEventListener("click", (e) => {
    const f = e.target.closest(".rl-feld");
    if (f) return void setzeChip(f.dataset.w, einsatz.wert());
    const a = e.target.closest("[data-a]")?.dataset.a;
    if (a === "loeschen" && !dreht) {
      api.gutschrift(summe());
      einsaetze = {};
      zeigeEinsaetze();
    } else if (a === "wiederholen" && letzte) {
      for (const [w, b] of Object.entries(letzte)) if (!setzeChip(w, b)) break;
    } else if (a === "drehen") drehen();
  });

  function drehen() {
    if (dreht || !summe()) return;
    dreht = true;
    zeigeEinsaetze();
    einsatz.sperre(true);
    ziel.querySelectorAll(".rl-feld").forEach((f) => f.classList.remove("treffer"));
    el(".rl-zahl").textContent = "";
    ergebnisEl.textContent = "Nichts geht mehr …";
    ergebnisEl.className = "rl-ergebnis";
    const idx = Math.floor(Math.random() * N);
    const zahl = RAD[idx];
    offen = zahl;
    // Kessel dreht rechts herum, Kugel links herum und fällt am Ende in das Fach idx
    const dauer = 4600;
    const t0 = performance.now();
    const w0 = winkel;
    const wEnde = w0 + Math.PI * 2 * 1.5;
    const kStart = -Math.PI / 2;
    const zielFach = (wEnd) => -Math.PI / 2 + idx * SEG + wEnd; // Fachmitte nach Kesseldrehung
    let kEnde = zielFach(wEnde);
    while (kEnde > kStart - Math.PI * 2 * 4) kEnde -= Math.PI * 2;
    const schritt = (t) => {
      const k = Math.min(1, (t - t0) / dauer);
      const e1 = 1 - Math.pow(1 - k, 3);
      winkel = w0 + (wEnde - w0) * e1;
      const kugelW = kStart + (kEnde - kStart) * (1 - Math.pow(1 - k, 2.4));
      // erst außen auf der Bahn, gegen Ende nach innen ins Fach
      const radius = k < 0.7 ? 200 : 200 - (k - 0.7) / 0.3 * 26 + Math.sin(k * 60) * (1 - k) * 6;
      kugel = { winkel: k < 1 ? kugelW : zielFach(winkel), radius };
      zeichneKessel();
      if (k < 1) raf = requestAnimationFrame(schritt);
      else fertig(zahl);
    };
    raf = requestAnimationFrame(schritt);
  }
  function fertig(zahl) {
    offen = null;
    let auszahlung = 0;
    const treffer = [];
    for (const [w, b] of Object.entries(einsaetze)) {
      if (WETTEN[w].gewinnt(zahl)) {
        auszahlung += b * WETTEN[w].faktor;
        treffer.push(WETTEN[w].name);
      }
    }
    const eingesetzt = summe();
    if (auszahlung) api.gutschrift(auszahlung);
    const f = farbe(zahl);
    el(".rl-zahl").textContent = zahl;
    el(".rl-zahl").className = `rl-zahl ${f}`;
    ziel.querySelectorAll(".rl-feld").forEach((x) => x.classList.toggle("treffer", WETTEN[x.dataset.w].gewinnt(zahl)));
    const netto = auszahlung - eingesetzt;
    const fName = f === "gruen" ? "Null" : f === "rot" ? "Rot" : "Schwarz";
    ergebnisEl.textContent = `${zahl} ${fName}: ${netto > 0 ? `gewonnen! +${api.fmt(netto)}` : netto === 0 && auszahlung ? "Einsatz zurück" : auszahlung ? `${api.fmt(auszahlung)} zurück (−${api.fmt(-netto)})` : `verloren (−${api.fmt(eingesetzt)})`}`;
    ergebnisEl.className = `rl-ergebnis ${netto > 0 ? "gewinn" : "nichts"}`;
    if (netto >= 500) api.meldung(`${zahl}! +${api.fmt(netto)}`, "gewinn");
    verlauf = [zahl, ...verlauf].slice(0, 10);
    el(".rl-verlauf").innerHTML = verlauf.map((z, i) => `<span class="rl-alt ${farbe(z)}${i === 0 ? " neu" : ""}">${z}</span>`).join("");
    letzte = einsaetze;
    einsaetze = {};
    dreht = false;
    einsatz.sperre(false);
    zeigeEinsaetze();
    api.runde();
  }
  const onKey = (e) => {
    if (e.key === " " && !e.target.closest?.("input, textarea, select, button")) {
      e.preventDefault();
      drehen();
    }
  };
  window.addEventListener("keydown", onKey);
  document.fonts?.ready.then(() => !dreht && zeichneKessel());
  zeichneKessel();
  zeigeEinsaetze();
  return {
    stop() {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      // Tab gewechselt: laufende Drehung sofort auswerten, nicht gesetzte Chips zurückgeben
      if (dreht && offen != null) fertig(offen);
      else if (summe()) api.gutschrift(summe());
      einsatz.aus();
    },
  };
}
