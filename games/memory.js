// Fachbegriff-Memory: Begriff und passende Erklärung aufdecken. Bestzeit zählt.

export const DOM = true;
export const HILFE = "Zwei Karten aufdecken · passen Begriff und Erklärung zusammen, bleiben sie offen · schneller = besser";

// [Begriff, Erklärung, Stufe]
export const PAARE = [
  ["RAID 1", "Spiegelung auf zwei Platten", 1],
  ["RAID 0", "Striping ohne Ausfallsicherheit", 1],
  ["DHCP", "Vergibt IP-Adressen automatisch", 1],
  ["DNS", "Übersetzt Namen in IP-Adressen", 1],
  ["Firewall", "Filtert Netzwerkverkehr nach Regeln", 1],
  ["Router", "Verbindet verschiedene Netze", 1],
  ["Switch", "Verteilt Frames per MAC-Adresse", 1],
  ["USV", "Überbrückt Stromausfälle", 1],
  ["Backup", "Sicherungskopie der Daten", 1],
  ["VPN", "Verschlüsselter Tunnel ins Netz", 1],
  ["RAID 5", "Verteilte Parität, 1 Platte darf ausfallen", 2],
  ["NAS", "Speicher im Netzwerk über Dateifreigaben", 2],
  ["SSD", "Speicher ohne bewegliche Teile", 2],
  ["Phishing", "Gefälschte Mails, um Daten abzugreifen", 2],
  ["DSGVO", "EU-Regeln zum Schutz personenbezogener Daten", 2],
  ["Subnetzmaske", "Trennt Netz- und Hostanteil der IP", 2],
  ["Gateway", "Tor aus dem eigenen Netz hinaus", 2],
  ["SLA", "Vereinbarte Service-Qualität mit dem Kunden", 2],
  ["Inkrementelles Backup", "Sichert nur Änderungen seit dem letzten Backup", 2],
  ["Ticketsystem", "Erfasst und verfolgt Störungen und Anfragen", 2],
  ["Virtualisierung", "Mehrere virtuelle Rechner auf einer Hardware", 2],
  ["Malware", "Oberbegriff für Schadsoftware", 2],
  ["RAID 10", "Spiegelung und Striping kombiniert", 3],
  ["Differenzielles Backup", "Sichert alle Änderungen seit dem letzten Vollbackup", 3],
  ["SAN", "Eigenes Netz nur für Speicher, blockbasiert", 3],
  ["VLAN", "Logische Trennung eines Netzes auf einem Switch", 3],
  ["NAT", "Übersetzt private in öffentliche IP-Adressen", 3],
  ["Hypervisor", "Software, die virtuelle Maschinen verwaltet", 3],
  ["Zwei-Faktor-Authentifizierung", "Anmeldung mit zwei unabhängigen Nachweisen", 3],
  ["Ransomware", "Verschlüsselt Daten und fordert Lösegeld", 3],
  ["ITIL", "Leitfaden für IT-Service-Management", 3],
  ["Scrum", "Agiles Vorgehen in Sprints", 3],
  ["Lastenheft", "Anforderungen aus Sicht des Auftraggebers", 3],
  ["Pflichtenheft", "Umsetzung aus Sicht des Auftragnehmers", 3],
  ["RAM", "Flüchtiger Arbeitsspeicher", 1],
  ["BIOS/UEFI", "Firmware, die den Rechner startet", 2],
];

const STUFEN = { leicht: { paare: 6, bis: 1 }, mittel: { paare: 8, bis: 2 }, schwer: { paare: 10, bis: 3 } };
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const formatZeit = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function start({ dom, stufe, status, nachricht, ergebnis }) {
  const S = STUFEN[stufe] || STUFEN.mittel;
  dom.innerHTML = `<div class="memory"><div class="memory-feld" style="--spalten: ${S.paare >= 10 ? 5 : 4}"></div></div>`;
  const feld = dom.querySelector(".memory-feld");
  let karten, offen, gefunden, zuege, start0, laeuft, timer, sperre;

  const mische = (a) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const zeigeStatus = () => status(`${gefunden}/${S.paare} Paare · ${zuege} Züge · ${start0 ? formatZeit((performance.now() - start0) / 1000) : "0:00"}`);

  function los() {
    // eher Begriffe der eigenen Stufe, aufgefüllt mit leichteren
    const eigene = mische(PAARE.filter((p) => p[2] === S.bis));
    const rest = mische(PAARE.filter((p) => p[2] < S.bis));
    const auswahl = [...eigene, ...rest].slice(0, S.paare);
    karten = mische(auswahl.flatMap((p, i) => [{ paar: i, text: p[0], art: "begriff" }, { paar: i, text: p[1], art: "erklaerung" }]));
    offen = [];
    gefunden = 0;
    zuege = 0;
    start0 = 0;
    sperre = false;
    laeuft = true;
    feld.innerHTML = karten
      .map(
        (k, i) => `<button type="button" class="memory-karte ${k.art}" data-i="${i}" aria-label="Verdeckte Karte ${i + 1}"><span class="memory-rueck" aria-hidden="true">?</span><span class="memory-vorn">${esc(k.text)}</span></button>`,
      )
      .join("");
    nachricht(null);
    clearInterval(timer);
    timer = setInterval(zeigeStatus, 500);
    zeigeStatus();
  }
  function decke(i) {
    if (!laeuft || sperre) return;
    const k = karten[i];
    const b = feld.querySelector(`[data-i="${i}"]`);
    if (k.weg || offen.includes(i)) return;
    if (!start0) start0 = performance.now();
    offen.push(i);
    b.classList.add("offen");
    b.setAttribute("aria-label", k.text);
    if (offen.length < 2) return;
    zuege++;
    const [a, c] = offen.map((x) => karten[x]);
    if (a.paar === c.paar) {
      a.weg = c.weg = true;
      offen.forEach((x) => feld.querySelector(`[data-i="${x}"]`).classList.add("gefunden"));
      offen = [];
      gefunden++;
      zeigeStatus();
      if (gefunden === S.paare) fertig();
      return;
    }
    sperre = true;
    offen.forEach((x) => feld.querySelector(`[data-i="${x}"]`).classList.add("falsch"));
    setTimeout(() => {
      offen.forEach((x) => {
        const el = feld.querySelector(`[data-i="${x}"]`);
        el.classList.remove("offen", "falsch");
        el.setAttribute("aria-label", "Verdeckte Karte");
      });
      offen = [];
      sperre = false;
      zeigeStatus();
    }, 950);
  }
  function fertig() {
    laeuft = false;
    clearInterval(timer);
    const sek = (performance.now() - start0) / 1000;
    const neu = ergebnis({ gewonnen: true, zeit: sek });
    status(`Alle ${S.paare} Paare in ${formatZeit(sek)} · ${zuege} Züge`);
    nachricht(`<p class="big">Alle Paare!</p><p>${formatZeit(sek)} min · ${zuege} Züge (bestmöglich: ${S.paare})${neu ? " · neue Bestzeit!" : ""}</p><p><button class="btn" type="button" data-neu>Nochmal</button></p>`);
    document.querySelector("#stage-msg [data-neu]")?.addEventListener("click", (e) => {
      e.stopPropagation();
      los();
    });
  }
  feld.addEventListener("click", (e) => {
    const b = e.target.closest(".memory-karte");
    if (b) decke(Number(b.dataset.i));
  });

  status("Fachbegriff-Memory");
  nachricht(`<p class="big">Fachbegriff-Memory</p><p>${S.paare} Paare aus Begriff und Erklärung. Deck immer zwei Karten auf. Die Zeit läuft ab der ersten Karte.</p><p><button class="btn" type="button" data-start>Los geht's</button></p>`);
  document.querySelector("#stage-msg [data-start]")?.addEventListener("click", (e) => {
    e.stopPropagation();
    los();
  });
  return {
    pause() {},
    stop() {
      laeuft = false;
      clearInterval(timer);
      dom.innerHTML = "";
    },
  };
}
