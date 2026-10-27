// Aktuelle Spritpreise der Globus-Tankstelle (Daten: /api/sprit, siehe api/sprit.js)
// und Wochenverlauf (Daten: /api/sprit-verlauf): teurer oder billiger als die Tage davor?

const SORTEN = ["e5", "e10", "diesel"];
const NAMEN = { e5: "Super E5", e10: "Super E10", diesel: "Diesel" };
const SPANNE = 0.005; // unter 0,5 Cent Unterschied gilt als „gleich“

function format(wert) {
  if (wert == null) return `<span class="faint">–</span>`;
  const [euro, cent] = wert.toFixed(3).split(".");
  // Tankstellen-Schreibweise: 1,97⁹ €
  return `${euro},${cent.slice(0, 2)}<sup>${cent[2]}</sup><em>€</em>`;
}
const euro = (w) => `${w.toFixed(3).replace(".", ",")} €`;
const cent = (d) => `${Math.abs(d * 100).toFixed(1).replace(".", ",")} ct`;

function uhrzeit(iso) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Schnitt der Vortage (ohne heute) für eine Sorte
function vortagsSchnitt(tage, sorte) {
  const liste = tage.slice(0, -1).map((t) => t[sorte]?.schnitt).filter((v) => typeof v === "number");
  return liste.length ? { wert: liste.reduce((a, b) => a + b, 0) / liste.length, tage: liste.length } : null;
}

function vergleich(aktuell, tage, sorte) {
  const v = vortagsSchnitt(tage, sorte);
  if (aktuell == null || !v) return null;
  const diff = aktuell - v.wert;
  return { diff, basis: v, richtung: Math.abs(diff) < SPANNE ? "gleich" : diff < 0 ? "billiger" : "teurer" };
}

function zeichneBild(svg, tage, sorte, aktuell) {
  const W = 280;
  const oben = 10;
  const unten = 80;
  const werte = tage.flatMap((t) => (t[sorte] ? [t[sorte].min, t[sorte].max] : []));
  if (aktuell != null) werte.push(aktuell);
  let lo = Math.min(...werte);
  let hi = Math.max(...werte);
  if (hi - lo < 0.02) {
    const m = (hi + lo) / 2;
    lo = m - 0.01;
    hi = m + 0.01;
  }
  const y = (v) => unten - ((v - lo) / (hi - lo)) * (unten - oben);
  const spalte = W / 7;
  const x = (i) => spalte * i + spalte / 2;
  let html = "";
  // aktueller Preis als gestrichelte Linie
  if (aktuell != null) html += `<line class="vb-jetzt" x1="0" x2="${W}" y1="${y(aktuell).toFixed(1)}" y2="${y(aktuell).toFixed(1)}" />`;
  const punkte = [];
  tage.forEach((t, i) => {
    const heute = i === tage.length - 1;
    const d = t[sorte];
    const label = heute ? "heute" : t.wt;
    html += `<text class="vb-tag${heute ? " vb-heute" : ""}" x="${x(i)}" y="100" text-anchor="middle">${label}</text>`;
    if (!d) {
      html += `<text class="vb-leer" x="${x(i)}" y="${(oben + unten) / 2}" text-anchor="middle">·</text>`;
      return;
    }
    const titel = `${t.wt} ${t.datum.slice(8, 10)}.${t.datum.slice(5, 7)}.: Schnitt ${euro(d.schnitt)}, ${euro(d.min)} bis ${euro(d.max)}`;
    html += `<g class="vb-spalte${heute ? " vb-heute" : ""}"><title>${titel}</title>`;
    html += `<rect class="vb-spanne" x="${x(i) - 3}" y="${y(d.max).toFixed(1)}" width="6" height="${Math.max(2, y(d.min) - y(d.max)).toFixed(1)}" rx="3" />`;
    html += `<circle class="vb-punkt" cx="${x(i)}" cy="${y(d.schnitt).toFixed(1)}" r="4" /></g>`;
    punkte.push(`${x(i)},${y(d.schnitt).toFixed(1)}`);
  });
  if (punkte.length > 1) html = `<polyline class="vb-linie" points="${punkte.join(" ")}" />` + html;
  svg.innerHTML = html;
}

function zeigeVerlauf(box, tage, aktuelle, sorte) {
  box.querySelectorAll("[data-sorte]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.sorte === sorte)));
  const svg = box.querySelector(".verlauf-bild");
  const satz = box.querySelector(".verlauf-satz");
  const mitDaten = tage.filter((t) => t[sorte]);
  if (!mitDaten.length) {
    svg.innerHTML = "";
    satz.textContent = "Der Verlauf wird gerade gesammelt. Ab morgen siehst du hier den Vergleich.";
    return;
  }
  zeichneBild(svg, tage, sorte, aktuelle[sorte]);
  const v = vergleich(aktuelle[sorte], tage, sorte);
  if (!v) {
    satz.textContent = "Noch keine Vortage gespeichert. Ab morgen siehst du hier den Vergleich.";
    return;
  }
  const seit = v.basis.tage === 1 ? "als gestern" : `als im Schnitt der letzten ${v.basis.tage} Tage`;
  satz.className = `verlauf-satz ${v.richtung}`;
  satz.innerHTML =
    v.richtung === "gleich"
      ? `${NAMEN[sorte]} kostet gerade etwa so viel ${seit} (${euro(v.basis.wert)}).`
      : `${NAMEN[sorte]} ist gerade <b>${cent(v.diff)} ${v.richtung}</b> ${seit} (${euro(v.basis.wert)}).`;
}

async function initVerlauf(aktuelle, dts) {
  const box = document.getElementById("sprit-verlauf");
  if (!box) return;
  try {
    const res = await fetch("/api/sprit-verlauf");
    const data = await res.json();
    if (!data.ok) return; // Speicher noch nicht eingerichtet: Bereich bleibt ausgeblendet
    box.hidden = false;
    // kleiner Pfeil an jedem Preis: teurer/billiger als die Vortage
    SORTEN.forEach((s, i) => {
      const v = vergleich(aktuelle[s], data.tage, s);
      if (!v || !dts[i]) return;
      const zeichen = v.richtung === "gleich" ? "=" : v.richtung === "billiger" ? "▼" : "▲";
      const text = v.richtung === "gleich" ? "gleich" : cent(v.diff);
      dts[i].insertAdjacentHTML("beforeend", ` <span class="trend ${v.richtung}" title="${v.richtung === "gleich" ? "etwa wie" : v.richtung + " als"} die Vortage">${zeichen} ${text}</span>`);
    });
    let sorte = "e5";
    zeigeVerlauf(box, data.tage, aktuelle, sorte);
    box.querySelectorAll("[data-sorte]").forEach((b) =>
      b.addEventListener("click", () => {
        sorte = b.dataset.sorte;
        zeigeVerlauf(box, data.tage, aktuelle, sorte);
      }),
    );
  } catch {
    /* ohne Verlauf geht es auch */
  }
}

export async function initSprit() {
  const list = document.getElementById("sprit");
  const stamp = document.getElementById("sprit-stamp");
  if (!list || !stamp) return;
  const werte = list.querySelectorAll(".v");
  const dts = list.querySelectorAll("dt");

  try {
    const res = await fetch("/api/sprit");
    const data = await res.json();
    if (!data.ok) throw new Error(data.fehler);

    SORTEN.forEach((key, i) => {
      if (werte[i]) werte[i].innerHTML = format(data.preise[key]);
    });
    stamp.classList.toggle("ok", data.offen);
    stamp.innerHTML = `<i></i>${data.offen ? "geöffnet" : "geschlossen"} · Stand <span class="num">${uhrzeit(data.stand)}</span>`;
    initVerlauf(data.preise, dts);
  } catch {
    stamp.classList.remove("ok");
    stamp.innerHTML = `<i></i>Preise gerade nicht verfügbar`;
  }
}
