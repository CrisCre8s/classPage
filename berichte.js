// Berichte werden automatisch aus dem Ordner /berichte geladen.
// Neue PDF einfach in den Ordner legen (Dateiname mit "KW<woche>_<jahr>",
// z. B. "KW43_26.pdf" oder "SchoolBH_KW43_26.pdf") und pushen. Fertig.

const dateien = import.meta.glob("/berichte/*.{pdf,PDF,png,jpg,jpeg}", {
  eager: true,
  query: "?url",
  import: "default",
});

function parse(pfad, url) {
  const name = pfad.split("/").pop();
  const typ = name.split(".").pop().toLowerCase();
  const m = name.match(/KW[_\s-]?(\d{1,2})[_\s-](\d{2,4})/i);

  if (!m) {
    return { url, typ, titel: name.replace(/\.[^.]+$/, ""), jahr: 0, woche: 0 };
  }

  const woche = Number(m[1]);
  const jahr = m[2].length === 2 ? 2000 + Number(m[2]) : Number(m[2]);
  return { url, typ, titel: `KW ${woche}`, jahr, woche };
}

export function getBerichte() {
  return Object.entries(dateien)
    .map(([pfad, url]) => parse(pfad, url))
    .sort((a, b) => b.jahr - a.jahr || b.woche - a.woche);
}

export function initBerichte() {
  const grid = document.getElementById("berichte-grid");
  const count = document.getElementById("berichte-count");
  if (!grid) return;

  const berichte = getBerichte();
  if (count) count.textContent = berichte.length;

  if (berichte.length === 0) {
    grid.innerHTML = `<p class="empty">Noch keine Berichte hochgeladen.</p>`;
    return;
  }

  berichte.forEach((b, i) => {
    const a = document.createElement("a");
    a.href = b.url;
    a.target = "_blank";
    a.rel = "noopener";
    a.className = "bericht" + (i === 0 ? " bericht--neu" : "");

    const icon = b.typ === "pdf" ? "document-text-outline" : "image-outline";
    a.innerHTML = `
      <ion-icon name="${icon}" aria-hidden="true"></ion-icon>
      <span class="bericht-titel">${b.titel}</span>
      <span class="bericht-meta">${b.jahr || ""} · ${b.typ.toUpperCase()}</span>
      ${i === 0 ? '<span class="tag tag--accent">NEU</span>' : ""}
    `;
    grid.appendChild(a);
  });
}
