// Logikgatter-Puzzle: Gatter (AND, OR, XOR) so einsetzen, dass die Schaltung die Ziel-Wahrheitstabelle erfüllt.
// Schaltzeichen nach DIN EN 60617: & = AND, ≥1 = OR, =1 = XOR, 1 mit Kreis = NOT.

export const DOM = true;
export const HILFE = "Gatter antippen, um AND / OR / XOR durchzuschalten · passt die Tabelle, geht's weiter · 120 Sekunden";

const GATTER = ["AND", "OR", "XOR"];
const SYMBOL = { AND: "&", OR: "≥1", XOR: "=1", NOT: "1", "?": "?" };
const RECHNE = { AND: (a, b) => a & b, OR: (a, b) => a | b, XOR: (a, b) => a ^ b };

// Schaltungen: Eingänge (Name → y), Gatter { id, typ: "bin" | "not", ein: [Quellen], x, y }, Ausgang = letztes Gatter
const VORLAGEN = {
  leicht: [{ ein: { A: 80, B: 180 }, gatter: [{ id: "g1", typ: "bin", ein: ["A", "B"], x: 220, y: 100 }] }],
  mittel: [
    { ein: { A: 60, B: 130, C: 220 }, gatter: [{ id: "g1", typ: "bin", ein: ["A", "B"], x: 160, y: 65 }, { id: "g2", typ: "bin", ein: ["g1", "C"], x: 330, y: 120 }] },
    { ein: { A: 80, B: 180 }, gatter: [{ id: "g1", typ: "bin", ein: ["A", "B"], x: 170, y: 100 }, { id: "n1", typ: "not", ein: ["g1"], x: 320, y: 110 }] },
  ],
  schwer: [
    { ein: { A: 50, B: 130, C: 220 }, gatter: [{ id: "g1", typ: "bin", ein: ["A", "B"], x: 170, y: 45 }, { id: "g2", typ: "bin", ein: ["B", "C"], x: 170, y: 175 }, { id: "g3", typ: "bin", ein: ["g1", "g2"], x: 340, y: 110 }] },
    { ein: { A: 60, B: 130, C: 220 }, gatter: [{ id: "g1", typ: "bin", ein: ["A", "B"], x: 130, y: 65 }, { id: "n1", typ: "not", ein: ["g1"], x: 255, y: 75 }, { id: "g2", typ: "bin", ein: ["n1", "C"], x: 370, y: 120 }] },
    { ein: { A: 60, B: 130, C: 220 }, gatter: [{ id: "g1", typ: "bin", ein: ["A", "B"], x: 160, y: 65 }, { id: "g2", typ: "bin", ein: ["g1", "C"], x: 330, y: 120 }] },
  ],
};
const PUNKTE = { leicht: 10, mittel: 20, schwer: 30 };
const SEKUNDEN = 120;
const B = 70; // Breite eines Gatters
const HB = 64; // Höhe 2 Eingänge
const HN = 44; // Höhe NOT

export function start({ dom, stufe, status, nachricht, ergebnis }) {
  const St = VORLAGEN[stufe] ? stufe : "mittel";
  dom.innerHTML = `
    <div class="gatter">
      <div class="quiz-top"><div class="quiz-zeit" aria-hidden="true"><span></span></div><span class="quiz-serie num"></span></div>
      <p class="gatter-aufgabe">Tippe die Gatter an, bis die Schaltung die Ziel-Tabelle erfüllt.</p>
      <div class="gatter-feld">
        <svg class="gatter-svg" viewBox="0 0 520 270" role="img" aria-label="Schaltung"></svg>
        <div class="gatter-tabelle"></div>
      </div>
      <div class="gatter-knoepfe"><button class="more" type="button" data-a="weiter">Überspringen</button></div>
      <p class="gatter-meldung" aria-live="polite"></p>
    </div>`;
  const el = (s) => dom.querySelector(s);
  const svg = el(".gatter-svg");
  const balken = el(".quiz-zeit span");
  let vorlage, ziel, wahl, punkte, geloest, versucht, ende, laeuft, raf, sperre;

  const eingaenge = () => Object.keys(vorlage.ein);
  const kombis = () => {
    const n = eingaenge().length;
    return Array.from({ length: 2 ** n }, (_, i) => Object.fromEntries(eingaenge().map((e, k) => [e, (i >> (n - 1 - k)) & 1])));
  };
  function werte(belegung, kombi) {
    const w = { ...kombi };
    for (const g of vorlage.gatter) {
      const [a, b] = g.ein.map((q) => w[q]);
      if (g.typ === "not") w[g.id] = a === undefined ? undefined : a ^ 1;
      else w[g.id] = belegung[g.id] === "?" || a === undefined || b === undefined ? undefined : RECHNE[belegung[g.id]](a, b);
    }
    return w[vorlage.gatter[vorlage.gatter.length - 1].id];
  }
  function neuesRaetsel() {
    const liste = VORLAGEN[St];
    for (let n = 0; n < 50; n++) {
      vorlage = liste[Math.floor(Math.random() * liste.length)];
      const loesung = Object.fromEntries(vorlage.gatter.filter((g) => g.typ === "bin").map((g) => [g.id, GATTER[Math.floor(Math.random() * 3)]]));
      ziel = kombis().map((k) => werte(loesung, k));
      // keine Schaltung, die immer 0 oder immer 1 liefert
      if (ziel.some((v) => v) && ziel.some((v) => !v)) break;
    }
    wahl = Object.fromEntries(vorlage.gatter.filter((g) => g.typ === "bin").map((g) => [g.id, "?"]));
    geloest = false;
    sperre = false;
    el(".gatter-meldung").textContent = "";
    zeichne();
  }
  const hoehe = (g) => (g.typ === "not" ? HN : HB);
  function anschluss(q, g, i) {
    // Startpunkt der Quelle q und Eingangspunkt i am Gatter g
    const quelle = vorlage.gatter.find((x) => x.id === q);
    const start = quelle ? { x: quelle.x + B + (quelle.typ === "not" ? 8 : 0), y: quelle.y + hoehe(quelle) / 2 } : { x: 46, y: vorlage.ein[q] };
    const h = hoehe(g);
    const ende2 = { x: g.x, y: g.typ === "not" ? g.y + h / 2 : g.y + (i === 0 ? h * 0.28 : h * 0.72) };
    return { start, ende: ende2 };
  }
  function zeichne() {
    const kom = kombis();
    const ist = kom.map((k) => werte(wahl, k));
    let html = "";
    // Leitungen
    for (const g of vorlage.gatter) {
      g.ein.forEach((q, i) => {
        const { start, ende: e } = anschluss(q, g, i);
        const mitte = Math.max(start.x + 14, e.x - 26 - i * 10);
        html += `<path class="g-leitung" d="M${start.x} ${start.y} H${mitte} V${e.y} H${e.x}" />`;
        if (!vorlage.gatter.some((x) => x.id === q)) html += `<circle class="g-punkt" cx="${start.x}" cy="${start.y}" r="3" />`;
      });
    }
    const letztes = vorlage.gatter[vorlage.gatter.length - 1];
    const ax = letztes.x + B + (letztes.typ === "not" ? 8 : 0);
    const ay = letztes.y + hoehe(letztes) / 2;
    html += `<path class="g-leitung" d="M${ax} ${ay} H470" /><text class="g-name" x="482" y="${ay + 6}">Y</text>`;
    // Eingänge
    for (const [n, y] of Object.entries(vorlage.ein)) html += `<text class="g-name" x="14" y="${y + 6}">${n}</text><path class="g-leitung" d="M32 ${y} H46" />`;
    // Gatter
    for (const g of vorlage.gatter) {
      const h = hoehe(g);
      const sym = g.typ === "not" ? "NOT" : wahl[g.id];
      const klick = g.typ === "bin" ? ` data-g="${g.id}" tabindex="0" role="button" aria-label="Gatter ${g.id}: ${sym}, antippen zum Wechseln"` : "";
      html += `<g class="g-gatter${g.typ === "bin" ? " waehlbar" : ""}${sym === "?" ? " offen" : ""}"${klick}>
        <rect x="${g.x}" y="${g.y}" width="${B}" height="${h}" rx="4" />
        <text x="${g.x + B / 2}" y="${g.y + h / 2 + 7}" text-anchor="middle">${SYMBOL[sym]}</text>
        ${g.typ === "not" ? `<circle class="g-negation" cx="${g.x + B + 4}" cy="${g.y + h / 2}" r="4" />` : ""}
        ${g.typ === "bin" ? `<text class="g-klein" x="${g.x + B / 2}" y="${g.y + h + 14}" text-anchor="middle">${sym === "?" ? "antippen" : sym}</text>` : ""}
      </g>`;
    }
    svg.innerHTML = html;
    // Tabelle
    const kopf = eingaenge().map((e) => `<th>${e}</th>`).join("") + `<th>Ziel Y</th><th>Deine</th>`;
    const zeilen = kom
      .map((k, i) => {
        const ok = ist[i] === ziel[i];
        return `<tr class="${ist[i] === undefined ? "" : ok ? "ok" : "falsch"}">${eingaenge().map((e) => `<td>${k[e]}</td>`).join("")}<td class="ziel">${ziel[i]}</td><td>${ist[i] === undefined ? "?" : ist[i]}</td></tr>`;
      })
      .join("");
    el(".gatter-tabelle").innerHTML = `<table class="gatter-tab num"><thead><tr>${kopf}</tr></thead><tbody>${zeilen}</tbody></table>`;
    if (!geloest && ist.every((v, i) => v === ziel[i])) {
      geloest = true;
      sperre = true;
      punkte += PUNKTE[St];
      versucht++;
      el(".gatter-meldung").textContent = `Passt! +${PUNKTE[St]} Punkte`;
      el(".gatter-meldung").className = "gatter-meldung ok";
      zeigeStatus();
      setTimeout(() => laeuft && neuesRaetsel(), 900);
    }
  }
  const zeigeStatus = () => status(`${punkte} Pkt · ${Math.round(punkte / PUNKTE[St])} Schaltungen gelöst`);
  function wechsle(id) {
    if (!laeuft || sperre) return;
    const i = GATTER.indexOf(wahl[id]);
    wahl[id] = GATTER[(i + 1) % GATTER.length];
    zeichne();
  }
  svg.addEventListener("click", (e) => {
    const g = e.target.closest("[data-g]");
    if (g) wechsle(g.dataset.g);
  });
  svg.addEventListener("keydown", (e) => {
    const g = e.target.closest?.("[data-g]");
    if (g && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      wechsle(g.dataset.g);
    }
  });
  el('[data-a="weiter"]').addEventListener("click", () => {
    if (!laeuft || sperre) return;
    versucht++;
    neuesRaetsel();
  });

  function tick() {
    const rest = Math.max(0, ende - performance.now());
    balken.style.transform = `scaleX(${rest / (SEKUNDEN * 1000)})`;
    balken.classList.toggle("knapp", rest < 10000);
    if (rest <= 0) return fertig();
    raf = requestAnimationFrame(tick);
  }
  function fertig() {
    laeuft = false;
    cancelAnimationFrame(raf);
    const neu = ergebnis({ punkte });
    nachricht(`<p class="big">Zeit um!</p><p>${punkte} Punkte · ${Math.round(punkte / PUNKTE[St])} Schaltungen gelöst${neu ? " · neuer Highscore!" : ""}</p><p class="small">AND (&): nur 1, wenn beide 1 sind · OR (≥1): 1, wenn mindestens einer 1 ist · XOR (=1): 1, wenn genau einer 1 ist · NOT: dreht um</p><p><button class="btn" type="button" data-neu>Nochmal</button></p>`);
    document.querySelector("#stage-msg [data-neu]")?.addEventListener("click", (e) => {
      e.stopPropagation();
      los();
    });
  }
  function los() {
    punkte = 0;
    versucht = 0;
    laeuft = true;
    nachricht(null);
    neuesRaetsel();
    zeigeStatus();
    ende = performance.now() + SEKUNDEN * 1000;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  }

  status("Logikgatter");
  nachricht(`<p class="big">Logikgatter-Puzzle</p><p>Setz die richtigen Gatter ein, bis die Schaltung für alle Eingänge den Ziel-Wert Y liefert. Tippe ein Gatter an, um zwischen AND (&), OR (≥1) und XOR (=1) zu wechseln.${St !== "leicht" ? " NOT (1 mit Kreis) ist fest eingebaut." : ""}</p><p class="small">${SEKUNDEN} Sekunden</p><p><button class="btn" type="button" data-start>Los geht's</button></p>`);
  document.querySelector("#stage-msg [data-start]")?.addEventListener("click", (e) => {
    e.stopPropagation();
    los();
  });
  return {
    pause() {},
    stop() {
      laeuft = false;
      cancelAnimationFrame(raf);
      dom.innerHTML = "";
    },
  };
}
