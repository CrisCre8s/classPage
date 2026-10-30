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
  if (spiel === "skate") {
    // Abendhimmel über der Stadt, Rampe, Strichmännchen im Kickflip über eine Lücke
    const himmel = ctx.createLinearGradient(0, 0, 0, 100);
    himmel.addColorStop(0, "#2a1f4a");
    himmel.addColorStop(0.55, "#6b3a6e");
    himmel.addColorStop(1, "#e0785a");
    ctx.fillStyle = himmel;
    ctx.fillRect(0, 0, 240, 100);
    ctx.fillStyle = "#ffd27a";
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(196, 70, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // Sterne
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    for (const [x, y] of [[20, 10], [58, 22], [92, 8], [140, 16], [170, 6], [226, 24], [8, 34]]) ctx.fillRect(x, y, 1.5, 1.5);
    // Skyline in zwei Ebenen
    ctx.fillStyle = "#3a2a55";
    for (const [x, w, h] of [[0, 22, 38], [20, 16, 52], [40, 26, 30], [70, 18, 46], [92, 30, 36], [128, 14, 58], [150, 26, 34], [182, 20, 44], [206, 34, 30]]) ctx.fillRect(x, 100 - h, w, h);
    ctx.fillStyle = "#241a38";
    for (const [x, w, h] of [[8, 26, 24], [44, 20, 32], [86, 24, 20], [118, 30, 28], [160, 22, 22], [214, 26, 34]]) ctx.fillRect(x, 100 - h, w, h);
    ctx.fillStyle = "#ffd27a";
    for (const [x, y] of [[24, 54], [30, 62], [74, 60], [132, 48], [132, 58], [186, 62], [96, 70], [212, 76]]) ctx.fillRect(x, y, 2, 3);
    // Boden mit Lücke
    ctx.fillStyle = "#1a1722";
    ctx.fillRect(0, 100, 240, 20);
    ctx.fillStyle = "#4a4060";
    ctx.fillRect(0, 100, 92, 3);
    ctx.fillRect(148, 100, 92, 3);
    ctx.fillStyle = "#0b0a10";
    ctx.fillRect(92, 100, 56, 20);
    ctx.fillStyle = "#3a6fd0";
    ctx.fillRect(92, 110, 56, 10);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(100, 112, 10, 1.5);
    ctx.fillRect(124, 115, 14, 1.5);
    // Absprungrampe
    ctx.fillStyle = "#8a6a4a";
    ctx.beginPath();
    ctx.moveTo(56, 100);
    ctx.quadraticCurveTo(84, 98, 92, 84);
    ctx.lineTo(92, 100);
    ctx.fill();
    ctx.fillStyle = "#c9a27a";
    ctx.fillRect(90, 84, 3, 16);
    // Bewegungslinien
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = 1.5;
    ctx.lineCap = "round";
    for (const [x, y, l] of [[78, 44, 18], [82, 52, 14], [76, 60, 20]]) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + l, y - 3);
      ctx.stroke();
    }
    // Strichmännchen im Sprung (Knie angezogen, Arme ausgebreitet)
    ctx.strokeStyle = "#f2f2f3";
    ctx.lineWidth = 2.6;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(114, 58); ctx.lineTo(118, 50); ctx.lineTo(124, 46); ctx.lineTo(128, 54); ctx.lineTo(132, 58);
    ctx.moveTo(124, 46); ctx.lineTo(126, 30);
    ctx.moveTo(125, 34); ctx.lineTo(114, 30); ctx.lineTo(106, 34);
    ctx.moveTo(126, 34); ctx.lineTo(136, 28); ctx.lineTo(144, 30);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(128, 22, 6, 0, Math.PI * 2);
    ctx.stroke();
    // Board im Flip (schräg, Unterseite sichtbar)
    ctx.save();
    ctx.translate(123, 64);
    ctx.rotate(-0.28);
    ctx.fillStyle = "#b48ef0";
    ctx.beginPath();
    ctx.roundRect(-18, -2.5, 36, 5, 2.5);
    ctx.fill();
    ctx.fillStyle = "#f5d97a";
    ctx.fillRect(-11, 2.5, 5, 4);
    ctx.fillRect(6, 2.5, 5, 4);
    ctx.restore();
    // Münzen
    for (const [x, y] of [[152, 40], [166, 48], [180, 58]]) {
      ctx.fillStyle = gelb;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#c99a2e";
      ctx.fillRect(x - 0.75, y - 2.5, 1.5, 5);
    }
  }
  if (spiel === "schlagzeug") {
    // kleines Schlagzeug: Bass, zwei Toms, Snare, Becken
    ctx.fillStyle = "#8a1f45";
    ctx.beginPath();
    ctx.arc(120, 82, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#efe9dc";
    ctx.beginPath();
    ctx.arc(120, 82, 22, 0, Math.PI * 2);
    ctx.fill();
    for (const [x, y, w] of [[98, 46, 16], [142, 46, 16], [68, 74, 18], [176, 70, 20]]) {
      ctx.fillStyle = x === 68 ? "#c9cbd4" : "#8a1f45";
      ctx.fillRect(x - w, y, w * 2, x === 176 ? 30 : 14);
      ctx.fillStyle = "#efe9dc";
      ctx.beginPath();
      ctx.ellipse(x, y, w, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = gelb;
    for (const [x, y, r] of [[52, 34, 22], [192, 38, 24], [36, 62, 15]]) {
      ctx.beginPath();
      ctx.ellipse(x, y, r, 4, -0.08, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#3a3550";
    ctx.fillRect(0, 110, 240, 3);
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
  if (spiel === "befehle") textBild("WELCHER BEFEHL?", "Pfad ausgeben", "pwd");
  if (spiel === "ports") textBild("WELCHER DIENST?", "PORT 22", "SSH");
  if (spiel === "csharp") textBild("C# · PROPERTY", "{ get; set; }", "static int n;");
  if (spiel === "sql") textBild("SQL-SPRINT", "SELECT name", "FROM kunden");
  if (spiel === "osi") {
    // sieben Schichten, eine Karte schwebt auf Schicht 3
    const namen = ["ANWENDUNG", "DARSTELLUNG", "SITZUNG", "TRANSPORT", "VERMITTLUNG", "SICHERUNG", "BIT"];
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    namen.forEach((n, i) => {
      const y = 8 + i * 15;
      ctx.fillStyle = i === 4 ? "#2a2438" : "#1c1a23";
      ctx.fillRect(110, y, 120, 13);
      ctx.fillStyle = i === 4 ? lila : "#8a8c92";
      ctx.fillText(`${7 - i} ${n}`, 115, y + 7);
    });
    ctx.fillStyle = "#1c1a23";
    ctx.fillRect(14, 42, 76, 34);
    ctx.strokeStyle = gelb;
    ctx.lineWidth = 2;
    ctx.strokeRect(14, 42, 76, 34);
    ctx.fillStyle = weiss;
    ctx.font = '9px "Press Start 2P", monospace';
    ctx.textAlign = "center";
    ctx.fillText("ROUTER", 52, 60);
    ctx.strokeStyle = lila;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(92, 66);
    ctx.lineTo(108, 73);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (spiel === "gatter") {
    ctx.strokeStyle = "#6a6578";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(30, 40); ctx.lineTo(90, 40);
    ctx.moveTo(30, 80); ctx.lineTo(90, 80);
    ctx.moveTo(140, 60); ctx.lineTo(200, 60);
    ctx.stroke();
    ctx.fillStyle = "#1c1a23";
    ctx.fillRect(90, 28, 50, 64);
    ctx.strokeStyle = lila;
    ctx.strokeRect(90, 28, 50, 64);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = '16px "Press Start 2P", monospace';
    ctx.fillStyle = weiss;
    ctx.fillText("=1", 115, 61);
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillStyle = gelb;
    ctx.fillText("A", 20, 41);
    ctx.fillText("B", 20, 81);
    ctx.fillText("Y", 212, 61);
    ctx.fillStyle = "#8a8c92";
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.fillText("XOR", 115, 104);
  }
  if (spiel === "memory") {
    const offen = { 1: ["RAID 1", gelb], 6: ["Spiegelung", weiss] };
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i < 8; i++) {
      const x = 14 + (i % 4) * 54;
      const y = 14 + Math.floor(i / 4) * 50;
      const o = offen[i];
      ctx.fillStyle = o ? "#1b2828" : "#1c1a23";
      ctx.fillRect(x, y, 50, 42);
      ctx.strokeStyle = o ? "#5fc39c" : "#2a292f";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, 50, 42);
      ctx.fillStyle = o ? o[1] : "#4a4458";
      ctx.font = o ? '5px "Press Start 2P", monospace' : '12px "Press Start 2P", monospace';
      ctx.fillText(o ? o[0] : "?", x + 25, y + 22);
    }
  }
  if (spiel === "bloecke") {
    // Brett mit Stapel, fallender T-Stein
    const z = 11;
    const ox = 65;
    ctx.fillStyle = "#16141c";
    ctx.fillRect(ox, 4, z * 10, z * 10);
    const farben = { I: "#7fb8ff", O: gelb, T: "#b48ef0", S: "#5fc39c", Z: "#e5566f", L: "#f0a35e" };
    const stapel = ["..........", "..........", "..........", "..........", "....T.....", "...TTT....", "..........", "Z.....OO.I", "ZZ.LL.OOSI", "SZLLLSSSSI"];
    stapel.forEach((zeile, y) => [...zeile].forEach((c, x) => {
      if (c === ".") return;
      ctx.fillStyle = farben[c];
      ctx.fillRect(ox + x * z + 1, 4 + y * z + 1, z - 2, z - 2);
    }));
    ctx.strokeStyle = "rgba(180,142,240,0.5)";
    ctx.strokeRect(ox + 3 * z + 1.5, 4 + 8 * z + 1.5, z - 3, z - 3);
    ctx.fillStyle = "#3a3550";
    ctx.fillRect(ox - 2, 4, 2, z * 10);
    ctx.fillRect(ox + z * 10, 4, 2, z * 10);
  }
  if (spiel === "flatter") {
    ctx.fillStyle = "#2f2c3a";
    for (const [x, oben, unten] of [[40, 38, 78], [150, 22, 64]]) {
      ctx.fillRect(x, 0, 36, oben);
      ctx.fillRect(x, unten, 36, 108 - unten);
      ctx.fillStyle = "#3d3949";
      ctx.fillRect(x - 3, oben - 7, 42, 7);
      ctx.fillRect(x - 3, unten, 42, 7);
      ctx.fillStyle = "#5fc39c";
      for (let y = unten + 12; y < 104; y += 10) ctx.fillRect(x + 6, y, 3, 3);
      for (let y = oben - 14; y > 0; y -= 10) ctx.fillRect(x + 6, y, 3, 3);
      ctx.fillStyle = "#2f2c3a";
    }
    ctx.fillStyle = "#3a3550";
    ctx.fillRect(0, 108, 240, 3);
    // Bildschirm ohne Fuß, nach rechts gedreht (Gehäuseseite links sichtbar)
    ctx.fillStyle = "#a49fb3";
    ctx.fillRect(104, 50, 4, 14);
    ctx.fillStyle = "#e9e6ef";
    ctx.fillRect(108, 48, 24, 18);
    ctx.fillStyle = "#1a2a3a";
    ctx.fillRect(110, 50, 20, 13);
    ctx.fillStyle = "#7fe0b0";
    ctx.fillRect(118, 53, 2, 3);
    ctx.fillRect(125, 53, 2, 3);
    ctx.fillRect(119, 58, 7, 1);
    ctx.fillStyle = lila;
    ctx.fillRect(96, 52, 10, 2);
    ctx.fillRect(98, 55, 8, 2);
  }
  if (spiel === "invasion") {
    const kaefer = ["...XXXXX...", "X.XXXXXXX.X", ".XXXX.XXXX.", "XXXXX.XXXXX", ".XXXX.XXXX.", "X.XXX.XXX.X", "...XXXXX...", "....XXX....", "...X...X..."];
    const reihen = [["#e5566f", 4], ["#f0a35e", 26], ["#5fc39c", 48]];
    for (const [farbe, y] of reihen)
      for (let c = 0; c < 6; c++) {
        ctx.fillStyle = farbe;
        kaefer.forEach((z, yy) => [...z].forEach((ch, xx) => ch === "X" && ctx.fillRect(40 + c * 28 + xx * 2, y + yy * 2, 2, 2)));
      }
    ctx.fillStyle = "#44a282";
    ctx.fillRect(36, 84, 30, 8);
    ctx.fillRect(174, 84, 30, 8);
    ctx.fillStyle = lila;
    ctx.fillRect(108, 104, 24, 7);
    ctx.strokeStyle = gelb;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(120, 97, 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#e5566f";
    ctx.beginPath();
    ctx.arc(120, 72, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  if (spiel === "sudoku") {
    const z = 12;
    const ox = 66;
    const oy = 6;
    const zahlen = "5 3 . . 7 . . . . 6 . . 1 9 5 . . . . 9 8 . . . . 6 . 8 . . . 6 . . . 3 4 . . 8 . 3 . . 1 7 . . . 2 . . . 6 . 6 . . . . 2 8 . . . . 4 1 9 . . 5 . . . . 8 . . 7 9".split(" ");
    ctx.fillStyle = "#16141c";
    ctx.fillRect(ox, oy, z * 9, z * 9);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = '7px "Press Start 2P", monospace';
    zahlen.forEach((v, i) => {
      if (v === ".") return;
      ctx.fillStyle = i % 7 === 3 ? lila : weiss;
      ctx.fillText(v, ox + (i % 9) * z + z / 2 + 0.5, oy + Math.floor(i / 9) * z + z / 2 + 1);
    });
    for (let i = 0; i <= 9; i++) {
      ctx.fillStyle = i % 3 === 0 ? "#8a8698" : "#2a292f";
      ctx.fillRect(ox + i * z - (i % 3 === 0 ? 1 : 0), oy, i % 3 === 0 ? 2 : 1, z * 9);
      ctx.fillRect(ox, oy + i * z - (i % 3 === 0 ? 1 : 0), z * 9, i % 3 === 0 ? 2 : 1);
    }
  }
  if (spiel === "ttt") {
    const z = 34;
    const ox = 69;
    const oy = 8;
    ctx.fillStyle = "#3a3550";
    ctx.fillRect(ox + z - 1, oy, 3, z * 3);
    ctx.fillRect(ox + 2 * z - 1, oy, 3, z * 3);
    ctx.fillRect(ox, oy + z - 1, z * 3, 3);
    ctx.fillRect(ox, oy + 2 * z - 1, z * 3, 3);
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    const x = (c, r) => {
      ctx.strokeStyle = gelb;
      ctx.beginPath();
      ctx.moveTo(ox + c * z + 9, oy + r * z + 9);
      ctx.lineTo(ox + c * z + z - 9, oy + r * z + z - 9);
      ctx.moveTo(ox + c * z + z - 9, oy + r * z + 9);
      ctx.lineTo(ox + c * z + 9, oy + r * z + z - 9);
      ctx.stroke();
    };
    const o = (c, r) => {
      ctx.strokeStyle = lila;
      ctx.beginPath();
      ctx.arc(ox + c * z + z / 2, oy + r * z + z / 2, 10, 0, Math.PI * 2);
      ctx.stroke();
    };
    x(0, 0);
    x(1, 1);
    o(2, 0);
    o(0, 2);
    x(2, 2);
    ctx.strokeStyle = weiss;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ox + 6, oy + 6);
    ctx.lineTo(ox + 3 * z - 6, oy + 3 * z - 6);
    ctx.stroke();
  }
}
