// OSI-Sortierer: Protokolle, Geräte und Begriffe in die richtige Schicht des OSI-Modells ziehen.
// Ziehen mit Maus/Finger, antippen oder Tasten 1–7. 90 Sekunden.

export const DOM = true;
export const HILFE = "Karte auf die richtige Schicht ziehen, Schicht antippen oder Taste 1–7 · 90 Sekunden";

export const SCHICHTEN = [
  { nr: 7, name: "Anwendung", en: "Application", pdu: "Daten" },
  { nr: 6, name: "Darstellung", en: "Presentation", pdu: "Daten" },
  { nr: 5, name: "Sitzung", en: "Session", pdu: "Daten" },
  { nr: 4, name: "Transport", en: "Transport", pdu: "Segment" },
  { nr: 3, name: "Vermittlung", en: "Network", pdu: "Paket" },
  { nr: 2, name: "Sicherung", en: "Data Link", pdu: "Frame" },
  { nr: 1, name: "Bitübertragung", en: "Physical", pdu: "Bits" },
];

// [Begriff, Schicht, Stufe 1–3, kurze Erklärung]
export const KARTEN = [
  ["HTTP", 7, 1, "Protokoll für Webseiten"],
  ["HTTPS", 7, 1, "HTTP mit Verschlüsselung (TLS darunter)"],
  ["FTP", 7, 1, "Dateiübertragung"],
  ["SMTP", 7, 1, "E-Mails versenden"],
  ["DNS", 7, 1, "Namen in IP-Adressen auflösen"],
  ["SSH", 7, 1, "Sichere Fernsteuerung per Konsole"],
  ["Browser", 7, 1, "Programm, das HTTP spricht"],
  ["TCP", 4, 1, "Verbindungsorientiert, mit Bestätigung"],
  ["UDP", 4, 1, "Verbindungslos, schnell, ohne Bestätigung"],
  ["Portnummer", 4, 1, "Adressiert die Anwendung auf einem Rechner"],
  ["IP-Adresse", 3, 1, "Logische Adresse für das Routing"],
  ["Router", 3, 1, "Verbindet Netze anhand der IP-Adresse"],
  ["Switch", 2, 1, "Leitet Frames anhand der MAC-Adresse weiter"],
  ["MAC-Adresse", 2, 1, "Hardware-Adresse der Netzwerkkarte"],
  ["Hub", 1, 1, "Verteilt Signale an alle Ports, ohne zu prüfen"],
  ["Netzwerkkabel", 1, 1, "Überträgt die Bits als Signal"],
  ["Glasfaser", 1, 1, "Überträgt Bits als Licht"],
  ["POP3", 7, 2, "E-Mails abholen"],
  ["IMAP", 7, 2, "E-Mails auf dem Server verwalten"],
  ["DHCP", 7, 2, "Vergibt IP-Adressen automatisch"],
  ["SNMP", 7, 2, "Netzwerkgeräte überwachen"],
  ["Telnet", 7, 2, "Unverschlüsselte Fernsteuerung"],
  ["Zeichensatz umwandeln (ASCII ↔ Unicode)", 6, 2, "Darstellung der Daten anpassen"],
  ["Verschlüsselung", 6, 2, "Daten für die Übertragung umformen"],
  ["Datenkompression", 6, 2, "Daten verkleinern, bevor sie übertragen werden"],
  ["Sitzung auf- und abbauen", 5, 2, "Dialog zwischen zwei Anwendungen steuern"],
  ["Segment", 4, 2, "Dateneinheit (PDU) der Transportschicht"],
  ["Flusskontrolle", 4, 2, "Sender bremsen, wenn der Empfänger nicht hinterherkommt"],
  ["ICMP (ping)", 3, 2, "Fehler- und Testmeldungen auf IP-Ebene"],
  ["IPv6", 3, 2, "Neue Version des Internet Protocol"],
  ["Paket", 3, 2, "Dateneinheit (PDU) der Vermittlungsschicht"],
  ["Ethernet-Frame", 2, 2, "Dateneinheit (PDU) der Sicherungsschicht"],
  ["Bridge", 2, 2, "Verbindet zwei Netzsegmente auf MAC-Ebene"],
  ["WLAN-Access-Point", 2, 2, "Bridge zwischen Funk und Kabelnetz"],
  ["Repeater", 1, 2, "Verstärkt das Signal, sonst nichts"],
  ["RJ45-Stecker", 1, 2, "Stecker für Twisted-Pair-Kabel"],
  ["LDAP", 7, 3, "Verzeichnisdienst abfragen"],
  ["JPEG/MPEG-Formate", 6, 3, "Datenformate für Bild und Video"],
  ["NetBIOS", 5, 3, "Sitzungsdienst in alten Windows-Netzen"],
  ["RPC", 5, 3, "Entfernte Funktionen aufrufen (Remote Procedure Call)"],
  ["Drei-Wege-Handshake", 4, 3, "Verbindungsaufbau bei TCP: SYN, SYN-ACK, ACK"],
  ["IPsec", 3, 3, "Verschlüsselung direkt auf IP-Ebene"],
  ["Layer-3-Switch", 3, 3, "Switch, der auch routen kann"],
  ["VLAN (IEEE 802.1Q)", 2, 3, "Ein Switch wird in mehrere logische Netze geteilt"],
  ["PPP", 2, 3, "Punkt-zu-Punkt-Verbindung, z. B. bei DSL"],
  ["CRC-Prüfsumme im Frame", 2, 3, "Erkennt Übertragungsfehler im Frame"],
  ["Medienkonverter", 1, 3, "Wandelt Kupfer- in Glasfasersignale"],
  ["Bits", 1, 3, "Dateneinheit der Bitübertragungsschicht"],
];

const STUFEN = { leicht: { bis: 1, punkte: 10 }, mittel: { bis: 2, punkte: 15 }, schwer: { bis: 3, punkte: 20 } };
const SEKUNDEN = 90;
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export function start({ dom, stufe, status, nachricht, ergebnis }) {
  const S = STUFEN[stufe] || STUFEN.mittel;
  const pool = KARTEN.filter((k) => k[2] <= S.bis);
  dom.innerHTML = `
    <div class="osi">
      <div class="quiz-top"><div class="quiz-zeit" aria-hidden="true"><span></span></div><span class="quiz-serie num"></span></div>
      <div class="osi-feld">
        <div class="osi-karte-platz"><div class="osi-karte" tabindex="0" role="button" aria-label="Karte"></div><p class="osi-feedback" aria-live="polite"></p></div>
        <ol class="osi-schichten">${SCHICHTEN.map(
          (s) => `<li class="osi-schicht" data-nr="${s.nr}"><button type="button"><span class="osi-nr num">${s.nr}</span><span class="osi-name">${s.name}<small>${s.en} · ${s.pdu}</small></span><span class="osi-abgelegt"></span></button></li>`,
        ).join("")}</ol>
      </div>
    </div>`;
  const el = (s) => dom.querySelector(s);
  const karteEl = el(".osi-karte");
  const feedback = el(".osi-feedback");
  const balken = el(".quiz-zeit span");
  const serieEl = el(".quiz-serie");
  let karte, stapel, punkte, serie, richtig, gesamt, fehler, ende, laeuft, raf, sperre;

  const mische = (a) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const zeigeStatus = () => {
    status(`${punkte} Pkt · ${richtig}/${gesamt} richtig`);
    serieEl.textContent = serie >= 3 ? `Serie ${serie}` : "";
  };
  function neueKarte() {
    if (!stapel.length) stapel = mische([...pool]);
    karte = stapel.pop();
    karteEl.textContent = karte[0];
    karteEl.classList.remove("weg");
    karteEl.style.transform = "";
  }
  function ablegen(nr) {
    if (!laeuft || sperre) return;
    sperre = true;
    gesamt++;
    const ok = nr === karte[1];
    const ziel = dom.querySelector(`.osi-schicht[data-nr="${karte[1]}"]`);
    const gewaehlt = dom.querySelector(`.osi-schicht[data-nr="${nr}"]`);
    if (ok) {
      richtig++;
      serie++;
      punkte += S.punkte + (serie >= 3 ? Math.min(serie - 2, 5) * 2 : 0);
      feedback.innerHTML = `<b class="ok">Richtig!</b> ${esc(karte[0])}: ${esc(karte[3])}`;
    } else {
      serie = 0;
      fehler.push(karte);
      feedback.innerHTML = `<b class="falsch">Falsch.</b> ${esc(karte[0])} gehört in Schicht ${karte[1]} (${SCHICHTEN.find((s) => s.nr === karte[1]).name}): ${esc(karte[3])}`;
      gewaehlt?.classList.add("osi-falsch");
    }
    ziel.classList.add("osi-richtig");
    const chip = document.createElement("span");
    chip.className = `osi-chip${ok ? "" : " war-falsch"}`;
    chip.textContent = karte[0];
    ziel.querySelector(".osi-abgelegt").prepend(chip);
    karteEl.classList.add("weg");
    zeigeStatus();
    setTimeout(() => {
      dom.querySelectorAll(".osi-falsch, .osi-richtig").forEach((e) => e.classList.remove("osi-falsch", "osi-richtig"));
      sperre = false;
      if (laeuft) neueKarte();
    }, ok ? 500 : 1700);
  }

  function tick() {
    const rest = Math.max(0, ende - performance.now());
    balken.style.transform = `scaleX(${rest / (SEKUNDEN * 1000)})`;
    balken.classList.toggle("knapp", rest < 10000);
    if (rest <= 0) return fertig();
    raf = requestAnimationFrame(tick);
  }
  function fertig() {
    laeuft = false;
    cancelAnimationFrame(raf);
    const neu = ergebnis({ punkte });
    const quote = gesamt ? Math.round((richtig / gesamt) * 100) : 0;
    const liste = fehler
      .slice(-6)
      .map((k) => `<li><span>${esc(k[0])}</span><span>Schicht ${k[1]} · ${SCHICHTEN.find((s) => s.nr === k[1]).name}</span></li>`)
      .join("");
    nachricht(`<p class="big">Zeit um!</p><p>${punkte} Punkte · ${richtig} von ${gesamt} richtig (${quote} %)${neu ? " · neuer Highscore!" : ""}</p>${liste ? `<div class="quiz-auswertung"><p class="small">Zum Nachlernen:</p><ul>${liste}</ul></div>` : ""}<p><button class="btn" type="button" data-neu>Nochmal</button></p>`);
    document.querySelector("#stage-msg [data-neu]")?.addEventListener("click", (e) => {
      e.stopPropagation();
      los();
    });
  }
  function los() {
    stapel = [];
    punkte = serie = richtig = gesamt = 0;
    fehler = [];
    sperre = false;
    laeuft = true;
    dom.querySelectorAll(".osi-abgelegt").forEach((e) => (e.innerHTML = ""));
    feedback.textContent = "Zieh die Karte auf die passende Schicht.";
    nachricht(null);
    neueKarte();
    zeigeStatus();
    ende = performance.now() + SEKUNDEN * 1000;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  }

  // ---------- Ziehen, Antippen, Tasten ----------
  let zug = null;
  const schichtBei = (x, y) => document.elementsFromPoint(x, y).map((e) => e.closest?.(".osi-schicht")).find(Boolean);
  karteEl.addEventListener("pointerdown", (e) => {
    if (!laeuft || sperre) return;
    zug = { x: e.clientX, y: e.clientY, id: e.pointerId };
    karteEl.setPointerCapture(e.pointerId);
    karteEl.classList.add("zieht");
  });
  karteEl.addEventListener("pointermove", (e) => {
    if (!zug || e.pointerId !== zug.id) return;
    karteEl.style.transform = `translate(${e.clientX - zug.x}px, ${e.clientY - zug.y}px) rotate(${Math.max(-8, Math.min(8, (e.clientX - zug.x) / 20))}deg)`;
    dom.querySelectorAll(".osi-schicht").forEach((s) => s.classList.remove("ueber"));
    schichtBei(e.clientX, e.clientY)?.classList.add("ueber");
  });
  const loslassen = (e) => {
    if (!zug || e.pointerId !== zug.id) return;
    const s = schichtBei(e.clientX, e.clientY);
    zug = null;
    karteEl.classList.remove("zieht");
    dom.querySelectorAll(".osi-schicht").forEach((x) => x.classList.remove("ueber"));
    if (s) ablegen(Number(s.dataset.nr));
    else karteEl.style.transform = "";
  };
  karteEl.addEventListener("pointerup", loslassen);
  karteEl.addEventListener("pointercancel", loslassen);
  dom.querySelectorAll(".osi-schicht button").forEach((b) => b.addEventListener("click", () => ablegen(Number(b.parentElement.dataset.nr))));
  const onKey = (e) => {
    if (laeuft && /^[1-7]$/.test(e.key)) {
      e.preventDefault();
      ablegen(Number(e.key));
    }
  };
  window.addEventListener("keydown", onKey);

  status("OSI-Sortierer");
  nachricht(`<p class="big">OSI-Sortierer</p><p>${pool.length} Begriffe: Protokolle, Geräte und Dateneinheiten. Zieh jede Karte auf die richtige Schicht des OSI-Modells.</p><p class="small">${SEKUNDEN} Sekunden · Ziehen, antippen oder Tasten 1–7</p><p><button class="btn" type="button" data-start>Los geht's</button></p>`);
  document.querySelector("#stage-msg [data-start]")?.addEventListener("click", (e) => {
    e.stopPropagation();
    los();
  });

  return {
    pause() {},
    stop() {
      laeuft = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      dom.innerHTML = "";
    },
  };
}
