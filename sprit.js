// Zeigt die aktuellen Spritpreise der Globus-Tankstelle im Globus-Fenster an.
// Die Daten kommen von /api/sprit (Vercel-Funktion, siehe api/sprit.js).

const SORTEN = [
  ["e5", "super_e5"],
  ["e10", "super_e10"],
  ["diesel", "diesel"],
];

function format(wert) {
  if (wert == null) return `<span class="c-bool">null</span>`;
  const [euro, cent] = wert.toFixed(3).split(".");
  // Typische Tankstellen-Schreibweise: 1,97⁹
  return `<span class="c-str">"${euro},${cent.slice(0, 2)}<sup>${cent[2]}</sup> €"</span>`;
}

function uhrzeit(iso) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export async function initSprit() {
  const el = document.getElementById("sprit");
  if (!el) return;

  try {
    const res = await fetch("/api/sprit");
    const data = await res.json();
    if (!data.ok) throw new Error(data.fehler);

    const zeilen = SORTEN.map(
      ([key, label]) => `<span class="c-key">${label}</span>:${" ".repeat(11 - label.length)}${format(data.preise[key])}`,
    ).join("\n");

    el.innerHTML =
      `<span class="c-dim">// tankstelle · ${data.offen ? "geöffnet" : "geschlossen"} · stand ${uhrzeit(data.stand)}</span>\n` +
      zeilen;
  } catch {
    el.innerHTML = `<span class="c-dim">// tankstelle</span>\n<span class="c-key">spritpreise</span>: <span class="c-bool">null</span> <span class="c-dim">// gerade nicht verfügbar</span>`;
  }
}
