// 2048: Gleiche Zahlen zusammenschieben. Leicht 5×5, Mittel 4×4, Schwer 3×3.
import { richtungsEingabe, overlayKlick, RICHTUNG } from "./eingabe.js";

export const HILFE = "Pfeiltasten, WASD oder Wischen · Ziel: die 2048-Kachel";

const STUFEN = { leicht: 5, mittel: 4, schwer: 3 };
const ZELLE = 104;
const LUECKE = 12;
const SLIDE_MS = 110;
const POP_MS = 140;

// Farben je Wert: von dunkel über lila zu gelb
const FARBEN = {
  2: ["#2a2733", "#e8e6f0"], 4: ["#353046", "#e8e6f0"], 8: ["#4a3c6e", "#ffffff"], 16: ["#5b4590", "#ffffff"],
  32: ["#6e4fb4", "#ffffff"], 64: ["#8a63d2", "#ffffff"], 128: ["#a37fe6", "#0f0e13"], 256: ["#b99cf2", "#0f0e13"],
  512: ["#d4b8ff", "#0f0e13"], 1024: ["#e9d891", "#0f0e13"], 2048: ["#f5d97a", "#0f0e13"],
};

// ---------- reine Logik (testbar) ----------
// kacheln: [{ id, wert, x, y }] → { kacheln, punkte, bewegt, geister }
export function schiebe(kacheln, n, richtung, neueId) {
  const d = RICHTUNG[richtung];
  const neu = [];
  const geister = [];
  let punkte = 0;
  let bewegt = false;
  const zelle = new Map(kacheln.map((k) => [`${k.x},${k.y}`, k]));

  for (let linie = 0; linie < n; linie++) {
    // Kacheln dieser Linie in Schieberichtung sortiert (die vorderste zuerst)
    const reihe = [];
    for (let i = 0; i < n; i++) {
      const pos = d.x !== 0 ? { x: d.x > 0 ? n - 1 - i : i, y: linie } : { x: linie, y: d.y > 0 ? n - 1 - i : i };
      const k = zelle.get(`${pos.x},${pos.y}`);
      if (k) reihe.push(k);
    }
    let ziel = 0;
    for (let i = 0; i < reihe.length; i++) {
      const k = reihe[i];
      const pos = d.x !== 0 ? { x: d.x > 0 ? n - 1 - ziel : ziel, y: linie } : { x: linie, y: d.y > 0 ? n - 1 - ziel : ziel };
      const naechste = reihe[i + 1];
      if (naechste && naechste.wert === k.wert) {
        const wert = k.wert * 2;
        punkte += wert;
        neu.push({ id: neueId(), wert, x: pos.x, y: pos.y, vonX: k.x, vonY: k.y, verschmolzen: true });
        geister.push({ ...k, nachX: pos.x, nachY: pos.y }, { ...naechste, nachX: pos.x, nachY: pos.y });
        bewegt = true;
        i++;
      } else {
        if (k.x !== pos.x || k.y !== pos.y) bewegt = true;
        neu.push({ id: k.id, wert: k.wert, x: pos.x, y: pos.y, vonX: k.x, vonY: k.y });
      }
      ziel++;
    }
  }
  return { kacheln: neu, punkte, bewegt, geister };
}

export function zugMoeglich(kacheln, n) {
  if (kacheln.length < n * n) return true;
  const z = new Map(kacheln.map((k) => [`${k.x},${k.y}`, k.wert]));
  for (const k of kacheln) if (z.get(`${k.x + 1},${k.y}`) === k.wert || z.get(`${k.x},${k.y + 1}`) === k.wert) return true;
  return false;
}

// ---------- Spiel ----------
export function start({ canvas, stufe, passeCanvas, status, nachricht, ergebnis }) {
  const N = STUFEN[stufe] || 4;
  const W = N * ZELLE + (N + 1) * LUECKE;
  const ctx = passeCanvas(canvas, W, W);

  let kacheln, geister, punkte, naechsteId, vorbei, gewonnenGezeigt, animStart, raf, sperre;
  const neueId = () => ++naechsteId;

  function zufallsKachel() {
    const frei = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!kacheln.some((k) => k.x === x && k.y === y)) frei.push({ x, y });
    if (!frei.length) return;
    const f = frei[Math.floor(Math.random() * frei.length)];
    kacheln.push({ id: neueId(), wert: Math.random() < 0.9 ? 2 : 4, x: f.x, y: f.y, vonX: f.x, vonY: f.y, neu: true });
  }

  function neu() {
    kacheln = [];
    geister = [];
    punkte = 0;
    naechsteId = 0;
    vorbei = false;
    gewonnenGezeigt = false;
    zufallsKachel();
    zufallsKachel();
    zeigeStatus();
    animiere();
  }

  function zeigeStatus() {
    const max = Math.max(0, ...kacheln.map((k) => k.wert));
    status(`${punkte} Pkt · höchste Kachel ${max}`);
  }

  function zug(richtung) {
    if (vorbei || sperre) return;
    const r = schiebe(kacheln, N, richtung, neueId);
    if (!r.bewegt) return;
    kacheln = r.kacheln;
    geister = r.geister;
    punkte += r.punkte;
    zufallsKachel();
    zeigeStatus();
    animiere();
    sperre = true;
    setTimeout(() => {
      sperre = false;
      if (!gewonnenGezeigt && kacheln.some((k) => k.wert >= 2048)) {
        gewonnenGezeigt = true;
        nachricht(`<p class="big">2048!</p><p>Geschafft. Du kannst weiterspielen und den Highscore erhöhen.</p><p class="small">Klick zum Weiterspielen</p>`);
      } else if (!zugMoeglich(kacheln, N)) ende();
    }, SLIDE_MS + 20);
  }

  function ende() {
    vorbei = true;
    const neuer = ergebnis({ punkte });
    const max = Math.max(...kacheln.map((k) => k.wert));
    nachricht(`<p class="big">Keine Züge mehr</p><p>${punkte} Punkte · höchste Kachel ${max}${neuer ? " · neuer Highscore!" : ""}</p><p class="small">Klick für ein neues Spiel</p>`);
  }

  const pos = (i) => LUECKE + i * (ZELLE + LUECKE);
  function kachel(k, x, y, skala) {
    const [bg, fg] = FARBEN[k.wert] || ["#f5d97a", "#0f0e13"];
    const g = ZELLE * skala;
    const ox = x + (ZELLE - g) / 2;
    const oy = y + (ZELLE - g) / 2;
    ctx.fillStyle = bg;
    ctx.fillRect(ox, oy, g, g);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(ox, oy + g - 5 * skala, g, 5 * skala);
    const stellen = String(k.wert).length;
    ctx.font = `${Math.round((stellen <= 2 ? 30 : stellen === 3 ? 24 : 19) * skala)}px "Press Start 2P", monospace`;
    ctx.fillStyle = fg;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(k.wert), x + ZELLE / 2 + 1, y + ZELLE / 2 + 2);
  }

  function zeichne(t) {
    const p = Math.min(1, (t - animStart) / SLIDE_MS);
    const e = 1 - (1 - p) ** 3;
    const pop = Math.min(1, Math.max(0, (t - animStart - SLIDE_MS) / POP_MS));
    ctx.fillStyle = "#0f0e13";
    ctx.fillRect(0, 0, W, W);
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        ctx.fillStyle = "#1c1a23";
        ctx.fillRect(pos(x), pos(y), ZELLE, ZELLE);
      }
    if (p < 1) for (const g of geister) kachel(g, pos(g.x) + (pos(g.nachX) - pos(g.x)) * e, pos(g.y) + (pos(g.nachY) - pos(g.y)) * e, 1);
    for (const k of kacheln) {
      if ((k.neu || k.verschmolzen) && p < 1) continue; // erscheinen erst nach dem Gleiten
      const x = pos(k.vonX) + (pos(k.x) - pos(k.vonX)) * e;
      const y = pos(k.vonY) + (pos(k.y) - pos(k.vonY)) * e;
      let s = 1;
      if (k.neu) s = 0.3 + 0.7 * pop;
      if (k.verschmolzen) s = 1 + 0.12 * Math.sin(pop * Math.PI);
      kachel(k, x, y, s);
    }
    return p >= 1 && pop >= 1;
  }

  function animiere() {
    cancelAnimationFrame(raf);
    animStart = performance.now();
    const schritt = (t) => {
      if (zeichne(t)) {
        kacheln.forEach((k) => {
          k.vonX = k.x;
          k.vonY = k.y;
          k.neu = k.verschmolzen = false;
        });
        geister = [];
        return;
      }
      raf = requestAnimationFrame(schritt);
    };
    raf = requestAnimationFrame(schritt);
  }

  const aus1 = richtungsEingabe(canvas, { richtung: zug, kontinuierlich: false });
  const aus2 = overlayKlick(() => {
    nachricht(null);
    if (vorbei) neu();
  });

  document.fonts?.load('30px "Press Start 2P"').finally(() => animiere());
  neu();

  return {
    pause() {},
    stop() {
      cancelAnimationFrame(raf);
      aus1();
      aus2();
    },
  };
}
