// Glücksrad: 20 gleich große Felder mit Multiplikatoren. Auszahlungsquote 97,5 % (Summe der Felder / 20).

export const FELDER = [0, 2, 0.5, 1.5, 0, 1, 0, 0.5, 0, 1.5, 0, 10, 0, 0, 0.5, 0, 0, 1, 0.5, 0.5];
const FARBE = (m) => (m === 0 ? "#2a2733" : m < 1 ? "#4a3c6e" : m === 1 ? "#6a8cff" : m < 3 ? "#5fc39c" : m < 10 ? "#f0a35e" : "#f5d97a");
const text = (m) => (m === 0 ? "0" : `${String(m).replace(".", ",")}×`);

export function baue(ziel, api) {
  ziel.innerHTML = `
    <div class="rad">
      <div class="rad-buehne"><canvas class="rad-canvas" width="600" height="600" aria-label="Glücksrad"></canvas><div class="rad-zeiger" aria-hidden="true"></div></div>
      <p class="rad-ergebnis" aria-live="polite">&nbsp;</p>
      <p class="rad-bilanz casino-klein" aria-live="polite">&nbsp;</p>
      <div class="casino-steuerung">
        <div class="einsatz-platz"></div>
        <button type="button" class="btn casino-los" data-los>Drehen</button>
      </div>
      <details class="casino-regeln"><summary>Felder</summary>
        <p class="casino-klein">20 gleich große Felder: ${[...new Set(FELDER)].sort((a, b) => a - b).map((m) => `${FELDER.filter((x) => x === m).length}× ${text(m)}`).join(" · ")}. Mehr als den Einsatz gibt es nur bei 1,5×, 2× und 10× – also in 4 von 20 Feldern (20 %). 0,5× ist ein Verlust. Im Schnitt kommen 97,5 % der Einsätze zurück, auf Dauer verliert man also ein wenig.</p>
      </details>
    </div>`;
  const el = (s) => ziel.querySelector(s);
  const canvas = el(".rad-canvas");
  const ctx = canvas.getContext("2d");
  const einsatz = api.einsatzWahl(el(".einsatz-platz"));
  const los = el("[data-los]");
  const ergebnisEl = el(".rad-ergebnis");
  const N = FELDER.length;
  const SEG = (Math.PI * 2) / N;
  let winkel = 0;
  let dreht = false;
  let raf = 0;
  let offen = null; // { m, e } während das Rad dreht
  // Bilanz seit dem Öffnen: Drehungen, echte Gewinne (mehr als der Einsatz) und Plus/Minus
  const bilanz = { n: 0, plus: 0, netto: 0 };
  const vz = (x) => (x > 0 ? `+${api.fmt(x)}` : x < 0 ? `−${api.fmt(-x)}` : "±0");

  function zeichne(hervor = -1) {
    const r = 290;
    ctx.clearRect(0, 0, 600, 600);
    ctx.save();
    ctx.translate(300, 300);
    ctx.rotate(winkel);
    for (let i = 0; i < N; i++) {
      // Feld i liegt mittig bei -90° + i·SEG (oben, wenn winkel = 0)
      const a = -Math.PI / 2 + i * SEG - SEG / 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, a, a + SEG);
      ctx.closePath();
      ctx.fillStyle = FARBE(FELDER[i]);
      ctx.fill();
      ctx.strokeStyle = "#0f0e13";
      ctx.lineWidth = 3;
      ctx.stroke();
      if (i === hervor) {
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.fill();
      }
      ctx.save();
      ctx.rotate(a + SEG / 2);
      ctx.translate(r * 0.72, 0);
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = FELDER[i] >= 3 ? "#0f0e13" : "#f2f2f3";
      ctx.font = `${FELDER[i] >= 10 ? 700 : 600} ${FELDER[i] >= 10 ? 30 : 26}px "Public Sans", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text(FELDER[i]), 0, 0);
      ctx.restore();
    }
    // Lämpchen am Rand
    for (let i = 0; i < N; i++) {
      const a = -Math.PI / 2 + i * SEG - SEG / 2;
      ctx.fillStyle = dreht && Math.floor(performance.now() / 120 + i) % 2 ? "#fff6d0" : "#f5d97a";
      ctx.beginPath();
      ctx.arc(Math.cos(a) * (r - 6), Math.sin(a) * (r - 6), 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // Nabe
    ctx.fillStyle = "#16141c";
    ctx.beginPath();
    ctx.arc(300, 300, 54, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#f5d97a";
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = "#f5d97a";
    ctx.font = '700 30px "Public Sans", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🔥", 300, 302);
  }

  function drehen() {
    if (dreht) return;
    const e = einsatz.wert();
    if (!api.setze(e)) return api.meldung("Zu wenig Guthaben für diesen Einsatz.");
    dreht = true;
    los.disabled = true;
    einsatz.sperre(true);
    ergebnisEl.innerHTML = "&nbsp;";
    ergebnisEl.className = "rad-ergebnis";
    const ziel_ = Math.floor(Math.random() * N);
    // Endwinkel: Feld ziel_ oben unter dem Zeiger, mit leichtem Versatz im Feld und 5–7 Umdrehungen
    const versatz = (Math.random() - 0.5) * SEG * 0.8;
    const start = winkel;
    const basis = -ziel_ * SEG - versatz;
    let ende = basis;
    const umdrehungen = 5 + Math.floor(Math.random() * 3);
    while (ende < start + umdrehungen * Math.PI * 2) ende += Math.PI * 2;
    offen = { m: FELDER[ziel_], e };
    const dauer = 4200;
    const t0 = performance.now();
    const schritt = (t) => {
      const k = Math.min(1, (t - t0) / dauer);
      const ease = 1 - Math.pow(1 - k, 4);
      winkel = start + (ende - start) * ease;
      zeichne();
      if (k < 1) raf = requestAnimationFrame(schritt);
      else {
        winkel = ende % (Math.PI * 2);
        offen = null;
        const m = FELDER[ziel_];
        const gewinn = Math.round(e * m);
        if (gewinn) api.gutschrift(gewinn);
        zeichne(ziel_);
        // Anzeige immer mit dem Ergebnis gegenüber dem Einsatz, damit 0,5× nicht wie ein Gewinn aussieht
        const netto = gewinn - e;
        if (m > 1) {
          ergebnisEl.textContent = `${text(m)}: ${api.fmt(gewinn)} zurück · Gewinn ${vz(netto)}`;
          ergebnisEl.className = `rad-ergebnis gewinn${m >= 10 ? " gross" : ""}`;
          if (m >= 10) api.meldung(`10×! Gewinn ${vz(netto)}`, "gewinn");
        } else if (m === 1) {
          ergebnisEl.textContent = "1×: Einsatz zurück · ±0";
          ergebnisEl.className = "rad-ergebnis zurueck";
        } else if (m > 0) {
          ergebnisEl.textContent = `${text(m)}: nur ${api.fmt(gewinn)} zurück · Verlust ${vz(netto)}`;
          ergebnisEl.className = "rad-ergebnis nichts";
        } else {
          ergebnisEl.textContent = `Niete · Verlust ${vz(netto)}`;
          ergebnisEl.className = "rad-ergebnis nichts";
        }
        bilanz.n++;
        if (m > 1) bilanz.plus++;
        bilanz.netto += netto;
        el(".rad-bilanz").textContent = `Bisher: ${bilanz.n} Drehung${bilanz.n === 1 ? "" : "en"} · echter Gewinn in ${bilanz.plus} · Bilanz ${vz(bilanz.netto)}`;
        api.runde(gewinn - e);
        dreht = false;
        los.disabled = false;
        einsatz.sperre(false);
      }
    };
    raf = requestAnimationFrame(schritt);
  }
  los.addEventListener("click", drehen);
  const onKey = (e) => {
    if (e.key === " " && !e.target.closest?.("input, textarea, select, button")) {
      e.preventDefault();
      drehen();
    }
  };
  window.addEventListener("keydown", onKey);
  document.fonts?.ready.then(() => !dreht && zeichne());
  zeichne();
  return {
    stop() {
      cancelAnimationFrame(raf);
      if (offen) {
        // Tab gewechselt, während das Rad dreht: Ergebnis trotzdem auszahlen
        const g = Math.round(offen.e * offen.m);
        if (g) api.gutschrift(g);
        api.runde(g - offen.e);
      }
      window.removeEventListener("keydown", onKey);
      einsatz.aus();
    },
  };
}
