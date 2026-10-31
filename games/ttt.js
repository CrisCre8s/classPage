// Tic-Tac-Toe gegen den Computer. Auf Schwer rechnet er alles durch (Minimax) und ist nicht zu schlagen.

export const DOM = true;
export const HILFE = "Feld antippen · Tastatur: Ziffern 1–9 wie auf dem Nummernblock · wer anfängt, wechselt jede Runde";

const LINIEN = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
// Nummernblock-Belegung: 7 8 9 oben, 1 2 3 unten
const NUMPAD = { 7: 0, 8: 1, 9: 2, 4: 3, 5: 4, 6: 5, 1: 6, 2: 7, 3: 8 };

export function gewinner(b) {
  for (const [a, c, d] of LINIEN) if (b[a] && b[a] === b[c] && b[a] === b[d]) return { wer: b[a], linie: [a, c, d] };
  return b.every(Boolean) ? { wer: "remis" } : null;
}
// Minimax mit Tiefe: schnelle Siege und späte Niederlagen bevorzugt
function minimax(b, am, ich, tiefe = 0) {
  const g = gewinner(b);
  if (g) return g.wer === "remis" ? 0 : g.wer === ich ? 10 - tiefe : tiefe - 10;
  const werte = [];
  for (let i = 0; i < 9; i++) {
    if (b[i]) continue;
    b[i] = am;
    werte.push(minimax(b, am === "X" ? "O" : "X", ich, tiefe + 1));
    b[i] = null;
  }
  return am === ich ? Math.max(...werte) : Math.min(...werte);
}
export function besterZug(b, ich) {
  let best = -Infinity;
  let zuege = [];
  for (let i = 0; i < 9; i++) {
    if (b[i]) continue;
    b[i] = ich;
    const w = minimax(b, ich === "X" ? "O" : "X", ich, 1);
    b[i] = null;
    if (w > best) {
      best = w;
      zuege = [i];
    } else if (w === best) zuege.push(i);
  }
  return zuege[Math.floor(Math.random() * zuege.length)];
}
function gewinnzug(b, wer) {
  for (const l of LINIEN) {
    const werte = l.map((i) => b[i]);
    if (werte.filter((v) => v === wer).length === 2 && werte.includes(null)) return l[werte.indexOf(null)];
  }
  return -1;
}
function computerZug(b, stufe) {
  const frei = b.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
  const zufall = () => frei[Math.floor(Math.random() * frei.length)];
  if (stufe === "schwer") return besterZug(b, "O");
  const sieg = gewinnzug(b, "O");
  const abwehr = gewinnzug(b, "X");
  if (stufe === "leicht") {
    // sieht eigene Siege meistens, eure Drohungen nur manchmal
    if (sieg >= 0 && Math.random() < 0.7) return sieg;
    if (abwehr >= 0 && Math.random() < 0.35) return abwehr;
    return zufall();
  }
  // Mittel: gewinnt und blockt immer, spielt sonst halb perfekt, halb zufällig
  if (sieg >= 0) return sieg;
  if (abwehr >= 0) return abwehr;
  return Math.random() < 0.5 ? besterZug(b, "O") : zufall();
}

export function start({ dom, tools, stufe, status, nachricht, ergebnis }) {
  dom.innerHTML = `
    <div class="ttt">
      <p class="ttt-zug" aria-live="polite"></p>
      <div class="ttt-buehne">
        <div class="ttt-feld" role="grid" aria-label="Tic-Tac-Toe">${Array.from({ length: 9 }, (_, i) => `<button type="button" class="ttt-zelle" data-i="${i}"></button>`).join("")}</div>
        <svg class="ttt-linie" viewBox="0 0 300 300" aria-hidden="true"><line x1="0" y1="0" x2="0" y2="0" /></svg>
        <div class="ttt-konfetti" aria-hidden="true"></div>
      </div>
      <div class="ttt-stand num"><span>Du <b data-s="X">0</b></span><span>Remis <b data-s="remis">0</b></span><span>Computer <b data-s="O">0</b></span></div>
      <div class="ttt-knoepfe"><button class="btn" type="button" data-a="neu" hidden>Nächste Runde</button></div>
    </div>`;
  const zellen = [...dom.querySelectorAll(".ttt-zelle")];
  const zugEl = dom.querySelector(".ttt-zug");
  const neuKnopf = dom.querySelector('[data-a="neu"]');
  const stand = { X: 0, O: 0, remis: 0 };
  let brett, amZug, ende, runde = 0, denkt, aktiv = true;
  // zu zweit an einem Gerät: X und O setzen abwechselnd, es wird nichts gewertet
  let zweiSpieler = false;
  const mensch = () => amZug === "X" || (zweiSpieler && amZug === "O");

  function neueRunde() {
    brett = Array(9).fill(null);
    ende = false;
    runde++;
    // abwechselnd anfangen
    amZug = runde % 2 === 1 ? "X" : "O";
    neuKnopf.hidden = true;
    zeichne();
    if (amZug === "O" && !zweiSpieler) computer();
  }
  function zeichne(linie = []) {
    zellen.forEach((z, i) => {
      z.textContent = brett[i] || "";
      z.className = `ttt-zelle${brett[i] ? ` ist-${brett[i].toLowerCase()}` : ""}${linie.includes(i) ? " sieg" : ""}`;
      z.style.setProperty("--n", linie.length ? Math.max(0, linie.indexOf(i)) : i);
      z.disabled = ende || !!brett[i] || !mensch();
      z.setAttribute("aria-label", `Feld ${i + 1}: ${brett[i] || "frei"}`);
    });
    if (!ende) zugEl.textContent = zweiSpieler ? `${amZug} ist dran` : amZug === "X" ? "Du bist dran (X)" : "Der Computer überlegt …";
    for (const [k, v] of Object.entries(stand)) dom.querySelector(`[data-s="${k}"]`).textContent = v;
    status(zweiSpieler ? `Runde ${runde} · X ${stand.X} : ${stand.O} O` : `Runde ${runde} · Du ${stand.X} : ${stand.O} Computer`);
  }
  function setze(i, wer) {
    if (ende || brett[i]) return;
    brett[i] = wer;
    amZug = wer === "X" ? "O" : "X";
    const g = gewinner(brett);
    if (g) return rundeVorbei(g);
    zeichne();
    if (amZug === "O" && !zweiSpieler) computer();
  }
  function computer() {
    clearTimeout(denkt);
    denkt = setTimeout(() => {
      if (!aktiv || ende || zweiSpieler) return;
      setze(computerZug(brett, stufe), "O");
    }, 380 + Math.random() * 300);
  }
  // ---------- Effekte ----------
  const buehne = dom.querySelector(".ttt-buehne");
  const linieSvg = dom.querySelector(".ttt-linie");
  const konfetti = dom.querySelector(".ttt-konfetti");
  function effekteAus() {
    buehne.classList.remove("eff-sieg", "eff-niederlage", "eff-remis");
    linieSvg.classList.remove("an");
    konfetti.innerHTML = "";
  }
  function zieheLinie(linie) {
    // Mittelpunkte der ersten und letzten Zelle, etwas über die Zellen hinaus verlängert
    const mitte = (i) => [(i % 3) * 100 + 50, Math.floor(i / 3) * 100 + 50];
    const [a, b] = [mitte(linie[0]), mitte(linie[2])];
    const dx = (b[0] - a[0]) * 0.2;
    const dy = (b[1] - a[1]) * 0.2;
    const l = linieSvg.querySelector("line");
    l.setAttribute("x1", a[0] - dx);
    l.setAttribute("y1", a[1] - dy);
    l.setAttribute("x2", b[0] + dx);
    l.setAttribute("y2", b[1] + dy);
    void linieSvg.getBoundingClientRect();
    linieSvg.classList.add("an");
  }
  function wirfKonfetti() {
    const farben = ["#f5d97a", "#c8a2ff", "#5fc39c", "#7fb8ff", "#e5566f", "#f0a35e"];
    konfetti.innerHTML = Array.from({ length: 46 }, () => {
      const x = Math.random() * 100;
      const drift = (Math.random() - 0.5) * 160;
      const dauer = 1.3 + Math.random() * 1.1;
      const warte = Math.random() * 0.35;
      const dreh = (Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 540);
      return `<i style="left:${x}%;background:${farben[Math.floor(Math.random() * farben.length)]};--drift:${drift}px;--dreh:${dreh}deg;animation-duration:${dauer}s;animation-delay:${warte}s;width:${5 + Math.random() * 6}px;height:${8 + Math.random() * 8}px"></i>`;
    }).join("");
  }

  function rundeVorbei(g) {
    ende = true;
    stand[g.wer]++;
    if (!zweiSpieler) ergebnis({ gewonnen: g.wer === "X" });
    if (zweiSpieler) zugEl.textContent = g.wer === "remis" ? "Unentschieden." : `${g.wer} gewinnt!`;
    else zugEl.textContent = g.wer === "X" ? "Gewonnen!" : g.wer === "O" ? "Der Computer gewinnt." : stufe === "schwer" ? "Unentschieden. Mehr geht gegen Schwer nicht." : "Unentschieden.";
    // zu zweit jubelt jeder Sieger mit Konfetti
    zugEl.dataset.ergebnis = zweiSpieler && g.wer === "O" ? "X" : g.wer;
    zeichne(g.linie || []);
    effekteAus();
    void buehne.offsetWidth; // Animation neu starten
    if (g.wer === "X" || (zweiSpieler && g.wer === "O")) {
      buehne.classList.add("eff-sieg");
      zieheLinie(g.linie);
      wirfKonfetti();
    } else if (g.wer === "O") {
      buehne.classList.add("eff-niederlage");
      zieheLinie(g.linie);
    } else buehne.classList.add("eff-remis");
    neuKnopf.hidden = false;
    neuKnopf.focus({ preventScroll: true });
  }
  dom.querySelector(".ttt-feld").addEventListener("click", (e) => {
    const z = e.target.closest(".ttt-zelle");
    if (z && mensch()) setze(Number(z.dataset.i), amZug);
  });
  neuKnopf.addEventListener("click", () => {
    delete zugEl.dataset.ergebnis;
    effekteAus();
    neueRunde();
  });
  const onKey = (e) => {
    if (e.target.closest?.("select")) return;
    if (NUMPAD[e.key] !== undefined && mensch() && !ende) {
      e.preventDefault();
      setze(NUMPAD[e.key], amZug);
    } else if ((e.key === "Enter" || e.key === " ") && ende) {
      e.preventDefault();
      neuKnopf.click();
    }
  };
  window.addEventListener("keydown", onKey);

  // Modus-Wahl in der Werkzeugleiste (startet immer gegen den Computer)
  tools.hidden = false;
  tools.innerHTML = `<label class="tools-feld"><span>Modus</span><select class="tools-select" data-s="ttt-modus"><option value="cpu">Gegen Computer</option><option value="zwei">Zu zweit</option></select></label>`;
  const modusWahl = tools.querySelector('[data-s="ttt-modus"]');
  const standLabels = () => {
    const [a, , c] = dom.querySelectorAll(".ttt-stand > span");
    a.firstChild.textContent = zweiSpieler ? "X " : "Du ";
    c.firstChild.textContent = zweiSpieler ? "O " : "Computer ";
  };
  modusWahl.addEventListener("change", () => {
    zweiSpieler = modusWahl.value === "zwei";
    clearTimeout(denkt);
    stand.X = stand.O = stand.remis = 0;
    runde = 0;
    delete zugEl.dataset.ergebnis;
    effekteAus();
    standLabels();
    neueRunde();
  });

  nachricht(null);
  neueRunde();
  return {
    pause() {},
    stop() {
      aktiv = false;
      clearTimeout(denkt);
      window.removeEventListener("keydown", onKey);
      dom.innerHTML = "";
    },
  };
}
