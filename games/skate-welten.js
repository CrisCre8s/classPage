// Stick-Skater: Welten (Stadt, Strand, Dschungel, Eis, Hölle, Himmel, Mond).
// Hintergründe mit Parallaxe, Boden, Lücken, Deko und Hindernisse je Welt. Alles mit Code gezeichnet.

export const WELTEN = [
  { id: "stadt", name: "Stadt bei Nacht", kurz: "Dächer, Skatepark und Innenstadt.", farbe: "#b48ef0" },
  { id: "strand", name: "Sonnenstrand", kurz: "Sandburgen, Surfbretter, Krabben. Über das Wasser springen!", farbe: "#f0a35e" },
  { id: "dschungel", name: "Dschungel", kurz: "Baumstämme grinden, auf Pilzen hüpfen, Flüsse überspringen.", farbe: "#5fc39c" },
  { id: "eis", name: "Eiswelt", kurz: "Glattes Eis (du rollst weiter), Pinguine und Gletscherspalten.", farbe: "#9fd0ff" },
  { id: "hoelle", name: "Hölle", kurz: "Lava-Geysire, glühende Ketten und überall Feuerringe.", farbe: "#ff6b3d" },
  { id: "himmel", name: "Himmel", kurz: "Wolkeninseln, goldene Rails und Regenbögen. Du schwebst länger.", farbe: "#ffe28a" },
  { id: "weltall", name: "Mond", kurz: "Wenig Schwerkraft, Krater, Rover und Laser-Rails.", farbe: "#c8d0ff" },
];
export const STADT_ZONEN = ["dach", "park", "strasse"];
export const ZONEN = {
  dach: "Über den Dächern",
  park: "Skatepark",
  strasse: "Innenstadt",
  strand: "Sonnenstrand",
  dschungel: "Dschungel",
  eis: "Eiswelt",
  hoelle: "Hölle",
  himmel: "Himmel",
  weltall: "Mond",
};
export const weltVonZone = (z) => (STADT_ZONEN.includes(z) ? "stadt" : z);

// Physik je Welt: g = Schwerkraft, sprung = Absprung, reibung = Rollwiderstand
export const PHYSIK = {
  eis: { reibung: 0.35 },
  himmel: { g: 0.8 },
  weltall: { g: 0.56, sprung: 0.84 },
};

export const BODEN_STIL = {
  dach: { oben: "#3b3456", mitte: "#2b2541", unten: "#141120", kante: "#6f6596" },
  park: { oben: "#9a9fb0", mitte: "#6a6f80", unten: "#2b2d36", kante: "#d3d7e3" },
  strasse: { oben: "#45444f", mitte: "#2d2c35", unten: "#16161c", kante: "#a19eae" },
  strand: { oben: "#f3d9a4", mitte: "#e0bb7c", unten: "#6e4f2c", kante: "#fff0c8" },
  dschungel: { oben: "#4f3a26", mitte: "#3e2d1d", unten: "#16100a", kante: "#7fd35a" },
  eis: { oben: "#d8ecff", mitte: "#8fbde4", unten: "#1d3a5e", kante: "#ffffff" },
  hoelle: { oben: "#4a2624", mitte: "#2a1214", unten: "#0c0405", kante: "#ff7a3a" },
  himmel: { oben: "#ffffff", mitte: "#f1f5ff", unten: "rgba(214, 228, 255, 0)", kante: "#ffffff" },
  weltall: { oben: "#a7a9b4", mitte: "#6d6f7b", unten: "#1f2028", kante: "#dcdee8" },
};

// Rails an Treppen und Lücken bekommen das Material der Welt
export const RAIL_STIL = { strand: "holz", dschungel: "bambus", eis: "eisrail", hoelle: "kette", himmel: "gold", weltall: "laser" };

// Hindernisse je Zone (Stadt-Zonen stehen in skate.js)
export const HINDERNISSE = {
  strand: ["sandburg", "surf", "liege", "krabbe", "ball", "kicker", "surf"],
  dschungel: ["stein", "stamm", "pilz", "stamm", "kicker", "pilz", "stein"],
  eis: ["schneemann", "eisblock", "pinguin", "eisrail", "kicker", "eisrail"],
  hoelle: ["geysir", "lavastein", "kette", "kicker", "geysir", "kette"],
  himmel: ["wolke", "gold", "regenbogen", "gewitter", "kicker", "regenbogen"],
  weltall: ["fels", "rover", "laser", "kicker", "laser", "fels"],
};

const zufall = (a, b) => a + Math.random() * (b - a);
// kleiner Zufallsgenerator mit Startwert (damit Deko beim Neuzeichnen gleich bleibt)
function sr(seed) {
  let r = Math.floor(Math.abs(seed) * 1e6) % 233280;
  return () => (r = (r * 9301 + 49297) % 233280) / 233280;
}

// ---------------------------------------------------------------------------
// Hintergründe
// ---------------------------------------------------------------------------
const BREITE = 2400;
function schicht(f, n, erzeuge) {
  const liste = [];
  let x = 0;
  while (x < BREITE) {
    const it = erzeuge(x);
    liste.push(it);
    x += it.b + (it.abst ?? zufall(10, 60));
    if (liste.length > n) break;
  }
  return { f, liste, breite: Math.max(BREITE, x) };
}
function parallax(ctx, s, kamX, kamY, W, H, fn) {
  const off = (((kamX * s.f) % s.breite) + s.breite) % s.breite;
  const basis = H + 40 - (kamY + H * 0.68) * s.f * 0.6;
  for (const rep of [0, s.breite]) {
    for (const it of s.liste) {
      const x = it.x - off + rep;
      if (x > W + 80 || x + it.b < -80) continue;
      fn(x, basis, it);
    }
  }
}
function verlauf(ctx, H, W, stops) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  stops.forEach(([k, c]) => g.addColorStop(k, c));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}
function glanz(ctx, x, y, r, farbe, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, farbe.replace("A", a));
  g.addColorStop(1, farbe.replace("A", 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
function kreis(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}
function sterneMalen(ctx, liste, t, farbig = false) {
  for (const s of liste) {
    ctx.globalAlpha = 0.4 + 0.45 * Math.sin(t / 700 + s.p);
    ctx.fillStyle = farbig && s.p > 5.2 ? "#ffd9a8" : farbig && s.p < 0.6 ? "#a8c8ff" : "#ffffff";
    kreis(ctx, s.x, s.y, s.r);
  }
  ctx.globalAlpha = 1;
}
const sterneErzeugen = (n, hoehe, W) => Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * hoehe, r: Math.random() < 0.15 ? 1.6 : 0.9, p: Math.random() * 6.28 }));

const CACHE_BAUER = {
  stadt(W) {
    const ebenen = [
      { f: 0.08, farbe: "#171329", hMin: 120, hMax: 260, fenster: 0.15 },
      { f: 0.2, farbe: "#1f1a36", hMin: 90, hMax: 220, fenster: 0.35 },
      { f: 0.38, farbe: "#29224a", hMin: 60, hMax: 170, fenster: 0.55 },
    ].map((e) => {
      const s = schicht(e.f, 80, (x) => {
        const b = zufall(60, 140);
        const h = zufall(e.hMin, e.hMax);
        const fenster = [];
        for (let fy = 14; fy < h - 16; fy += 20) for (let fx = 10; fx < b - 12; fx += 18) if (Math.random() < e.fenster) fenster.push([fx, fy, Math.random()]);
        return { x, b, h, fenster, antenne: Math.random() < 0.25, abst: zufall(6, 26) };
      });
      return { ...s, farbe: e.farbe };
    });
    return { ebenen, sterne: sterneErzeugen(90, 260, W) };
  },
  strand() {
    return {
      inseln: schicht(0.05, 20, (x) => ({ x, b: zufall(180, 420), h: zufall(26, 70), abst: zufall(160, 500) })),
      palmen: schicht(0.26, 40, (x) => ({ x, b: 70, h: zufall(120, 190), neig: zufall(-0.35, 0.35), seed: Math.random(), abst: zufall(40, 260) })),
      wolken: Array.from({ length: 7 }, () => ({ x: Math.random() * 1400, y: zufall(40, 190), b: zufall(80, 220) })),
    };
  },
  dschungel() {
    return {
      huegel: schicht(0.05, 30, (x) => ({ x, b: zufall(200, 380), h: zufall(70, 150), abst: -zufall(40, 120) })),
      kronen: schicht(0.16, 50, (x) => ({ x, b: zufall(90, 160), h: zufall(150, 240), seed: Math.random(), abst: zufall(-20, 30) })),
      staemme: schicht(0.38, 30, (x) => ({ x, b: zufall(26, 44), seed: Math.random(), abst: zufall(160, 420) })),
      lianen: schicht(0.55, 40, (x) => ({ x, b: 30, l: zufall(50, 170), seed: Math.random(), abst: zufall(50, 220) })),
    };
  },
  eis(W) {
    return {
      sterne: sterneErzeugen(110, 300, W),
      fern: schicht(0.05, 30, (x) => ({ x, b: zufall(200, 360), h: zufall(140, 230), abst: -zufall(60, 140) })),
      nah: schicht(0.15, 30, (x) => ({ x, b: zufall(160, 300), h: zufall(90, 170), abst: -zufall(40, 100) })),
      tannen: schicht(0.34, 60, (x) => ({ x, b: zufall(34, 60), h: zufall(70, 130), abst: zufall(-6, 50) })),
    };
  },
  hoelle() {
    return {
      vulkane: schicht(0.05, 14, (x) => ({ x, b: zufall(260, 420), h: zufall(150, 230), abst: zufall(80, 300), seed: Math.random() })),
      felsen: schicht(0.16, 40, (x) => ({ x, b: zufall(80, 170), h: zufall(60, 160), seed: Math.random(), abst: zufall(-20, 40) })),
      zapfen: schicht(0.3, 50, (x) => ({ x, b: zufall(30, 70), l: zufall(40, 140), abst: zufall(10, 90) })),
    };
  },
  himmel() {
    return {
      fern: schicht(0.04, 20, (x) => ({ x, b: zufall(220, 420), seed: Math.random(), abst: zufall(80, 260) })),
      inseln: schicht(0.13, 12, (x) => ({ x, b: zufall(120, 200), y: zufall(-60, 60), seed: Math.random(), abst: zufall(260, 600) })),
      nah: schicht(0.3, 20, (x) => ({ x, b: zufall(180, 320), seed: Math.random(), abst: zufall(200, 500) })),
    };
  },
  weltall(W) {
    return {
      sterne: sterneErzeugen(180, 440, W),
      fern: schicht(0.05, 30, (x) => ({ x, b: zufall(160, 320), h: zufall(60, 140), seed: Math.random(), abst: -zufall(30, 80) })),
      basis: schicht(0.16, 20, (x) => ({ x, b: zufall(110, 200), seed: Math.random(), abst: zufall(200, 600) })),
      nah: schicht(0.32, 30, (x) => ({ x, b: zufall(90, 200), h: zufall(30, 80), seed: Math.random(), abst: zufall(60, 300) })),
    };
  },
};

const caches = {};
function cache(welt, W) {
  if (!caches[welt]) caches[welt] = CACHE_BAUER[welt](W);
  return caches[welt];
}

const HINTERGRUND = {
  stadt(ctx, t, kamX, kamY, W, H, c) {
    verlauf(ctx, H, W, [[0, "#07060d"], [0.55, "#181332"], [1, "#33264f"]]);
    sterneMalen(ctx, c.sterne, t);
    glanz(ctx, 780, 90, 110, "rgba(245, 230, 184, A)", 0.35);
    ctx.fillStyle = "#f5e6b8";
    kreis(ctx, 780, 90, 30);
    ctx.fillStyle = "rgba(200, 185, 140, 0.35)";
    [[770, 82, 6], [792, 100, 4], [784, 76, 3]].forEach(([x, y, r]) => kreis(ctx, x, y, r));
    for (const e of c.ebenen) {
      parallax(ctx, e, kamX, kamY, W, H, (x, basis, h) => {
        const top = basis - h.h - 120;
        ctx.fillStyle = e.farbe;
        ctx.fillRect(x, top, h.b, H - top + 40);
        if (h.antenne) {
          ctx.fillRect(x + h.b / 2 - 1, top - 18, 2, 18);
          ctx.fillStyle = Math.sin(t / 400 + h.x) > 0 ? "#e5566f" : "#5a2030";
          ctx.fillRect(x + h.b / 2 - 2, top - 20, 4, 4);
        }
        for (const [fx, fy, p] of h.fenster) {
          ctx.fillStyle = p > 0.85 ? "rgba(159, 208, 255, 0.55)" : `rgba(245, 217, 122, ${0.25 + p * 0.35})`;
          ctx.fillRect(x + fx, top + fy, 7, 9);
        }
      });
    }
    const d = ctx.createLinearGradient(0, H * 0.55, 0, H);
    d.addColorStop(0, "rgba(51, 38, 79, 0)");
    d.addColorStop(1, "rgba(51, 38, 79, 0.55)");
    ctx.fillStyle = d;
    ctx.fillRect(0, H * 0.55, W, H * 0.45);
  },

  strand(ctx, t, kamX, kamY, W, H, c) {
    verlauf(ctx, H, W, [[0, "#2b1e4f"], [0.38, "#a8457a"], [0.62, "#f08a5a"], [0.8, "#ffc982"], [1, "#ffe3a8"]]);
    const hz = 262 - (kamY + H * 0.68) * 0.04;
    // Sonne kurz über dem Meer
    glanz(ctx, 640, hz - 18, 170, "rgba(255, 220, 150, A)", 0.45);
    const sg = ctx.createLinearGradient(0, hz - 80, 0, hz);
    sg.addColorStop(0, "#fff3c4");
    sg.addColorStop(1, "#ff9a5a");
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(640, hz - 18, 56, Math.PI, 0);
    ctx.lineTo(696, hz);
    ctx.lineTo(584, hz);
    ctx.fill();
    // Wolkenstreifen
    ctx.fillStyle = "rgba(255, 190, 200, 0.28)";
    for (const w of c.wolken) {
      const x = ((((w.x - kamX * 0.02 + t * 0.004) % 1400) + 1400) % 1400) - 200;
      ctx.beginPath();
      ctx.ellipse(x, w.y, w.b / 2, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + w.b * 0.2, w.y - 6, w.b / 3, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Inseln am Horizont
    ctx.fillStyle = "#6a3462";
    parallax(ctx, c.inseln, kamX, kamY, W, H, (x, _b, it) => {
      ctx.beginPath();
      ctx.ellipse(x + it.b / 2, hz, it.b / 2, it.h, 0, Math.PI, 0);
      ctx.fill();
    });
    // Meer mit Sonnenspiegelung
    const mg = ctx.createLinearGradient(0, hz, 0, H);
    mg.addColorStop(0, "#c25a78");
    mg.addColorStop(0.35, "#5a2f6e");
    mg.addColorStop(1, "#22163e");
    ctx.fillStyle = mg;
    ctx.fillRect(0, hz, W, H - hz);
    for (let i = 0; i < 16; i++) {
      const y = hz + 4 + i * i * 0.9;
      const b = 90 - i * 4 + Math.sin(t / 300 + i) * 10;
      ctx.fillStyle = `rgba(255, 225, 160, ${0.5 - i * 0.028})`;
      ctx.fillRect(640 - b / 2 + Math.sin(t / 500 + i * 2) * 6, y, b, 2);
    }
    ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
    for (let i = 0; i < 26; i++) {
      const x = (((i * 137 - kamX * 0.12 + Math.sin(t / 900 + i) * 8) % W) + W) % W;
      ctx.fillRect(x, hz + 14 + ((i * 53) % 90), 18, 1.5);
    }
    // Palmen (Silhouetten)
    parallax(ctx, c.palmen, kamX, kamY, W, H, (x, basis, it) => palmeSilhouette(ctx, x + 35, basis - 130, it, t, "#2a1532"));
  },

  dschungel(ctx, t, kamX, kamY, W, H, c) {
    verlauf(ctx, H, W, [[0, "#0b271e"], [0.5, "#1d5a3c"], [1, "#8cc67e"]]);
    // Lichtstrahlen durch das Blätterdach
    ctx.fillStyle = "rgba(255, 250, 200, 0.06)";
    for (let i = 0; i < 5; i++) {
      const x = ((((i * 260 - kamX * 0.03) % 1300) + 1300) % 1300) - 100;
      const w = 50 + 20 * Math.sin(t / 1500 + i);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + w, 0);
      ctx.lineTo(x + w + 160, H);
      ctx.lineTo(x + 120, H);
      ctx.fill();
    }
    ctx.fillStyle = "#1a4834";
    parallax(ctx, c.huegel, kamX, kamY, W, H, (x, basis, it) => {
      ctx.beginPath();
      ctx.ellipse(x + it.b / 2, basis - 150, it.b / 2 + 30, it.h, 0, Math.PI, 0);
      ctx.fill();
    });
    parallax(ctx, c.kronen, kamX, kamY, W, H, (x, basis, it) => {
      const r = sr(it.seed);
      const top = basis - 140 - it.h;
      ctx.fillStyle = "#123628";
      ctx.fillRect(x + it.b / 2 - 7, top + 30, 14, it.h);
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = i % 2 ? "#174a34" : "#1b553b";
        kreis(ctx, x + r() * it.b, top + r() * 50, 30 + r() * 30);
      }
    });
    parallax(ctx, c.staemme, kamX, kamY, W, H, (x, basis, it) => {
      const r = sr(it.seed);
      ctx.fillStyle = "#0c241a";
      ctx.fillRect(x, -40, it.b, basis + 40);
      ctx.fillStyle = "rgba(95, 195, 120, 0.18)";
      for (let i = 0; i < 6; i++) ctx.fillRect(x + r() * it.b * 0.6, r() * basis, it.b * 0.4, 10 + r() * 24);
    });
    // Mehr Nebel unten
    const n = ctx.createLinearGradient(0, H * 0.45, 0, H);
    n.addColorStop(0, "rgba(220, 255, 220, 0)");
    n.addColorStop(1, "rgba(220, 255, 220, 0.18)");
    ctx.fillStyle = n;
    ctx.fillRect(0, H * 0.45, W, H * 0.55);
    // Lianen hängen von oben
    parallax(ctx, c.lianen, kamX, kamY, W, H, (x, _b, it) => {
      const r = sr(it.seed);
      const sw = Math.sin(t / 1300 + it.seed * 9) * 5;
      ctx.strokeStyle = "#2a6a3e";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x, -5);
      ctx.quadraticCurveTo(x + 8 + sw, it.l / 2, x + sw, it.l);
      ctx.stroke();
      ctx.fillStyle = "#3f8f52";
      for (let y = 18; y < it.l; y += 16 + r() * 10) {
        ctx.beginPath();
        ctx.ellipse(x + sw * (y / it.l) + (r() < 0.5 ? -5 : 5), y, 6, 3, r() - 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  },

  eis(ctx, t, kamX, kamY, W, H, c) {
    verlauf(ctx, H, W, [[0, "#040a1c"], [0.55, "#0c2149"], [1, "#2a5c8c"]]);
    sterneMalen(ctx, c.sterne, t);
    // Polarlicht: wehende Bänder
    for (let b = 0; b < 3; b++) {
      const farbe = b === 1 ? "120, 230, 255" : "110, 255, 170";
      for (let x = -10; x < W + 10; x += 8) {
        const y = 60 + b * 30 + Math.sin(x / 130 + t / 2000 + b * 1.7) * 22 + Math.sin(x / 47 + t / 900) * 5;
        const a = 0.05 + 0.05 * Math.sin(x / 90 + t / 1100 + b);
        for (let k = 0; k < 3; k++) {
          ctx.fillStyle = `rgba(${farbe}, ${Math.max(0, a * (1 - k * 0.3))})`;
          ctx.fillRect(x, y + k * 16, 8, 18);
        }
      }
    }
    const berg = (s, farbe, kappe, hoch) =>
      parallax(ctx, s, kamX, kamY, W, H, (x, basis, it) => {
        const fuss = basis - hoch;
        ctx.fillStyle = farbe;
        ctx.beginPath();
        ctx.moveTo(x - 40, fuss + 200);
        ctx.lineTo(x + it.b / 2, fuss - it.h);
        ctx.lineTo(x + it.b + 40, fuss + 200);
        ctx.fill();
        ctx.fillStyle = kappe;
        ctx.beginPath();
        const k = 0.28;
        ctx.moveTo(x + it.b / 2, fuss - it.h);
        ctx.lineTo(x + it.b / 2 + (it.b / 2 + 40) * k, fuss - it.h + (it.h + 200) * k);
        ctx.lineTo(x + it.b / 2 + 6, fuss - it.h + (it.h + 200) * k * 0.8);
        ctx.lineTo(x + it.b / 2 - 10, fuss - it.h + (it.h + 200) * k);
        ctx.lineTo(x + it.b / 2 - (it.b / 2 + 40) * k, fuss - it.h + (it.h + 200) * k * 0.9);
        ctx.fill();
      });
    berg(c.fern, "#172b4e", "rgba(210, 228, 250, 0.55)", 170);
    berg(c.nah, "#21406b", "rgba(235, 245, 255, 0.85)", 130);
    parallax(ctx, c.tannen, kamX, kamY, W, H, (x, basis, it) => {
      const fuss = basis - 100;
      for (let i = 0; i < 3; i++) {
        const y = fuss - i * it.h * 0.28;
        const b = it.b * (1 - i * 0.22);
        ctx.fillStyle = "#10243f";
        ctx.beginPath();
        ctx.moveTo(x + it.b / 2 - b / 2, y);
        ctx.lineTo(x + it.b / 2, y - it.h * 0.5);
        ctx.lineTo(x + it.b / 2 + b / 2, y);
        ctx.fill();
        ctx.fillStyle = "rgba(230, 242, 255, 0.7)";
        ctx.beginPath();
        ctx.moveTo(x + it.b / 2 - b / 4, y - it.h * 0.25);
        ctx.lineTo(x + it.b / 2, y - it.h * 0.5);
        ctx.lineTo(x + it.b / 2 + b / 4, y - it.h * 0.25);
        ctx.fill();
      }
      ctx.fillStyle = "#0b1a2e";
      ctx.fillRect(x + it.b / 2 - 3, fuss, 6, 100);
    });
  },

  hoelle(ctx, t, kamX, kamY, W, H, c) {
    verlauf(ctx, H, W, [[0, "#110203"], [0.5, "#3d0a08"], [1, "#9a2a12"]]);
    parallax(ctx, c.vulkane, kamX, kamY, W, H, (x, basis, it) => {
      const fuss = basis - 110;
      const top = fuss - it.h;
      ctx.fillStyle = "#250707";
      ctx.beginPath();
      ctx.moveTo(x - 60, fuss + 200);
      ctx.lineTo(x + it.b * 0.4, top);
      ctx.lineTo(x + it.b * 0.6, top);
      ctx.lineTo(x + it.b + 60, fuss + 200);
      ctx.fill();
      // Glut im Krater und Lavaströme
      const puls = 0.5 + 0.3 * Math.sin(t / 500 + it.seed * 10);
      glanz(ctx, x + it.b / 2, top, 90, "rgba(255, 110, 40, A)", puls * 0.7);
      ctx.strokeStyle = `rgba(255, 120, 40, ${0.55 * puls + 0.2})`;
      ctx.lineWidth = 3;
      const r = sr(it.seed);
      for (let i = 0; i < 2; i++) {
        const sx = x + it.b * (0.43 + r() * 0.14);
        ctx.beginPath();
        ctx.moveTo(sx, top + 2);
        ctx.quadraticCurveTo(sx + (r() - 0.5) * 60, top + it.h * 0.5, sx + (r() - 0.5) * 120, fuss + 40);
        ctx.stroke();
      }
    });
    parallax(ctx, c.felsen, kamX, kamY, W, H, (x, basis, it) => {
      const r = sr(it.seed);
      const fuss = basis - 90;
      ctx.fillStyle = "#330c0a";
      ctx.beginPath();
      ctx.moveTo(x, fuss + 100);
      let px = x;
      while (px < x + it.b) {
        px += 12 + r() * 20;
        ctx.lineTo(Math.min(px, x + it.b), fuss - it.h * (0.4 + r() * 0.6));
      }
      ctx.lineTo(x + it.b, fuss + 100);
      ctx.fill();
    });
    const g = ctx.createLinearGradient(0, H * 0.5, 0, H);
    g.addColorStop(0, "rgba(255, 90, 30, 0)");
    g.addColorStop(1, `rgba(255, 90, 30, ${0.32 + 0.06 * Math.sin(t / 400)})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, H * 0.5, W, H * 0.5);
    // Höhlendecke mit Zapfen
    const deckeY = -(kamY + H * 0.68) * 0.3 * 0.6;
    ctx.fillStyle = "#1c0405";
    ctx.fillRect(0, deckeY - 400, W, 412);
    parallax(ctx, c.zapfen, kamX, kamY, W, H, (x, _b, it) => {
      ctx.beginPath();
      ctx.moveTo(x, deckeY + 10);
      ctx.lineTo(x + it.b / 2, deckeY + 10 + it.l);
      ctx.lineTo(x + it.b, deckeY + 10);
      ctx.fill();
    });
  },

  himmel(ctx, t, kamX, kamY, W, H, c) {
    verlauf(ctx, H, W, [[0, "#3f8cf2"], [0.55, "#9fd0ff"], [1, "#fff1d6"]]);
    // Sonne mit Strahlen
    ctx.save();
    ctx.translate(150, 80);
    ctx.rotate(t / 9000);
    ctx.fillStyle = "rgba(255, 250, 220, 0.18)";
    for (let i = 0; i < 12; i++) {
      ctx.rotate(Math.PI / 6);
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.lineTo(14, 0);
      ctx.lineTo(0, 260);
      ctx.fill();
    }
    ctx.restore();
    glanz(ctx, 150, 80, 110, "rgba(255, 250, 220, A)", 0.8);
    ctx.fillStyle = "#fffbe8";
    kreis(ctx, 150, 80, 34);
    // Regenbogen weit hinten
    const rx = ((((700 - kamX * 0.015) % 2000) + 2000) % 2000) - 400;
    const farben = ["#ff6b6b", "#ffb347", "#ffe066", "#7be07b", "#6ab8ff", "#b48ef0"];
    ctx.lineWidth = 9;
    ctx.globalAlpha = 0.28;
    farben.forEach((f, i) => {
      ctx.strokeStyle = f;
      ctx.beginPath();
      ctx.arc(rx, 420, 300 - i * 9, Math.PI, 0);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
    const wolke = (x, y, b, seed, farbe) => {
      const r = sr(seed);
      ctx.fillStyle = farbe;
      for (let i = 0; i < 7; i++) {
        const k = i / 6;
        kreis(ctx, x + k * b, y - Math.sin(k * Math.PI) * b * 0.16 - r() * 12, b * (0.12 + r() * 0.1));
      }
      ctx.fillRect(x, y - 4, b, b * 0.12);
    };
    parallax(ctx, c.fern, kamX, kamY, W, H, (x, basis, it) => wolke(x, basis - 250, it.b, it.seed, "rgba(255,255,255,0.65)"));
    parallax(ctx, c.inseln, kamX, kamY, W, H, (x, basis, it) => {
      const y = basis - 290 + it.y + Math.sin(t / 1600 + it.seed * 8) * 6;
      ctx.fillStyle = "#b39a7c";
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + it.b, y);
      ctx.lineTo(x + it.b * 0.55, y + it.b * 0.45);
      ctx.fill();
      ctx.fillStyle = "#8fd96e";
      ctx.fillRect(x - 3, y - 5, it.b + 6, 8);
      // kleiner Tempel aus Säulen
      ctx.fillStyle = "#f7f3ea";
      const tb = it.b * 0.5;
      const tx = x + it.b * 0.25;
      ctx.fillRect(tx, y - 36, tb, 5);
      for (let i = 0; i < 4; i++) ctx.fillRect(tx + 3 + i * ((tb - 10) / 3), y - 31, 4, 26);
      ctx.beginPath();
      ctx.moveTo(tx - 4, y - 36);
      ctx.lineTo(tx + tb / 2, y - 48);
      ctx.lineTo(tx + tb + 4, y - 36);
      ctx.fill();
      // Wasserfall
      ctx.fillStyle = "rgba(220, 240, 255, 0.6)";
      ctx.fillRect(x + it.b * 0.8, y + 2, 4, 30 + Math.sin(t / 200) * 2);
    });
    parallax(ctx, c.nah, kamX, kamY, W, H, (x, basis, it) => wolke(x, basis - 150, it.b, it.seed, "rgba(255,255,255,0.85)"));
  },

  weltall(ctx, t, kamX, kamY, W, H, c) {
    verlauf(ctx, H, W, [[0, "#000004"], [1, "#0b0b26"]]);
    // Milchstraße
    ctx.fillStyle = "rgba(170, 160, 255, 0.05)";
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.ellipse(480, 200, 620, 40 + i * 10, -0.35, 0, Math.PI * 2);
      ctx.fill();
    }
    sterneMalen(ctx, c.sterne, t, true);
    // Sternschnuppe
    const sz = (t / 4200) % 1;
    if (sz < 0.12) {
      const k = sz / 0.12;
      const sx = 200 + Math.floor(t / 4200) * 173 % 600 + k * 220;
      const sy = 40 + k * 90;
      ctx.strokeStyle = `rgba(255,255,255,${1 - k})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx - 50, sy - 20);
      ctx.stroke();
    }
    // ein blauer Planet (Fantasie-Kontinente)
    const px = 790;
    const py = 105;
    glanz(ctx, px, py, 80, "rgba(120, 180, 255, A)", 0.35);
    ctx.save();
    ctx.beginPath();
    ctx.arc(px, py, 42, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "#2b67cf";
    ctx.fillRect(px - 42, py - 42, 84, 84);
    ctx.fillStyle = "#47a868";
    const r = sr(0.4242);
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.ellipse(px - 30 + r() * 60 + ((t / 400) % 84) - 42, py - 30 + r() * 60, 8 + r() * 14, 5 + r() * 9, r() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.ellipse(px - 36 + r() * 72, py - 30 + r() * 60, 12 + r() * 10, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    const sch = ctx.createLinearGradient(px - 42, 0, px + 42, 0);
    sch.addColorStop(0, "rgba(0,0,10,0)");
    sch.addColorStop(0.55, "rgba(0,0,10,0.1)");
    sch.addColorStop(1, "rgba(0,0,10,0.85)");
    ctx.fillStyle = sch;
    ctx.fillRect(px - 42, py - 42, 84, 84);
    ctx.restore();
    // Mondberge
    parallax(ctx, c.fern, kamX, kamY, W, H, (x, basis, it) => {
      const r2 = sr(it.seed);
      const fuss = basis - 120;
      ctx.fillStyle = "#24252f";
      ctx.beginPath();
      ctx.moveTo(x - 20, fuss + 120);
      let p = x - 20;
      while (p < x + it.b + 20) {
        p += 20 + r2() * 30;
        ctx.lineTo(p, fuss - it.h * (0.3 + r2() * 0.7));
      }
      ctx.lineTo(x + it.b + 30, fuss + 120);
      ctx.fill();
    });
    // Mondbasis mit Kuppeln
    parallax(ctx, c.basis, kamX, kamY, W, H, (x, basis, it) => {
      const fuss = basis - 105;
      ctx.fillStyle = "#363847";
      ctx.fillRect(x - 10, fuss, it.b + 20, 140);
      const r2 = sr(it.seed);
      ctx.fillStyle = "#4b4f63";
      ctx.beginPath();
      ctx.arc(x + it.b * 0.3, fuss, it.b * 0.24, Math.PI, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + it.b * 0.72, fuss, it.b * 0.16, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "rgba(160, 220, 255, 0.35)";
      ctx.beginPath();
      ctx.arc(x + it.b * 0.3, fuss, it.b * 0.24 - 5, Math.PI, Math.PI * 1.4);
      ctx.lineTo(x + it.b * 0.3, fuss);
      ctx.fill();
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = Math.sin(t / 300 + i + it.seed * 9) > 0.2 ? "#f5d97a" : "#5a5030";
        ctx.fillRect(x + 8 + r2() * (it.b - 16), fuss - 4 - r2() * 10, 3, 2);
      }
      ctx.fillStyle = "#4b4f63";
      ctx.fillRect(x + it.b * 0.9, fuss - 50, 2, 50);
      ctx.fillStyle = Math.sin(t / 450 + it.seed * 5) > 0 ? "#e5566f" : "#4a2030";
      kreis(ctx, x + it.b * 0.9 + 1, fuss - 52, 2.5);
    });
    parallax(ctx, c.nah, kamX, kamY, W, H, (x, basis, it) => {
      const fuss = basis - 80;
      ctx.fillStyle = "#30313d";
      ctx.beginPath();
      ctx.ellipse(x + it.b / 2, fuss + 20, it.b / 2, it.h, 0, Math.PI, 0);
      ctx.fill();
    });
  },
};

function palmeSilhouette(ctx, x, fuss, it, t, farbe) {
  const wind = Math.sin(t / 1100 + it.seed * 7) * 0.05;
  const kx = x + Math.sin(it.neig) * it.h;
  const ky = fuss - it.h;
  ctx.strokeStyle = farbe;
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, fuss + 140);
  ctx.quadraticCurveTo(x + (kx - x) * 0.2, fuss - it.h * 0.5, kx, ky);
  ctx.stroke();
  ctx.fillStyle = farbe;
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.5 + wind;
    const l = 46 + (i % 2) * 10;
    ctx.beginPath();
    ctx.moveTo(kx, ky);
    ctx.quadraticCurveTo(kx + Math.cos(a) * l * 0.6, ky + Math.sin(a) * l * 0.6 - 14, kx + Math.cos(a) * l, ky + Math.sin(a) * l + 18);
    ctx.quadraticCurveTo(kx + Math.cos(a) * l * 0.5, ky + Math.sin(a) * l * 0.5 - 4, kx, ky + 3);
    ctx.fill();
  }
}

export function zeichneHintergrund(ctx, welt, t, kamX, kamY, W, H) {
  const fn = HINTERGRUND[welt] || HINTERGRUND.stadt;
  fn(ctx, t, kamX, kamY, W, H, cache(welt in HINTERGRUND ? welt : "stadt", W));
}

// Wetter vor der Szene: Schnee, Glut, Glühwürmchen, Funkeln
const wetterTeile = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), v: 0.6 + Math.random() * 0.8, p: Math.random() * 6.28, r: 0.8 + Math.random() * 1.8 }));
export function zeichneWetter(ctx, welt, t, kamX, W, H) {
  if (welt === "eis") {
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    for (const p of wetterTeile) {
      const y = (p.y * (H + 20) + t * 0.035 * p.v) % (H + 20) - 10;
      const x = ((((p.x * W + Math.sin(t / 900 + p.p) * 16 - kamX * 0.5 * p.v) % W) + W) % W);
      kreis(ctx, x, y, p.r);
    }
  } else if (welt === "hoelle") {
    for (const p of wetterTeile.slice(0, 45)) {
      const y = H - ((p.y * (H + 20) + t * 0.05 * p.v) % (H + 20));
      const x = ((((p.x * W + Math.sin(t / 600 + p.p) * 20 - kamX * 0.4 * p.v) % W) + W) % W);
      ctx.fillStyle = `rgba(255, ${140 + p.v * 60}, 60, ${0.35 + 0.4 * Math.sin(t / 200 + p.p)})`;
      ctx.fillRect(x, y, p.r + 0.6, p.r + 0.6);
    }
  } else if (welt === "dschungel") {
    for (const p of wetterTeile.slice(0, 24)) {
      const a = Math.max(0, Math.sin(t / 700 + p.p * 3));
      if (a < 0.1) continue;
      const x = ((((p.x * W + Math.sin(t / 2000 + p.p) * 40 - kamX * 0.3) % W) + W) % W);
      const y = 120 + p.y * 240 + Math.cos(t / 1500 + p.p) * 20;
      glanz(ctx, x, y, 7, "rgba(230, 255, 120, A)", a * 0.8);
    }
  } else if (welt === "himmel") {
    for (const p of wetterTeile.slice(0, 26)) {
      const a = Math.max(0, Math.sin(t / 500 + p.p * 4));
      if (a < 0.3) continue;
      const x = ((((p.x * W - kamX * 0.25) % W) + W) % W);
      const y = 40 + p.y * 300;
      ctx.fillStyle = `rgba(255, 245, 190, ${a})`;
      ctx.fillRect(x - 0.6, y - 3 * a, 1.2, 6 * a);
      ctx.fillRect(x - 3 * a, y - 0.6, 6 * a, 1.2);
    }
  }
}

// ---------------------------------------------------------------------------
// Boden und Lücken
// ---------------------------------------------------------------------------
// Verzierung der Oberkante eines flachen Stücks (nach dem Füllen gezeichnet)
export function bodenDetail(ctx, zone, t, x0, x1, y) {
  if (zone === "strand") {
    const r = sr(x0 * 0.001 + 0.13);
    ctx.fillStyle = "rgba(160, 120, 70, 0.35)";
    for (let i = 0; i < (x1 - x0) / 10; i++) ctx.fillRect(x0 + r() * (x1 - x0), y + 4 + r() * 30, 2, 1.5);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(x0, y + 2, x1 - x0, 3);
    for (let i = 0; i < (x1 - x0) / 160; i++) {
      const mx = x0 + r() * (x1 - x0);
      ctx.fillStyle = r() < 0.5 ? "#f7c6c6" : "#fff4e6";
      ctx.beginPath();
      ctx.arc(mx, y + 8, 3, Math.PI, 0);
      ctx.fill();
    }
  } else if (zone === "dschungel") {
    // Grasnarbe mit Halmen und Wurzeln
    ctx.fillStyle = "#3f8f3e";
    ctx.fillRect(x0, y, x1 - x0, 7);
    ctx.fillStyle = "#5fb64a";
    ctx.fillRect(x0, y, x1 - x0, 3);
    const r = sr(x0 * 0.001 + 0.27);
    ctx.fillStyle = "#5fb64a";
    for (let x = x0 + 2; x < x1 - 4; x += 5 + r() * 6) {
      const h = 4 + r() * 7;
      ctx.beginPath();
      ctx.moveTo(x, y + 1);
      ctx.lineTo(x + 1.5 + Math.sin(t / 600 + x) * 1, y - h);
      ctx.lineTo(x + 3, y + 1);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(30, 20, 10, 0.5)";
    ctx.lineWidth = 2;
    for (let i = 0; i < (x1 - x0) / 140; i++) {
      const wx = x0 + r() * (x1 - x0);
      ctx.beginPath();
      ctx.moveTo(wx, y + 8);
      ctx.quadraticCurveTo(wx + 10, y + 22, wx + 4 + r() * 20, y + 40);
      ctx.stroke();
    }
  } else if (zone === "eis") {
    // Schneedecke mit welliger Unterkante, glänzendes Eis darunter
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(x0, y);
    for (let x = x0; x <= x1; x += 12) ctx.lineTo(x, y + 7 + Math.sin(x * 0.11) * 2.5);
    ctx.lineTo(x1, y);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1.5;
    const r = sr(x0 * 0.001 + 0.31);
    for (let i = 0; i < (x1 - x0) / 120; i++) {
      const sx = x0 + r() * (x1 - x0);
      ctx.beginPath();
      ctx.moveTo(sx, y + 16);
      ctx.lineTo(sx + 14, y + 30);
      ctx.lineTo(sx + 8, y + 44);
      ctx.stroke();
    }
  } else if (zone === "hoelle") {
    // glühende Risse im Basalt
    const r = sr(x0 * 0.001 + 0.41);
    const puls = 0.55 + 0.35 * Math.sin(t / 380 + x0);
    ctx.strokeStyle = `rgba(255, 120, 40, ${puls})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < (x1 - x0) / 90; i++) {
      let sx = x0 + r() * (x1 - x0);
      let sy = y + 6;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      for (let k = 0; k < 4; k++) {
        sx += (r() - 0.5) * 24;
        sy += 6 + r() * 10;
        ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }
    ctx.fillStyle = `rgba(255, 140, 60, ${0.25 + puls * 0.2})`;
    ctx.fillRect(x0, y + 1, x1 - x0, 2);
  } else if (zone === "himmel") {
    // Wolkenrand: weiche Beulen oben und unten
    ctx.fillStyle = "#ffffff";
    for (let x = x0 + 10; x < x1 - 6; x += 22) kreis(ctx, x, y + 9 + Math.sin(x) * 2, 12 + Math.sin(x * 0.37) * 3);
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    for (let x = x0 + 18; x < x1 - 14; x += 30) kreis(ctx, x, y + 52 + Math.sin(x * 0.5) * 6, 18);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x0, y, x1 - x0, 6);
  } else if (zone === "weltall") {
    const r = sr(x0 * 0.001 + 0.53);
    for (let i = 0; i < (x1 - x0) / 70; i++) {
      const cx = x0 + 20 + r() * (x1 - x0 - 40);
      const rr = 4 + r() * 12;
      ctx.fillStyle = "rgba(0,0,0,0.22)";
      ctx.beginPath();
      ctx.ellipse(cx, y + 8 + r() * 30, rr, rr * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(cx - rr, y + 6, rr * 2, 1);
    }
  }
}

// Inhalt einer Lücke (Wasser, Lava …). y = Kante, unten = Bildunterkante in Weltkoordinaten
export function zeichneLuecke(ctx, zone, t, x0, x1, y, unten) {
  const b = x1 - x0;
  if (zone === "strand" || zone === "dschungel") {
    const wy = y + 46;
    const g = ctx.createLinearGradient(0, wy, 0, wy + 120);
    g.addColorStop(0, zone === "strand" ? "#4fb6d8" : "#3f8a7a");
    g.addColorStop(1, zone === "strand" ? "#1a4a7a" : "#14342c");
    ctx.fillStyle = g;
    ctx.fillRect(x0 - 2, wy, b + 4, unten - wy);
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = x0; x <= x1; x += 6) ctx.lineTo(x, wy + Math.sin(x / 14 + t / 250) * 2.5);
    ctx.stroke();
    if (zone === "dschungel") {
      ctx.fillStyle = "#4caf50";
      for (let i = 0; i < b / 60; i++) {
        const lx = x0 + 20 + ((i * 53) % Math.max(1, b - 40));
        ctx.beginPath();
        ctx.ellipse(lx + Math.sin(t / 900 + i) * 3, wy + 6, 9, 3, 0, 0.3, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (zone === "hoelle") {
    const ly = y + 52;
    glanz(ctx, (x0 + x1) / 2, ly, Math.max(80, b), "rgba(255, 120, 40, A)", 0.45);
    const g = ctx.createLinearGradient(0, ly, 0, ly + 80);
    g.addColorStop(0, "#ffd36a");
    g.addColorStop(0.25, "#ff7a2a");
    g.addColorStop(1, "#7a1208");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x0 - 2, unten);
    for (let x = x0 - 2; x <= x1 + 2; x += 8) ctx.lineTo(x, ly + Math.sin(x / 18 + t / 300) * 3);
    ctx.lineTo(x1 + 2, unten);
    ctx.fill();
    // Blasen
    for (let i = 0; i < b / 40; i++) {
      const k = ((t / 900 + i * 0.37) % 1);
      const bx = x0 + 10 + ((i * 71) % Math.max(1, b - 20));
      ctx.fillStyle = `rgba(255, 230, 140, ${1 - k})`;
      kreis(ctx, bx, ly + 4 - k * 10, 2 + k * 4);
    }
  } else if (zone === "eis") {
    const g = ctx.createLinearGradient(0, y, 0, y + 200);
    g.addColorStop(0, "rgba(120, 180, 230, 0.6)");
    g.addColorStop(1, "rgba(5, 15, 40, 0.95)");
    ctx.fillStyle = g;
    ctx.fillRect(x0, y + 10, b, unten - y);
  } else if (zone === "weltall") {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(x0, y + 8, b, unten - y);
  }
}

// ---------------------------------------------------------------------------
// Deko
// ---------------------------------------------------------------------------
export function dekoFuerWelt(zone, x0, x1, y, push) {
  const span = x1 - x0;
  const irgendwo = (rand = 80) => x0 + zufall(rand, Math.max(rand + 10, span - rand));
  if (zone === "strand") {
    for (let x = x0 + zufall(40, 140); x < x1 - 80; x += zufall(220, 420)) push({ art: "palme", x, y, h: zufall(110, 170), neig: zufall(-0.3, 0.3), seed: Math.random() });
    if (Math.random() < 0.6) push({ art: "schirm", x: irgendwo(), y, farbe: ["#e5566f", "#5fc39c", "#7fb8ff", "#f5d97a"][Math.floor(Math.random() * 4)] });
    if (Math.random() < 0.25) push({ art: "turm", x: irgendwo(120), y });
    if (Math.random() < 0.4) push({ art: "tauben", vogel: "moewe", x: irgendwo(120), y, n: 2 + Math.floor(Math.random() * 3), auf: null, seed: Math.random() });
  } else if (zone === "dschungel") {
    for (let x = x0 + zufall(20, 120); x < x1 - 60; x += zufall(140, 300)) push({ art: Math.random() < 0.5 ? "farn" : "baum", x, y, h: zufall(150, 240), seed: Math.random() });
    if (Math.random() < 0.35) push({ art: "totem", x: irgendwo(), y, seed: Math.random() });
    if (Math.random() < 0.45) push({ art: "tauben", vogel: "papagei", x: irgendwo(120), y, n: 1 + Math.floor(Math.random() * 3), auf: null, seed: Math.random() });
  } else if (zone === "eis") {
    for (let x = x0 + zufall(30, 160); x < x1 - 60; x += zufall(160, 340)) push({ art: "tanne", x, y, h: zufall(70, 130) });
    if (Math.random() < 0.3) push({ art: "iglu", x: irgendwo(100), y });
    if (Math.random() < 0.3) push({ art: "eiskristall", x: irgendwo(), y, h: zufall(40, 80), seed: Math.random() });
  } else if (zone === "hoelle") {
    for (let x = x0 + zufall(70, 200); x < x1 - 70; x += zufall(240, 380)) push({ art: "fackel", x, y });
  } else if (zone === "himmel") {
    for (let x = x0 + zufall(60, 200); x < x1 - 60; x += zufall(260, 420)) push({ art: "saeule", x, y, h: zufall(90, 140), kaputt: Math.random() < 0.3 });
    if (Math.random() < 0.25) push({ art: "tor", x: irgendwo(140), y });
    if (Math.random() < 0.4) push({ art: "tauben", vogel: "weiss", x: irgendwo(120), y, n: 2 + Math.floor(Math.random() * 3), auf: null, seed: Math.random() });
  } else if (zone === "weltall") {
    // Lichtkegel der Lampe reicht ±54 px: Abstand zur Kante halten
    for (let x = x0 + zufall(80, 220); x < x1 - 80; x += zufall(280, 480)) push({ art: Math.random() < 0.5 ? "schuessel" : "lampe", x, y });
    if (Math.random() < 0.25) push({ art: "rakete", x: irgendwo(140), y });
  }
}

export const VOGEL = {
  taube: { koerper: "#8d8aa0", schnabel: "#f0a35e", fluegel: "#a8a5ba" },
  moewe: { koerper: "#f4f1f8", schnabel: "#ffcc4a", fluegel: "#c9cdd8" },
  papagei: { koerper: "#e5402a", schnabel: "#f5d97a", fluegel: "#3f8fd8" },
  weiss: { koerper: "#ffffff", schnabel: "#f0a35e", fluegel: "#e8eef8" },
};

// gibt true zurück, wenn die Deko-Art hier gezeichnet wurde
export function zeichneWeltDeko(ctx, d, t) {
  const { x, y } = d;
  switch (d.art) {
    case "palme":
      palmeFarbig(ctx, x, y, d, t);
      return true;
    case "schirm": {
      ctx.fillStyle = "#e8e2d4";
      ctx.fillRect(x - 1.5, y - 74, 3, 74);
      ctx.fillStyle = d.farbe;
      ctx.beginPath();
      ctx.moveTo(x - 46, y - 62);
      ctx.quadraticCurveTo(x, y - 100, x + 46, y - 62);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      for (const k of [-0.5, 0.5]) {
        ctx.beginPath();
        ctx.moveTo(x + k * 30 - 8, y - 66);
        ctx.quadraticCurveTo(x + k * 18, y - 90, x + k * 30 + 8, y - 66);
        ctx.fill();
      }
      ctx.fillStyle = d.farbe;
      ctx.globalAlpha = 0.8;
      ctx.fillRect(x + 6, y - 3, 52, 3);
      ctx.globalAlpha = 1;
      return true;
    }
    case "turm": {
      ctx.strokeStyle = "#a8794a";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x - 26, y);
      ctx.lineTo(x - 18, y - 80);
      ctx.moveTo(x + 26, y);
      ctx.lineTo(x + 18, y - 80);
      ctx.moveTo(x - 24, y - 26);
      ctx.lineTo(x + 24, y - 50);
      ctx.stroke();
      ctx.fillStyle = "#f4f1f8";
      ctx.fillRect(x - 26, y - 116, 52, 36);
      ctx.fillStyle = "#e5566f";
      ctx.fillRect(x - 26, y - 116, 52, 8);
      ctx.fillStyle = "#4fb6d8";
      ctx.fillRect(x - 16, y - 102, 32, 14);
      ctx.fillStyle = "#e5566f";
      ctx.beginPath();
      ctx.moveTo(x + 22, y - 116);
      ctx.lineTo(x + 22, y - 146);
      ctx.lineTo(x + 40 + Math.sin(t / 200) * 3, y - 140);
      ctx.lineTo(x + 22, y - 134);
      ctx.fill();
      return true;
    }
    case "baum": {
      const r = sr(d.seed);
      ctx.fillStyle = "#2a1c12";
      ctx.fillRect(x - 10, y - d.h, 20, d.h);
      ctx.fillStyle = "#3a2a1a";
      ctx.fillRect(x - 6, y - d.h, 4, d.h);
      ctx.strokeStyle = "#2a6a3e";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x + 10, y - d.h + 30);
      ctx.quadraticCurveTo(x + 40, y - d.h * 0.4, x + 22 + Math.sin(t / 1000 + d.seed) * 4, y - 40);
      ctx.stroke();
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = ["#1f6b3c", "#2a7d46", "#185a32"][i % 3];
        kreis(ctx, x + (r() - 0.5) * 110, y - d.h - 10 + (r() - 0.5) * 50, 22 + r() * 22);
      }
      return true;
    }
    case "farn": {
      const r = sr(d.seed);
      for (let i = 0; i < 9; i++) {
        const a = -Math.PI / 2 + (i - 4) * 0.32 + Math.sin(t / 900 + i) * 0.03;
        const l = 34 + r() * 26;
        ctx.strokeStyle = i % 2 ? "#3f9a4a" : "#2f7d3c";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + Math.cos(a) * l * 0.6, y + Math.sin(a) * l, x + Math.cos(a) * l, y + Math.sin(a) * l * 0.6);
        ctx.stroke();
      }
      if (r() < 0.5) {
        ctx.fillStyle = "#ff6b9d";
        kreis(ctx, x + 14, y - 30, 5);
        ctx.fillStyle = "#ffe066";
        kreis(ctx, x + 14, y - 30, 2);
      }
      return true;
    }
    case "totem": {
      const farben = ["#c0703a", "#5fc39c", "#e5566f"];
      for (let i = 0; i < 3; i++) {
        const ty = y - 30 - i * 30;
        ctx.fillStyle = farben[i];
        ctx.fillRect(x - 16, ty, 32, 30);
        ctx.fillStyle = "#1c1a22";
        ctx.fillRect(x - 10, ty + 8, 6, 5);
        ctx.fillRect(x + 4, ty + 8, 6, 5);
        ctx.fillRect(x - 7, ty + 19, 14, 4);
      }
      ctx.fillStyle = "#f5d97a";
      ctx.beginPath();
      ctx.moveTo(x - 30, y - 92);
      ctx.lineTo(x, y - 104);
      ctx.lineTo(x + 30, y - 92);
      ctx.lineTo(x, y - 86);
      ctx.fill();
      return true;
    }
    case "tanne": {
      for (let i = 0; i < 3; i++) {
        const ty = y - 12 - i * d.h * 0.27;
        const b = 50 * (1 - i * 0.24);
        ctx.fillStyle = "#1f4a3a";
        ctx.beginPath();
        ctx.moveTo(x - b / 2, ty);
        ctx.lineTo(x, ty - d.h * 0.45);
        ctx.lineTo(x + b / 2, ty);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.moveTo(x - b / 2, ty);
        ctx.lineTo(x - b / 4, ty - 6);
        ctx.lineTo(x, ty - 2);
        ctx.lineTo(x + b / 4, ty - 6);
        ctx.lineTo(x + b / 2, ty);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x - 8, ty - d.h * 0.36);
        ctx.lineTo(x, ty - d.h * 0.45);
        ctx.lineTo(x + 8, ty - d.h * 0.36);
        ctx.fill();
      }
      ctx.fillStyle = "#3a2a1e";
      ctx.fillRect(x - 3, y - 12, 6, 12);
      return true;
    }
    case "iglu": {
      ctx.fillStyle = "#eef6ff";
      ctx.beginPath();
      ctx.arc(x, y, 44, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = "rgba(120, 170, 220, 0.6)";
      ctx.lineWidth = 1.5;
      for (const r of [14, 28]) {
        ctx.beginPath();
        ctx.moveTo(x - Math.sqrt(44 * 44 - r * r), y - r);
        ctx.lineTo(x + Math.sqrt(44 * 44 - r * r), y - r);
        ctx.stroke();
      }
      ctx.fillStyle = "#1d3a5e";
      ctx.beginPath();
      ctx.arc(x + 18, y, 13, Math.PI, 0);
      ctx.fill();
      glanz(ctx, x + 18, y - 6, 20, "rgba(255, 200, 120, A)", 0.4);
      return true;
    }
    case "eiskristall": {
      const r = sr(d.seed);
      for (let i = 0; i < 4; i++) {
        const h = d.h * (0.5 + r() * 0.5);
        const bx = x + (i - 1.5) * 12;
        const g = ctx.createLinearGradient(bx, y - h, bx + 10, y);
        g.addColorStop(0, "rgba(230, 248, 255, 0.95)");
        g.addColorStop(1, "rgba(120, 190, 240, 0.6)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(bx - 6, y);
        ctx.lineTo(bx, y - h);
        ctx.lineTo(bx + 6, y);
        ctx.fill();
      }
      glanz(ctx, x, y - d.h * 0.5, 40, "rgba(160, 220, 255, A)", 0.25 + 0.1 * Math.sin(t / 500));
      return true;
    }
    case "fackel": {
      ctx.fillStyle = "#2a1a14";
      ctx.fillRect(x - 3, y - 70, 6, 70);
      ctx.fillStyle = "#4a3020";
      ctx.fillRect(x - 7, y - 76, 14, 8);
      const fl = Math.sin(t / 70 + x) * 2;
      glanz(ctx, x, y - 86, 60, "rgba(255, 140, 50, A)", 0.4);
      ctx.fillStyle = "#ff7a2a";
      ctx.beginPath();
      ctx.moveTo(x - 7, y - 76);
      ctx.quadraticCurveTo(x - 9, y - 92, x + fl, y - 104);
      ctx.quadraticCurveTo(x + 9, y - 92, x + 7, y - 76);
      ctx.fill();
      ctx.fillStyle = "#ffe08a";
      ctx.beginPath();
      ctx.moveTo(x - 3, y - 77);
      ctx.quadraticCurveTo(x - 4, y - 87, x + fl * 0.5, y - 94);
      ctx.quadraticCurveTo(x + 4, y - 87, x + 3, y - 77);
      ctx.fill();
      return true;
    }
    case "obsidian": {
      const r = sr(d.seed);
      for (let i = 0; i < 3; i++) {
        const h = d.h * (0.5 + r() * 0.5);
        const bx = x + (i - 1) * 14;
        ctx.fillStyle = "#1a0c14";
        ctx.beginPath();
        ctx.moveTo(bx - 8, y);
        ctx.lineTo(bx + (r() - 0.5) * 6, y - h);
        ctx.lineTo(bx + 8, y);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 90, 160, 0.45)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      return true;
    }
    case "saeule": {
      const h = d.kaputt ? d.h * 0.6 : d.h;
      ctx.fillStyle = "#f7f3ea";
      ctx.fillRect(x - 14, y - 8, 28, 8);
      ctx.fillRect(x - 10, y - h, 20, h - 8);
      ctx.fillStyle = "rgba(180, 170, 150, 0.4)";
      for (let i = -6; i <= 6; i += 6) ctx.fillRect(x + i - 1, y - h, 2, h - 8);
      if (!d.kaputt) {
        ctx.fillStyle = "#f7f3ea";
        ctx.fillRect(x - 15, y - h - 8, 30, 8);
      } else {
        ctx.fillStyle = "#f7f3ea";
        ctx.beginPath();
        ctx.moveTo(x - 10, y - h);
        ctx.lineTo(x - 4, y - h - 8);
        ctx.lineTo(x + 3, y - h - 2);
        ctx.lineTo(x + 10, y - h - 10);
        ctx.lineTo(x + 10, y - h);
        ctx.fill();
        ctx.fillStyle = "#7fd36a";
        ctx.fillRect(x - 12, y - h * 0.5, 4, 10);
      }
      return true;
    }
    case "tor": {
      ctx.fillStyle = "#f5c842";
      ctx.fillRect(x - 60, y - 140, 10, 140);
      ctx.fillRect(x + 50, y - 140, 10, 140);
      ctx.strokeStyle = "#f5c842";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(x, y - 140, 55, Math.PI, 0);
      ctx.stroke();
      ctx.lineWidth = 2;
      for (let i = -40; i <= 40; i += 16) {
        ctx.beginPath();
        ctx.moveTo(x + i, y - 2);
        ctx.lineTo(x + i, y - 140 - Math.sqrt(Math.max(0, 55 * 55 - i * i)) + 6);
        ctx.stroke();
      }
      glanz(ctx, x, y - 120, 120, "rgba(255, 240, 170, A)", 0.25);
      return true;
    }
    case "schuessel": {
      ctx.fillStyle = "#6d6f7b";
      ctx.fillRect(x - 3, y - 44, 6, 44);
      ctx.save();
      ctx.translate(x, y - 50);
      ctx.rotate(-0.5 + Math.sin(t / 3000) * 0.2);
      ctx.fillStyle = "#c9ccd8";
      ctx.beginPath();
      ctx.ellipse(0, 0, 26, 9, 0, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = "#8d90a0";
      ctx.fillRect(-1, -22, 2, 22);
      ctx.fillStyle = Math.sin(t / 300) > 0 ? "#e5566f" : "#4a2030";
      kreis(ctx, 0, -23, 2.5);
      ctx.restore();
      return true;
    }
    case "lampe": {
      ctx.fillStyle = "#5a5d6d";
      ctx.fillRect(x - 2, y - 96, 4, 96);
      ctx.fillRect(x - 12, y - 98, 24, 4);
      ctx.fillStyle = "rgba(170, 220, 255, 0.12)";
      ctx.beginPath();
      ctx.moveTo(x - 10, y - 94);
      ctx.lineTo(x + 10, y - 94);
      ctx.lineTo(x + 54, y);
      ctx.lineTo(x - 54, y);
      ctx.fill();
      ctx.fillStyle = "#cfe8ff";
      ctx.fillRect(x - 10, y - 95, 20, 3);
      return true;
    }
    case "rakete": {
      ctx.fillStyle = "#4b4f63";
      ctx.fillRect(x - 40, y - 150, 6, 150);
      ctx.fillRect(x - 40, y - 110, 26, 4);
      ctx.fillRect(x - 40, y - 60, 26, 4);
      const g = ctx.createLinearGradient(x - 16, 0, x + 16, 0);
      g.addColorStop(0, "#c9ccd8");
      g.addColorStop(0.5, "#ffffff");
      g.addColorStop(1, "#8d90a0");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - 14, y - 20);
      ctx.lineTo(x - 14, y - 120);
      ctx.quadraticCurveTo(x, y - 170, x + 14, y - 120);
      ctx.lineTo(x + 14, y - 20);
      ctx.fill();
      ctx.fillStyle = "#e5566f";
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x + s * 14, y - 50);
        ctx.lineTo(x + s * 28, y - 10);
        ctx.lineTo(x + s * 14, y - 20);
        ctx.fill();
      }
      ctx.fillStyle = "#7fb8ff";
      kreis(ctx, x, y - 100, 6);
      ctx.fillStyle = "#3a3c4a";
      ctx.fillRect(x - 10, y - 20, 20, 20);
      return true;
    }
    case "portal": {
      // Tor in die nächste Welt
      const f = d.farbe;
      ctx.fillStyle = "#1c1a26";
      ctx.fillRect(x - 70, y - 190, 16, 190);
      ctx.fillRect(x + 54, y - 190, 16, 190);
      ctx.fillRect(x - 80, y - 206, 160, 20);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x - 54, y - 186, 108, 186);
      ctx.clip();
      for (let i = 0; i < 8; i++) {
        const k = ((t / 1200 + i / 8) % 1);
        ctx.strokeStyle = f;
        ctx.globalAlpha = (1 - k) * 0.7;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(x, y - 93, 54 * k + 4, 93 * k + 6, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
      glanz(ctx, x, y - 93, 130, "rgba(255, 255, 255, A)", 0.12);
      ctx.font = '11px "Press Start 2P", monospace';
      ctx.textAlign = "center";
      ctx.fillStyle = f;
      ctx.fillText(d.name.toUpperCase(), x, y - 192);
      return true;
    }
  }
  return false;
}

function palmeFarbig(ctx, x, y, d, t) {
  const wind = Math.sin(t / 1100 + d.seed * 7) * 0.06;
  const kx = x + Math.sin(d.neig) * d.h;
  const ky = y - d.h;
  ctx.strokeStyle = "#8a5a32";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + (kx - x) * 0.2, y - d.h * 0.5, kx, ky);
  ctx.stroke();
  ctx.strokeStyle = "rgba(60, 30, 10, 0.45)";
  ctx.lineWidth = 2;
  for (let k = 0.1; k < 0.95; k += 0.09) {
    const px = lerpQ(x, x + (kx - x) * 0.2, kx, k);
    const py = lerpQ(y, y - d.h * 0.5, ky, k);
    ctx.beginPath();
    ctx.moveTo(px - 4, py);
    ctx.lineTo(px + 4, py - 2);
    ctx.stroke();
  }
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.52 + wind;
    const l = 50 + (i % 2) * 12;
    ctx.fillStyle = i % 2 ? "#2f8f4a" : "#3fae5a";
    ctx.beginPath();
    ctx.moveTo(kx, ky);
    ctx.quadraticCurveTo(kx + Math.cos(a) * l * 0.6, ky + Math.sin(a) * l * 0.6 - 16, kx + Math.cos(a) * l, ky + Math.sin(a) * l + 20);
    ctx.quadraticCurveTo(kx + Math.cos(a) * l * 0.5, ky + Math.sin(a) * l * 0.5 - 4, kx, ky + 3);
    ctx.fill();
  }
  ctx.fillStyle = "#6a4020";
  kreis(ctx, kx - 4, ky + 5, 4.5);
  kreis(ctx, kx + 4, ky + 6, 4.5);
}
const lerpQ = (a, b, c, k) => (1 - k) * (1 - k) * a + 2 * (1 - k) * k * b + k * k * c;

// ---------------------------------------------------------------------------
// Hindernisse
// ---------------------------------------------------------------------------
export function zeichneKleinWelt(ctx, o, t) {
  const { x, y, w, h } = o;
  if (o.stil === "sandburg") {
    ctx.fillStyle = "#e8c48a";
    ctx.fillRect(x, y - h * 0.55, w, h * 0.55);
    ctx.fillRect(x + 4, y - h, 10, h * 0.45);
    ctx.fillRect(x + w - 14, y - h, 10, h * 0.45);
    ctx.fillRect(x + w / 2 - 6, y - h * 0.85, 12, h * 0.3);
    ctx.fillStyle = "#c9a06a";
    for (const bx of [x + 4, x + w - 14]) for (let i = 0; i < 3; i++) ctx.fillRect(bx + i * 4, y - h - 3, 2, 3);
    ctx.fillStyle = "#8a6a3e";
    ctx.beginPath();
    ctx.arc(x + w / 2, y, 6, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = "#e5566f";
    ctx.fillRect(x + w / 2 - 0.5, y - h * 0.85 - 12, 1.5, 12);
    ctx.fillRect(x + w / 2 + 1, y - h * 0.85 - 12, 7, 4);
  } else if (o.stil === "ball") {
    const by = y - h / 2 - Math.abs(Math.sin(t / 260)) * 4;
    const farben = ["#e5566f", "#ffffff", "#7fb8ff", "#ffffff", "#f5d97a", "#ffffff"];
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = farben[i];
      ctx.beginPath();
      ctx.moveTo(x + w / 2, by);
      ctx.arc(x + w / 2, by, h / 2, (i * Math.PI) / 3 + t / 500, ((i + 1) * Math.PI) / 3 + t / 500);
      ctx.fill();
    }
  } else if (o.stil === "stein" || o.stil === "lavastein" || o.stil === "fels") {
    const farbe = o.stil === "stein" ? ["#8a8f86", "#5a5f58"] : o.stil === "lavastein" ? ["#4a2a28", "#1e0c0c"] : ["#a0a2ac", "#5d5f6a"];
    const g = ctx.createLinearGradient(x, y - h, x + w, y);
    g.addColorStop(0, farbe[0]);
    g.addColorStop(1, farbe[1]);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 3, y - h * 0.6);
    ctx.lineTo(x + w * 0.35, y - h);
    ctx.lineTo(x + w * 0.75, y - h * 0.88);
    ctx.lineTo(x + w, y - h * 0.4);
    ctx.lineTo(x + w, y);
    ctx.fill();
    if (o.stil === "stein") {
      ctx.fillStyle = "#5fb64a";
      ctx.fillRect(x + w * 0.3, y - h, w * 0.4, 3);
    } else if (o.stil === "lavastein") {
      ctx.strokeStyle = `rgba(255, 120, 40, ${0.6 + 0.3 * Math.sin(t / 300)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.3, y - h * 0.9);
      ctx.lineTo(x + w * 0.45, y - h * 0.5);
      ctx.lineTo(x + w * 0.4, y - 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.beginPath();
      ctx.ellipse(x + w * 0.6, y - h * 0.5, 4, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (o.stil === "schneemann") {
    ctx.fillStyle = "#ffffff";
    kreis(ctx, x + w / 2, y - 12, 13);
    kreis(ctx, x + w / 2, y - 32, 10);
    kreis(ctx, x + w / 2, y - 47, 7);
    ctx.fillStyle = "#1c1a22";
    ctx.fillRect(x + w / 2 - 7, y - 56, 14, 3);
    ctx.fillRect(x + w / 2 - 5, y - 66, 10, 10);
    kreis(ctx, x + w / 2 - 2.5, y - 49, 1.2);
    kreis(ctx, x + w / 2 + 2.5, y - 49, 1.2);
    ctx.fillStyle = "#f0a35e";
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y - 47);
    ctx.lineTo(x + w / 2 + 9, y - 46);
    ctx.lineTo(x + w / 2, y - 45);
    ctx.fill();
    ctx.fillStyle = "#e5566f";
    ctx.fillRect(x + w / 2 - 8, y - 41, 16, 3);
    ctx.strokeStyle = "#6a4020";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + w / 2 - 9, y - 32);
    ctx.lineTo(x - 6, y - 42);
    ctx.moveTo(x + w / 2 + 9, y - 32);
    ctx.lineTo(x + w + 6, y - 40);
    ctx.stroke();
  } else if (o.stil === "gewitter") {
    const by = y - h + 6 + Math.sin(t / 500) * 2;
    ctx.fillStyle = "#5a6078";
    kreis(ctx, x + 8, by + 8, 10);
    kreis(ctx, x + w / 2, by + 2, 13);
    kreis(ctx, x + w - 8, by + 8, 10);
    ctx.fillRect(x, by + 8, w, 10);
    if (Math.sin(t / 130) > 0.6) {
      ctx.strokeStyle = "#ffe066";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + w / 2, by + 18);
      ctx.lineTo(x + w / 2 - 5, by + 26);
      ctx.lineTo(x + w / 2 + 3, by + 26);
      ctx.lineTo(x + w / 2 - 3, y);
      ctx.stroke();
    }
  } else return false;
  return true;
}

export function zeichneKisteWelt(ctx, o, t) {
  const { x, y, w, h } = o;
  if (o.stil === "eisblock") {
    const g = ctx.createLinearGradient(x, y - h, x + w, y);
    g.addColorStop(0, "rgba(220, 245, 255, 0.95)");
    g.addColorStop(1, "rgba(110, 170, 225, 0.9)");
    ctx.fillStyle = g;
    ctx.fillRect(x, y - h, w, h);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x, y - h - 3, w, 5);
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 8, y - h + 8);
    ctx.lineTo(x + 20, y - h + 20);
    ctx.moveTo(x + w - 20, y - 10);
    ctx.lineTo(x + w - 10, y - 20);
    ctx.stroke();
  } else if (o.stil === "wolke") {
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i <= 5; i++) kreis(ctx, x + (w * i) / 5, y - h + 8 + Math.sin(i * 2) * 2, 12);
    ctx.fillRect(x, y - h + 4, w, h - 4);
    ctx.fillStyle = "rgba(190, 210, 240, 0.5)";
    ctx.fillRect(x, y - 6, w, 6);
  } else return false;
  void t;
  return true;
}

// Grindbare Dinge der Welten. pfosten: [[x, yRail, yBoden], …]
export function zeichneRailWelt(ctx, o, t, pfosten) {
  const s = o.stil;
  const linie = (breite, farbe, dy = 0) => {
    ctx.strokeStyle = farbe;
    ctx.lineWidth = breite;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(o.x0, o.y0 + dy);
    ctx.lineTo(o.x1, o.y1 + dy);
    ctx.stroke();
  };
  const stuetzen = (farbe, b = 4) => {
    ctx.fillStyle = farbe;
    for (const [px, ry, fy] of pfosten) ctx.fillRect(px - b / 2, ry, b, fy - ry);
  };
  if (s === "surf") {
    // Surfbrett auf zwei Böcken
    ctx.fillStyle = "#a8794a";
    for (const px of [o.x0 + 24, o.x1 - 24]) {
      ctx.fillRect(px - 10, o.y0 + 4, 3, o.boden - o.y0 - 4);
      ctx.fillRect(px + 7, o.y0 + 4, 3, o.boden - o.y0 - 4);
    }
    const g = ctx.createLinearGradient(o.x0, 0, o.x1, 0);
    g.addColorStop(0, o.farbe || "#4fb6d8");
    g.addColorStop(0.5, "#ffffff");
    g.addColorStop(1, o.farbe || "#4fb6d8");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(o.x0, o.y0 + 2);
    ctx.quadraticCurveTo(o.x0 + 10, o.y0 - 4, o.x0 + 40, o.y0 - 3);
    ctx.lineTo(o.x1 - 30, o.y0 - 3);
    ctx.quadraticCurveTo(o.x1 + 6, o.y0 - 2, o.x1, o.y0 + 3);
    ctx.lineTo(o.x0, o.y0 + 4);
    ctx.fill();
    ctx.fillStyle = "#e5566f";
    ctx.fillRect(o.x0 + 20, o.y0 - 2, o.x1 - o.x0 - 50, 1.5);
  } else if (s === "liege") {
    ctx.strokeStyle = "#c9ccd8";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(o.x0 + 8, o.boden);
    ctx.lineTo(o.x0 + 16, o.y0);
    ctx.moveTo(o.x1 - 8, o.boden);
    ctx.lineTo(o.x1 - 16, o.y0);
    ctx.moveTo(o.x1 - 6, o.y0);
    ctx.lineTo(o.x1 + 8, o.y0 - 30);
    ctx.stroke();
    ctx.fillStyle = o.farbe || "#5fc39c";
    ctx.fillRect(o.x0, o.y0 - 3, o.x1 - o.x0, 5);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    for (let x = o.x0 + 6; x < o.x1 - 6; x += 16) ctx.fillRect(x, o.y0 - 3, 8, 5);
    ctx.save();
    ctx.translate(o.x1, o.y0);
    ctx.rotate(-1.1);
    ctx.fillStyle = o.farbe || "#5fc39c";
    ctx.fillRect(0, -3, 34, 5);
    ctx.restore();
  } else if (s === "stamm") {
    const h = o.boden - o.y0;
    const g = ctx.createLinearGradient(0, o.y0, 0, o.boden);
    g.addColorStop(0, "#9a6a3a");
    g.addColorStop(0.5, "#6a4020");
    g.addColorStop(1, "#3a2210");
    ctx.fillStyle = g;
    ctx.fillRect(o.x0, o.y0, o.x1 - o.x0, h);
    ctx.fillStyle = "#c8945a";
    ctx.beginPath();
    ctx.ellipse(o.x1, o.y0 + h / 2, 6, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8a5a2a";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(o.x1, o.y0 + h / 2, 3, h / 4, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(40, 20, 5, 0.45)";
    for (let x = o.x0 + 14; x < o.x1 - 10; x += 26) {
      ctx.beginPath();
      ctx.moveTo(x, o.y0 + 4);
      ctx.lineTo(x + 14, o.y0 + 6);
      ctx.stroke();
    }
    ctx.fillStyle = "#4caf50";
    ctx.fillRect(o.x0 + (o.x1 - o.x0) * 0.3, o.y0 - 1, 22, 3);
    ctx.fillRect(o.x0 + (o.x1 - o.x0) * 0.7, o.y0 - 1, 14, 3);
  } else if (s === "holz") {
    stuetzen("#8a5a32", 5);
    linie(7, "#b07a44");
    linie(2, "#e0b07a", -1.5);
  } else if (s === "bambus") {
    stuetzen("#5a8a3a", 4);
    linie(7, "#8fbf4a");
    ctx.fillStyle = "#4f7a2a";
    const n = Math.floor((o.x1 - o.x0) / 28);
    for (let i = 1; i < n; i++) {
      const k = i / n;
      ctx.fillRect(o.x0 + (o.x1 - o.x0) * k - 1.5, o.y0 + (o.y1 - o.y0) * k - 4, 3, 8);
    }
  } else if (s === "eisrail") {
    stuetzen("rgba(170, 215, 250, 0.8)", 5);
    ctx.shadowColor = "#9fd0ff";
    ctx.shadowBlur = 10;
    linie(7, "rgba(190, 230, 255, 0.95)");
    ctx.shadowBlur = 0;
    linie(2, "#ffffff", -1.5);
    // Eiszapfen
    ctx.fillStyle = "rgba(220, 240, 255, 0.85)";
    for (let x = o.x0 + 10; x < o.x1 - 6; x += 18) {
      const ry = o.y0 + ((o.y1 - o.y0) * (x - o.x0)) / (o.x1 - o.x0);
      ctx.beginPath();
      ctx.moveTo(x - 2.5, ry + 3);
      ctx.lineTo(x, ry + 9 + ((x * 7) % 6));
      ctx.lineTo(x + 2.5, ry + 3);
      ctx.fill();
    }
  } else if (s === "kette") {
    stuetzen("#2a1a1a", 5);
    const heiss = 0.6 + 0.3 * Math.sin(t / 300);
    ctx.shadowColor = "#ff5a1a";
    ctx.shadowBlur = 12;
    linie(6, `rgba(255, ${90 + heiss * 60}, 30, 1)`);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#ffe08a";
    ctx.lineWidth = 1.5;
    const n = Math.floor((o.x1 - o.x0) / 12);
    for (let i = 0; i < n; i++) {
      const k = (i + 0.5) / n;
      const cx = o.x0 + (o.x1 - o.x0) * k;
      const cy = o.y0 + (o.y1 - o.y0) * k;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 5, i % 2 ? 1.2 : 2.6, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (s === "gold") {
    stuetzen("#e8b84a", 5);
    ctx.shadowColor = "#ffe28a";
    ctx.shadowBlur = 10;
    linie(7, "#f5c842");
    ctx.shadowBlur = 0;
    linie(2, "#fff6c8", -1.5);
  } else if (s === "regenbogen") {
    const farben = ["#ff6b6b", "#ffb347", "#ffe066", "#7be07b", "#6ab8ff", "#b48ef0"];
    stuetzen("rgba(255,255,255,0.8)", 4);
    farben.forEach((f, i) => linie(2.2, f, -5 + i * 2));
    ctx.fillStyle = "#ffffff";
    for (const ex of [o.x0, o.x1]) {
      const ey = ex === o.x0 ? o.y0 : o.y1;
      kreis(ctx, ex, ey + 3, 8);
      kreis(ctx, ex + (ex === o.x0 ? -7 : 7), ey + 6, 6);
    }
  } else if (s === "laser") {
    // zwei Emitter, dazwischen ein flimmernder Strahl
    ctx.fillStyle = "#4b4f63";
    for (const [px, ry, fy] of pfosten.length ? [pfosten[0], pfosten[pfosten.length - 1]] : []) {
      ctx.fillRect(px - 4, ry - 4, 8, fy - ry + 4);
      ctx.fillStyle = "#7ff0ff";
      ctx.fillRect(px - 3, ry - 3, 6, 4);
      ctx.fillStyle = "#4b4f63";
    }
    ctx.shadowColor = "#5ff7ff";
    ctx.shadowBlur = 14;
    linie(4 + Math.sin(t / 40) * 0.8, "rgba(95, 247, 255, 0.85)");
    ctx.shadowBlur = 0;
    linie(1.6, "#ffffff");
  } else return false;
  return true;
}

// Bewegte Hindernisse: Krabbe, Pinguin, Rover
export function zeichneMover(ctx, o, t) {
  const x = o.x;
  const y = o.y;
  const p = o.phase;
  if (o.stil === "krabbe") {
    ctx.strokeStyle = "#c2412a";
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x + 15 + s * 6, y - 8);
        ctx.lineTo(x + 15 + s * (14 + i * 3), y - 4 + Math.sin(p + i) * 2);
        ctx.lineTo(x + 15 + s * (16 + i * 3), y);
        ctx.stroke();
      }
    }
    ctx.fillStyle = "#e5563a";
    ctx.beginPath();
    ctx.ellipse(x + 15, y - 10, 13, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(x + 15 + s * 16, y - 18 + Math.sin(p * 2) * 2, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      kreis(ctx, x + 15 + s * 4, y - 20, 3);
      ctx.fillStyle = "#1c1a22";
      kreis(ctx, x + 15 + s * 4, y - 20, 1.4);
      ctx.fillStyle = "#e5563a";
    }
  } else if (o.stil === "pinguin") {
    const w = Math.sin(p) * 0.12;
    ctx.save();
    ctx.translate(x + 14, y);
    ctx.rotate(w);
    ctx.fillStyle = "#1c1a26";
    ctx.beginPath();
    ctx.ellipse(0, -17, 12, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(2, -15, 8, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1c1a26";
    kreis(ctx, 1, -32, 9);
    ctx.fillStyle = "#ffffff";
    kreis(ctx, 4, -33, 3);
    ctx.fillStyle = "#1c1a22";
    kreis(ctx, 5, -33, 1.4);
    ctx.fillStyle = "#f0a35e";
    ctx.beginPath();
    ctx.moveTo(8, -31);
    ctx.lineTo(15, -29);
    ctx.lineTo(8, -27);
    ctx.fill();
    ctx.fillRect(-7, -2, 7, 3);
    ctx.fillRect(3, -2, 7, 3);
    ctx.restore();
  } else if (o.stil === "rover") {
    ctx.fillStyle = "#c9ccd8";
    ctx.fillRect(x, y - 22, 34, 10);
    ctx.fillStyle = "#4b4f63";
    ctx.fillRect(x + 4, y - 30, 14, 8);
    ctx.fillStyle = "#7fb8ff";
    ctx.fillRect(x + 6, y - 28, 10, 4);
    ctx.fillStyle = "#8d90a0";
    ctx.fillRect(x + 26, y - 40, 2, 18);
    ctx.fillStyle = Math.sin(t / 200) > 0 ? "#5ff7ff" : "#2a5a6a";
    kreis(ctx, x + 27, y - 41, 2.5);
    ctx.fillStyle = "#1c1a22";
    for (const rx of [x + 5, x + 17, x + 29]) {
      kreis(ctx, rx, y - 6, 5.5);
      ctx.fillStyle = "#8d90a0";
      kreis(ctx, rx, y - 6, 2);
      ctx.fillStyle = "#1c1a22";
    }
  } else return false;
  return true;
}

export function zeichnePilz(ctx, o, t, gedrueckt) {
  const { x, y, w, h } = o;
  const q = gedrueckt > 0 ? Math.sin(gedrueckt * 20) * gedrueckt * 6 : 0;
  ctx.fillStyle = "#f4ead8";
  ctx.fillRect(x + w / 2 - 9, y - h + 10, 18, h - 10);
  ctx.fillStyle = "#e5402a";
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y - h + 8 + q * 0.3, w / 2 + q, 14 - q * 0.5, 0, Math.PI, 0);
  ctx.lineTo(x + w + q, y - h + 10);
  ctx.lineTo(x - q, y - h + 10);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  for (const [dx, dy, r] of [[-12, -4, 4], [4, -9, 3.5], [14, -3, 3]]) kreis(ctx, x + w / 2 + dx, y - h + 8 + dy, r);
  glanz(ctx, x + w / 2, y - h, 30, "rgba(255, 120, 100, A)", 0.15 + 0.08 * Math.sin(t / 300));
}

export function zeichneGeysir(ctx, o, t, hoehe, warnung) {
  const cx = o.x + o.w / 2;
  ctx.fillStyle = "#2a1214";
  ctx.beginPath();
  ctx.ellipse(cx, o.y, o.w / 2 + 8, 6, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#ff7a2a";
  ctx.beginPath();
  ctx.ellipse(cx, o.y - 2, o.w / 2, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  if (warnung > 0) {
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = `rgba(255, 220, 120, ${warnung})`;
      kreis(ctx, cx - 6 + i * 6, o.y - 4 - ((t / 60 + i * 5) % 8), 2);
    }
  }
  if (hoehe > 4) {
    glanz(ctx, cx, o.y - hoehe / 2, hoehe, "rgba(255, 120, 40, A)", 0.4);
    const g = ctx.createLinearGradient(0, o.y - hoehe, 0, o.y);
    g.addColorStop(0, "#ffe08a");
    g.addColorStop(0.4, "#ff8a2a");
    g.addColorStop(1, "#c0300a");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx - o.w / 2, o.y);
    for (let k = 0; k <= 1; k += 0.1) ctx.lineTo(cx - o.w / 2 + Math.sin(t / 50 + k * 8) * 2 + k * 3, o.y - hoehe * k);
    ctx.quadraticCurveTo(cx, o.y - hoehe - 14, cx + o.w / 2 - 3, o.y - hoehe);
    for (let k = 1; k >= 0; k -= 0.1) ctx.lineTo(cx + o.w / 2 + Math.sin(t / 45 + k * 7) * 2 - k * 3, o.y - hoehe * k);
    ctx.fill();
  }
}

// Farben des Rings je Welt: [Kern, Mitte, Rand, Glanz]
export const RING_FARBEN = {
  himmel: ["rgba(255, 255, 230, 0.95)", "rgba(255, 225, 120, 0.85)", "rgba(255, 200, 80, 0)", "rgba(255, 230, 150, 0.14)", "#e8b84a"],
  weltall: ["rgba(230, 255, 255, 0.95)", "rgba(95, 247, 255, 0.85)", "rgba(120, 80, 255, 0)", "rgba(95, 247, 255, 0.14)", "#4b4f63"],
  eis: ["rgba(240, 255, 250, 0.95)", "rgba(110, 255, 190, 0.85)", "rgba(80, 180, 255, 0)", "rgba(110, 255, 190, 0.12)", "#8fbde4"],
};

// Symbol einer Welt (für Karte und Fortschrittsleiste)
export function zeichneWeltSymbol(ctx, id, x, y, r, t = 0) {
  ctx.save();
  ctx.translate(x, y);
  const s = r / 20;
  ctx.scale(s, s);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (id === "stadt") {
    ctx.fillStyle = "#29224a";
    ctx.fillRect(-16, -6, 10, 18);
    ctx.fillRect(-4, -14, 10, 26);
    ctx.fillRect(8, -2, 9, 14);
    ctx.fillStyle = "#f5d97a";
    for (const [fx, fy] of [[-13, -2], [-13, 4], [-1, -10], [-1, -4], [2, 2], [11, 2]]) ctx.fillRect(fx, fy, 3, 3);
    ctx.fillStyle = "#f5e6b8";
    kreis(ctx, 11, -12, 4);
  } else if (id === "strand") {
    ctx.fillStyle = "#ffcf6a";
    kreis(ctx, 6, -4, 9);
    ctx.fillStyle = "#4fb6d8";
    ctx.fillRect(-18, 4, 36, 10);
    ctx.strokeStyle = "#8a5a32";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-8, 12);
    ctx.quadraticCurveTo(-10, -2, -4, -12);
    ctx.stroke();
    ctx.fillStyle = "#3fae5a";
    for (const a of [-2.6, -1.9, -1.2, -0.5]) {
      ctx.beginPath();
      ctx.ellipse(-4 + Math.cos(a) * 6, -12 + Math.sin(a) * 4, 8, 3, a, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === "dschungel") {
    ctx.fillStyle = "#3fae5a";
    ctx.beginPath();
    ctx.moveTo(0, 16);
    ctx.quadraticCurveTo(-20, 0, 0, -16);
    ctx.quadraticCurveTo(20, 0, 0, 16);
    ctx.fill();
    ctx.strokeStyle = "#1f6b3c";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 16);
    ctx.lineTo(0, -12);
    for (let i = -8; i < 12; i += 6) {
      ctx.moveTo(0, i);
      ctx.lineTo(-7, i - 5);
      ctx.moveTo(0, i);
      ctx.lineTo(7, i - 5);
    }
    ctx.stroke();
  } else if (id === "eis") {
    ctx.strokeStyle = "#dff2ff";
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      ctx.rotate(Math.PI / 3);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -16);
      ctx.moveTo(0, -9);
      ctx.lineTo(-5, -13);
      ctx.moveTo(0, -9);
      ctx.lineTo(5, -13);
      ctx.stroke();
    }
  } else if (id === "hoelle") {
    const f = Math.sin(t / 120) * 1.5;
    ctx.fillStyle = "#ff5a1a";
    ctx.beginPath();
    ctx.moveTo(-12, 14);
    ctx.quadraticCurveTo(-18, -2, -4 + f, -18);
    ctx.quadraticCurveTo(-2, -6, 4, -8);
    ctx.quadraticCurveTo(6, -14, 8 - f, -16);
    ctx.quadraticCurveTo(18, 0, 12, 14);
    ctx.fill();
    ctx.fillStyle = "#ffe08a";
    ctx.beginPath();
    ctx.moveTo(-6, 14);
    ctx.quadraticCurveTo(-9, 2, 0, -6);
    ctx.quadraticCurveTo(9, 2, 6, 14);
    ctx.fill();
  } else if (id === "himmel") {
    ctx.strokeStyle = "#f5c842";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, -12, 11, 4, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    kreis(ctx, -9, 6, 8);
    kreis(ctx, 2, 2, 10);
    kreis(ctx, 11, 7, 7);
    ctx.fillRect(-12, 6, 26, 8);
  } else if (id === "weltall") {
    ctx.fillStyle = "#c8d0ff";
    kreis(ctx, 0, 0, 11);
    ctx.fillStyle = "rgba(80, 90, 140, 0.5)";
    kreis(ctx, -4, -3, 3);
    kreis(ctx, 4, 4, 2.2);
    ctx.strokeStyle = "#b48ef0";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 19, 6, -0.4, 0.15, Math.PI * 2 - 0.15 + Math.PI * 0);
    ctx.stroke();
  }
  ctx.restore();
}
