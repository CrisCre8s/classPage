// Berichte werden automatisch aus dem Ordner /berichte geladen.
// Neue PDF einfach in den Ordner legen (Dateiname mit "KW<woche>_<jahr>",
// z. B. "KW43_26.pdf" oder "SchoolBH_KW43_26.pdf") und pushen. Fertig.

const dateien = import.meta.glob("/berichte/*.{pdf,PDF,png,jpg,jpeg}", {
  eager: true,
  query: "?url",
  import: "default",
});

const SICHTBAR_STANDARD = 4; // so viele Berichte stehen ohne „Alle anzeigen“ da

function parse(pfad, url) {
  const name = pfad.split("/").pop();
  const typ = name.split(".").pop().toLowerCase();
  const m = name.match(/KW[_\s-]?(\d{1,2})[_\s-](\d{2,4})/i);

  if (!m) {
    return { url, typ, name, titel: name.replace(/\.[^.]+$/, ""), jahr: 0, woche: 0 };
  }

  const woche = Number(m[1]);
  const jahr = m[2].length === 2 ? 2000 + Number(m[2]) : Number(m[2]);
  return { url, typ, name, titel: `KW ${woche} · ${jahr}`, jahr, woche };
}

export function getBerichte() {
  return Object.entries(dateien)
    .map(([pfad, url]) => parse(pfad, url))
    .sort((a, b) => b.jahr - a.jahr || b.woche - a.woche);
}

function esc(s = "") {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

export function initBerichte() {
  const list = document.getElementById("berichte-grid");
  const count = document.getElementById("berichte-count");
  const toggle = document.getElementById("berichte-toggle");
  if (!list) return;

  const berichte = getBerichte();
  if (count) count.textContent = berichte.length || "";

  // Im schmalen 4-4-4-Raster (keine LKs) ist Platz für eine Zeile mehr
  const SICHTBAR = document.getElementById("board")?.classList.contains("lk-leer") ? 5 : SICHTBAR_STANDARD;

  if (berichte.length === 0) {
    list.innerHTML = `<li class="empty">Noch keine Berichte. PDF in den Ordner berichte/ legen und pushen.</li>`;
    return;
  }

  list.innerHTML = berichte
    .map((b, i) => {
      const icon = b.typ === "pdf" ? "i-file" : "i-image";
      const rechts = i === 0 ? `<span class="pill pos">neu</span>` : `<span class="r">${b.typ.toUpperCase()}</span>`;
      return `
      <li${i >= SICHTBAR ? " hidden" : ""}>
        <a class="row file-row" href="${b.url}" target="_blank" rel="noopener">
          <svg class="i"><use href="#${icon}" /></svg>
          <span><span class="t">${esc(b.titel)}</span><span class="d">${esc(b.name)}</span></span>
          ${rechts}
        </a>
      </li>`;
    })
    .join("");

  if (toggle && berichte.length > SICHTBAR) {
    let offen = false;
    toggle.hidden = false;
    toggle.textContent = `Alle ${berichte.length} anzeigen`;
    toggle.addEventListener("click", () => {
      offen = !offen;
      list.querySelectorAll("li").forEach((li, i) => {
        if (i >= SICHTBAR) li.hidden = !offen;
      });
      toggle.textContent = offen ? "Weniger anzeigen" : `Alle ${berichte.length} anzeigen`;
    });
  }
}
