// Klang des Schlagzeugs: vier Kits.
// - „Black Pearl“ und „Red Zeppelin“: echte Aufnahmen aus den AVL-Drumkits von Glen MacArthur
//   (CC BY-SA 3.0, siehe public/drums/LIZENZ.txt), je Teil drei Anschlagstärken.
// - „Elektro“ (wie ein klassischer Drumcomputer) und „8-Bit“ (Spielkonsolen-Klang) werden im Browser erzeugt.

export const KITS = [
  { id: "black-pearl", name: "Black Pearl (Akustik)", samples: true, farben: ["#0e0d14", "#4a4562", "#2a2738", "#08070c"], logo: "#d8d2ea" },
  { id: "red-zeppelin", name: "Red Zeppelin (Rock)", samples: true, farben: ["#3a0d22", "#b8325e", "#8a1f45", "#2a0818"], logo: "#8a1f45" },
  { id: "elektro", name: "Elektro (Drumcomputer)", samples: false, farben: ["#06262b", "#1fb5a8", "#0f6a66", "#031416"], logo: "#1fb5a8" },
  { id: "retro", name: "8-Bit (Retro)", samples: false, farben: ["#1d1240", "#7f5fff", "#4b35a8", "#120a2a"], logo: "#7f5fff" },
];
export const PADS = ["kick", "snare", "tom1", "tom2", "floor", "hihat", "hihatOffen", "crash", "ride"];
const STAERKEN = [3, 4, 5];
// Stereo-Position aus Sicht des Publikums (Hi-Hat links, Ride rechts)
const PAN = { kick: 0, snare: -0.18, tom1: -0.1, tom2: 0.1, floor: 0.32, hihat: -0.38, hihatOffen: -0.38, crash: -0.42, ride: 0.45 };

export function erstelleKlang() {
  let ac = null;
  let master = null;
  let hall = null;
  let rauschen = null;
  let krach = null; // grobes Rauschen für 8-Bit
  let offeneHihat = null;
  const puffer = {}; // kitId → { pad: [AudioBuffer, …] }
  const laden = {}; // kitId → Promise

  function audio() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
      const comp = ac.createDynamicsCompressor();
      comp.threshold.value = -10;
      comp.knee.value = 8;
      comp.ratio.value = 3;
      comp.attack.value = 0.003;
      comp.release.value = 0.12;
      master = ac.createGain();
      master.gain.value = 0.9;
      master.connect(comp);
      comp.connect(ac.destination);
      // kleiner Raumhall (nur für die erzeugten Kits, die Aufnahmen haben ihren Raum schon)
      hall = ac.createConvolver();
      hall.buffer = impuls(0.7, 3.2);
      const hallPegel = ac.createGain();
      hallPegel.gain.value = 0.16;
      hall.connect(hallPegel).connect(master);
      const len = ac.sampleRate * 2;
      rauschen = ac.createBuffer(1, len, ac.sampleRate);
      krach = ac.createBuffer(1, len, ac.sampleRate);
      const d = rauschen.getChannelData(0);
      const k = krach.getChannelData(0);
      let halten = 0;
      for (let i = 0; i < len; i++) {
        d[i] = Math.random() * 2 - 1;
        if (i % 6 === 0) halten = Math.random() < 0.5 ? -1 : 1; // 1-Bit-Rauschen, grob gerastert
        k[i] = halten;
      }
    }
    if (ac.state === "suspended") ac.resume();
    return ac;
  }
  const jetzt = () => (ac ? ac.currentTime : performance.now() / 1000);

  function impuls(dauer, abfall) {
    const n = Math.floor(ac.sampleRate * dauer);
    const b = ac.createBuffer(2, n, ac.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, abfall);
    }
    return b;
  }

  // ---------- Aufnahmen ----------
  function ladeKit(id) {
    const kit = KITS.find((k) => k.id === id);
    if (!kit?.samples) return Promise.resolve(true);
    if (laden[id]) return laden[id];
    audio();
    const ziel = (puffer[id] = {});
    laden[id] = Promise.all(
      PADS.flatMap((pad) =>
        STAERKEN.map(async (s, i) => {
          const res = await fetch(`/drums/${id}/${pad}-${s}.mp3`);
          if (!res.ok) throw new Error(`${pad}-${s}: HTTP ${res.status}`);
          const daten = await res.arrayBuffer();
          const b = await new Promise((ok, fehler) => ac.decodeAudioData(daten, ok, fehler));
          (ziel[pad] ||= [])[i] = b;
        }),
      ),
    ).then(
      () => true,
      () => {
        delete laden[id];
        return false;
      },
    );
    return laden[id];
  }
  const kitBereit = (id) => !KITS.find((k) => k.id === id)?.samples || Boolean(puffer[id]?.ride?.[2] && puffer[id]?.kick?.[2]);

  function ausgang(pad, mitHall) {
    const p = ac.createStereoPanner ? ac.createStereoPanner() : null;
    if (p) {
      p.pan.value = PAN[pad] ?? 0;
      p.connect(master);
      if (mitHall) p.connect(hall);
      return p;
    }
    return master;
  }

  function spieleAufnahme(id, pad, t, staerke) {
    const liste = puffer[id][pad];
    // laut angeschlagen: meist die lauteste Stufe, ab und zu eine leisere (klingt lebendiger)
    const r = Math.random() * staerke;
    const i = r > 0.4 ? 2 : r > 0.15 ? 1 : 0;
    const b = liste[i] || liste[2];
    const q = ac.createBufferSource();
    q.buffer = b;
    q.playbackRate.value = 0.99 + Math.random() * 0.02;
    const g = ac.createGain();
    g.gain.value = (0.82 + Math.random() * 0.12) * (pad === "kick" ? 1.1 : 1);
    q.connect(g).connect(ausgang(pad, false));
    q.start(t);
    return g;
  }

  // ---------- Bausteine für erzeugte Klänge ----------
  function huelle(g, t, spitze, dauer, anstieg = 0.002) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(spitze, t + anstieg);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
  }
  function geraeusch(ziel, t, dauer, typ, freq, q, spitze, quelle = rauschen) {
    const s = ac.createBufferSource();
    s.buffer = quelle;
    const f = ac.createBiquadFilter();
    f.type = typ;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ac.createGain();
    huelle(g, t, spitze, dauer);
    s.connect(f).connect(g).connect(ziel);
    s.start(t, Math.random() * 1.5);
    s.stop(t + dauer + 0.05);
    return g;
  }
  function ton(ziel, t, typ, f0, f1, dauer, spitze, fall, anstieg = 0.002) {
    const o = ac.createOscillator();
    o.type = typ;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + fall);
    const g = ac.createGain();
    huelle(g, t, spitze, dauer, anstieg);
    o.connect(g).connect(ziel);
    o.start(t);
    o.stop(t + dauer + 0.05);
    return g;
  }
  let saettigung = null;
  function warm() {
    if (!saettigung) {
      saettigung = ac.createWaveShaper();
      const n = 1024;
      const kurve = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * 2 - 1;
        kurve[i] = Math.tanh(2.2 * x) / Math.tanh(2.2);
      }
      saettigung.curve = kurve;
      saettigung.connect(master);
      saettigung.connect(hall);
    }
    return saettigung;
  }
  // metallischer Klang aus sechs Rechteck-Schwingungen (Prinzip der klassischen Drumcomputer)
  function metall(ziel, t, dauer, spitze, basis, hochpass, band = 10000) {
    const g = ac.createGain();
    huelle(g, t, spitze, dauer, 0.001);
    const bp = ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = band;
    bp.Q.value = 0.6;
    const hp = ac.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = hochpass;
    for (const r of [2, 3, 4.16, 5.43, 6.79, 8.21]) {
      const o = ac.createOscillator();
      o.type = "square";
      o.frequency.value = basis * r;
      o.connect(bp);
      o.start(t);
      o.stop(t + dauer + 0.05);
    }
    bp.connect(hp).connect(g).connect(ziel);
    return g;
  }

  const ELEKTRO = {
    kick: (t, a) => {
      const z = warm();
      ton(z, t, "sine", 150, 47, 0.9, 0.95 * a, 0.07);
      ton(z, t, "triangle", 1200, 200, 0.012, 0.25 * a, 0.01);
    },
    snare: (t, a) => {
      const z = ausgang("snare", true);
      ton(z, t, "sine", 330, 300, 0.09, 0.35 * a, 0.05);
      ton(z, t, "sine", 185, 175, 0.14, 0.45 * a, 0.05);
      geraeusch(z, t, 0.22, "highpass", 1800, 0.8, 0.5 * a);
    },
    hihat: (t, a) => metall(ausgang("hihat", true), t, 0.05, 0.34 * a, 40, 7500),
    hihatOffen: (t, a) => metall(ausgang("hihatOffen", true), t, 0.42, 0.3 * a, 40, 7500),
    tom1: (t, a) => ton(ausgang("tom1", true), t, "sine", 240, 170, 0.5, 0.8 * a, 0.25),
    tom2: (t, a) => ton(ausgang("tom2", true), t, "sine", 175, 120, 0.6, 0.85 * a, 0.3),
    floor: (t, a) => ton(ausgang("floor", true), t, "sine", 120, 78, 0.8, 0.9 * a, 0.35),
    crash: (t, a) => {
      const z = ausgang("crash", true);
      metall(z, t, 1.6, 0.22 * a, 52, 5500, 8000);
      geraeusch(z, t, 1.4, "highpass", 7000, 0.5, 0.2 * a);
    },
    ride: (t, a) => {
      const z = ausgang("ride", true);
      metall(z, t, 1.1, 0.12 * a, 61, 7000, 9000);
      ton(z, t, "square", 2350, 2350, 0.35, 0.03 * a, 0.3);
    },
  };

  const RETRO = {
    kick: (t, a) => ton(ausgang("kick", false), t, "square", 160, 40, 0.18, 0.4 * a, 0.12),
    snare: (t, a) => {
      const z = ausgang("snare", false);
      geraeusch(z, t, 0.16, "lowpass", 9000, 0.5, 0.42 * a, krach);
      ton(z, t, "triangle", 240, 120, 0.08, 0.4 * a, 0.06);
    },
    hihat: (t, a) => geraeusch(ausgang("hihat", false), t, 0.04, "highpass", 6000, 0.5, 0.3 * a, krach),
    hihatOffen: (t, a) => geraeusch(ausgang("hihatOffen", false), t, 0.3, "highpass", 6000, 0.5, 0.26 * a, krach),
    tom1: (t, a) => ton(ausgang("tom1", false), t, "square", 330, 160, 0.2, 0.28 * a, 0.15),
    tom2: (t, a) => ton(ausgang("tom2", false), t, "square", 250, 120, 0.22, 0.28 * a, 0.17),
    floor: (t, a) => ton(ausgang("floor", false), t, "triangle", 180, 70, 0.3, 0.55 * a, 0.22),
    crash: (t, a) => geraeusch(ausgang("crash", false), t, 1.0, "highpass", 3000, 0.5, 0.3 * a, krach),
    ride: (t, a) => ton(ausgang("ride", false), t, "square", 1568, 1568, 0.25, 0.08 * a, 0.2),
  };

  // Schlag auf ein Teil. staerke 0..1 (1 = voll)
  function spiele(kitId, pad, staerke = 1) {
    if (!audio()) return;
    const t = ac.currentTime;
    if (pad === "hihat" && offeneHihat) {
      // geschlossene Hi-Hat stoppt die offene
      offeneHihat.gain.cancelScheduledValues(t);
      offeneHihat.gain.setTargetAtTime(0.0001, t, 0.015);
      offeneHihat = null;
    }
    const kit = KITS.find((k) => k.id === kitId) || KITS[0];
    const a = 0.85 + Math.random() * 0.15 * staerke;
    let g;
    if (kit.samples && kitBereit(kit.id)) g = spieleAufnahme(kit.id, pad, t, staerke);
    else g = (kit.id === "retro" ? RETRO : ELEKTRO)[pad](t, a);
    if (pad === "hihatOffen") offeneHihat = g;
  }

  function klick(t, betont) {
    if (!ac) return;
    ton(master, t, "square", betont ? 1760 : 1180, betont ? 1760 : 1180, 0.035, betont ? 0.2 : 0.12, 0.03);
  }

  return {
    audio,
    jetzt,
    spiele,
    klick,
    ladeKit,
    kitBereit,
    get zeit() {
      return ac ? ac.currentTime : null;
    },
    schliessen() {
      ac?.close();
    },
  };
}
