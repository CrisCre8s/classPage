// Port-Quiz: Welcher Dienst läuft auf welchem Standard-Port?
import { quizSpiel } from "./quiz-ui.js";

export const DOM = true;
export const HILFE = "Antwort antippen oder Taste 1–4 · 60 Sekunden";

// [Port, Dienst, Protokoll, Stufe 1–3]
export const PORTS = [
  [21, "FTP (Steuerung)", "TCP", 1],
  [22, "SSH", "TCP", 1],
  [23, "Telnet", "TCP", 1],
  [25, "SMTP", "TCP", 1],
  [53, "DNS", "UDP/TCP", 1],
  [80, "HTTP", "TCP", 1],
  [110, "POP3", "TCP", 1],
  [143, "IMAP", "TCP", 1],
  [443, "HTTPS", "TCP", 1],
  [3389, "RDP (Remotedesktop)", "TCP", 1],
  [20, "FTP (Daten)", "TCP", 2],
  [67, "DHCP (Server)", "UDP", 2],
  [68, "DHCP (Client)", "UDP", 2],
  [69, "TFTP", "UDP", 2],
  [123, "NTP", "UDP", 2],
  [161, "SNMP", "UDP", 2],
  [389, "LDAP", "TCP", 2],
  [445, "SMB", "TCP", 2],
  [587, "SMTP (Submission)", "TCP", 2],
  [993, "IMAPS", "TCP", 2],
  [995, "POP3S", "TCP", 2],
  [3306, "MySQL", "TCP", 2],
  [5432, "PostgreSQL", "TCP", 2],
  [8080, "HTTP (alternativ)", "TCP", 2],
  [88, "Kerberos", "UDP/TCP", 3],
  [162, "SNMP-Trap", "UDP", 3],
  [465, "SMTPS", "TCP", 3],
  [500, "IKE (IPsec)", "UDP", 3],
  [514, "Syslog", "UDP", 3],
  [636, "LDAPS", "TCP", 3],
  [853, "DNS over TLS", "TCP", 3],
  [1194, "OpenVPN", "UDP", 3],
  [1433, "Microsoft SQL Server", "TCP", 3],
  [1521, "Oracle Database", "TCP", 3],
  [1812, "RADIUS", "UDP", 3],
  [5060, "SIP", "UDP/TCP", 3],
  [5900, "VNC", "TCP", 3],
  [6379, "Redis", "TCP", 3],
  [27017, "MongoDB", "TCP", 3],
  [51820, "WireGuard", "UDP", 3],
];

const STUFEN = { leicht: { bis: 1, punkte: 10 }, mittel: { bis: 2, punkte: 15 }, schwer: { bis: 3, punkte: 20 } };

const mische = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export function start({ dom, stufe, status, nachricht, ergebnis }) {
  const S = STUFEN[stufe] || STUFEN.mittel;
  const pool = PORTS.filter((p) => p[3] <= S.bis);
  let letzte = null;
  return quizSpiel({
    dom,
    status,
    nachricht,
    ergebnis,
    titel: "Port-Quiz",
    intro: `${pool.length} Dienste und ihre Standard-Ports. Mal ist der Port gesucht, mal der Dienst.`,
    sekunden: 60,
    punkteJe: S.punkte,
    naechste() {
      let eintrag;
      do eintrag = pool[Math.floor(Math.random() * pool.length)];
      while (eintrag === letzte);
      letzte = eintrag;
      const [port, dienst, proto] = eintrag;
      const andere = mische(pool.filter((p) => p !== eintrag)).slice(0, 3);
      const auswahl = mische([eintrag, ...andere]);
      const portGesucht = Math.random() < 0.5;
      return portGesucht
        ? {
            frage: `<span class="quiz-label">Welcher Port?</span><span class="quiz-wert">${dienst}</span>`,
            optionen: auswahl.map((p) => String(p[0])),
            richtigIndex: auswahl.indexOf(eintrag),
            loesung: `${port} (${proto})`,
          }
        : {
            frage: `<span class="quiz-label">Welcher Dienst?</span><span class="quiz-wert num">Port ${port}</span>`,
            optionen: auswahl.map((p) => p[1]),
            richtigIndex: auswahl.indexOf(eintrag),
            loesung: `${dienst} (${proto})`,
          };
    },
  });
}
