// Schlagzeug: Trommeln und Becken mit der Tastatur, der Maus oder dem Finger spielen.
// Frei spielen (mit Metronom) oder Rhythmus-Challenge: Noten laufen auf eine Linie zu.
// Alle Klänge werden im Browser erzeugt (Web Audio), es gibt keine Sounddateien.

export const HILFE = "Q Crash · A Hi-Hat · W Hi-Hat offen · S Snare · D Tom 1 · F Tom 2 · G Standtom · R Ride · Leertaste oder B Bass · M Metronom · Maus/Finger: Trommel antippen · Challenge: Enter startet";

const W = 960;
const H = 540;
const BODEN = 522;
const LINIE_X = 168; // Trefferlinie im Notenband
const NOTEN_TEMPO = 250; // px pro Sekunde im Notenband

// Spuren im Notenband (oben nach unten), Farbe und Taste
const SPUREN = [
  { pad: "crash", name: "Crash", taste: "Q", farbe: "#f5d97a" },
  { pad: "ride", name: "Ride", taste: "R", farbe: "#ffe9b0" },
  { pad: "hihat", name: "Hi-Hat", taste: "A/W", farbe: "#9fd0ff" },
  { pad: "snare", name: "Snare", taste: "S", farbe: "#f4f1f8" },
  { pad: "tom1", name: "Tom 1", taste: "D", farbe: "#e5566f" },
  { pad: "tom2", name: "Tom 2", taste: "F", farbe: "#f0a35e" },
  { pad: "floor", name: "Standtom", taste: "G", farbe: "#b48ef0" },
  { pad: "kick", name: "Bass", taste: "LEER", farbe: "#5fc39c" },
];
const SPUR_VON = { hihatOffen: "hihat" };
const spurIndex = (pad) => SPUREN.findIndex((s) => s.pad === (SPUR_VON[pad] || pad));

const TASTEN = { q: "crash", a: "hihat", w: "hihatOffen", s: "snare", d: "tom1", f: "tom2", g: "floor", r: "ride", " ": "kick", b: "kick" };

// Takte für die Challenge: 16 Schritte (Sechzehntel). x = Schlag, o = Hi-Hat offen
const T = (o) => o;
const TAKTE = {
  leicht: {
    bpm: 80,
    A: T({ hihat: "x...x...x...x...", snare: "....x.......x...", kick: "x.......x......." }),
    B: T({ hihat: "x...x...x...x...", snare: "....x.......x...", kick: "x.......x.x....." }),
    F: T({ hihat: "x...x...", snare: "....x...x...x...", tom1: "..........x.....", floor: "..............x." , kick: "x......." }),
    lied: ["A", "A", "A", "B", "A", "A", "A", "F", "E"],
  },
  mittel: {
    bpm: 96,
    A: T({ hihat: "x.x.x.x.x.x.x.x.", snare: "....x.......x...", kick: "x.....x.x......." }),
    B: T({ hihat: "x.x.x.x.x.x.x.o.", snare: "....x.......x...", kick: "x.....x.x.x....." }),
    F: T({ hihat: "x.x.x.x.", snare: "....x...x.x.....", tom1: "............x...", tom2: ".............x..", floor: "..............x.", kick: "x.....x........." }),
    lied: ["A", "A", "A", "B", "A", "A", "A", "F", "A", "B", "A", "F", "E"],
  },
  schwer: {
    bpm: 112,
    A: T({ hihat: "x.x.x.x.x.x.x.o.", snare: "....x..x....x...", kick: "x.x...x...x..x.." }),
    B: T({ ride: "x.x.x.x.x.x.x.x.", snare: "....x.......x..x", kick: "x..x..x.x..x...." }),
    F: T({ hihat: "x.x.x.x.", snare: "....x.x.xx......", tom1: "..........xx....", tom2: "............xx..", floor: "..............xx", kick: "x.....x...x...x." }),
    lied: ["A", "A", "A", "F", "B", "B", "B", "F", "A", "A", "B", "F", "B", "B", "A", "F", "E"],
  },
};
// E = Schlussschlag
const SCHLUSS = { crash: "x...............", kick: "x..............." };

export function start({ canvas, tools, stufe, passeCanvas, status, nachricht, ergebnis }) {
  const STUFE = TAKTE[stufe] ? stufe : "mittel";
  const ctx = passeCanvas(canvas, W, H);

  // ---------- HD: Zeichenfläche so groß wie auf dem Bildschirm ----------
  let skala = 1;
  function passeAufloesung() {
    const breite = canvas.getBoundingClientRect().width;
    if (!breite) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const px = Math.max(W, Math.round(breite * dpr));
    if (canvas.width !== px) {
      canvas.width = px;
      canvas.height = Math.round((px * H) / W);
    }
    skala = canvas.width / W;
  }
  const ro = new ResizeObserver(passeAufloesung);
  ro.observe(canvas);

  // ---------- Klang (Web Audio) ----------
  let ac = null;
  let master = null;
  let rauschen = null;
  let offeneHihat = null;
  function audio() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
      const comp = ac.createDynamicsCompressor();
      comp.threshold.value = -12;
      comp.ratio.value = 4;
      master = ac.createGain();
      master.gain.value = 0.85;
      master.connect(comp);
      comp.connect(ac.destination);
      const len = ac.sampleRate * 2;
      rauschen = ac.createBuffer(1, len, ac.sampleRate);
      const d = rauschen.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === "suspended") ac.resume();
    return ac;
  }
  function huelle(g, t, spitze, dauer, anstieg = 0.002) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(spitze, t + anstieg);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
  }
  function geraeusch(t, dauer, typ, freq, q, spitze) {
    const s = ac.createBufferSource();
    s.buffer = rauschen;
    const f = ac.createBiquadFilter();
    f.type = typ;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ac.createGain();
    huelle(g, t, spitze, dauer);
    s.connect(f).connect(g).connect(master);
    s.start(t, Math.random() * 1.5);
    s.stop(t + dauer + 0.05);
    return g;
  }
  function ton(t, typ, f0, f1, dauer, spitze, fall) {
    const o = ac.createOscillator();
    o.type = typ;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + fall);
    const g = ac.createGain();
    huelle(g, t, spitze, dauer);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dauer + 0.05);
    return g;
  }
  // metallischer Klang aus sechs Rechteck-Schwingungen (wie bei klassischen Drumcomputern)
  function metall(t, dauer, spitze, basis, hochpass) {
    const g = ac.createGain();
    huelle(g, t, spitze, dauer, 0.001);
    const bp = ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 10000;
    bp.Q.value = 0.7;
    const hp = ac.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = hochpass;
    for (const r of [2, 3, 4.16, 5.43, 6.79, 8.21]) {
      const o = ac.createOscillator();
      o.type = "square";
      o.frequency.value = basis * r * (0.995 + Math.random() * 0.01);
      o.connect(bp);
      o.start(t);
      o.stop(t + dauer + 0.05);
    }
    bp.connect(hp).connect(g).connect(master);
    return g;
  }
  const v = () => 0.88 + Math.random() * 0.12; // etwas Lebendigkeit
  const KLANG = {
    kick: (t) => {
      ton(t, "sine", 165, 44, 0.5, 1.0 * v(), 0.11);
      geraeusch(t, 0.02, "lowpass", 2500, 0.7, 0.3);
    },
    snare: (t) => {
      geraeusch(t, 0.24, "highpass", 1300, 0.7, 0.55 * v());
      geraeusch(t, 0.12, "bandpass", 3800, 1, 0.3);
      ton(t, "triangle", 230, 165, 0.13, 0.5 * v(), 0.06);
    },
    hihat: (t) => {
      if (offeneHihat) {
        // geschlossene Hi-Hat stoppt die offene
        offeneHihat.gain.cancelScheduledValues(t);
        offeneHihat.gain.setTargetAtTime(0.0001, t, 0.01);
        offeneHihat = null;
      }
      metall(t, 0.06, 0.32 * v(), 40, 7000);
    },
    hihatOffen: (t) => {
      offeneHihat = metall(t, 0.5, 0.28 * v(), 40, 7000);
    },
    tom1: (t) => {
      ton(t, "sine", 270, 195, 0.45, 0.85 * v(), 0.22);
      geraeusch(t, 0.05, "lowpass", 3000, 0.7, 0.12);
    },
    tom2: (t) => {
      ton(t, "sine", 205, 148, 0.5, 0.85 * v(), 0.25);
      geraeusch(t, 0.05, "lowpass", 2600, 0.7, 0.12);
    },
    floor: (t) => {
      ton(t, "sine", 140, 92, 0.7, 0.95 * v(), 0.3);
      geraeusch(t, 0.06, "lowpass", 2000, 0.7, 0.14);
    },
    crash: (t) => {
      metall(t, 1.9, 0.26 * v(), 52, 5000);
      geraeusch(t, 1.7, "highpass", 6000, 0.5, 0.22);
    },
    ride: (t) => {
      metall(t, 1.2, 0.13 * v(), 61, 6500);
      ton(t, "sine", 830, 815, 0.7, 0.07, 0.6);
      geraeusch(t, 0.08, "highpass", 8000, 0.5, 0.08);
    },
    klick: (t, betont) => ton(t, "square", betont ? 1760 : 1180, betont ? 1760 : 1180, 0.035, betont ? 0.22 : 0.13, 0.03),
  };

  // ---------- Zustand ----------
  let modus = "frei"; // frei | takt
  let zustand = "frei"; // frei | bereit | laeuft | ende
  let metronomAn = false;
  let bpm = 100;
  let naechsterKlick = 0;
  let klickZaehler = 0;
  let letzterKlick = { zeit: -1, betont: false };
  const schwung = {}; // Anschlag-Animation je Pad (1 → 0)
  let hihatOffen = false;
  let eigeneSchlaege = []; // für das Notenband im freien Spiel
  let popups = [];
  // Challenge
  let noten = [];
  let liedStart = 0;
  let liedEnde = 0;
  let taktBpm = 100;
  let punkte = 0;
  let combo = 0;
  let besteCombo = 0;
  let zaehl = { perfekt: 0, gut: 0, ok: 0, verpasst: 0, falsch: 0 };

  const jetzt = () => (ac ? ac.currentTime : performance.now() / 1000);

  function liedBauen() {
    const def = TAKTE[STUFE];
    taktBpm = def.bpm;
    const schritt = 60 / taktBpm / 4;
    noten = [];
    const t0 = jetzt() + 0.25 + 16 * schritt; // ein Takt Einzählen
    def.lied.forEach((name, takt) => {
      const muster = name === "E" ? SCHLUSS : def[name];
      for (const [pad, folge] of Object.entries(muster)) {
        for (let i = 0; i < folge.length; i++) {
          const c = folge[i];
          if (c === ".") continue;
          let p = pad === "hihat" && c === "o" ? "hihatOffen" : pad;
          // erster Schlag nach einem Fill: Crash statt Hi-Hat
          if (takt > 0 && i === 0 && def.lied[takt - 1] === "F" && pad === "hihat") p = "crash";
          noten.push({ zeit: t0 + (takt * 16 + i) * schritt, pad: p, ergebnis: null });
        }
      }
    });
    noten.sort((a, b) => a.zeit - b.zeit);
    liedStart = t0;
    liedEnde = noten[noten.length - 1].zeit;
    naechsterKlick = t0 - 4 * (60 / taktBpm);
    klickZaehler = 0;
  }

  function zeigeStatus() {
    if (modus === "frei") status(`Frei spielen · Metronom ${metronomAn ? `an (${bpm} BPM)` : "aus"}`);
    else {
      const gespielt = zaehl.perfekt + zaehl.gut + zaehl.ok + zaehl.verpasst;
      const quote = gespielt ? Math.round(((zaehl.perfekt + zaehl.gut + zaehl.ok) / gespielt) * 100) : 100;
      status(`${punkte} Punkte · Combo ${combo} · Treffer ${quote}%`);
    }
  }

  function zeigeBereit() {
    zustand = "bereit";
    const def = TAKTE[STUFE];
    nachricht(`<p class="big">Rhythmus-Challenge</p><p>${def.lied.length - 1} Takte mit ${def.bpm} BPM. Schlag die Trommel, wenn ihre Note die weiße Linie erreicht. Je genauer, desto mehr Punkte, Combos zählen extra.</p><p class="small">Vorher ausprobieren geht auch. Enter oder Klick: Start (es wird ein Takt eingezählt)</p>`);
    zeigeStatus();
  }
  function starteChallenge() {
    if (!audio()) return;
    nachricht(null);
    punkte = 0;
    combo = 0;
    besteCombo = 0;
    zaehl = { perfekt: 0, gut: 0, ok: 0, verpasst: 0, falsch: 0 };
    popups = [];
    liedBauen();
    zustand = "laeuft";
    zeigeStatus();
  }
  function endeChallenge() {
    zustand = "ende";
    const gesamt = noten.length;
    const quote = Math.round(((zaehl.perfekt + zaehl.gut + zaehl.ok) / gesamt) * 100);
    const neu = ergebnis({ punkte });
    const note = quote >= 95 ? "Wie ein Profi!" : quote >= 80 ? "Starker Groove!" : quote >= 60 ? "Gut im Takt." : "Übung macht den Meister.";
    nachricht(`<p class="big">${punkte} Punkte</p><p>${note}${neu ? " Neuer Highscore!" : ""}</p><p>Treffer ${quote}% · Perfekt ${zaehl.perfekt} · Gut ${zaehl.gut} · Knapp ${zaehl.ok} · Verpasst ${zaehl.verpasst} · beste Combo ${besteCombo}</p><p class="small">Enter oder Klick: nochmal</p>`);
    zeigeStatus();
  }

  // ---------- Anschlag ----------
  function schlag(pad) {
    if (!audio()) return;
    const t = jetzt();
    KLANG[pad](t);
    if (pad === "hihat") hihatOffen = false;
    if (pad === "hihatOffen") hihatOffen = true;
    const anim = pad === "hihatOffen" ? "hihat" : pad;
    schwung[anim] = 1;
    if (modus === "frei" || zustand !== "laeuft") {
      eigeneSchlaege.push({ zeit: t, pad });
      return;
    }
    bewerte(pad, t);
  }
  function bewerte(pad, t) {
    // nächste offene Note derselben Spur (Hi-Hat zu/offen zählt beides)
    const spur = spurIndex(pad);
    let beste = null;
    for (const n of noten) {
      if (n.ergebnis || spurIndex(n.pad) !== spur) continue;
      const d = Math.abs(n.zeit - t);
      if (d <= 0.16 && (!beste || d < Math.abs(beste.zeit - t))) beste = n;
      if (n.zeit > t + 0.2) break;
    }
    if (!beste) {
      zaehl.falsch++;
      combo = 0;
      popup("Daneben", "#8a8698", spur);
      zeigeStatus();
      return;
    }
    const d = Math.abs(beste.zeit - t);
    const art = d <= 0.045 ? "perfekt" : d <= 0.095 ? "gut" : "ok";
    beste.ergebnis = art;
    zaehl[art]++;
    combo++;
    besteCombo = Math.max(besteCombo, combo);
    const faktor = 1 + Math.min(3, Math.floor(combo / 8));
    punkte += { perfekt: 100, gut: 60, ok: 25 }[art] * faktor;
    popup({ perfekt: "Perfekt!", gut: "Gut", ok: "Knapp" }[art] + (faktor > 1 ? ` ×${faktor}` : ""), { perfekt: "#5fc39c", gut: "#9fd0ff", ok: "#f0a35e" }[art], spur);
    zeigeStatus();
  }
  function popup(text, farbe, spur) {
    popups.push({ text, farbe, y: 30 + spur * 20, t: 0 });
  }

  // ---------- Metronom und Ablauf (läuft auf der Audio-Uhr) ----------
  const takt = setInterval(() => {
    if (!ac) return;
    const t = ac.currentTime;
    const laeuft = zustand === "laeuft";
    if (laeuft || (modus === "frei" && metronomAn)) {
      const schlagLaenge = 60 / (laeuft ? taktBpm : bpm);
      if (naechsterKlick < t - 0.2) naechsterKlick = t + 0.05;
      while (naechsterKlick < t + 0.12) {
        if (!laeuft || naechsterKlick <= liedEnde + 0.01) {
          const betont = klickZaehler % 4 === 0;
          KLANG.klick(naechsterKlick, betont);
          letzterKlick = { zeit: naechsterKlick, betont };
        }
        naechsterKlick += schlagLaenge;
        klickZaehler++;
      }
    }
    if (laeuft) {
      for (const n of noten) {
        if (!n.ergebnis && n.zeit < t - 0.16) {
          n.ergebnis = "verpasst";
          zaehl.verpasst++;
          combo = 0;
          zeigeStatus();
        }
      }
      if (t > liedEnde + 1.2) endeChallenge();
    }
  }, 25);

  // ---------- Schlagzeug: Lage der Teile ----------
  const KIT = {
    crash: { x: 168, y: 250, r: 66 },
    hihat: { x: 92, y: 365, r: 50 },
    ride: { x: 812, y: 262, r: 76 },
    tom1: { x: 392, y: 322, rx: 50, h: 40 },
    tom2: { x: 548, y: 322, rx: 52, h: 42 },
    snare: { x: 248, y: 418, rx: 60, h: 32 },
    floor: { x: 728, y: 404, rx: 66, h: 84 },
    kick: { x: 470, y: 428, r: 92 },
  };
  // Trefferflächen, vorne zuerst
  function padBei(x, y) {
    const inEllipse = (cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
    const k = KIT;
    if (inEllipse(k.hihat.x, k.hihat.y, k.hihat.r + 6, 28)) return "hihat";
    if (inEllipse(k.snare.x, k.snare.y + 10, k.snare.rx + 4, 34)) return "snare";
    if (inEllipse(k.floor.x, k.floor.y + 30, k.floor.rx + 4, 62)) return "floor";
    if (inEllipse(k.tom1.x, k.tom1.y + 14, k.tom1.rx + 4, 38)) return "tom1";
    if (inEllipse(k.tom2.x, k.tom2.y + 14, k.tom2.rx + 4, 38)) return "tom2";
    if (inEllipse(k.kick.x, k.kick.y, k.kick.r, k.kick.r)) return "kick";
    if (inEllipse(k.crash.x, k.crash.y, k.crash.r + 8, 30)) return "crash";
    if (inEllipse(k.ride.x, k.ride.y, k.ride.r + 8, 30)) return "ride";
    return null;
  }

  // ---------- Zeichnen ----------
  function rund(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function glanz(x, y, r, farbe, a) {
    if (a <= 0.01) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, farbe + Math.round(a * 255).toString(16).padStart(2, "0"));
    g.addColorStop(1, farbe + "00");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function tastenSchild(x, y, text, farbe, an) {
    ctx.font = '11px "Press Start 2P", monospace';
    const b = Math.max(24, ctx.measureText(text).width + 12);
    ctx.fillStyle = an ? farbe : "rgba(14, 12, 22, 0.82)";
    rund(x - b / 2, y - 12, b, 22, 6);
    ctx.fill();
    ctx.strokeStyle = farbe;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = an ? "#0f0e13" : farbe;
    ctx.textAlign = "center";
    ctx.fillText(text, x, y + 5);
  }
  const farbeVon = (pad) => SPUREN[spurIndex(pad)].farbe;
  const chrom = (x0, x1) => {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, "#7b7d88");
    g.addColorStop(0.35, "#f2f3f7");
    g.addColorStop(0.6, "#a9abb6");
    g.addColorStop(1, "#5d5f6a");
    return g;
  };
  function staender(x, yOben, breite = 26) {
    ctx.strokeStyle = "#8d8f9b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, yOben);
    ctx.lineTo(x, BODEN - 22);
    ctx.moveTo(x, BODEN - 22);
    ctx.lineTo(x - breite, BODEN);
    ctx.moveTo(x, BODEN - 22);
    ctx.lineTo(x + breite, BODEN);
    ctx.moveTo(x, BODEN - 22);
    ctx.lineTo(x + 4, BODEN);
    ctx.stroke();
  }
  // Trommel von vorn, leicht von oben gesehen
  function trommel(id, k, kessel, t) {
    const s = schwung[id] || 0;
    const x = k.x;
    const y = k.y + s * 3;
    const rx = k.rx * (1 + s * 0.02);
    const ry = rx * 0.3;
    glanz(x, y + k.h / 2, rx * 1.9, farbeVon(id), s * 0.45);
    // Kessel
    const g = ctx.createLinearGradient(x - rx, 0, x + rx, 0);
    if (kessel === "chrom") {
      g.addColorStop(0, "#6d6f7a");
      g.addColorStop(0.3, "#eceef3");
      g.addColorStop(0.55, "#a2a4af");
      g.addColorStop(1, "#4e505b");
    } else {
      g.addColorStop(0, "#3a0d22");
      g.addColorStop(0.32, "#b8325e");
      g.addColorStop(0.5, "#8a1f45");
      g.addColorStop(1, "#2a0818");
    }
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - rx, y);
    ctx.lineTo(x - rx, y + k.h);
    ctx.ellipse(x, y + k.h, rx, ry, 0, Math.PI, 0, true);
    ctx.lineTo(x + rx, y);
    ctx.closePath();
    ctx.fill();
    if (kessel !== "chrom") {
      // Glitzerlack
      ctx.fillStyle = "rgba(255, 200, 230, 0.18)";
      for (let i = 0; i < 14; i++) {
        const a = ((i * 97) % 100) / 100;
        ctx.fillRect(x - rx * 0.9 + a * rx * 1.8, y + 4 + ((i * 37) % Math.max(1, k.h - 6)), 1.5, 1.5);
      }
    }
    // Spannböckchen
    ctx.fillStyle = chrom(x - rx, x + rx);
    for (let i = 1; i < 6; i++) {
      const bx = x - rx * Math.cos((i / 6) * Math.PI);
      ctx.fillRect(bx - 2, y + 4, 4, k.h - 6);
    }
    // unterer Reifen
    ctx.strokeStyle = "#c9cbd4";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, y + k.h, rx, ry, 0, 0, Math.PI);
    ctx.stroke();
    // Fell und oberer Reifen
    const hell = Math.round(236 + s * 19);
    ctx.fillStyle = `rgb(${hell}, ${hell - 6}, ${hell - 18})`;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.06)";
    ctx.beginPath();
    ctx.ellipse(x, y + 1, rx * 0.35, ry * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    if (s > 0.05) {
      // Welle auf dem Fell
      ctx.strokeStyle = `rgba(255,255,255,${s * 0.8})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, y, rx * (1 - s) + 4, ry * (1 - s) + 1.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = chrom(x - rx, x + rx);
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    void t;
  }
  function becken(id, k, t, offen = 0) {
    const s = schwung[id] || 0;
    const wackeln = Math.sin(t / 55) * s * 0.14;
    glanz(k.x, k.y, k.r * 1.8, farbeVon(id), s * 0.5);
    ctx.save();
    ctx.translate(k.x, k.y);
    ctx.rotate(-0.06 + wackeln);
    const ry = k.r * 0.2 + s * 5;
    const g = ctx.createRadialGradient(-k.r * 0.3, -ry * 0.6, 4, 0, 0, k.r);
    g.addColorStop(0, "#fff2c2");
    g.addColorStop(0.35, "#e7bd5e");
    g.addColorStop(0.75, "#b88a2e");
    g.addColorStop(1, "#7a5718");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, k.r, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(90, 60, 10, 0.35)";
    ctx.lineWidth = 0.8;
    for (let i = 1; i < 6; i++) {
      ctx.beginPath();
      ctx.ellipse(0, 0, (k.r * i) / 6, (ry * i) / 6, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = "#d9a94a";
    ctx.beginPath();
    ctx.ellipse(0, -ry * 0.25, k.r * 0.16, ry * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    if (s > 0.02) {
      ctx.fillStyle = `rgba(255, 255, 255, ${s * 0.45})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, k.r, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    void offen;
  }
  function hihat(t) {
    const k = KIT.hihat;
    const s = schwung.hihat || 0;
    staender(k.x, k.y, 24);
    // Pedal
    ctx.fillStyle = "#3a3c46";
    ctx.fillRect(k.x - 10, BODEN - 6, 26, 6);
    const spalt = hihatOffen ? 10 : 3;
    // unteres Becken
    becken("hihat", { x: k.x, y: k.y + spalt, r: k.r }, t);
    // oberes Becken (bewegt sich beim Anschlag)
    becken("hihat", { x: k.x, y: k.y - s * 2, r: k.r }, t);
  }
  function bass(t) {
    const k = KIT.kick;
    const s = schwung.kick || 0;
    glanz(k.x, k.y, k.r * 1.7, farbeVon("kick"), s * 0.4);
    ctx.save();
    ctx.translate(k.x, k.y);
    ctx.scale(1 + s * 0.025, 1 + s * 0.025);
    // Füße
    ctx.strokeStyle = "#8d8f9b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-k.r * 0.75, k.r * 0.55);
    ctx.lineTo(-k.r * 1.05, BODEN - k.y);
    ctx.moveTo(k.r * 0.75, k.r * 0.55);
    ctx.lineTo(k.r * 1.05, BODEN - k.y);
    ctx.stroke();
    // Kessel (Rand)
    const g = ctx.createRadialGradient(-20, -30, 10, 0, 0, k.r);
    g.addColorStop(0, "#c43a68");
    g.addColorStop(0.7, "#8a1f45");
    g.addColorStop(1, "#3a0d22");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, k.r, 0, Math.PI * 2);
    ctx.fill();
    // Spannschrauben
    ctx.fillStyle = "#e4e6ec";
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      ctx.save();
      ctx.rotate(a);
      ctx.fillRect(-2, -k.r - 1, 4, 10);
      ctx.restore();
    }
    // Reifen und Fell
    ctx.strokeStyle = "#d7d9e1";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, k.r - 6, 0, Math.PI * 2);
    ctx.stroke();
    const fell = ctx.createRadialGradient(-20, -24, 6, 0, 0, k.r - 9);
    fell.addColorStop(0, s > 0.1 ? "#ffffff" : "#fbf7ee");
    fell.addColorStop(1, "#ddd3bf");
    ctx.fillStyle = fell;
    ctx.beginPath();
    ctx.arc(0, 0, k.r - 9, 0, Math.PI * 2);
    ctx.fill();
    // Logo der Klasse auf dem Resonanzfell
    ctx.strokeStyle = "#8a1f45";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -4, 46, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#8a1f45";
    ctx.textAlign = "center";
    ctx.font = '13px "Press Start 2P", monospace';
    ctx.fillText("H-FI24", 0, -10);
    ctx.font = '11px "Press Start 2P", monospace';
    ctx.fillText("1B", 0, 10);
    if (s > 0.05) {
      ctx.strokeStyle = `rgba(95, 195, 156, ${s})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, (k.r - 9) * (1 - s * 0.6), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    // Pedal
    ctx.fillStyle = "#3a3c46";
    ctx.fillRect(k.x - 14, BODEN - 8, 28, 8);
    ctx.fillStyle = "#8d8f9b";
    ctx.save();
    ctx.translate(k.x, BODEN - 8);
    ctx.rotate(-0.5 + s * 0.4);
    ctx.fillRect(-3, -26, 6, 26);
    ctx.restore();
  }

  function zeichneBuehne() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0c0b12");
    g.addColorStop(0.45, "#17142a");
    g.addColorStop(1, "#22183a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // Scheinwerfer
    for (const [x, f] of [[250, "#b48ef0"], [700, "#5fc39c"], [470, "#f5d97a"]]) {
      const sg = ctx.createRadialGradient(x, 200, 10, x, 420, 380);
      sg.addColorStop(0, f + "30");
      sg.addColorStop(1, f + "00");
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.moveTo(x - 30, 190);
      ctx.lineTo(x + 30, 190);
      ctx.lineTo(x + 260, BODEN);
      ctx.lineTo(x - 260, BODEN);
      ctx.fill();
    }
    // Boden und Teppich
    ctx.fillStyle = "#120f1c";
    ctx.fillRect(0, BODEN, W, H - BODEN);
    ctx.fillStyle = "#3a2448";
    ctx.beginPath();
    ctx.ellipse(470, BODEN + 4, 420, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(245, 217, 122, 0.25)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(470, BODEN + 4, 400, 17, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  function zeichneKit(t) {
    const k = KIT;
    // Ständer der Becken hinten
    staender(k.crash.x, k.crash.y);
    staender(k.ride.x, k.ride.y);
    becken("ride", k.ride, t);
    becken("crash", k.crash, t);
    bass(t);
    // Tom-Halter auf der Bass
    ctx.strokeStyle = "#a9abb6";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(k.kick.x, k.kick.y - k.kick.r + 4);
    ctx.lineTo(k.tom1.x + 10, k.tom1.y + k.tom1.h);
    ctx.moveTo(k.kick.x, k.kick.y - k.kick.r + 4);
    ctx.lineTo(k.tom2.x - 10, k.tom2.y + k.tom2.h);
    ctx.stroke();
    trommel("tom1", k.tom1, "lack", t);
    trommel("tom2", k.tom2, "lack", t);
    // Standtom mit Beinen
    ctx.strokeStyle = "#8d8f9b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (const dx of [-0.85, 0.85]) {
      ctx.moveTo(k.floor.x + k.floor.rx * dx, k.floor.y + 20);
      ctx.lineTo(k.floor.x + k.floor.rx * dx * 1.15, BODEN);
    }
    ctx.stroke();
    trommel("floor", k.floor, "lack", t);
    // Snare auf Ständer
    staender(k.snare.x, k.snare.y + k.snare.h, 22);
    trommel("snare", k.snare, "chrom", t);
    hihat(t);
    // Tasten-Schilder
    const schild = (pad, x, y, text) => tastenSchild(x, y, text, farbeVon(pad), (schwung[pad === "hihatOffen" ? "hihat" : pad] || 0) > 0.5);
    schild("crash", k.crash.x, k.crash.y - 26, "Q");
    schild("ride", k.ride.x, k.ride.y - 28, "R");
    schild("hihat", k.hihat.x - 14, k.hihat.y - 30, "A");
    schild("hihat", k.hihat.x + 16, k.hihat.y - 30, "W");
    schild("snare", k.snare.x, k.snare.y + k.snare.h + 26, "S");
    schild("tom1", k.tom1.x, k.tom1.y + k.tom1.h / 2 + 6, "D");
    schild("tom2", k.tom2.x, k.tom2.y + k.tom2.h / 2 + 6, "F");
    schild("floor", k.floor.x, k.floor.y + k.floor.h / 2 + 8, "G");
    schild("kick", k.kick.x, k.kick.y + 50, "LEER");
  }

  // Notenband oben: Noten laufen von rechts auf die Linie zu (Challenge) bzw. eigene Schläge laufen nach links weg
  function zeichneBand(t, dt) {
    const oben = 12;
    const sh = 20;
    ctx.fillStyle = "rgba(8, 7, 14, 0.8)";
    rund(12, 6, W - 24, oben + SPUREN.length * sh + 12, 12);
    ctx.fill();
    SPUREN.forEach((s, i) => {
      const y = oben + 6 + i * sh;
      ctx.fillStyle = i % 2 ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.06)";
      ctx.fillRect(140, y, W - 164, sh);
      ctx.textAlign = "left";
      ctx.font = "13px system-ui, -apple-system, Segoe UI, sans-serif";
      ctx.fillStyle = s.farbe;
      ctx.fillText(s.name, 24, y + 15);
      ctx.textAlign = "right";
      ctx.font = '9px "Press Start 2P", monospace';
      ctx.fillStyle = "#8a8698";
      ctx.fillText(s.taste, 132, y + 14);
    });
    const unten = oben + 6 + SPUREN.length * sh;
    // Taktstriche
    const laeuft = zustand === "laeuft" && modus === "takt";
    const schlagL = 60 / (laeuft ? taktBpm : bpm);
    if (laeuft || metronomAn) {
      const basis = laeuft ? liedStart : naechsterKlick;
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      for (let k = -24; k < 30; k++) {
        const zt = basis + k * schlagL;
        const x = LINIE_X + (zt - t) * NOTEN_TEMPO;
        if (x < 140 || x > W - 24) continue;
        ctx.fillRect(x, oben + 6, Math.abs(k) % 4 === 0 ? 2 : 1, unten - oben - 6);
      }
    }
    // Trefferlinie
    ctx.fillStyle = "#f4f1f8";
    ctx.fillRect(LINIE_X - 1.5, oben + 2, 3, unten - oben + 2);
    const note = (x, i, pad, a, art) => {
      const y = oben + 6 + i * sh + sh / 2;
      const f = SPUREN[i].farbe;
      ctx.globalAlpha = a;
      ctx.fillStyle = art === "verpasst" ? "#4a4658" : f;
      rund(x - 13, y - 7, 26, 14, 5);
      ctx.fill();
      if (pad === "hihatOffen") {
        ctx.strokeStyle = "#0f0e13";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };
    ctx.save();
    ctx.beginPath();
    ctx.rect(140, oben, W - 164, unten - oben + 6);
    ctx.clip();
    if (modus === "takt" && (zustand === "laeuft" || zustand === "ende")) {
      for (const n of noten) {
        const x = LINIE_X + (n.zeit - t) * NOTEN_TEMPO;
        if (x < 120 || x > W + 20) continue;
        if (n.ergebnis && n.ergebnis !== "verpasst") continue;
        note(x, spurIndex(n.pad), n.pad, 1, n.ergebnis);
      }
    } else {
      eigeneSchlaege = eigeneSchlaege.filter((s) => t - s.zeit < 2);
      for (const s of eigeneSchlaege) note(LINIE_X + (t - s.zeit) * NOTEN_TEMPO, spurIndex(s.pad), s.pad, 1 - (t - s.zeit) / 2);
    }
    ctx.restore();
    // Bewertungen
    popups = popups.filter((p) => (p.t += dt) < 0.7);
    ctx.textAlign = "left";
    ctx.font = '10px "Press Start 2P", monospace';
    for (const p of popups) {
      ctx.globalAlpha = 1 - p.t / 0.7;
      ctx.fillStyle = p.farbe;
      ctx.fillText(p.text, LINIE_X + 18, p.y + 8 - p.t * 10);
    }
    ctx.globalAlpha = 1;
    // Einzählen
    if (laeuft && t < liedStart) {
      const rest = Math.ceil((liedStart - t) / schlagL);
      ctx.textAlign = "center";
      ctx.font = '40px "Press Start 2P", monospace';
      ctx.fillStyle = "#f5d97a";
      ctx.fillText(String(Math.min(4, rest)), W / 2, 290);
    }
    // Metronom-Lämpchen
    if (laeuft || metronomAn) {
      const a = Math.max(0, 1 - (t - letzterKlick.zeit) / 0.15);
      ctx.fillStyle = letzterKlick.betont ? `rgba(245, 217, 122, ${0.25 + a * 0.75})` : `rgba(159, 208, 255, ${0.25 + a * 0.75})`;
      ctx.beginPath();
      ctx.arc(W - 40, unten + 26, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.textAlign = "right";
      ctx.font = "13px system-ui, -apple-system, Segoe UI, sans-serif";
      ctx.fillStyle = "#c9c3e0";
      ctx.fillText(`${laeuft ? taktBpm : bpm} BPM`, W - 54, unten + 31);
    }
    if (modus === "takt" && zustand === "laeuft") {
      ctx.textAlign = "left";
      ctx.font = '12px "Press Start 2P", monospace';
      ctx.fillStyle = "#f4f1f8";
      ctx.fillText(`${punkte}`, 24, unten + 32);
      if (combo >= 4) {
        ctx.fillStyle = "#5fc39c";
        ctx.fillText(`Combo ${combo}`, 24, unten + 54);
      }
    }
    if (modus === "frei" && !eigeneSchlaege.length && !ersterSchlag) {
      ctx.textAlign = "center";
      ctx.font = "15px system-ui, -apple-system, Segoe UI, sans-serif";
      ctx.fillStyle = "#c9c3e0";
      ctx.fillText("Tasten drücken oder Trommeln antippen", (W + 140) / 2, unten + 30);
    }
  }

  let ersterSchlag = false;
  let zuletzt = 0;
  let raf;
  function loop(ms) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (ms - (zuletzt || ms)) / 1000);
    zuletzt = ms;
    for (const id of Object.keys(schwung)) {
      const abkling = id === "crash" || id === "ride" ? 2.2 : id === "hihat" ? 7 : 6;
      schwung[id] = Math.max(0, schwung[id] - dt * abkling);
    }
    ctx.setTransform(skala, 0, 0, skala, 0, 0);
    ctx.imageSmoothingEnabled = true;
    zeichneBuehne();
    zeichneKit(ms);
    zeichneBand(jetzt(), dt);
  }

  // ---------- Eingabe ----------
  const onKeyDown = (e) => {
    if (e.target.closest?.("input, select, textarea, button")) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const pad = TASTEN[k];
    if (pad || k === "Enter" || k === "m") e.preventDefault();
    if (e.repeat) return;
    if (pad) {
      ersterSchlag = true;
      return schlag(pad);
    }
    if (k === "m") return setzeMetronom(!metronomAn);
    if (k === "Enter" && modus === "takt" && zustand !== "laeuft") starteChallenge();
  };
  const onDown = (e) => {
    const r = canvas.getBoundingClientRect();
    const pad = padBei(((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H);
    if (pad) {
      e.preventDefault();
      ersterSchlag = true;
      schlag(pad);
    }
  };
  const onMove = (e) => {
    const r = canvas.getBoundingClientRect();
    canvas.style.cursor = padBei(((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H) ? "pointer" : "default";
  };
  window.addEventListener("keydown", onKeyDown);
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  // Overlay (Start/Ergebnis der Challenge) anklicken
  const msg = document.getElementById("stage-msg");
  const onMsg = (e) => {
    if (e.target.closest("button")) return;
    if (modus === "takt" && zustand !== "laeuft") starteChallenge();
  };
  msg.addEventListener("click", onMsg);

  // ---------- Leiste unter dem Schlagzeug ----------
  tools.hidden = false;
  tools.innerHTML = `
    <label class="tools-feld"><span>Modus</span>
      <select class="tools-select" data-dr="modus">
        <option value="frei">Frei spielen</option>
        <option value="takt">Rhythmus-Challenge</option>
      </select>
    </label>
    <button type="button" class="more" data-dr="metronom" aria-pressed="false">Metronom: aus (M)</button>
    <label class="tools-feld" data-dr="tempo-feld"><span>Tempo</span>
      <input type="range" min="60" max="180" step="5" value="${bpm}" data-dr="tempo" aria-label="Tempo des Metronoms in BPM">
      <span class="num" data-dr="tempo-wert">${bpm} BPM</span>
    </label>`;
  const el = (n) => tools.querySelector(`[data-dr="${n}"]`);
  function setzeMetronom(an) {
    if (modus !== "frei") return;
    metronomAn = an;
    if (an && audio()) {
      naechsterKlick = ac.currentTime + 0.05;
      klickZaehler = 0;
    }
    el("metronom").textContent = `Metronom: ${an ? "an" : "aus"} (M)`;
    el("metronom").setAttribute("aria-pressed", String(an));
    zeigeStatus();
  }
  el("modus").addEventListener("change", (e) => {
    modus = e.target.value;
    e.target.blur();
    canvas.focus({ preventScroll: true });
    el("metronom").hidden = modus !== "frei";
    el("tempo-feld").hidden = modus !== "frei";
    if (modus === "takt") {
      metronomAn = false;
      zeigeBereit();
    } else {
      zustand = "frei";
      nachricht(null);
      setzeMetronom(false);
    }
  });
  el("metronom").addEventListener("click", (e) => {
    setzeMetronom(!metronomAn);
    e.currentTarget.blur();
  });
  el("tempo").addEventListener("input", (e) => {
    bpm = Number(e.target.value);
    el("tempo-wert").textContent = `${bpm} BPM`;
    zeigeStatus();
  });
  el("tempo").addEventListener("change", (e) => e.target.blur());

  passeAufloesung();
  zeigeStatus();
  raf = requestAnimationFrame(loop);
  document.fonts?.load('12px "Press Start 2P"');

  return {
    pause() {
      if (zustand === "laeuft") zeigeBereit();
      if (metronomAn) setzeMetronom(false);
    },
    stop() {
      cancelAnimationFrame(raf);
      clearInterval(takt);
      ro.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      msg.removeEventListener("click", onMsg);
      canvas.style.cursor = "";
      ac?.close();
    },
  };
}
