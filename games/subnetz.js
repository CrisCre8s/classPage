// Subnetz-Sprint: Netzadresse, Broadcast, Maske, Hostanzahl … aus IP/CIDR berechnen.
import { quizSpiel, esc } from "./quiz-ui.js";

export const DOM = true;
export const HILFE = "IP-Adressen mit Punkten eingeben (z. B. 192.168.4.64), Zahlen ohne Punkte · Enter: prüfen";

// ---------- Rechnen (vorzeichenlos, 32 Bit) ----------
export const zuZahl = (ip) => ip.split(".").reduce((a, o) => ((a << 8) | Number(o)) >>> 0, 0) >>> 0;
export const zuIp = (n) => [24, 16, 8, 0].map((s) => (n >>> s) & 255).join(".");
export const maske = (p) => (p === 0 ? 0 : (0xffffffff << (32 - p)) >>> 0);

export function rechne(ip, p) {
  const n = zuZahl(ip);
  const m = maske(p);
  const netz = (n & m) >>> 0;
  const bc = (netz | (~m >>> 0)) >>> 0;
  return {
    netz: zuIp(netz),
    broadcast: zuIp(bc),
    maske: zuIp(m),
    hosts: 2 ** (32 - p) - 2,
    erster: zuIp(netz + 1),
    letzter: zuIp(bc - 1),
  };
}

// Eingabe einer IP prüfen: genau 4 Oktette 0–255, führende Nullen egal
export function liesIp(e) {
  const t = String(e).trim();
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(t)) return null;
  const o = t.split(".").map(Number);
  return o.every((x) => x <= 255) ? o.join(".") : null;
}
const liesZahl = (e) => {
  const t = String(e).replace(/[\s.]/g, "");
  return /^\d+$/.test(t) ? Number(t) : NaN;
};

// ---------- Aufgaben ----------
const FRAGEN = {
  netz: { text: "Netzadresse?", art: "ip" },
  broadcast: { text: "Broadcast-Adresse?", art: "ip" },
  maske: { text: "Subnetzmaske (dezimal)?", art: "ip" },
  hosts: { text: "Wie viele nutzbare Hosts?", art: "zahl" },
  erster: { text: "Erste nutzbare Host-Adresse?", art: "ip" },
  letzter: { text: "Letzte nutzbare Host-Adresse?", art: "ip" },
};

const STUFEN = {
  leicht: { praefixe: [8, 16, 24], fragen: ["netz", "maske", "hosts"], punkte: 15 },
  mittel: { praefixe: range(17, 30), fragen: ["netz", "broadcast", "hosts", "maske"], punkte: 20 },
  schwer: { praefixe: range(9, 30), fragen: ["netz", "broadcast", "hosts", "maske", "erster", "letzter", "anzahl"], punkte: 25 },
};

function range(a, b) {
  return Array.from({ length: b - a + 1 }, (_, i) => a + i);
}
const zufall = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

// realistische Adressen aus den privaten Bereichen
function zufallsIp() {
  const r = Math.random();
  if (r < 0.4) return `192.168.${zufall(0, 255)}.${zufall(1, 254)}`;
  if (r < 0.75) return `10.${zufall(0, 255)}.${zufall(0, 255)}.${zufall(1, 254)}`;
  return `172.${zufall(16, 31)}.${zufall(0, 255)}.${zufall(1, 254)}`;
}

export function start({ dom, stufe, status, nachricht, ergebnis }) {
  const S = STUFEN[stufe] || STUFEN.mittel;
  return quizSpiel({
    dom,
    status,
    nachricht,
    ergebnis,
    titel: "Subnetz-Sprint",
    intro: `Präfixe ${S.praefixe[0] === 8 && S.praefixe.length === 3 ? "/8, /16 und /24" : `/${S.praefixe[0]} bis /${S.praefixe.at(-1)}`} · ${S.fragen.length} Aufgabentypen. Bei Fehlern siehst du die komplette Lösung.`,
    sekunden: 90,
    punkteJe: S.punkte,
    naechste() {
      const typ = S.fragen[Math.floor(Math.random() * S.fragen.length)];
      if (typ === "anzahl") {
        // Wie viele /y-Netze passen in ein /x?
        const x = zufall(16, 26);
        const y = zufall(x + 1, Math.min(30, x + 6));
        const loesung = String(2 ** (y - x));
        return {
          frage: `<span class="quiz-label">Aufteilen</span><span class="quiz-wert num">/${x} → /${y}</span><span class="quiz-unter">Wie viele /${y}-Netze passen in ein /${x}-Netz?</span>`,
          loesung,
          tastatur: "dez",
          pruefe: (e) => liesZahl(e) === Number(loesung),
          erklaerung: `<span class="num">2^(${y} − ${x}) = ${loesung}</span>`,
        };
      }
      const p = S.praefixe[Math.floor(Math.random() * S.praefixe.length)];
      const ip = zufallsIp();
      const r = rechne(ip, p);
      const f = FRAGEN[typ];
      const loesung = String(r[typ]);
      return {
        frage: `<span class="quiz-label">${esc(f.text)}</span><span class="quiz-wert num">${ip}/${p}</span>`,
        loesung,
        tastatur: f.art === "ip" ? "ip" : "dez",
        platzhalter: f.art === "ip" ? "z. B. 192.168.1.0" : "z. B. 254",
        pruefe: (e) => (f.art === "ip" ? liesIp(e) === loesung : liesZahl(e) === Number(loesung)),
        erklaerung: `<span class="num">Maske ${r.maske} · Netz ${r.netz} · Broadcast ${r.broadcast} · Hosts ${r.hosts.toLocaleString("de-DE")}</span>`,
      };
    },
  });
}
