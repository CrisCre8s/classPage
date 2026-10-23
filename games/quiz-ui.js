// Gemeinsame Oberfläche für die Lernspiele: Zeitbalken, Punkte, Serie, Eingabe oder Auswahl,
// Bildschirm-Ziffernfeld und eine Auswertung mit den Fehlern am Ende.

const TASTEN = {
  bin: ["0", "1"],
  dez: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  hex: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F"],
  ip: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "."],
};

export const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/**
 * naechste() liefert die nächste Frage:
 *  { frage: html, loesung: text, pruefe(eingabe) → bool, tastatur?: "bin"|"dez"|"hex"|"ip",
 *    optionen?: [text], richtigIndex?: number, erklaerung?: html, platzhalter?: text,
 *    freitext?: bool (normale Tastatur, keine Großbuchstaben), hinweis?: text (aufdeckbar, halbe Punkte) }
 */
export function quizSpiel({ dom, status, nachricht, ergebnis, titel, intro, sekunden, punkteJe, naechste }) {
  const grob = window.matchMedia("(pointer: coarse)").matches; // Touch: eigenes Ziffernfeld statt Handytastatur
  dom.innerHTML = `
    <div class="quiz">
      <div class="quiz-top">
        <div class="quiz-zeit" aria-hidden="true"><span></span></div>
        <span class="quiz-serie num"></span>
      </div>
      <div class="quiz-frage" aria-live="polite"></div>
      <form class="quiz-form" autocomplete="off">
        <input class="quiz-input num" type="text" spellcheck="false" autocapitalize="characters" autocorrect="off" aria-label="Antwort" ${grob ? "readonly" : ""} />
        <button class="btn quiz-pruefen" type="submit">Prüfen</button>
      </form>
      <div class="quiz-hilfe" hidden>
        <button class="quiz-hinweis-btn" type="button">Hinweis aufdecken <span>halbe Punkte</span></button>
        <p class="quiz-hinweis" hidden></p>
      </div>
      <div class="quiz-optionen" hidden></div>
      <p class="quiz-feedback" aria-live="assertive"></p>
      <div class="quiz-pad" hidden></div>
      <button class="more quiz-skip" type="button">Überspringen</button>
    </div>`;
  const el = (s) => dom.querySelector(s);
  const frageEl = el(".quiz-frage");
  const form = el(".quiz-form");
  const input = el(".quiz-input");
  const optionen = el(".quiz-optionen");
  const feedback = el(".quiz-feedback");
  const pad = el(".quiz-pad");
  const balken = el(".quiz-zeit span");
  const serieEl = el(".quiz-serie");
  const hilfe = el(".quiz-hilfe");
  const hinweisBtn = el(".quiz-hinweis-btn");
  const hinweisEl = el(".quiz-hinweis");

  let frage, punkte, serie, richtig, gesamt, fehler, ende, timer, sperre, laeuft, raf, hinweise, mitHinweis;

  function zeigeStatus() {
    status(`${punkte} Pkt · ${richtig}/${gesamt} richtig`);
    serieEl.textContent = serie >= 3 ? `Serie ${serie} · +${bonus()}` : "";
  }
  const bonus = () => (serie >= 3 ? Math.min(serie - 2, 5) * Math.round(punkteJe / 5) : 0);

  function baueTastatur(art) {
    if (!art) {
      pad.hidden = true;
      return;
    }
    pad.hidden = false;
    pad.dataset.art = art;
    pad.innerHTML =
      TASTEN[art].map((t) => `<button type="button" class="quiz-taste num" data-t="${t}">${t}</button>`).join("") +
      `<button type="button" class="quiz-taste quiz-loeschen" data-t="⌫" aria-label="Löschen">⌫</button>` +
      `<button type="button" class="quiz-taste quiz-ok" data-t="ok">OK</button>`;
  }

  function zeigeFrage() {
    frage = naechste();
    frageEl.innerHTML = frage.frage;
    feedback.textContent = "";
    feedback.className = "quiz-feedback";
    mitHinweis = false;
    hilfe.hidden = !frage.hinweis;
    hinweisBtn.hidden = false;
    hinweisEl.hidden = true;
    hinweisEl.textContent = frage.hinweis || "";
    if (frage.optionen) {
      form.hidden = true;
      pad.hidden = true;
      optionen.hidden = false;
      optionen.innerHTML = frage.optionen.map((o, i) => `<button type="button" class="quiz-option" data-i="${i}"><span class="num">${i + 1}</span>${esc(o)}</button>`).join("");
      optionen.querySelector("button")?.focus({ preventScroll: true });
    } else {
      form.hidden = false;
      optionen.hidden = true;
      input.value = "";
      input.placeholder = frage.platzhalter || "";
      // Freitext (z. B. Befehle): echte Handytastatur, nichts automatisch groß schreiben
      input.readOnly = grob && !frage.freitext;
      input.setAttribute("autocapitalize", frage.freitext ? "off" : "characters");
      input.setAttribute("aria-label", frage.freitext ? "Befehl eingeben" : "Antwort");
      baueTastatur(frage.tastatur);
      if (!grob) input.focus({ preventScroll: true });
    }
  }

  function antworte(eingabe, optionIndex) {
    if (!laeuft || sperre) return;
    const ok = frage.optionen ? optionIndex === frage.richtigIndex : frage.pruefe(eingabe);
    gesamt++;
    sperre = true;
    if (ok) {
      richtig++;
      serie++;
      const wert = punkteJe + bonus();
      punkte += mitHinweis ? Math.round(wert / 2) : wert;
      feedback.textContent = mitHinweis ? `Richtig! Mit Hinweis: +${Math.round(wert / 2)}` : "Richtig!";
      feedback.className = "quiz-feedback ok";
    } else {
      serie = 0;
      fehler.push({ frage: frage.frage, loesung: frage.loesung, eingabe: frage.optionen ? frage.optionen[optionIndex] ?? "–" : eingabe || "–" });
      feedback.innerHTML = `Richtig wäre: <strong class="num">${esc(frage.loesung)}</strong>${frage.erklaerung ? `<span class="quiz-erkl">${frage.erklaerung}</span>` : ""}`;
      feedback.className = "quiz-feedback falsch";
    }
    if (frage.optionen) {
      optionen.querySelectorAll(".quiz-option").forEach((b, i) => {
        if (i === frage.richtigIndex) b.classList.add("ok");
        else if (i === optionIndex) b.classList.add("falsch");
      });
    }
    hinweisBtn.hidden = true;
    zeigeStatus();
    setTimeout(() => {
      sperre = false;
      if (laeuft) zeigeFrage();
    }, ok ? 450 : frage.erklaerung ? 2600 : 1600);
  }

  function tick() {
    const rest = Math.max(0, ende - performance.now());
    balken.style.transform = `scaleX(${rest / (sekunden * 1000)})`;
    balken.classList.toggle("knapp", rest < 10000);
    if (rest <= 0) return fertig();
    raf = requestAnimationFrame(tick);
  }

  function fertig() {
    laeuft = false;
    cancelAnimationFrame(raf);
    const quote = gesamt ? Math.round((richtig / gesamt) * 100) : 0;
    const neu = ergebnis({ punkte });
    const liste = fehler
      .slice(-5)
      .map((f) => `<li><span class="quiz-auswertung-frage">${f.frage}</span><span>deine Antwort <span class="num">${esc(f.eingabe)}</span> · richtig <strong class="num">${esc(f.loesung)}</strong></span></li>`)
      .join("");
    nachricht(`
      <p class="big">Zeit um!</p>
      <p>${punkte} Punkte · ${richtig} von ${gesamt} richtig (${quote} %)${hinweise ? ` · ${hinweise} ${hinweise === 1 ? "Hinweis" : "Hinweise"} genutzt` : ""}${neu ? " · neuer Highscore!" : ""}</p>
      ${liste ? `<div class="quiz-auswertung"><p class="small">Zum Nachlernen:</p><ul>${liste}</ul></div>` : ""}
      <p><button class="btn" type="button" data-neu>Nochmal</button></p>`);
    document.querySelector("#stage-msg [data-neu]")?.addEventListener("click", (e) => {
      e.stopPropagation();
      los();
    });
  }

  function los() {
    punkte = 0;
    serie = 0;
    richtig = 0;
    gesamt = 0;
    fehler = [];
    hinweise = 0;
    sperre = false;
    laeuft = true;
    nachricht(null);
    zeigeStatus();
    zeigeFrage();
    ende = performance.now() + sekunden * 1000;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  }

  // ---------- Eingabe ----------
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (input.value.trim()) antworte(input.value.trim());
  });
  optionen.addEventListener("click", (e) => {
    const b = e.target.closest(".quiz-option");
    if (b) antworte(null, Number(b.dataset.i));
  });
  pad.addEventListener("click", (e) => {
    const b = e.target.closest(".quiz-taste");
    if (!b) return;
    const t = b.dataset.t;
    if (t === "⌫") input.value = input.value.slice(0, -1);
    else if (t === "ok") input.value.trim() && antworte(input.value.trim());
    else input.value += t;
  });
  el(".quiz-skip").addEventListener("click", () => antworte("", -1));
  hinweisBtn.addEventListener("click", () => {
    if (!laeuft || sperre || mitHinweis) return;
    mitHinweis = true;
    hinweise++;
    hinweisBtn.hidden = true;
    hinweisEl.hidden = false;
    input.focus({ preventScroll: true });
  });
  const onKey = (e) => {
    if (!laeuft) {
      if (e.key === "Enter" && !document.getElementById("stage-msg").hidden && gesamt === undefined) los();
      return;
    }
    if (frage?.optionen && /^[1-9]$/.test(e.key) && Number(e.key) <= frage.optionen.length) {
      e.preventDefault();
      antworte(null, Number(e.key) - 1);
    }
  };
  window.addEventListener("keydown", onKey);
  const msg = document.getElementById("stage-msg");
  const onMsg = (e) => {
    if (e.target.closest("button")) return;
    if (gesamt === undefined) los(); // nur der Startbildschirm startet per Klick
  };
  msg.addEventListener("click", onMsg);

  status(titel);
  nachricht(`<p class="big">${esc(titel)}</p><p>${intro}</p><p class="small">${sekunden} Sekunden · Klick zum Start</p><p><button class="btn" type="button" data-start>Los geht's</button></p>`);
  document.querySelector("#stage-msg [data-start]")?.addEventListener("click", (e) => {
    e.stopPropagation();
    los();
  });

  return {
    pause() {},
    stop() {
      laeuft = false;
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
      msg.removeEventListener("click", onMsg);
      dom.innerHTML = "";
    },
  };
}
