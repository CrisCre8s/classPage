const berichte = [
  { titel: "KW07_26", datei: "/berichte/SchoolBH_KW07_26.pdf", typ: "pdf" },
  { titel: "KW06_26", datei: "/berichte/SchoolBH_KW06_26.pdf", typ: "pdf" },
];

export function initBerichte() {
  const grid = document.getElementById("berichte-grid");
  if (!grid) return;

  berichte.forEach((bericht) => {
    const card = document.createElement("a");
    card.href = bericht.datei;
    card.target = "_blank";
    card.rel = "noopener";
    card.classList.add("bericht-card");

    const icon = bericht.typ === "pdf" ? "document-outline" : "image-outline";

    card.innerHTML = `
      <ion-icon name="${icon}"></ion-icon>
      <span class="bericht-titel">${bericht.titel}</span>
      <span class="bericht-typ">${bericht.typ.toUpperCase()}</span>
    `;

    grid.appendChild(card);
  });
}
