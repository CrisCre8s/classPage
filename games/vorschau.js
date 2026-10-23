// Gemeinsame Helfer für Spiele-Seite und Hub: scharfes Canvas und Vorschaubilder

// ---------- Canvas-Helfer für die Spiele ----------
// Setzt eine feste logische Größe und skaliert scharf auf das Display
export function passeCanvas(canvas, w, h) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.aspectRatio = `${w} / ${h}`;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

// ---------- Vorschaubilder auf den Karten ----------
export function zeichneVorschau(canvas, spiel) {
  const ctx = passeCanvas(canvas, 240, 120);
  ctx.fillStyle = "#0f0e13";
  ctx.fillRect(0, 0, 240, 120);
  const weiss = "#f2f2f3";
  const gelb = "#f5d97a";
  const lila = "#c8a2ff";

  if (spiel === "pong") {
    ctx.fillStyle = "#2a292f";
    for (let y = 6; y < 120; y += 14) ctx.fillRect(118, y, 4, 8);
    ctx.fillStyle = weiss;
    ctx.fillRect(16, 34, 6, 40);
    ctx.fillRect(218, 52, 6, 40);
    ctx.fillStyle = gelb;
    ctx.fillRect(150, 44, 7, 7);
    ctx.fillStyle = "rgba(245,217,122,0.25)";
    ctx.fillRect(138, 48, 7, 5);
    ctx.fillRect(127, 52, 7, 4);
  }
  if (spiel === "schach") {
    const z = 15;
    const ox = 60;
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        ctx.fillStyle = (r + c) % 2 ? "#1c1b20" : "#34323b";
        ctx.fillRect(ox + c * z, r * z, z, z);
      }
    ctx.fillStyle = weiss;
    [[4, 6], [3, 6], [6, 7], [4, 4]].forEach(([c, r]) => ctx.fillRect(ox + c * z + 4, r * z + 4, 7, 7));
    ctx.fillStyle = lila;
    [[4, 1], [2, 2], [5, 3], [1, 0]].forEach(([c, r]) => ctx.fillRect(ox + c * z + 4, r * z + 4, 7, 7));
  }
  if (spiel === "bits") {
    ctx.fillStyle = "#3a3550";
    const wand = [
      [10, 10, 220, 4], [10, 106, 220, 4], [10, 10, 4, 100], [226, 10, 4, 100],
      [40, 34, 60, 4], [140, 34, 60, 4], [40, 80, 60, 4], [140, 80, 60, 4], [118, 34, 4, 50],
    ];
    wand.forEach((w) => ctx.fillRect(...w));
    ctx.fillStyle = "#8a8c92";
    for (let x = 26; x < 220; x += 14) ctx.fillRect(x, 57, 3, 3);
    ctx.fillStyle = gelb;
    ctx.fillRect(56, 52, 12, 10);
    ctx.fillStyle = "#e5566f";
    ctx.fillRect(170, 52, 10, 10);
    ctx.fillStyle = "#5fc39c";
    ctx.fillRect(190, 20, 10, 10);
  }
}

