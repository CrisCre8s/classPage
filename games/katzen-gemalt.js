// Gemalte Katzen im Stil handgezeichneter Zeichentrickfilme: natürliche, sitzende Katzen,
// Aquarell-Schattierung mit Papierstruktur, feine warme Linien. Ruhige Bewegungen: Wind im
// Fell und in den Schnurrhaaren, langsames Blinzeln, Ohren, Schwanzspitze, Blick wandert.
// Über das Brett wehen ab und zu Blätter. Alles eigene Zeichnung (100 × 100-Feld).

const LINIE = "#4a3426";

// Fell je Seite/Figur: basis, schatten (Aquarell-Lasur), brust, streifen, augen
const FELL = {
  w: {
    K: { basis: "#f3e6d2", schatten: "#cdb79a", brust: "#fffaf1", streifen: null, auge: "#9cc25a" },
    Q: { basis: "#f0b77a", schatten: "#c98a4e", brust: "#fff4e4", streifen: "#c47a3c", auge: "#8dbb4f" },
    R: { basis: "#d8d2c8", schatten: "#aaa297", brust: "#f7f3ec", streifen: "#9c9488", auge: "#d9a93c" },
    B: { basis: "#f6efe4", schatten: "#d2c3ad", brust: "#fffdf8", flecken: "#b49a7c", auge: "#7fb0c8" },
    N: { basis: "#e9c28e", schatten: "#c39a62", brust: "#fbecd4", streifen: "#a87444", auge: "#a5c45a" },
    P: { basis: "#f4c88f", schatten: "#d29c5c", brust: "#fff5e6", streifen: "#c98a48", auge: "#9cc25a" },
  },
  b: {
    K: { basis: "#3b3530", schatten: "#211d1a", brust: "#57504a", streifen: null, auge: "#e0b33e" },
    Q: { basis: "#4a3a30", schatten: "#2a201b", brust: "#6b5546", streifen: "#2b1f18", auge: "#d9a43a" },
    R: { basis: "#55524f", schatten: "#33302e", brust: "#77736e", streifen: "#2f2c2a", auge: "#cfae48" },
    B: { basis: "#2f2b29", schatten: "#1b1817", brust: "#e9e2d6", streifen: null, auge: "#b8c860" },
    N: { basis: "#5e4a38", schatten: "#3a2c20", brust: "#7d6650", streifen: "#2e2218", auge: "#d6b04a" },
    P: { basis: "#464039", schatten: "#29241f", brust: "#625a51", streifen: "#2a2520", auge: "#d9b445" },
  },
};
const GROESSE = { K: 1, Q: 0.97, R: 0.93, B: 0.95, N: 0.94, P: 0.78 };

// ---------- Papierstruktur (einmal erzeugt) ----------
let papier = null;
function papierMuster(ctx) {
  if (!papier) {
    const c = document.createElement("canvas");
    c.width = c.height = 96;
    const g = c.getContext("2d");
    let r = 1234567;
    const rnd = () => ((r = (r * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = rnd() < 0.5 ? `rgba(60, 40, 20, ${0.05 + rnd() * 0.12})` : `rgba(255, 250, 235, ${0.05 + rnd() * 0.15})`;
      g.fillRect(rnd() * 96, rnd() * 96, 0.5 + rnd() * 0.9, 0.5 + rnd() * 0.9);
    }
    papier = c;
  }
  return ctx.createPattern(papier, "repeat");
}

// ---------- Werkzeuge ----------
function linie(ctx, farbe, breite, fn, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = farbe;
  ctx.lineWidth = breite;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  fn();
  ctx.stroke();
  ctx.restore();
}
function ell(ctx, x, y, rx, ry, farbe, rot = 0, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.fillStyle = farbe;
  ctx.fill();
  ctx.restore();
}
// gezeichnete Kontur: einmal kräftig, einmal leicht versetzt und blass (wirkt von Hand)
function kontur(ctx, pfad, breite = 1.3) {
  ctx.save();
  ctx.strokeStyle = LINIE;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = breite;
  pfad();
  ctx.stroke();
  ctx.globalAlpha = 0.22;
  ctx.translate(0.5, 0.4);
  pfad();
  ctx.stroke();
  ctx.restore();
}
// Aquarell: Grundfarbe, darüber Lasuren, Papierkorn, alles auf die Form beschränkt
function lasur(ctx, pfad, F, flecken) {
  ctx.save();
  pfad();
  ctx.fillStyle = F.basis;
  ctx.fill();
  pfad();
  ctx.clip();
  for (const [x, y, rx, ry, farbe, a] of flecken) ell(ctx, x, y, rx, ry, farbe, 0, a);
  ctx.fillStyle = papierMuster(ctx);
  ctx.fillRect(0, 0, 100, 100);
  ctx.restore();
}

// ---------- Formen ----------
const koerperPfad = (ctx) => () => {
  ctx.beginPath();
  ctx.moveTo(50, 54);
  ctx.bezierCurveTo(66, 54, 76, 66, 76, 79);
  ctx.bezierCurveTo(76, 91, 68, 95, 50, 95);
  ctx.bezierCurveTo(32, 95, 24, 91, 24, 79);
  ctx.bezierCurveTo(24, 66, 34, 54, 50, 54);
  ctx.closePath();
};
const kopfPfad = (ctx, wind) => () => {
  // runder Kopf mit Wangenfell, das im Wind leicht weht
  const w = wind * 1.6;
  ctx.beginPath();
  ctx.moveTo(50, 23);
  ctx.bezierCurveTo(62, 23, 69, 30, 69, 39);
  ctx.lineTo(73 + w, 44);
  ctx.lineTo(68.5, 45.5);
  ctx.lineTo(71 + w, 49.5);
  ctx.bezierCurveTo(64, 56, 57, 57, 50, 57);
  ctx.bezierCurveTo(43, 57, 36, 56, 29 + w, 49.5);
  ctx.lineTo(31.5, 45.5);
  ctx.lineTo(27 + w, 44);
  ctx.lineTo(31, 39);
  ctx.bezierCurveTo(31, 30, 38, 23, 50, 23);
  ctx.closePath();
};
function ohrPfad(ctx, s, zucken) {
  return () => {
    ctx.save();
    ctx.translate(50 + s * 12, 28);
    ctx.rotate(s * (0.12 + zucken));
    ctx.beginPath();
    ctx.moveTo(-6 * s, 3);
    ctx.quadraticCurveTo(-3 * s, -8, 3 * s, -15);
    ctx.quadraticCurveTo(7 * s, -5, 8 * s, 4);
    ctx.closePath();
    ctx.restore();
  };
}

// ---------- Kopfschmuck (gemalt) ----------
function krone(ctx) {
  const pfad = () => {
    ctx.beginPath();
    ctx.moveTo(38, 27);
    ctx.lineTo(37, 15);
    ctx.lineTo(43, 20);
    ctx.lineTo(50, 10);
    ctx.lineTo(57, 20);
    ctx.lineTo(63, 15);
    ctx.lineTo(62, 27);
    ctx.quadraticCurveTo(50, 24, 38, 27);
    ctx.closePath();
  };
  lasur(ctx, pfad, { basis: "#e9c35c" }, [[44, 16, 10, 6, "#fff1b0", 0.6], [58, 25, 9, 4, "#b98b2a", 0.45]]);
  kontur(ctx, pfad, 1.1);
  ell(ctx, 50, 22.5, 2, 2, "#c8443c");
  ell(ctx, 43, 23.5, 1.4, 1.4, "#5b86b8");
  ell(ctx, 57, 23.5, 1.4, 1.4, "#5b86b8");
}
function blumenkranz(ctx, wind) {
  // kleine Wiesenblumen rund um den Kopf
  const blumen = [[34, 31, "#f4c6d0"], [39, 26, "#fffaf0"], [45, 23.5, "#f2d36b"], [50, 22.8, "#f4c6d0"], [55, 23.5, "#fffaf0"], [61, 26, "#f2d36b"], [66, 31, "#f4c6d0"]];
  linie(ctx, "#6f8f4a", 1.6, () => {
    ctx.moveTo(33, 32);
    ctx.quadraticCurveTo(50, 17, 67, 32);
  });
  blumen.forEach(([x, y, c], i) => {
    const dx = wind * (i % 2 ? 0.6 : 0.3);
    for (let k = 0; k < 5; k++) {
      const w = (k / 5) * Math.PI * 2;
      ell(ctx, x + dx + Math.cos(w) * 1.9, y + Math.sin(w) * 1.9, 1.6, 1.6, c, 0, 0.95);
    }
    ell(ctx, x + dx, y, 1, 1, "#e2a23a");
  });
  [[42, 25.5], [58, 25.5]].forEach(([x, y]) => ell(ctx, x, y, 2.4, 1, "#7fa055", 0.6));
}
function spitzhut(ctx, wind) {
  ctx.save();
  ctx.translate(50, 26);
  ctx.rotate(wind * 0.04);
  const kegel = () => {
    ctx.beginPath();
    ctx.moveTo(-13, 0);
    ctx.quadraticCurveTo(-4, -12, 5 + wind * 0.8, -22);
    ctx.quadraticCurveTo(7, -10, 13, 0);
    ctx.closePath();
  };
  const krempe = () => {
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 4, 0, 0, Math.PI * 2);
  };
  lasur(ctx, kegel, { basis: "#6d84a8" }, [[-6, -8, 6, 12, "#9db0cc", 0.55], [7, -4, 5, 8, "#46597a", 0.5]]);
  kontur(ctx, kegel, 1.1);
  lasur(ctx, krempe, { basis: "#5f7598" }, [[-6, -1, 8, 2, "#94a8c6", 0.5]]);
  kontur(ctx, krempe, 1.1);
  // aufgenähter Flicken
  ctx.save();
  ctx.translate(-2, -10);
  ctx.rotate(0.2);
  ctx.fillStyle = "#c8a86a";
  ctx.fillRect(-3, -2.5, 6, 5);
  linie(ctx, LINIE, 0.6, () => ctx.rect(-3, -2.5, 6, 5), 0.6);
  ctx.restore();
  ctx.restore();
}
function helm(ctx, wind) {
  const kuppel = () => {
    ctx.beginPath();
    ctx.moveTo(33, 33);
    ctx.bezierCurveTo(33, 14, 67, 14, 67, 33);
    ctx.quadraticCurveTo(50, 29, 33, 33);
    ctx.closePath();
  };
  // Feder, weht im Wind
  ctx.save();
  ctx.translate(52, 17);
  ctx.rotate(-0.3 + wind * 0.08);
  const feder = () => {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(4, -9, 14, -12, 20, -8);
    ctx.bezierCurveTo(13, -6, 6, -2, 2, 2);
    ctx.closePath();
  };
  lasur(ctx, feder, { basis: "#c9554a" }, [[10, -8, 6, 3, "#e98b78", 0.6]]);
  kontur(ctx, feder, 1);
  ctx.restore();
  lasur(ctx, kuppel, { basis: "#b8bcc2" }, [[42, 20, 8, 6, "#eef0f2", 0.7], [60, 29, 9, 5, "#7d838c", 0.5]]);
  kontur(ctx, kuppel, 1.1);
  linie(ctx, LINIE, 0.8, () => {
    ctx.moveTo(50, 18);
    ctx.lineTo(50, 30);
  }, 0.6);
}
function blatt(ctx, wind) {
  // ein kleines Blatt ist dem Kätzchen auf den Kopf gefallen
  ctx.save();
  ctx.translate(55, 23);
  ctx.rotate(-0.5 + wind * 0.1);
  const pfad = () => {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(6, -6, 13, -1);
    ctx.quadraticCurveTo(6, 4, 0, 0);
    ctx.closePath();
  };
  lasur(ctx, pfad, { basis: "#88a957" }, [[7, -2, 5, 2, "#b5cf7a", 0.6]]);
  kontur(ctx, pfad, 0.9);
  linie(ctx, "#5d7a35", 0.6, () => {
    ctx.moveTo(1, 0);
    ctx.lineTo(11, -1);
  });
  ctx.restore();
}
function kartonVorne(ctx) {
  const front = () => {
    ctx.beginPath();
    ctx.moveTo(22, 70);
    ctx.lineTo(78, 70);
    ctx.lineTo(77, 96);
    ctx.lineTo(23, 96);
    ctx.closePath();
  };
  const klappeL = () => {
    ctx.beginPath();
    ctx.moveTo(22, 70);
    ctx.lineTo(10, 62);
    ctx.lineTo(16, 56);
    ctx.lineTo(30, 66);
    ctx.closePath();
  };
  const klappeR = () => {
    ctx.beginPath();
    ctx.moveTo(78, 70);
    ctx.lineTo(91, 63);
    ctx.lineTo(88, 56);
    ctx.lineTo(72, 66);
    ctx.closePath();
  };
  [klappeL, klappeR].forEach((k) => {
    lasur(ctx, k, { basis: "#d2a46c" }, [[20, 60, 8, 4, "#e9c490", 0.5], [84, 62, 8, 4, "#a8783f", 0.5]]);
    kontur(ctx, k, 1.1);
  });
  lasur(ctx, front, { basis: "#d8ab74" }, [[35, 76, 16, 6, "#ecc994", 0.55], [66, 90, 16, 7, "#a9773e", 0.5]]);
  kontur(ctx, front, 1.2);
  linie(ctx, "#a87a44", 2.2, () => {
    ctx.moveTo(42, 80);
    ctx.lineTo(58, 80);
  }, 0.7);
}

// ---------- Katze ----------
export function zeichneGemalteKatze(ctx, p, x, y, Z, t, seed) {
  const weiss = p === p.toUpperCase();
  const typ = p.toUpperCase();
  const F = FELL[weiss ? "w" : "b"][typ];
  const gr = GROESSE[typ];

  // ruhige Bewegungen
  const atem = 1 + 0.018 * Math.sin(t / 900 + seed * 6.28);
  const wind = Math.sin(t / 650 + seed) * (0.6 + 0.4 * Math.sin(t / 2300)); // Böen kommen und gehen
  const lid = (() => {
    const ph = (t + seed * 6000) % 5200;
    return ph < 340 ? Math.sin((ph / 340) * Math.PI) : 0; // langsames Blinzeln
  })();
  const blick = Math.sin(t / 2600 + seed * 4) * 1.2;
  const zucken = (t + seed * 7000) % 6400 < 200 ? 0.22 : 0;
  const spitze = Math.sin(t / 800 + seed * 3) * 0.5;
  const neigen = Math.sin(t / 2100 + seed * 2) * 0.04;
  // ab und zu zufrieden die Augen zukneifen (wie beim Schnurren)
  const froh = (t + seed * 8300) % 8800 < 1100;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(Z / 100, Z / 100);
  // weicher, gemalter Bodenschatten
  ell(ctx, 50, 94, 28 * gr, 5, "#3a2a1c", 0, 0.22);
  ctx.translate(50, 96);
  ctx.scale(gr, gr * atem);
  ctx.translate(-50, -96);

  // Körper
  const koerper = koerperPfad(ctx);
  {
    lasur(ctx, koerper, F, [
      [36, 62, 12, 16, F.schatten, 0.55],
      [68, 80, 12, 16, F.schatten, 0.65],
      [50, 52, 14, 6, F.schatten, 0.45],
      [50, 75, 10, 16, F.brust, 0.85],
      [40, 58, 6, 8, "#ffffff", 0.12],
    ]);
    if (F.streifen) {
      [[30, 66, 36, 70], [70, 66, 64, 70], [28, 76, 35, 79], [72, 76, 65, 79]].forEach(([a, b, c, d]) =>
        linie(ctx, F.streifen, 2.4, () => {
          ctx.moveTo(a, b);
          ctx.quadraticCurveTo((a + c) / 2, b - 2, c, d);
        }, 0.55),
      );
    }
    if (F.flecken) ell(ctx, 66, 68, 7, 9, F.flecken, 0.3, 0.6);
    kontur(ctx, koerper);
  }
  if (typ !== "R") {
    // Vorderbeine und Pfoten
    linie(ctx, LINIE, 1, () => {
      ctx.moveTo(44, 72);
      ctx.quadraticCurveTo(43, 84, 43.5, 91);
      ctx.moveTo(56, 72);
      ctx.quadraticCurveTo(57, 84, 56.5, 91);
    }, 0.6);
    [43, 57].forEach((px) => {
      ell(ctx, px, 92.5, 5, 3, F.brust, 0, 1);
      kontur(ctx, () => {
        ctx.beginPath();
        ctx.ellipse(px, 92.5, 5, 3, 0, 0, Math.PI * 2);
      }, 1);
    });
    // Schwanz liegt vorne um die Pfoten, nur die Spitze bewegt sich
    const schwanz = () => {
      ctx.moveTo(72, 88);
      ctx.bezierCurveTo(70, 97, 46, 98, 33, 94);
      ctx.quadraticCurveTo(26 + spitze * 2, 92 - spitze * 3, 24 + spitze * 4, 87 - spitze * 3);
    };
    linie(ctx, LINIE, 7.6, schwanz, 0.85);
    linie(ctx, F.basis, 5.6, schwanz);
    linie(ctx, F.schatten, 2, () => {
      ctx.moveTo(70, 91);
      ctx.bezierCurveTo(66, 96, 48, 97, 36, 95);
    }, 0.6);
  }

  // Kopf: größer als bei echten Katzen (wirkt jung und lieb), neigt sich sanft
  ctx.save();
  ctx.translate(50, 60);
  ctx.rotate(neigen * 1.6);
  ctx.scale(1.24, 1.24);
  ctx.translate(-50, -54);
  const ohrL = ohrPfad(ctx, -1, zucken);
  const ohrR = ohrPfad(ctx, 1, 0);
  [ohrL, ohrR].forEach((o, i) => {
    lasur(ctx, o, F, [[i ? 64 : 36, 18, 5, 8, F.schatten, 0.5]]);
    kontur(ctx, o, 1.1);
  });
  // Innenohr mit Haarbüscheln
  [-1, 1].forEach((s) => {
    ctx.save();
    ctx.translate(50 + s * 12, 28);
    ctx.rotate(s * (0.12 + (s < 0 ? zucken : 0)));
    ctx.beginPath();
    ctx.moveTo(-3 * s, 2);
    ctx.quadraticCurveTo(-1 * s, -6, 3 * s, -10);
    ctx.quadraticCurveTo(5 * s, -3, 5 * s, 2);
    ctx.closePath();
    ctx.fillStyle = "rgba(232, 160, 160, 0.75)";
    ctx.fill();
    linie(ctx, weiss ? "#fffaf0" : "#9a9088", 0.7, () => {
      ctx.moveTo(0, 1);
      ctx.lineTo(1.5 * s + wind * 0.3, -5);
      ctx.moveTo(2 * s, 1);
      ctx.lineTo(3 * s + wind * 0.3, -4);
    }, 0.8);
    ctx.restore();
  });
  const kopf = kopfPfad(ctx, wind);
  lasur(ctx, kopf, F, [
    [50, 27, 14, 6, F.schatten, 0.5],
    [64, 46, 8, 8, F.schatten, 0.5],
    [50, 50, 11, 6, F.brust, 0.9],
    [40, 33, 6, 4, "#ffffff", 0.15],
  ]);
  if (F.streifen) {
    [[46, 25, 47, 31], [50, 24.5, 50, 31], [54, 25, 53, 31]].forEach(([a, b, c, d]) =>
      linie(ctx, F.streifen, 1.8, () => {
        ctx.moveTo(a, b);
        ctx.lineTo(c, d);
      }, 0.6),
    );
  }
  kontur(ctx, kopf);

  // Augen: groß und rund, dunkle Pupille mit Farbrand, zwei Lichtpunkte; Lid schließt sich langsam
  [-1, 1].forEach((s) => {
    const ax = 50 + s * 7.6;
    const ay = 40.5;
    const auge = () => {
      ctx.beginPath();
      ctx.ellipse(ax, ay, 4.6, 5, 0, 0, Math.PI * 2);
    };
    ell(ctx, 50 + s * 12.5, 46.5, 3.6, 2, "#f2a0a4", 0, 0.45); // rosige Bäckchen
    if (froh) {
      // zufrieden zugekniffen (wie beim Schnurren)
      linie(ctx, LINIE, 1.5, () => {
        ctx.moveTo(ax - 4.2, ay + 1);
        ctx.quadraticCurveTo(ax, ay - 3.4, ax + 4.2, ay + 1);
      });
      return;
    }
    ctx.save();
    auge();
    ctx.clip();
    ell(ctx, ax, ay, 5, 5.4, F.auge);
    ell(ctx, ax + blick * 0.6, ay + 0.4, 3.5, 4, "#1d1410");
    ell(ctx, ax + blick * 0.6, ay - 3.4, 4.6, 1.6, "rgba(0,0,0,0.25)"); // Schatten vom Lid
    ell(ctx, ax + blick * 0.6 - 1.5, ay - 1.6, 1.6, 1.8, "#ffffff", 0, 0.97);
    ell(ctx, ax + blick * 0.6 + 1.6, ay + 1.8, 0.7, 0.7, "#ffffff", 0, 0.85);
    if (lid > 0) {
      ctx.fillStyle = F.basis;
      ctx.fillRect(ax - 5, ay - 5.4, 10, 10.8 * lid);
    }
    ctx.restore();
    kontur(ctx, auge, 1.1);
    // kleine Wimpernlinie oben
    linie(ctx, LINIE, 1.6, () => ctx.ellipse(ax, ay, 4.8, 5.2, 0, Math.PI * 1.15, Math.PI * 1.85), 0.9);
  });
  // Nase und Mund
  ctx.beginPath();
  ctx.moveTo(48.4, 46.2);
  ctx.lineTo(51.6, 46.2);
  ctx.lineTo(50, 48);
  ctx.closePath();
  ctx.fillStyle = "#d98a86";
  ctx.fill();
  linie(ctx, LINIE, 0.9, () => {
    ctx.moveTo(50, 48);
    ctx.lineTo(50, 49.4);
    ctx.quadraticCurveTo(48.6, 51, 47, 50.2);
    ctx.moveTo(50, 49.4);
    ctx.quadraticCurveTo(51.4, 51, 53, 50.2);
  }, 0.85);
  // Schnurrhaare, wehen im Wind
  linie(ctx, weiss ? "rgba(255,255,255,0.9)" : "rgba(230, 222, 210, 0.7)", 0.7, () => {
    [-1, 1].forEach((s) => {
      for (let i = 0; i < 3; i++) {
        ctx.moveTo(50 + s * 6, 47.5 + i * 1.3);
        ctx.quadraticCurveTo(50 + s * 14, 46 + i * 2 + wind * 0.6, 50 + s * 22 + wind * 1.2, 45 + i * 3.4 + wind);
      }
    });
  });

  if (typ === "K") krone(ctx);
  else if (typ === "Q") blumenkranz(ctx, wind);
  else if (typ === "B") spitzhut(ctx, wind);
  else if (typ === "N") helm(ctx, wind);
  else if (typ === "P") blatt(ctx, wind);
  ctx.restore();

  if (typ === "R") kartonVorne(ctx);
  ctx.restore();
}

// ---------- Blätter, die über das Brett wehen ----------
export function zeichneWind(ctx, t, N) {
  const farben = ["#8fae5a", "#c9b45a", "#e2a26a", "#f4c6d0", "#a8c46e"];
  for (let i = 0; i < 5; i++) {
    const dauer = 11000 + i * 1700;
    const k = ((t + i * 3700) % dauer) / dauer;
    if (k > 0.55) continue; // nicht ständig, nur ab und zu
    const p = k / 0.55;
    const x = -30 + p * (N + 60);
    const y = (0.15 + i * 0.17) * N + Math.sin(p * 7 + i) * 26 + p * 30;
    ctx.save();
    ctx.globalAlpha = Math.min(1, Math.sin(p * Math.PI) * 1.6) * 0.9;
    ctx.translate(x, y);
    ctx.rotate(p * 9 + i);
    ctx.scale(1.9, 1.9 * (0.55 + 0.45 * Math.cos(p * 11 + i))); // dreht sich im Flug
    ctx.beginPath();
    if (i === 3) {
      ctx.ellipse(0, 0, 5, 3.4, 0, 0, Math.PI * 2); // Blütenblatt
    } else {
      ctx.moveTo(-8, 0);
      ctx.quadraticCurveTo(0, -6, 8, 0);
      ctx.quadraticCurveTo(0, 6, -8, 0);
    }
    ctx.fillStyle = farben[i];
    ctx.fill();
    ctx.strokeStyle = "rgba(74, 52, 38, 0.55)";
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.restore();
  }
}

// gemaltes Brett: Papierkorn und weiche Lasuren über den Feldern
export function zeichneBrettStruktur(ctx, N) {
  ctx.save();
  ctx.fillStyle = papierMuster(ctx);
  ctx.globalAlpha = 0.45;
  ctx.fillRect(0, 0, N, N);
  ctx.globalAlpha = 0.08;
  const g = ctx.createRadialGradient(N * 0.3, N * 0.25, N * 0.05, N * 0.5, N * 0.5, N * 0.75);
  g.addColorStop(0, "#fff6d8");
  g.addColorStop(1, "#5a4428");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, N, N);
  ctx.restore();
}
