// Aufklappbare Erklärungen zu den Lernspielen: erst lernen, dann spielen.
// Wird erst geladen, wenn jemand „So geht's“ öffnet.
import { BEFEHLE, SYSTEME } from "./befehle.js";
import { PORTS } from "./ports.js";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const block = (titel, html) => `<section class="lh-block"><h4>${titel}</h4>${html}</section>`;
const bsp = (zeilen) => `<pre class="lh-bsp num">${zeilen.map(esc).join("\n")}</pre>`;
const tabelle = (kopf, zeilen, klasse = "") =>
  `<div class="lh-scroll"><table class="lh-tab ${klasse}"><thead><tr>${kopf.map((k) => `<th>${k}</th>`).join("")}</tr></thead><tbody>${zeilen
    .map((z) => `<tr>${z.map((w, i) => `<td${i === 0 ? ' class="num"' : ""}>${w}</td>`).join("")}</tr>`)
    .join("")}</tbody></table></div>`;

const STUFE_NAME = { 1: "Leicht", 2: "Mittel", 3: "Schwer" };

// ---------- Binär-Blitz ----------
function binaer() {
  const stellen = [128, 64, 32, 16, 8, 4, 2, 1];
  const nibbles = Array.from({ length: 16 }, (_, i) => `<li><b class="num">${i.toString(16).toUpperCase()}</b><span class="num">${i.toString(2).padStart(4, "0")}</span><small>${i}</small></li>`).join("");
  return [
    block(
      "Stellenwerte",
      `<p>Jede Stelle einer Binärzahl ist doppelt so viel wert wie die rechts daneben. Eine 1 heißt „zählt mit“, eine 0 „zählt nicht“.</p>
       <div class="lh-stellen num">${stellen.map((s) => `<span>${s}</span>`).join("")}</div>`,
    ),
    block(
      "Binär → Dezimal",
      `<p>Die Stellenwerte aller Einsen zusammenzählen.</p>${bsp(["1011 0110", "= 128 + 32 + 16 + 4 + 2", "= 182"])}`,
    ),
    block(
      "Dezimal → Binär",
      `<p>Von links den größten Stellenwert abziehen, der noch passt, dort eine 1 setzen. Was nicht passt, bekommt eine 0.</p>${bsp(["182 ≥ 128 → 1   Rest 54", " 54 <  64 → 0", " 54 ≥  32 → 1   Rest 22", " 22 ≥  16 → 1   Rest 6", "  6 <   8 → 0", "  6 ≥   4 → 1   Rest 2", "  2 ≥   2 → 1   Rest 0", "  0 <   1 → 0", "= 1011 0110"])}
       <p class="lh-klein">Alternative: immer durch 2 teilen und die Reste von unten nach oben lesen.</p>`,
    ),
    block(
      "Hexadezimal",
      `<p>Basis 16: nach 9 kommen A=10, B=11, C=12, D=13, E=14, F=15. Ein Hex-Zeichen steht für genau 4 Bit (ein Nibble).</p>
       <p><b>Binär ↔ Hex:</b> von rechts in 4er-Gruppen teilen und jede Gruppe einzeln umwandeln.</p>${bsp(["1011 0110", "   B    6  → B6"])}
       <p><b>Hex → Dezimal:</b> linke Stelle × 16 plus rechte Stelle.</p>${bsp(["B6 = 11 × 16 + 6 = 182"])}`,
    ),
    block("Spickzettel 0–F", `<ul class="lh-nibbles">${nibbles}</ul>`),
    block(
      "Das kommt dran",
      `<ul class="lh-liste">
        <li><b>Leicht:</b> 0–15 (4 Bit), Dezimal ↔ Binär</li>
        <li><b>Mittel:</b> 0–255 (8 Bit, ein Oktett), dazu Dezimal ↔ Hex</li>
        <li><b>Schwer:</b> 0–65535 (16 Bit), auch Hex ↔ Binär</li>
      </ul>
      <p class="lh-klein">Führende Nullen, Leerzeichen und die Präfixe 0b/0x sind bei der Eingabe egal.</p>`,
    ),
  ].join("");
}

// ---------- Subnetz-Sprint ----------
function subnetz() {
  const masken = [1, 2, 3, 4, 5, 6, 7, 8].map((b) => [`${b}`, `${256 - 2 ** (8 - b)}`, `${2 ** (8 - b)}`]);
  const kurz = [24, 25, 26, 27, 28, 29, 30].map((p) => [`/${p}`, `255.255.255.${256 - 2 ** (32 - p)}`, `${2 ** (32 - p)}`, `${2 ** (32 - p) - 2}`]);
  return [
    block(
      "1 · Präfix verstehen",
      `<p><span class="num">/26</span> heißt: die ersten 26 Bit sind der Netzanteil, die restlichen 6 Bit sind für Hosts. Pro volle 8 Bit steht in der Maske eine 255.</p>
       <p>Das <b>interessante Oktett</b> ist das, in dem die Maske „aufhört“: bis /8 das 1., bis /16 das 2., bis /24 das 3., sonst das 4.</p>`,
    ),
    block(
      "2 · Maske und Blockgröße",
      `<p>Übrige Netzbits im interessanten Oktett → Maskenwert. Die <b>Blockgröße</b> (Abstand der Netze) ist 256 − Maskenwert.</p>
       ${tabelle(["Netzbits", "Maskenwert", "Blockgröße"], masken, "lh-tab-mini")}`,
    ),
    block(
      "3 · Netz, Broadcast, Hosts",
      `<ul class="lh-liste">
        <li><b>Netzadresse:</b> im interessanten Oktett auf ein Vielfaches der Blockgröße abrunden, alles rechts davon 0.</li>
        <li><b>Broadcast:</b> nächste Netzadresse minus 1, alles rechts davon 255.</li>
        <li><b>Nutzbare Hosts:</b> 2<sup>Hostbits</sup> − 2 (Netz und Broadcast fallen weg).</li>
        <li><b>Erster/letzter Host:</b> Netzadresse + 1 bzw. Broadcast − 1.</li>
      </ul>`,
    ),
    block(
      "Beispiel /26",
      bsp([
        "192.168.4.77/26",
        "26 = 24 + 2 → 4. Oktett, 2 Netzbits",
        "Maske       255.255.255.192",
        "Blockgröße  256 − 192 = 64",
        "Netze       .0  .64  .128  .192",
        "77 liegt im Block ab 64",
        "Netz        192.168.4.64",
        "Broadcast   192.168.4.127",
        "Hosts       2^6 − 2 = 62",
        "Erster/Letzter  .65 / .126",
      ]),
    ),
    block(
      "Beispiel /12 (anderes Oktett)",
      bsp([
        "10.200.13.5/12",
        "12 = 8 + 4 → 2. Oktett, 4 Netzbits",
        "Maske       255.240.0.0",
        "Blockgröße  256 − 240 = 16",
        "200 → abrunden auf 192",
        "Netz        10.192.0.0",
        "Broadcast   10.207.255.255",
        "Hosts       2^20 − 2 = 1.048.574",
      ]),
    ),
    block(
      "Häufige Präfixe",
      `${tabelle(["Präfix", "Maske", "Adressen", "Hosts"], kurz, "lh-tab-mini")}
       <p class="lh-klein"><b>Aufteilen (Schwer):</b> Ein /x-Netz enthält 2<sup>y − x</sup> Netze der Größe /y. Beispiel: /24 → /27 = 2³ = 8 Netze.</p>
       <p class="lh-klein"><b>Leicht:</b> nur /8, /16, /24 · <b>Mittel:</b> /17–/30 · <b>Schwer:</b> /9–/30 plus erster/letzter Host und Aufteilen</p>`,
    ),
  ].join("");
}

// ---------- Befehl gesucht ----------
function befehle() {
  const stufen = { leicht: "Leicht", mittel: "Mittel", schwer: "Schwer" };
  return (
    `<p class="lh-intro">Alle Aufgaben aus dem Spiel mit Lösung. Bei der Eingabe ist egal: mehrere Leerzeichen, Anführungszeichen und unter Linux ein vorangestelltes <code class="num">sudo</code>. Windows (CMD und PowerShell) achtet nicht auf Groß-/Kleinschreibung, Linux, Git und Docker schon. Wo mehrere Schreibweisen gehen, zählen sie alle.</p>` +
    Object.entries(stufen)
      .map(([id, name]) =>
        block(
          `${name} <span class="chip">${BEFEHLE[id].length}</span>`,
          `<ul class="lh-befehle">${BEFEHLE[id]
            .map((b) => `<li><span class="quiz-os lh-os" data-sys="${b.sys}">${SYSTEME[b.sys]}</span><span>${esc(b.aufgabe)}</span><code class="num">${esc(b.loesungen[0])}</code></li>`)
            .join("")}</ul>`,
        ),
      )
      .join("")
  );
}

// ---------- Port-Quiz ----------
function ports() {
  const nachStufe = [1, 2, 3].map((s) =>
    block(
      `${STUFE_NAME[s]} <span class="chip">${PORTS.filter((p) => p[3] === s).length}</span>`,
      tabelle(
        ["Port", "Dienst", "Protokoll"],
        PORTS.filter((p) => p[3] === s)
          .sort((a, b) => a[0] - b[0])
          .map(([port, dienst, proto]) => [port, esc(dienst), proto]),
      ),
    ),
  );
  return [
    block(
      "Merkhilfen",
      `<ul class="lh-liste">
        <li><b>Well-known Ports</b> sind 0–1023, darüber liegen registrierte Ports (z. B. 3306 MySQL, 3389 RDP).</li>
        <li><b>Mit Verschlüsselung</b> gibt es meist einen eigenen Port: HTTP 80 → HTTPS 443, IMAP 143 → IMAPS 993, POP3 110 → POP3S 995, LDAP 389 → LDAPS 636.</li>
        <li><b>Paare:</b> FTP 20 (Daten) + 21 (Steuerung), DHCP 67 (Server) + 68 (Client), SNMP 161 + Trap 162.</li>
        <li><b>UDP</b> nutzen Dienste, bei denen Tempo wichtiger ist als Bestätigung: DNS-Anfragen, DHCP, NTP, TFTP, Syslog, VPN.</li>
      </ul>
      <p class="lh-klein">Leicht fragt die erste Tabelle ab, Mittel die ersten beiden, Schwer alle drei.</p>`,
    ),
    ...nachStufe,
  ].join("");
}

export const LERNHILFE = {
  binaer: { titel: "So rechnest du um", inhalt: binaer },
  subnetz: { titel: "So berechnest du Subnetze", inhalt: subnetz },
  befehle: { titel: "Alle Befehle im Überblick", inhalt: befehle },
  ports: { titel: "Alle Ports im Überblick", inhalt: ports },
};
