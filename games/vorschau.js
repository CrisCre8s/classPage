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
  if (spiel === "snake") {
    const teile = [[60, 60], [72, 60], [84, 60], [96, 60], [96, 48], [96, 36], [108, 36], [120, 36], [132, 36]];
    teile.forEach(([x, y], i) => {
      ctx.fillStyle = i === teile.length - 1 ? weiss : i % 2 ? lila : "#b48ef0";
      ctx.fillRect(x, y, 10, 10);
    });
    ctx.fillStyle = gelb;
    ctx.fillRect(170, 76, 10, 10);
  }
  if (spiel === "minen") {
    const z = 18;
    const ox = 48;
    const oy = 15;
    const offen = new Set(["0,0", "1,0", "2,0", "0,1", "1,1", "2,1", "3,1", "0,2", "1,2", "0,3", "1,3", "2,3"]);
    const zahlen = { "2,0": "1", "3,1": "2", "1,2": "1", "2,3": "1" };
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let y = 0; y < 5; y++)
      for (let x = 0; x < 8; x++) {
        const k = `${x},${y}`;
        ctx.fillStyle = offen.has(k) ? "#16141c" : "#353140";
        ctx.fillRect(ox + x * z + 1, oy + y * z + 1, z - 2, z - 2);
        if (zahlen[k]) {
          ctx.fillStyle = zahlen[k] === "1" ? "#7fb8ff" : "#5fc39c";
          ctx.fillText(zahlen[k], ox + x * z + z / 2, oy + y * z + z / 2 + 1);
        }
      }
    ctx.fillStyle = gelb;
    ctx.fillRect(ox + 4 * z + 7, oy + 2 * z + 4, 3, 10);
    ctx.fillRect(ox + 4 * z + 10, oy + 2 * z + 4, 5, 4);
  }
  if (spiel === "z2048") {
    const werte = [[2, 4, 8, 0], [0, 16, 32, 2], [0, 0, 64, 128], [0, 2, 0, 2048]];
    const farbe = { 2: "#2a2733", 4: "#353046", 8: "#4a3c6e", 16: "#5b4590", 32: "#6e4fb4", 64: "#8a63d2", 128: "#a37fe6", 2048: gelb };
    const z = 26;
    const ox = 66;
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        const v = werte[y][x];
        ctx.fillStyle = v ? farbe[v] : "#1c1a23";
        ctx.fillRect(ox + x * (z + 3), 4 + y * (z + 3), z, z);
      }
  }
  if (spiel === "vier") {
    ctx.fillStyle = "#2b2640";
    ctx.fillRect(50, 8, 140, 104);
    const steine = { "2,5": gelb, "3,5": lila, "3,4": gelb, "4,5": gelb, "4,4": lila, "4,3": gelb, "5,5": lila, "5,4": lila, "5,3": lila, "5,2": gelb, "1,5": lila };
    for (let c = 0; c < 7; c++)
      for (let r = 0; r < 6; r++) {
        ctx.fillStyle = steine[`${c},${r}`] || "#0f0e13";
        ctx.beginPath();
        ctx.arc(60 + c * 20, 18 + r * 17, 7, 0, Math.PI * 2);
        ctx.fill();
      }
  }
  if (spiel === "mauer") {
    const farben = ["#e5566f", "#f0a35e", "#f5d97a", "#5fc39c", "#7fb8ff"];
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 9; c++) {
        if ((r === 4 && c > 2 && c < 6) || (r === 3 && c === 4)) continue;
        ctx.fillStyle = farben[r];
        ctx.fillRect(14 + c * 24, 10 + r * 11, 22, 9);
      }
    ctx.fillStyle = weiss;
    ctx.fillRect(96, 104, 48, 6);
    ctx.fillStyle = gelb;
    ctx.fillRect(128, 80, 7, 7);
  }
  const textBild = (oben, gross, unten) => {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#8a8c92";
    ctx.font = '9px "Press Start 2P", monospace';
    ctx.fillText(oben, 120, 26);
    ctx.fillStyle = weiss;
    ctx.font = '16px "Press Start 2P", monospace';
    ctx.fillText(gross, 120, 62);
    ctx.fillStyle = gelb;
    ctx.font = '11px "Press Start 2P", monospace';
    ctx.fillText(unten, 120, 96);
  };
  if (spiel === "binaer") textBild("DEZ → BIN", "1011 0110", "= 182");
  if (spiel === "subnetz") textBild("NETZADRESSE?", "10.4.77.9/26", "10.4.77.0");
  if (spiel === "befehle") textBild("LINUX · WELCHER BEFEHL?", "Pfad ausgeben", "pwd");
  if (spiel === "ports") textBild("WELCHER DIENST?", "PORT 22", "SSH");
}

