// Preise, die man im Casino-Shop mit Hotte-Dollar kauft. Die Spiele lesen hier ihren gewählten Stil.
import { aktiv } from "./casino-konto.js";

export const KATEGORIEN = [
  { id: "snake", name: "Snake-Skins", text: "Farbe deiner Schlange in Snake" },
  { id: "bloecke", name: "Block-Stapler-Farben", text: "Farben der Steine im Block-Stapler" },
  { id: "pong", name: "Ping-Pong-Bälle", text: "Ball mit Leuchtspur in Ping-Pong" },
  { id: "abzeichen", name: "Abzeichen", text: "Steht vor deinem Namen in der Klassen-Bestenliste" },
];

// Snake: Farbe je Glied (i = 0 ist der Kopf); strich = durchgehendes Band darunter
const regenbogen = (i, t) => `hsl(${(i * 24 + t * 90) % 360} 85% ${i === 0 ? 85 : 66}%)`;
export const SNAKE = {
  standard: { name: "Lila", preis: 0, glied: (i) => (i === 0 ? "#ffffff" : i % 2 ? "#c8a2ff" : "#b48ef0"), strich: () => "#b48ef0" },
  neon: { name: "Neon", preis: 3000, glied: (i) => (i === 0 ? "#eafff4" : i % 2 ? "#5ff0a8" : "#29d68a"), strich: () => "#29d68a" },
  regenbogen: { name: "Regenbogen", preis: 7500, glied: regenbogen, strich: (t) => `hsl(${(t * 90) % 360} 70% 55%)` },
  // der große Preis zum Schluss
  gold: { name: "Gold", preis: 15000, glied: (i) => (i === 0 ? "#fff6d0" : i % 2 ? "#f5d97a" : "#e0b84a"), strich: () => "#e0b84a" },
};

// Block-Stapler: Farbe je Steintyp
export const BLOECKE = {
  standard: { name: "Klassisch", preis: 0, farben: { I: "#7fb8ff", O: "#f5d97a", T: "#b48ef0", S: "#5fc39c", Z: "#e5566f", J: "#6a8cff", L: "#f0a35e" } },
  pastell: { name: "Pastell", preis: 2500, farben: { I: "#bfe3ff", O: "#fff1b8", T: "#e3d1ff", S: "#c8f2df", Z: "#ffc9d4", J: "#c9d3ff", L: "#ffd9bd" } },
  retro: { name: "Retro-Grün", preis: 5000, farben: { I: "#9bbc0f", O: "#8bac0f", T: "#306230", S: "#7fa30f", Z: "#4f7a28", J: "#5b8c2a", L: "#a8c84a" } },
  neon: { name: "Neon", preis: 6000, farben: { I: "#00e5ff", O: "#ffee00", T: "#d600ff", S: "#00ff88", Z: "#ff2a6d", J: "#2979ff", L: "#ff9100" } },
  gold: { name: "Gold & Silber", preis: 10000, farben: { I: "#e8e8ee", O: "#f5d97a", T: "#d4af37", S: "#c0c0c8", Z: "#b8860b", J: "#a8a9ad", L: "#ffcf40" } },
};

// Ping-Pong: Ballfarbe und Leuchtspur
export const PONG = {
  standard: { name: "Gelb", preis: 0, ball: "#f5d97a", spur: null },
  feuer: { name: "Feuerball", preis: 5000, ball: "#ffb347", spur: ["#ff3d00", "#ff9100", "#ffd54f"] },
  plasma: { name: "Plasma", preis: 8000, ball: "#e6ccff", spur: ["#7c4dff", "#b388ff", "#ea80fc"] },
  eis: { name: "Eiskristall", preis: 6000, ball: "#e0f7ff", spur: ["#4fc3f7", "#81d4fa", "#e1f5fe"] },
};

// Abzeichen für die Klassen-Bestenliste (der Server kennt dieselben Kürzel)
export const ABZEICHEN = {
  standard: { name: "Keins", preis: 0, zeichen: "" },
  zocker: { name: "Zocker", preis: 7500, zeichen: "🎰" },
  stern: { name: "Stern", preis: 15000, zeichen: "⭐" },
  diamant: { name: "Diamant", preis: 30000, zeichen: "💎" },
  koenig: { name: "Hotte-König", preis: 75000, zeichen: "👑" },
};

export const DATEN = { snake: SNAKE, bloecke: BLOECKE, pong: PONG, abzeichen: ABZEICHEN };
export const stil = (kat) => {
  const id = aktiv(kat);
  return DATEN[kat][id] ? id : "standard";
};
export const gewaehlt = (kat) => DATEN[kat][stil(kat)];
