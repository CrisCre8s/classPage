// Stick-Skater: Fortschritt (Münzkonto, freigeschaltete Welten, Boards, Aufgaben).
// Wird nur im Browser des Spielers gespeichert (localStorage).

const KEY = "skate-fortschritt-v1";

// werte: 1–5 → Tempo (Höchsttempo), Sprung (Ollie-Höhe), Schub (Anschieben)
export const BOARDS = [
  { id: "klassik", name: "Klassik", preis: 0, werte: { tempo: 3, sprung: 3, schub: 3 },
    skin: { kante: "#e3c497", schicht: "rgba(150,100,50,0.55)", unten: ["#b48ef0", "#f5d97a", "#e5566f"], grip: "#1c1a22", rolle: ["#fffaf0", "#ebe3d2", "#b7ae9b"], gummi: "#e5566f" } },
  { id: "mitternacht", name: "Mitternacht", preis: 40, werte: { tempo: 3, sprung: 4, schub: 3 },
    skin: { kante: "#2a2633", schicht: "rgba(180,142,240,0.6)", unten: ["#2b2140", "#6a48a8", "#2b2140"], grip: "#0e0c12", rolle: ["#efe6ff", "#b48ef0", "#6d4fa8"], gummi: "#b48ef0" } },
  { id: "neon", name: "Neon", preis: 120, werte: { tempo: 4, sprung: 3, schub: 3 }, spur: "neon",
    skin: { kante: "#1b1f2a", schicht: "rgba(95,255,230,0.9)", unten: ["#00e5ff", "#1b1f2a", "#ff3ea5"], grip: "#121218", rolle: ["#e8fffc", "#5ff7e4", "#20a89a"], gummi: "#ff3ea5", leuchten: "#5ff7e4" } },
  { id: "lava", name: "Lava", preis: 250, werte: { tempo: 4, sprung: 4, schub: 3 }, spur: "feuer",
    skin: { kante: "#3a1410", schicht: "rgba(255,140,60,0.85)", unten: ["#ffd36a", "#ff6a2a", "#5a1208"], grip: "#1a0c0a", rolle: ["#fff0d8", "#ffb070", "#c0501a"], gummi: "#ffd36a", leuchten: "#ff8a3a" } },
  { id: "frost", name: "Frost", preis: 400, werte: { tempo: 3, sprung: 4, schub: 5 }, spur: "schnee",
    skin: { kante: "#d8eeff", schicht: "rgba(110,170,235,0.8)", unten: ["#ffffff", "#9fd0ff", "#3f6fb0"], grip: "#1d2a3e", rolle: ["#ffffff", "#d8eeff", "#8fb8e0"], gummi: "#9fd0ff" } },
  { id: "gold", name: "Gold", preis: 700, werte: { tempo: 5, sprung: 4, schub: 4 }, spur: "funkeln",
    skin: { kante: "#f2c552", schicht: "rgba(140,90,10,0.65)", unten: ["#fff3a8", "#ffc93a", "#a06d0a"], grip: "#2a2216", rolle: ["#fffbe8", "#f5d97a", "#b48a2a"], gummi: "#ffc93a", leuchten: "#ffe28a" } },
  { id: "regenbogen", name: "Regenbogen", preis: 1100, werte: { tempo: 5, sprung: 5, schub: 4 }, spur: "regenbogen",
    skin: { kante: "#f4f1f8", schicht: "rgba(180,142,240,0.7)", unten: ["#ff6b6b", "#ffb347", "#ffe066", "#7be07b", "#6ab8ff", "#b48ef0"], grip: "#1c1a22", rolle: ["#ffffff", "#ffe0f0", "#c8a0e0"], gummi: "#ff6b6b" } },
  { id: "hover", name: "Hoverboard", preis: 1800, werte: { tempo: 5, sprung: 5, schub: 5 }, spur: "hover", hover: true,
    skin: { kante: "#2a2f3f", schicht: "rgba(127,184,255,0.95)", unten: ["#7fb8ff", "#b48ef0", "#7fb8ff"], grip: "#141824", rolle: ["#ffffff", "#7fb8ff", "#3a5a9a"], gummi: "#7fb8ff", leuchten: "#7fb8ff" } },
];
export const boardVon = (id) => BOARDS.find((b) => b.id === id) || BOARDS[0];
// Wirkung der Werte (3 = normal)
export const boardFaktoren = (b) => ({
  tempo: 1 + (b.werte.tempo - 3) * 0.04,
  sprung: 1 + (b.werte.sprung - 3) * 0.03,
  schub: 1 + (b.werte.schub - 3) * 0.07,
});

// ---------- Aufgaben ----------
// lauf: zählt nur innerhalb eines Laufs (bester Lauf wird angezeigt)
const VORLAGEN = [
  { typ: "kickflip", n: [5, 12], text: (n) => `Mach ${n} Kickflips`, lohn: (n) => 10 + n * 2 },
  { typ: "backflip", n: [2, 5], text: (n) => `Mach ${n} Backflips`, lohn: (n) => n * 9 },
  { typ: "shove", n: [4, 10], text: (n) => `Mach ${n} Shove-its`, lohn: (n) => 10 + n * 2 },
  { typ: "grindtrick", n: [3, 8], text: (n) => `Halte ${n} Grind-Tricks (↑↓←→ auf der Stange)`, lohn: (n) => n * 7 },
  { typ: "grind", n: [8, 20], text: (n) => `Grinde ${n}-mal`, lohn: (n) => 10 + n * 2 },
  { typ: "gap", n: [5, 12], text: (n) => `Spring über ${n} Lücken`, lohn: (n) => n * 4 },
  { typ: "ring", n: [1, 3], text: (n) => `Spring durch ${n} Feuerring${n > 1 ? "e" : ""}`, lohn: (n) => n * 25 },
  { typ: "treppe", n: [1, 3], text: (n) => `Spring ${n === 1 ? "eine Treppe" : `${n} Treppen`} mit 5+ Stufen ganz`, lohn: (n) => n * 18 },
  { typ: "auto", n: [1, 3], text: (n) => `Grinde ${n === 1 ? "ein Auto" : `${n} Autos`}`, lohn: (n) => n * 15 },
  { typ: "muenzenLauf", lauf: true, n: [30, 110], schritt: 10, text: (n) => `Sammle ${n} Münzen in einem Lauf`, lohn: (n) => Math.round(n / 2 + 10) },
  { typ: "meterLauf", lauf: true, n: [400, 1600], schritt: 100, text: (n) => `Fahre ${n} m in einem Lauf`, lohn: (n) => Math.round(n / 20) },
  { typ: "combo", lauf: true, n: [2, 3], text: (n) => `${n}er-Combo in einem Sprung`, lohn: (n) => n * 15 },
  { typ: "pilz", n: [3, 8], text: (n) => `Hüpf ${n}-mal auf Pilzen (Dschungel)`, lohn: (n) => n * 6, ab: 2 },
  { typ: "welt", text: (_n, f) => `Erreiche ${f.zielName}`, lohn: () => 60 },
];

function ganz(a, b, schritt = 1) {
  return Math.round((a + Math.random() * (b - a)) / schritt) * schritt;
}

export function neueAufgabe(f, welten) {
  const belegt = new Set(f.aufgaben.map((a) => a.typ));
  const moeglich = VORLAGEN.filter((v) => !belegt.has(v.typ) && (v.ab === undefined || f.welten >= v.ab) && (v.typ !== "welt" || f.welten < welten.length - 1));
  const v = moeglich[Math.floor(Math.random() * moeglich.length)];
  if (v.typ === "welt") {
    const ziel = f.welten + 1;
    return { typ: "welt", ziel, stand: f.welten, lohn: v.lohn(), text: v.text(ziel, { zielName: welten[ziel].name }) };
  }
  const n = ganz(v.n[0], v.n[1], v.schritt || 1);
  return { typ: v.typ, lauf: !!v.lauf, ziel: n, stand: 0, lohn: v.lohn(n), text: v.text(n) };
}

export function laden(welten) {
  let f = null;
  try {
    f = JSON.parse(localStorage.getItem(KEY) || "null");
  } catch {
    f = null;
  }
  f = { muenzen: 0, welten: 0, boards: ["klassik"], board: "klassik", aufgaben: [], weiteste: 0, startWelt: 0, ...(f || {}) };
  if (!Array.isArray(f.boards) || !f.boards.includes("klassik")) f.boards = ["klassik", ...(f.boards || [])];
  f.welten = Math.max(0, Math.min(welten.length - 1, f.welten | 0));
  f.startWelt = Math.max(0, Math.min(f.welten, f.startWelt | 0));
  if (!Array.isArray(f.aufgaben)) f.aufgaben = [];
  f.aufgaben = f.aufgaben.filter((a) => a && a.typ && a.ziel);
  while (f.aufgaben.length < 3) f.aufgaben.push(neueAufgabe(f, welten));
  return f;
}

export function speichern(f) {
  try {
    localStorage.setItem(KEY, JSON.stringify(f));
  } catch {
    /* privates Fenster o. Ä.: dann eben ohne Speichern */
  }
}
