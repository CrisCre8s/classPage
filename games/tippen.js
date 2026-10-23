// Befehle tippen: Linux-, Git-, Windows- und Netzwerkbefehle fehlerfrei abtippen und lernen, was sie tun.
import { esc } from "./quiz-ui.js";

export const DOM = true;
export const HILFE = "Befehl genau so abtippen · Enter oder fertig getippt: nächster Befehl · 60 Sekunden";

// [Befehl, was er tut]
const BEFEHLE = {
  leicht: [
    ["ls", "Dateien im aktuellen Ordner anzeigen"],
    ["pwd", "aktuellen Pfad ausgeben"],
    ["cd ..", "in den übergeordneten Ordner wechseln"],
    ["mkdir test", "Ordner „test“ anlegen"],
    ["whoami", "angemeldeten Benutzer anzeigen"],
    ["git status", "geänderte Dateien im Repository anzeigen"],
    ["git add .", "alle Änderungen für den nächsten Commit vormerken"],
    ["git pull", "Änderungen vom Server holen und einspielen"],
    ["git push", "eigene Commits zum Server hochladen"],
    ["ping 8.8.8.8", "Erreichbarkeit eines Hosts prüfen"],
    ["ipconfig", "IP-Konfiguration unter Windows anzeigen"],
    ["cat notizen.txt", "Inhalt einer Datei ausgeben"],
    ["cp a.txt b.txt", "Datei kopieren"],
    ["rm alt.txt", "Datei löschen"],
    ["man ls", "Handbuchseite zu einem Befehl öffnen"],
    ["history", "zuletzt ausgeführte Befehle anzeigen"],
    ["clear", "Terminal leeren"],
    ["top", "laufende Prozesse und Auslastung anzeigen"],
  ],
  mittel: [
    ['git commit -m "Fix Login"', "vorgemerkte Änderungen mit Nachricht speichern"],
    ["git checkout -b feature", "neuen Branch „feature“ anlegen und wechseln"],
    ["git log --oneline", "Commit-Verlauf kompakt anzeigen"],
    ["chmod 755 skript.sh", "Rechte setzen: Besitzer alles, andere lesen + ausführen"],
    ["ping -c 4 8.8.8.8", "genau 4 Ping-Pakete senden (Linux)"],
    ["ssh admin@10.0.0.5", "per SSH als „admin“ verbinden"],
    ["grep -i fehler log.txt", "„fehler“ in einer Datei suchen, Groß/klein egal"],
    ["tar -czf backup.tar.gz ordner", "Ordner als gzip-Archiv packen"],
    ["sudo apt update", "Paketlisten unter Debian/Ubuntu aktualisieren"],
    ["ipconfig /all", "ausführliche IP-Konfiguration (Windows)"],
    ["nslookup example.com", "DNS-Auflösung eines Namens abfragen"],
    ["tracert 8.8.8.8", "Weg der Pakete zum Ziel verfolgen (Windows)"],
    ["netstat -an", "offene Verbindungen und Ports anzeigen"],
    ["docker ps -a", "alle Docker-Container anzeigen"],
    ["df -h", "freien Speicherplatz lesbar anzeigen"],
    ["ps aux", "alle laufenden Prozesse anzeigen"],
    ["kill -9 1234", "Prozess 1234 sofort beenden"],
    ['find . -name "*.log"', "alle .log-Dateien unterhalb suchen"],
  ],
  schwer: [
    ["ssh -p 2222 admin@192.168.10.5", "SSH-Verbindung auf abweichendem Port 2222"],
    ["docker run -d -p 8080:80 --name web nginx", "nginx-Container im Hintergrund, Port 8080 → 80"],
    ["git rebase -i HEAD~3", "die letzten 3 Commits interaktiv umbauen"],
    ["git push --set-upstream origin main", "Branch hochladen und als Standard-Ziel setzen"],
    ["iptables -A INPUT -p tcp --dport 22 -j ACCEPT", "Firewall-Regel: eingehendes SSH erlauben"],
    ["tar -xzvf backup.tar.gz -C /opt", "Archiv nach /opt entpacken"],
    ["scp -r projekt/ user@host:/home/user/", "Ordner per SSH auf einen Server kopieren"],
    ["find /var/log -name \"*.log\" -mtime +7 -delete", "Logdateien älter als 7 Tage löschen"],
    ['grep -rn "TODO" src/', "rekursiv nach TODO suchen, mit Zeilennummern"],
    ["systemctl restart nginx.service", "Dienst nginx neu starten"],
    ["journalctl -u ssh --since today", "heutige Log-Einträge des SSH-Dienstes"],
    ["ip addr add 192.168.1.10/24 dev eth0", "IP-Adresse auf eth0 setzen (Linux)"],
    ["Get-NetIPAddress -AddressFamily IPv4", "IPv4-Adressen in PowerShell anzeigen"],
    ["Test-NetConnection 10.0.0.1 -Port 443", "PowerShell: ist Port 443 erreichbar?"],
    ["curl -I https://example.com", "nur die HTTP-Header einer Seite abrufen"],
    ["openssl s_client -connect example.com:443", "TLS-Verbindung und Zertifikat prüfen"],
    ["sed -i 's/alt/neu/g' datei.txt", "in einer Datei „alt“ durch „neu“ ersetzen"],
    ["chmod -R u+rwX,go-w /srv/www", "Rechte rekursiv anpassen"],
  ],
};

export function start({ dom, stufe, status, nachricht, ergebnis }) {
  const liste = BEFEHLE[stufe] || BEFEHLE.mittel;
  const SEKUNDEN = 60;
  dom.innerHTML = `
    <div class="quiz tippen">
      <div class="quiz-top">
        <div class="quiz-zeit" aria-hidden="true"><span></span></div>
        <span class="quiz-serie num"></span>
      </div>
      <div class="quiz-frage">
        <span class="quiz-label">Abtippen</span>
        <code class="tippen-befehl num" aria-live="polite"></code>
        <span class="quiz-unter tippen-erkl"></span>
      </div>
      <form class="quiz-form" autocomplete="off">
        <input class="quiz-input num" type="text" spellcheck="false" autocapitalize="off" autocorrect="off" aria-label="Befehl eintippen" />
      </form>
      <p class="quiz-feedback" aria-live="polite"></p>
    </div>`;
  const el = (s) => dom.querySelector(s);
  const befehlEl = el(".tippen-befehl");
  const erklEl = el(".tippen-erkl");
  const input = el(".quiz-input");
  const balken = el(".quiz-zeit span");
  const feedback = el(".quiz-feedback");

  let aktuell, reihenfolge, pos, zeichen, getippt, fehlerZeichen, geschafft, ende, raf, laeuft, startZeit;

  function mische() {
    reihenfolge = [...liste].sort(() => Math.random() - 0.5);
    pos = 0;
  }

  function naechster() {
    if (pos >= reihenfolge.length) mische();
    aktuell = reihenfolge[pos++];
    erklEl.textContent = aktuell[1];
    input.value = "";
    zeige("");
  }

  // Zeichen einfärben: grün = richtig, rot = falsch, Rest grau
  function zeige(t) {
    const soll = aktuell[0];
    // Wörter zusammenhalten, damit lange Befehle nur an Leerzeichen umbrechen
    let html = '<span class="tw">';
    for (let i = 0; i < soll.length; i++) {
      const klasse = i < t.length ? (t[i] === soll[i] ? "ok" : "falsch") : i === t.length ? "cursor" : "";
      if (soll[i] === " ") html += `</span><span class="${klasse}">\u00a0</span><wbr><span class="tw">`;
      else html += `<span class="${klasse}">${esc(soll[i])}</span>`;
    }
    befehlEl.innerHTML = html + "</span>";
  }

  function zeigeStatus() {
    const minuten = Math.max(1 / 60, (performance.now() - startZeit) / 60000);
    status(`${zeichen} Pkt · ${geschafft} Befehle · ${Math.round(zeichen / minuten)} Zeichen/min`);
  }

  function onInput() {
    if (!laeuft) return;
    const t = input.value;
    const soll = aktuell[0];
    // neu dazugekommenes Zeichen falsch? → für die Genauigkeit zählen
    if (t.length > getippt && t[t.length - 1] !== soll[t.length - 1]) fehlerZeichen++;
    getippt = t.length;
    zeige(t);
    if (t === soll) fertigBefehl();
  }

  function fertigBefehl() {
    zeichen += aktuell[0].length;
    geschafft++;
    getippt = 0;
    feedback.textContent = `✓ ${aktuell[0]}`;
    feedback.className = "quiz-feedback ok";
    zeigeStatus();
    naechster();
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
    input.blur();
    const anschlaege = zeichen + fehlerZeichen;
    const genau = anschlaege ? Math.round((zeichen / anschlaege) * 100) : 0;
    const neu = ergebnis({ punkte: zeichen });
    nachricht(`<p class="big">Zeit um!</p><p>${geschafft} Befehle · ${zeichen} Zeichen/min · ${genau} % Genauigkeit${neu ? " · neuer Highscore!" : ""}</p><p><button class="btn" type="button" data-neu>Nochmal</button></p>`);
    document.querySelector("#stage-msg [data-neu]")?.addEventListener("click", (e) => {
      e.stopPropagation();
      los();
    });
  }

  function los() {
    zeichen = 0;
    getippt = 0;
    fehlerZeichen = 0;
    geschafft = 0;
    laeuft = true;
    feedback.textContent = "";
    mische();
    naechster();
    nachricht(null);
    startZeit = performance.now();
    ende = startZeit + SEKUNDEN * 1000;
    zeigeStatus();
    input.focus({ preventScroll: true });
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  }

  input.addEventListener("input", onInput);
  el(".quiz-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (laeuft && input.value === aktuell[0]) fertigBefehl();
  });
  // Klick irgendwo auf die Fläche holt den Fokus zurück ins Eingabefeld
  const onDomClick = () => laeuft && input.focus({ preventScroll: true });
  dom.addEventListener("click", onDomClick);

  mische();
  naechster();
  status("Befehle tippen");
  nachricht(`<p class="big">Befehle tippen</p><p>${liste.length} Befehle für Linux, Git, Windows und Netzwerk. Unter jedem steht, was er tut.</p><p class="small">${SEKUNDEN} Sekunden · Punkte = richtig getippte Zeichen</p><p><button class="btn" type="button" data-start>Los geht's</button></p>`);
  document.querySelector("#stage-msg [data-start]")?.addEventListener("click", (e) => {
    e.stopPropagation();
    los();
  });

  return {
    pause() {},
    stop() {
      laeuft = false;
      cancelAnimationFrame(raf);
      dom.removeEventListener("click", onDomClick);
      dom.innerHTML = "";
    },
  };
}
