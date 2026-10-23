// Binär-Blitz: Zahlen zwischen Binär, Dezimal und Hexadezimal umrechnen.
import { quizSpiel, esc } from "./quiz-ui.js";

export const DOM = true;
export const HILFE = "Antwort tippen oder Ziffernfeld nutzen · Enter: prüfen · Präfixe 0b/0x und führende Nullen sind erlaubt";

const SYSTEME = {
  bin: { name: "binär", basis: 2, zeichen: /^[01]+$/ },
  dez: { name: "dezimal", basis: 10, zeichen: /^[0-9]+$/ },
  hex: { name: "hexadezimal", basis: 16, zeichen: /^[0-9A-F]+$/ },
};

const STUFEN = {
  leicht: { max: 15, bits: 4, paare: [["dez", "bin"], ["bin", "dez"]], punkte: 10 },
  mittel: { max: 255, bits: 8, paare: [["dez", "bin"], ["bin", "dez"], ["dez", "hex"], ["hex", "dez"]], punkte: 15 },
  schwer: { max: 65535, bits: 16, paare: [["dez", "bin"], ["bin", "dez"], ["dez", "hex"], ["hex", "dez"], ["hex", "bin"], ["bin", "hex"]], punkte: 20 },
};

// Binärzahlen in 4er-Gruppen zeigen (besser lesbar)
export function zeige(n, sys, bits) {
  if (sys === "bin") return n.toString(2).padStart(bits, "0").replace(/(.{4})(?=.)/g, "$1 ");
  if (sys === "hex") return n.toString(16).toUpperCase();
  return String(n);
}

// Eingabe lesen: Leerzeichen, Präfixe (0b, 0x) und führende Nullen sind egal
export function lies(eingabe, sys) {
  let t = String(eingabe).replace(/\s|_/g, "").toUpperCase();
  if (sys === "bin") t = t.replace(/^0B/, "");
  if (sys === "hex") t = t.replace(/^0X/, "").replace(/H$/, "");
  if (!t || !SYSTEME[sys].zeichen.test(t)) return NaN;
  return parseInt(t, SYSTEME[sys].basis);
}

export function start({ dom, stufe, status, nachricht, ergebnis }) {
  const S = STUFEN[stufe] || STUFEN.mittel;
  let letzte = -1;
  return quizSpiel({
    dom,
    status,
    nachricht,
    ergebnis,
    titel: "Binär-Blitz",
    intro: `Zahlen von 0 bis ${S.max} (${S.bits} Bit) umrechnen. Serien bringen Bonuspunkte.`,
    sekunden: 60,
    punkteJe: S.punkte,
    naechste() {
      let n;
      do n = Math.floor(Math.random() * (S.max + 1));
      while (n === letzte);
      letzte = n;
      const [von, nach] = S.paare[Math.floor(Math.random() * S.paare.length)];
      const loesung = zeige(n, nach, S.bits);
      return {
        frage: `<span class="quiz-label">${SYSTEME[von].name} → ${SYSTEME[nach].name}</span><span class="quiz-wert num">${esc(zeige(n, von, S.bits))}</span>`,
        loesung,
        tastatur: nach,
        platzhalter: nach === "bin" ? "z. B. 1010" : nach === "hex" ? "z. B. 2F" : "z. B. 42",
        pruefe: (e) => lies(e, nach) === n,
        erklaerung: nach === "dez" && von === "bin" ? erklaereBinaer(n, S.bits) : "",
      };
    },
  });
}

// z. B. 1011 = 8 + 2 + 1 = 11
function erklaereBinaer(n, bits) {
  const teile = [];
  for (let i = bits - 1; i >= 0; i--) if (n & (1 << i)) teile.push(2 ** i);
  return teile.length > 1 ? `<span class="num">${teile.join(" + ")} = ${n}</span>` : "";
}
