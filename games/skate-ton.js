// Stick-Skater: Geräusche und Musik, komplett mit der Web-Audio-API erzeugt (keine Audiodateien,
// keine fremden Lieder). Die Musik ist ein kleiner Sequenzer mit eigener Akkordfolge je Welt.

const KEY = "skate-einstellungen-v1";
export function ladeEinstellungen() {
  let e = null;
  try {
    e = JSON.parse(localStorage.getItem(KEY) || "null");
  } catch {
    e = null;
  }
  return { ton: true, musik: true, vibration: true, ...(e || {}) };
}
export function speichereEinstellungen(e) {
  try {
    localStorage.setItem(KEY, JSON.stringify(e));
  } catch {
    /* ohne Speichern */
  }
}

// Musik je Welt: Tempo, Grundton (MIDI), Tonleiter, Akkordfolge (Stufen), Klangfarbe
const STIL = {
  menu: { bpm: 92, grund: 57, leiter: [0, 2, 3, 5, 7, 8, 10], akkorde: [0, 5, 3, 4], welle: "triangle", trommel: 0 },
  stadt: { bpm: 104, grund: 50, leiter: [0, 2, 3, 5, 7, 8, 10], akkorde: [0, 5, 2, 6], welle: "square", trommel: 2 },
  strand: { bpm: 112, grund: 55, leiter: [0, 2, 4, 5, 7, 9, 11], akkorde: [0, 4, 5, 3], welle: "triangle", trommel: 1 },
  dschungel: { bpm: 98, grund: 52, leiter: [0, 3, 5, 7, 10, 12, 15], akkorde: [0, 3, 1, 4], welle: "triangle", trommel: 3 },
  eis: { bpm: 88, grund: 59, leiter: [0, 2, 4, 7, 9, 11, 14], akkorde: [0, 5, 3, 4], welle: "sine", trommel: 0 },
  hoelle: { bpm: 126, grund: 45, leiter: [0, 1, 3, 5, 7, 8, 10], akkorde: [0, 1, 5, 4], welle: "sawtooth", trommel: 2 },
  himmel: { bpm: 96, grund: 60, leiter: [0, 2, 4, 5, 7, 9, 11], akkorde: [0, 3, 4, 5], welle: "sine", trommel: 1 },
  weltall: { bpm: 100, grund: 48, leiter: [0, 2, 3, 7, 8, 10, 14], akkorde: [0, 5, 4, 2], welle: "square", trommel: 3 },
};
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

export function erzeugeTon() {
  const E = ladeEinstellungen();
  let ac = null;
  let haupt, sfx, musikBus, rauschPuffer;
  let roll = null; // Dauerrauschen der Rollen
  let seq = null; // laufende Musik
  let gewuenscht = null; // welche Musik laufen soll

  function bereit() {
    if (ac) {
      if (ac.state === "suspended") ac.resume().catch(() => {});
      return true;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ac = new AC();
    haupt = ac.createGain();
    haupt.gain.value = 0.9;
    // sanfter Limiter, damit nichts übersteuert
    const komp = ac.createDynamicsCompressor();
    komp.threshold.value = -14;
    komp.ratio.value = 6;
    haupt.connect(komp).connect(ac.destination);
    sfx = ac.createGain();
    sfx.gain.value = E.ton ? 0.8 : 0;
    sfx.connect(haupt);
    musikBus = ac.createGain();
    musikBus.gain.value = E.musik ? 0.32 : 0;
    musikBus.connect(haupt);
    rauschPuffer = ac.createBuffer(1, ac.sampleRate * 1.5, ac.sampleRate);
    const d = rauschPuffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    if (gewuenscht) starteMusik(gewuenscht);
    return true;
  }

  // ---------- Bausteine ----------
  function rauschen(ziel, t, dauer, { typ = "bandpass", f = 1200, q = 1, laut = 0.5, f2 = null } = {}) {
    const q0 = ac.createBufferSource();
    q0.buffer = rauschPuffer;
    const fl = ac.createBiquadFilter();
    fl.type = typ;
    fl.frequency.setValueAtTime(f, t);
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dauer);
    fl.Q.value = q;
    const g = ac.createGain();
    g.gain.setValueAtTime(laut, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dauer);
    q0.connect(fl).connect(g).connect(ziel);
    q0.start(t, Math.random() * 0.5);
    q0.stop(t + dauer + 0.05);
  }
  function ton(ziel, t, frequenz, dauer, { welle = "sine", laut = 0.3, bis = null, angriff = 0.005 } = {}) {
    const o = ac.createOscillator();
    o.type = welle;
    o.frequency.setValueAtTime(frequenz, t);
    if (bis) o.frequency.exponentialRampToValueAtTime(bis, t + dauer);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(laut, t + angriff);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
    o.connect(g).connect(ziel);
    o.start(t);
    o.stop(t + dauer + 0.05);
  }
  const jetzt = () => ac.currentTime + 0.005;
  const vib = (ms) => E.vibration && navigator.vibrate?.(ms);

  // ---------- Geräusche ----------
  const S = {
    ollie() {
      if (!bereit()) return;
      const t = jetzt();
      rauschen(sfx, t, 0.07, { typ: "highpass", f: 1800, laut: 0.5 });
      ton(sfx, t, 170, 0.12, { welle: "triangle", laut: 0.45, bis: 70 });
    },
    landen(stark = 1) {
      if (!bereit()) return;
      const t = jetzt();
      ton(sfx, t, 110, 0.14, { welle: "sine", laut: 0.5 * stark, bis: 45 });
      rauschen(sfx, t, 0.09, { typ: "bandpass", f: 900, q: 0.8, laut: 0.35 * stark });
      if (stark > 0.8) vib(18);
    },
    muenze() {
      if (!bereit()) return;
      const t = jetzt();
      ton(sfx, t, 988, 0.08, { welle: "square", laut: 0.09 });
      ton(sfx, t + 0.06, 1319, 0.16, { welle: "square", laut: 0.09 });
    },
    trick() {
      if (!bereit()) return;
      rauschen(sfx, jetzt(), 0.28, { typ: "bandpass", f: 500, f2: 2600, q: 2, laut: 0.28 });
    },
    grindStart() {
      if (!bereit()) return;
      const t = jetzt();
      rauschen(sfx, t, 0.12, { typ: "highpass", f: 3000, laut: 0.35 });
      ton(sfx, t, 2400, 0.1, { welle: "sawtooth", laut: 0.05 });
    },
    sturz() {
      if (!bereit()) return;
      const t = jetzt();
      rauschen(sfx, t, 0.5, { typ: "lowpass", f: 1800, f2: 200, laut: 0.6 });
      ton(sfx, t, 300, 0.45, { welle: "sawtooth", laut: 0.12, bis: 60 });
      vib([40, 30, 60]);
    },
    ring() {
      if (!bereit()) return;
      const t = jetzt();
      [659, 880, 1175, 1568].forEach((f, i) => ton(sfx, t + i * 0.06, f, 0.3, { welle: "triangle", laut: 0.14 }));
      rauschen(sfx, t, 0.4, { typ: "bandpass", f: 400, f2: 3000, q: 1.5, laut: 0.25 });
    },
    boost() {
      if (!bereit()) return;
      const t = jetzt();
      ton(sfx, t, 200, 0.6, { welle: "sawtooth", laut: 0.08, bis: 900 });
      rauschen(sfx, t, 0.6, { typ: "bandpass", f: 300, f2: 2400, q: 1, laut: 0.3 });
    },
    einschlag() {
      if (!bereit()) return;
      const t = jetzt();
      ton(sfx, t, 90, 0.5, { welle: "sine", laut: 0.7, bis: 30 });
      rauschen(sfx, t, 0.6, { typ: "lowpass", f: 1200, f2: 120, laut: 0.55 });
      vib(30);
    },
    blitz() {
      if (!bereit()) return;
      const t = jetzt();
      rauschen(sfx, t, 0.9, { typ: "lowpass", f: 3000, f2: 90, laut: 0.7 });
    },
    ziel() {
      if (!bereit()) return;
      const t = jetzt();
      [523, 659, 784, 1047, 784, 1047].forEach((f, i) => ton(sfx, t + i * 0.11, f, i === 5 ? 0.7 : 0.18, { welle: "square", laut: 0.1 }));
      vib([30, 40, 30]);
    },
    stern(i = 0) {
      if (!bereit()) return;
      const t = jetzt();
      const f = [784, 988, 1319][i] || 1319;
      ton(sfx, t, f, 0.5, { welle: "triangle", laut: 0.18 });
      ton(sfx, t + 0.05, f * 1.5, 0.4, { welle: "sine", laut: 0.08 });
    },
    klick() {
      if (!bereit()) return;
      ton(sfx, jetzt(), 1400, 0.04, { welle: "square", laut: 0.05 });
    },
    kauf() {
      if (!bereit()) return;
      const t = jetzt();
      [880, 1109, 1319].forEach((f, i) => ton(sfx, t + i * 0.07, f, 0.2, { welle: "square", laut: 0.08 }));
    },
  };

  // ---------- Rollgeräusch (läuft dauernd, Lautstärke nach Tempo) ----------
  function rollen(k, amBoden, aufRail) {
    if (!ac || !E.ton) return;
    if (!roll) {
      const q = ac.createBufferSource();
      q.buffer = rauschPuffer;
      q.loop = true;
      const fl = ac.createBiquadFilter();
      fl.type = "bandpass";
      fl.Q.value = 0.7;
      const g = ac.createGain();
      g.gain.value = 0;
      q.connect(fl).connect(g).connect(sfx);
      q.start();
      roll = { q, fl, g };
    }
    const t = ac.currentTime;
    const laut = amBoden ? (aufRail ? 0.22 : 0.05 + 0.11 * k) : 0;
    roll.g.gain.setTargetAtTime(laut, t, 0.05);
    roll.fl.frequency.setTargetAtTime(aufRail ? 3200 + Math.random() * 800 : 300 + 500 * k, t, 0.05);
    roll.fl.Q.setTargetAtTime(aufRail ? 4 : 0.7, t, 0.05);
  }

  // ---------- Musik ----------
  function starteMusik(art) {
    gewuenscht = art;
    if (!ac) return;
    if (seq?.art === art) return;
    stoppeMusik(true);
    const st = STIL[art] || STIL.menu;
    const schritt = 60 / st.bpm / 4; // Sechzehntel
    const bus = ac.createGain();
    bus.gain.value = 0;
    bus.gain.setTargetAtTime(1, ac.currentTime, 0.6);
    const tief = ac.createBiquadFilter();
    tief.type = "lowpass";
    tief.frequency.value = st.welle === "sawtooth" ? 1600 : 2600;
    bus.connect(tief).connect(musikBus);
    // Melodie-Motiv: je Welt fest (aus dem Namen abgeleitet), damit jede Welt wiedererkennbar ist
    let saat = [...art].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
    const zufall = () => ((saat = (saat * 1103515245 + 12345) >>> 0) / 4294967296);
    const motiv = Array.from({ length: 16 }, (_, i) => (i % 2 === 0 || zufall() < 0.35 ? Math.floor(zufall() * 5) : null));
    const stufe = (akk, n) => {
      const l = st.leiter;
      const i = akk + n;
      return l[((i % l.length) + l.length) % l.length] + 12 * Math.floor(i / l.length);
    };
    let n = 0;
    let naechste = ac.currentTime + 0.1;
    const takt = () => {
      while (naechste < ac.currentTime + 0.25) {
        const s16 = n % 16;
        const akk = st.akkorde[Math.floor(n / 16) % st.akkorde.length];
        const t = naechste;
        // Bass auf 1 und 3 (plus Achtel-Antrieb bei schnellen Welten)
        if (s16 % 4 === 0 || (st.bpm > 110 && s16 % 2 === 0)) ton(bus, t, hz(st.grund - 12 + stufe(akk, 0)), schritt * 1.8, { welle: "triangle", laut: 0.34 });
        // Akkord-Flächen am Taktanfang
        if (s16 === 0) for (const k of [0, 2, 4]) ton(bus, t, hz(st.grund + stufe(akk, k)), schritt * 15, { welle: st.welle === "sawtooth" ? "sawtooth" : "triangle", laut: 0.05, angriff: 0.15 });
        // Melodie
        const m = motiv[s16];
        if (m !== null && Math.floor(n / 64) % 2 === 1) ton(bus, t, hz(st.grund + 12 + stufe(akk, m)), schritt * 1.6, { welle: st.welle, laut: st.welle === "sine" ? 0.12 : 0.06 });
        else if (m !== null && s16 % 4 === 2) ton(bus, t, hz(st.grund + 12 + stufe(akk, m + 2)), schritt * 1.2, { welle: "sine", laut: 0.06 });
        // Schlagzeug
        if (st.trommel) {
          if (s16 % 8 === 0 || (st.trommel === 2 && s16 === 10)) ton(bus, t, 140, 0.18, { welle: "sine", laut: 0.55, bis: 40 });
          if (s16 % 8 === 4) rauschen(bus, t, 0.12, { typ: "bandpass", f: 1800, q: 0.8, laut: 0.25 });
          if (s16 % 2 === 0 || st.trommel === 3) rauschen(bus, t, 0.03, { typ: "highpass", f: 7000, laut: s16 % 4 === 2 ? 0.12 : 0.06 });
        }
        naechste += schritt;
        n++;
      }
    };
    const id = setInterval(takt, 40);
    takt();
    seq = { art, id, bus };
  }
  function stoppeMusik(sofort = false) {
    if (!seq) return;
    clearInterval(seq.id);
    const b = seq.bus;
    if (ac) {
      b.gain.setTargetAtTime(0, ac.currentTime, sofort ? 0.05 : 0.4);
      setTimeout(() => b.disconnect(), 1500);
    }
    seq = null;
  }

  return {
    ...S,
    bereit,
    rollen,
    musik: starteMusik,
    musikAus() {
      gewuenscht = null;
      stoppeMusik();
    },
    pause() {
      if (roll && ac) roll.g.gain.setTargetAtTime(0, ac.currentTime, 0.03);
      ac?.suspend?.().catch?.(() => {});
    },
    weiter() {
      ac?.resume?.().catch?.(() => {});
    },
    einstellungen: E,
    setze(name, wert) {
      E[name] = wert;
      speichereEinstellungen(E);
      if (!ac) return;
      if (name === "ton") sfx.gain.setTargetAtTime(wert ? 0.8 : 0, ac.currentTime, 0.05);
      if (name === "musik") musikBus.gain.setTargetAtTime(wert ? 0.32 : 0, ac.currentTime, 0.1);
      if (name === "vibration" && wert) vib(30);
    },
    schliessen() {
      stoppeMusik(true);
      try {
        roll?.q.stop();
      } catch {
        /* schon gestoppt */
      }
      ac?.close?.().catch?.(() => {});
      ac = null;
      roll = null;
    },
  };
}
