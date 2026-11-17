// Stick-Skater – Ton: alle Geräusche und die Musik werden mit der Web Audio API erzeugt (keine Dateien).
// Jede Welt hat ihren eigenen Beat. In der Parallelwelt läuft die Musik durch Verzerrer und Tiefpass.

const WELT_MUSIK = [
  // bpm, Grundton (Hz), Tonleiter (Halbtöne), Kick, Snare, HiHat, Bass-Folge (Stufen, -1 = Pause), Klang
  { bpm: 112, root: 55, skala: [0, 3, 5, 7, 10], kick: "x...x...x...x...", snare: "....x.......x...", hat: "..x...x...x...xx", bass: [0, -1, 0, 3, -1, 2, 0, -1, 4, -1, 3, -1, 2, -1, 1, -1], welle: "sawtooth" },
  { bpm: 94, root: 49, skala: [0, 1, 5, 7, 8], kick: "x.....x...x.....", snare: "....x.......x..x", hat: "x.x.x.x.x.x.x.x.", bass: [0, -1, -1, 0, -1, -1, 1, -1, 0, -1, -1, 4, -1, 3, -1, -1], welle: "square" },
  { bpm: 124, root: 41, skala: [0, 2, 3, 7, 8], kick: "x...x...x...x...", snare: "....x..x....x...", hat: "xxxxxxxxxxxxxxxx", bass: [0, 0, -1, 0, 3, -1, 0, -1, 0, 0, -1, 4, 3, -1, 2, -1], welle: "square" },
  { bpm: 132, root: 46, skala: [0, 3, 5, 6, 7, 10], kick: "x..x..x...x..x..", snare: "....x.......x...", hat: "..x...x...x...x.", bass: [0, -1, 0, -1, 2, -1, 0, -1, 4, -1, 3, -1, 5, -1, 3, -1], welle: "sawtooth" },
  { bpm: 100, root: 52, skala: [0, 2, 4, 7, 9], kick: "x.......x.x.....", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x.", bass: [0, -1, 2, -1, 3, -1, 4, -1, 3, -1, 2, -1, 1, -1, 2, -1], welle: "triangle" },
  { bpm: 140, root: 44, skala: [0, 1, 4, 6, 7, 10], kick: "x..x.x..x..x.x..", snare: "....x...x...x..x", hat: "x.xxx.xxx.xxx.xx", bass: [0, 5, -1, 0, 3, -1, 1, 4, 0, -1, 2, 5, -1, 3, 0, -1], welle: "sawtooth" },
];
const MENUE_MUSIK = { bpm: 104, root: 55, skala: [0, 3, 5, 7, 10], kick: "x.......x.......", snare: "....x.......x...", hat: "..x...x...x...x.", bass: [0, -1, -1, -1, 3, -1, -1, -1, 2, -1, -1, -1, 1, -1, -1, -1], welle: "triangle" };

export function erstelleTon() {
  let ac = null;
  let master, musikBus, sfxBus, dry, wet, filter, rollGain, rollFilter, grindGain;
  let rauschen = null;
  let lautMusik = 0.6;
  let lautFx = 0.8;
  let lied = null;
  let schritt = 0;
  let naechste = 0;
  let uhr = null;
  let parallel = false;
  let pausiert = false;

  function init() {
    if (ac) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = 0.9;
    const komp = ac.createDynamicsCompressor();
    master.connect(komp).connect(ac.destination);
    musikBus = ac.createGain();
    sfxBus = ac.createGain();
    sfxBus.connect(master);
    dry = ac.createGain();
    wet = ac.createGain();
    wet.gain.value = 0;
    const verz = ac.createWaveShaper();
    const kurve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      const x = (i / 1023) * 2 - 1;
      kurve[i] = Math.tanh(x * 6) * 0.8;
    }
    verz.curve = kurve;
    filter = ac.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    filter.Q.value = 6;
    musikBus.connect(dry).connect(master);
    musikBus.connect(verz).connect(filter).connect(wet).connect(master);
    // Rauschen als Quelle für Rollen, Grind, Snare …
    rauschen = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = rauschen.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // Dauerschleifen: Rollen und Grinden
    const rollQ = ac.createBufferSource();
    rollQ.buffer = rauschen;
    rollQ.loop = true;
    rollFilter = ac.createBiquadFilter();
    rollFilter.type = "lowpass";
    rollFilter.frequency.value = 380;
    rollGain = ac.createGain();
    rollGain.gain.value = 0;
    rollQ.connect(rollFilter).connect(rollGain).connect(sfxBus);
    rollQ.start();
    const grQ = ac.createBufferSource();
    grQ.buffer = rauschen;
    grQ.loop = true;
    const grF = ac.createBiquadFilter();
    grF.type = "bandpass";
    grF.frequency.value = 2600;
    grF.Q.value = 4;
    grindGain = ac.createGain();
    grindGain.gain.value = 0;
    grQ.connect(grF).connect(grindGain).connect(sfxBus);
    grQ.start();
    setzeLautstaerke(lautMusik, lautFx);
    return true;
  }

  function setzeLautstaerke(m, f) {
    lautMusik = m;
    lautFx = f;
    if (!ac) return;
    musikBus.gain.setTargetAtTime(m * 0.55, ac.currentTime, 0.05);
    sfxBus.gain.setTargetAtTime(f, ac.currentTime, 0.05);
  }

  // ---------- Bausteine ----------
  function ton(freq, start, dauer, { welle = "sine", laut = 0.3, ziel = null, bus = sfxBus, attack = 0.005 } = {}) {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = welle;
    o.frequency.setValueAtTime(freq, start);
    if (ziel) o.frequency.exponentialRampToValueAtTime(Math.max(20, ziel), start + dauer);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(laut, start + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dauer);
    o.connect(g).connect(bus);
    o.start(start);
    o.stop(start + dauer + 0.02);
  }
  function rausch(start, dauer, { typ = "bandpass", freq = 1200, ziel = null, q = 1, laut = 0.3, bus = sfxBus } = {}) {
    const s = ac.createBufferSource();
    s.buffer = rauschen;
    const f = ac.createBiquadFilter();
    f.type = typ;
    f.frequency.setValueAtTime(freq, start);
    if (ziel) f.frequency.exponentialRampToValueAtTime(ziel, start + dauer);
    f.Q.value = q;
    const g = ac.createGain();
    g.gain.setValueAtTime(laut, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dauer);
    s.connect(f).connect(g).connect(bus);
    s.start(start, Math.random() * 1.5);
    s.stop(start + dauer + 0.02);
  }

  // ---------- Effekte ----------
  function fx(name, opt = {}) {
    if (!ac || pausiert) return;
    const t = ac.currentTime + 0.005;
    switch (name) {
      case "ollie":
        rausch(t, 0.07, { freq: 1500, q: 2, laut: 0.5 });
        ton(150, t, 0.12, { ziel: 60, laut: 0.5 });
        break;
      case "land":
        ton(95, t, 0.16, { ziel: 40, laut: opt.hart ? 0.7 : 0.45 });
        rausch(t, 0.08, { typ: "lowpass", freq: 900, laut: 0.4 });
        break;
      case "trickStart":
        rausch(t, 0.24, { freq: 500, ziel: 2600, q: 3, laut: 0.25 });
        break;
      case "trick":
        ton(880, t, 0.08, { welle: "triangle", laut: 0.15 });
        ton(1320, t + 0.05, 0.1, { welle: "triangle", laut: 0.12 });
        break;
      case "grind":
        ton(1100, t, 0.1, { welle: "square", laut: 0.1 });
        ton(1650, t, 0.12, { welle: "square", laut: 0.06 });
        rausch(t, 0.1, { freq: 3000, q: 5, laut: 0.4 });
        break;
      case "combo": {
        const n = Math.min(8, opt.n || 1);
        for (let i = 0; i < Math.min(5, n); i++) ton(523 * Math.pow(1.26, i), t + i * 0.06, 0.12, { welle: "square", laut: 0.08 });
        break;
      }
      case "tropfen":
        ton(opt.bonus ? 1500 : 1180, t, 0.08, { welle: "triangle", ziel: opt.bonus ? 2400 : 1760, laut: 0.18 });
        break;
      case "sturz":
        rausch(t, 0.35, { typ: "lowpass", freq: 2000, ziel: 200, laut: 0.7 });
        ton(420, t, 0.55, { welle: "sawtooth", ziel: 70, laut: 0.18 });
        ton(300, t + 0.25, 0.3, { welle: "sine", ziel: 600, laut: 0.2 });
        break;
      case "riss":
        ton(180, t, 0.6, { welle: "sawtooth", ziel: 1800, laut: 0.18 });
        rausch(t, 0.7, { freq: 300, ziel: 5000, q: 2, laut: 0.35 });
        rausch(t + 0.55, 0.25, { typ: "highpass", freq: 3000, laut: 0.4 });
        break;
      case "zurueck":
        ton(1400, t, 0.5, { welle: "sawtooth", ziel: 120, laut: 0.15 });
        rausch(t, 0.5, { freq: 4000, ziel: 300, q: 2, laut: 0.3 });
        break;
      case "warn":
        ton(1760, t, 0.05, { welle: "square", laut: 0.06 });
        break;
      case "presse":
        ton(70, t, 0.25, { ziel: 30, laut: 0.6 });
        rausch(t, 0.18, { typ: "lowpass", freq: 600, laut: 0.5 });
        break;
      case "flacker":
        ton(60, t, 0.12, { welle: "square", laut: 0.08 });
        rausch(t, 0.1, { typ: "highpass", freq: 5000, laut: 0.12 });
        break;
      case "knack":
        rausch(t, 0.12, { typ: "highpass", freq: 1800, laut: 0.4 });
        break;
      case "ziel":
        [523, 659, 784, 1046].forEach((f, i) => ton(f, t + i * 0.1, 0.25, { welle: "square", laut: 0.1 }));
        break;
      case "aus":
        [392, 330, 262].forEach((f, i) => ton(f, t + i * 0.16, 0.3, { welle: "triangle", laut: 0.18 }));
        break;
      case "klick":
        ton(900, t, 0.04, { welle: "square", laut: 0.06 });
        break;
      case "stern":
        ton(660 * Math.pow(1.335, opt.n || 0), t, 0.18, { welle: "triangle", ziel: 1320 * Math.pow(1.335, opt.n || 0), laut: 0.2 });
        break;
      case "kauf":
        [784, 988, 1175, 1568].forEach((f, i) => ton(f, t + i * 0.06, 0.12, { welle: "triangle", laut: 0.16 }));
        break;
      case "nein":
        ton(160, t, 0.18, { welle: "square", laut: 0.08 });
        break;
      default:
    }
  }

  // Dauergeräusche je Bild: Rollen (nach Tempo) und Grinden
  function dauer(zustand, tempo) {
    if (!ac) return;
    const t = ac.currentTime;
    const rollt = zustand === "boden" && !pausiert;
    rollGain.gain.setTargetAtTime(rollt ? Math.min(0.32, 0.12 + tempo / 2600) : 0, t, 0.04);
    rollFilter.frequency.setTargetAtTime(250 + tempo * 0.6, t, 0.1);
    grindGain.gain.setTargetAtTime(zustand === "grind" && !pausiert ? 0.22 : 0, t, 0.03);
  }

  // ---------- Musik ----------
  function spieleSchritt(zeit) {
    const L = lied;
    const i = schritt % 16;
    const bus = musikBus;
    if (L.kick[i] === "x") ton(140, zeit, 0.22, { ziel: 42, laut: 0.75, bus });
    if (L.snare[i] === "x") {
      rausch(zeit, 0.15, { typ: "highpass", freq: 1400, laut: 0.35, bus });
      ton(220, zeit, 0.08, { welle: "triangle", ziel: 140, laut: 0.18, bus });
    }
    if (L.hat[i] === "x") rausch(zeit, 0.035, { typ: "highpass", freq: 7000, laut: 0.12, bus });
    const b = L.bass[i];
    if (b >= 0) {
      const takt = Math.floor(schritt / 16) % 4;
      const stufe = L.skala[(b + (takt === 2 ? 2 : 0)) % L.skala.length];
      const f = L.root * Math.pow(2, stufe / 12);
      const o = ac.createOscillator();
      const flt = ac.createBiquadFilter();
      const g = ac.createGain();
      o.type = L.welle;
      o.frequency.value = f;
      flt.type = "lowpass";
      flt.frequency.setValueAtTime(1400, zeit);
      flt.frequency.exponentialRampToValueAtTime(220, zeit + 0.18);
      g.gain.setValueAtTime(0.0001, zeit);
      g.gain.exponentialRampToValueAtTime(0.28, zeit + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, zeit + 0.22);
      o.connect(flt).connect(g).connect(bus);
      o.start(zeit);
      o.stop(zeit + 0.25);
    }
    // Akkord-Stich alle zwei Takte
    if (i === 0 && Math.floor(schritt / 16) % 2 === 1) {
      for (const st of [0, 2, 4]) {
        const f = L.root * 4 * Math.pow(2, L.skala[st % L.skala.length] / 12);
        ton(f, zeit, 0.4, { welle: "triangle", laut: 0.05, bus });
      }
    }
  }
  function takt() {
    if (!ac || !lied || pausiert) return;
    const sek = 60 / lied.bpm / 4;
    while (naechste < ac.currentTime + 0.12) {
      spieleSchritt(Math.max(naechste, ac.currentTime));
      naechste += sek;
      schritt++;
    }
  }
  function musik(welt) {
    if (!ac) return;
    const neu = welt == null ? MENUE_MUSIK : WELT_MUSIK[welt];
    if (lied === neu && uhr) return;
    lied = neu;
    schritt = 0;
    naechste = ac.currentTime + 0.05;
    if (!uhr) uhr = setInterval(takt, 25);
  }
  function setParallel(an) {
    parallel = an;
    if (!ac) return;
    const t = ac.currentTime;
    dry.gain.setTargetAtTime(an ? 0.15 : 1, t, 0.08);
    wet.gain.setTargetAtTime(an ? 0.9 : 0, t, 0.08);
    filter.frequency.setTargetAtTime(an ? 700 + Math.random() * 600 : 900, t, 0.1);
  }

  return {
    init,
    fx,
    dauer,
    musik,
    setParallel,
    setzeLautstaerke,
    pause(an) {
      pausiert = an;
      if (!ac) return;
      if (an) {
        rollGain.gain.setTargetAtTime(0, ac.currentTime, 0.02);
        grindGain.gain.setTargetAtTime(0, ac.currentTime, 0.02);
      } else naechste = ac.currentTime + 0.05;
    },
    stop() {
      clearInterval(uhr);
      uhr = null;
      if (ac) ac.close().catch(() => {});
      ac = null;
    },
    get parallel() {
      return parallel;
    },
  };
}
