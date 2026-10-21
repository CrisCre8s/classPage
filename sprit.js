// Aktuelle Spritpreise der Globus-Tankstelle. Daten kommen von /api/sprit (siehe api/sprit.js).

const SORTEN = ["e5", "e10", "diesel"];

function format(wert) {
  if (wert == null) return `<span class="faint">–</span>`;
  const [euro, cent] = wert.toFixed(3).split(".");
  // Tankstellen-Schreibweise: 1,97⁹ €
  return `${euro},${cent.slice(0, 2)}<sup>${cent[2]}</sup><em>€</em>`;
}

function uhrzeit(iso) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export async function initSprit() {
  const list = document.getElementById("sprit");
  const stamp = document.getElementById("sprit-stamp");
  if (!list || !stamp) return;
  const werte = list.querySelectorAll(".v");

  try {
    const res = await fetch("/api/sprit");
    const data = await res.json();
    if (!data.ok) throw new Error(data.fehler);

    SORTEN.forEach((key, i) => {
      if (werte[i]) werte[i].innerHTML = format(data.preise[key]);
    });
    stamp.classList.toggle("ok", data.offen);
    stamp.innerHTML = `<i></i>${data.offen ? "geöffnet" : "geschlossen"} · Stand <span class="num">${uhrzeit(data.stand)}</span>`;
  } catch {
    stamp.classList.remove("ok");
    stamp.innerHTML = `<i></i>Preise gerade nicht verfügbar`;
  }
}
