// Befehl gesucht: Aufgabe + Betriebssystem stehen da, den passenden Befehl selbst eintippen.
// Ein verdeckter Hinweis hilft weiter, kostet aber die Hälfte der Punkte.
import { quizSpiel, esc } from "./quiz-ui.js";

export const DOM = true;
export const HILFE = "Befehl eintippen · Enter: prüfen · Hinweis aufdecken = halbe Punkte · 90 Sekunden";

// System, unter dem der Befehl läuft (steht als Etikett über der Aufgabe)
export const SYSTEME = {
  linux: "Linux",
  cmd: "Windows (CMD)",
  ps: "Windows (PowerShell)",
  git: "Git",
  docker: "Docker",
};

// { sys, aufgabe, loesungen: [erste = Musterlösung, weitere sind auch richtig], hinweis }
const B = (sys, aufgabe, loesungen, hinweis) => ({ sys, aufgabe, loesungen: [].concat(loesungen), hinweis });

export const BEFEHLE = {
  leicht: [
    B("linux", "Inhalt des aktuellen Ordners anzeigen", ["ls", "ls -l", "ls -la", "ls -al"], "Zwei Buchstaben, kurz für „list“"),
    B("linux", "Aktuellen Pfad ausgeben", "pwd", "print working directory"),
    B("linux", "In den übergeordneten Ordner wechseln", "cd ..", "cd + zwei Punkte"),
    B("linux", "Ordner „test“ anlegen", "mkdir test", "make directory: mkdir …"),
    B("linux", "Inhalt der Datei notizen.txt ausgeben", "cat notizen.txt", "Kurz für „concatenate“, klingt wie ein Tier"),
    B("linux", "Datei alt.txt löschen", "rm alt.txt", "remove: rm …"),
    B("linux", "Laufende Prozesse live anzeigen", ["top", "htop"], "Drei Buchstaben, englisch für „Spitze“"),
    B("linux", "Terminal leeren", "clear", "Englisch für „leeren“"),
    B("linux", "Angemeldeten Benutzer anzeigen", "whoami", "„Wer bin ich?“ auf Englisch, zusammengeschrieben"),
    B("cmd", "IP-Konfiguration anzeigen", "ipconfig", "ip + config"),
    B("cmd", "Inhalt des aktuellen Ordners anzeigen", "dir", "Kurz für „directory“, drei Buchstaben"),
    B("cmd", "Bildschirm leeren", "cls", "clear screen: c… l… s…"),
    B("cmd", "Erreichbarkeit von 8.8.8.8 prüfen", "ping 8.8.8.8", "Wie beim Tischtennis: p… 8.8.8.8"),
    B("cmd", "Namen des Computers anzeigen", "hostname", "host + name"),
    B("git", "Geänderte Dateien im Repository anzeigen", "git status", "git + Zustand auf Englisch"),
    B("git", "Alle Änderungen für den nächsten Commit vormerken", ["git add .", "git add -A", "git add --all"], "git add + Punkt für „alles hier“"),
    B("git", "Änderungen vom Server holen und einspielen", "git pull", "Gegenteil von push"),
    B("git", "Eigene Commits zum Server hochladen", "git push", "Englisch für „schieben“"),
  ],
  mittel: [
    B("linux", "Rechte von skript.sh auf rwxr-xr-x setzen", ["chmod 755 skript.sh", "chmod u=rwx,go=rx skript.sh"], "chmod + drei Ziffern (r=4, w=2, x=1) + Datei"),
    B("linux", "Genau 4 Ping-Pakete an 8.8.8.8 senden", ["ping -c 4 8.8.8.8", "ping -c4 8.8.8.8"], "ping mit Option -c (count)"),
    B("linux", "Als Benutzer admin per SSH mit 10.0.0.5 verbinden", ["ssh admin@10.0.0.5", "ssh -l admin 10.0.0.5"], "ssh benutzer@adresse"),
    B("linux", "In log.txt nach „fehler“ suchen, Groß-/Kleinschreibung egal", ["grep -i fehler log.txt"], "grep mit Option -i (ignore case)"),
    B("linux", "Paketlisten aktualisieren (Debian/Ubuntu)", ["apt update", "apt-get update"], "Paketmanager apt + update"),
    B("linux", "Freien Platz aller Laufwerke gut lesbar anzeigen", "df -h", "disk free + Option für „human readable“"),
    B("linux", "Prozess 1234 sofort beenden", ["kill -9 1234", "kill -KILL 1234", "kill -SIGKILL 1234"], "kill + Signal 9 + Prozess-ID"),
    B("linux", "Datei a.txt in den Ordner backup kopieren", ["cp a.txt backup/", "cp a.txt backup"], "copy: cp Quelle Ziel"),
    B("cmd", "Ausführliche IP-Konfiguration anzeigen", ["ipconfig /all", "ipconfig/all"], "ipconfig mit Schalter für „alles“"),
    B("cmd", "DNS-Eintrag von example.com abfragen", "nslookup example.com", "name server lookup"),
    B("cmd", "Weg der Pakete zu 8.8.8.8 verfolgen", "tracert 8.8.8.8", "Windows kürzt „trace route“ ab"),
    B("cmd", "Alle Verbindungen und Ports als Zahlen anzeigen", ["netstat -an", "netstat -na", "netstat -a -n"], "netstat mit -a (alle) und -n (numerisch)"),
    B("cmd", "DNS-Cache leeren", ["ipconfig /flushdns", "ipconfig/flushdns"], "ipconfig /… „spülen“ auf Englisch + dns"),
    B("cmd", "Neue IP-Adresse vom DHCP-Server holen", ["ipconfig /renew", "ipconfig/renew"], "ipconfig /… „erneuern“ auf Englisch"),
    B("git", "Neuen Branch „feature“ anlegen und direkt wechseln", ["git checkout -b feature", "git switch -c feature"], "git checkout mit -b"),
    B("git", "Vorgemerkte Änderungen mit der Nachricht „Fix Login“ committen", ['git commit -m "Fix Login"'], "git commit mit -m und Nachricht in Anführungszeichen"),
    B("git", "Commit-Verlauf kompakt, eine Zeile pro Commit", "git log --oneline", "git log + „eine Zeile“ als Option"),
    B("docker", "Alle Container anzeigen, auch gestoppte", ["docker ps -a", "docker ps --all", "docker container ls -a"], "docker ps + Option für „alle“"),
  ],
  schwer: [
    B("linux", "Als admin per SSH auf Port 2222 mit 192.168.10.5 verbinden", ["ssh -p 2222 admin@192.168.10.5", "ssh admin@192.168.10.5 -p 2222"], "ssh -p <Port> benutzer@adresse"),
    B("linux", "Archiv backup.tar.gz nach /opt entpacken", ["tar -xzf backup.tar.gz -C /opt", "tar -xzvf backup.tar.gz -C /opt", "tar xzf backup.tar.gz -C /opt", "tar xzvf backup.tar.gz -C /opt", "tar -xf backup.tar.gz -C /opt"], "tar -x… (extract), Zielordner mit -C"),
    B("linux", "Ordner projekt als gzip-Archiv projekt.tar.gz packen", ["tar -czf projekt.tar.gz projekt", "tar -czvf projekt.tar.gz projekt", "tar czf projekt.tar.gz projekt", "tar czvf projekt.tar.gz projekt", "tar -czf projekt.tar.gz projekt/"], "tar -c… (create) z (gzip) f (Datei)"),
    B("linux", "Dienst nginx über systemd neu starten", ["systemctl restart nginx", "systemctl restart nginx.service"], "systemctl + restart + Dienst"),
    B("linux", "IP-Adresse 192.168.1.10/24 auf eth0 setzen", ["ip addr add 192.168.1.10/24 dev eth0", "ip a add 192.168.1.10/24 dev eth0", "ip address add 192.168.1.10/24 dev eth0"], "ip addr add <IP/Präfix> dev <Schnittstelle>"),
    B("linux", "Rekursiv in src/ nach TODO suchen, mit Zeilennummern", ["grep -rn TODO src/", "grep -rn TODO src", "grep -nr TODO src/", "grep -nr TODO src", "grep -r -n TODO src/"], "grep mit -r (rekursiv) und -n (Nummern)"),
    B("linux", "Log-Einträge des Dienstes ssh anzeigen (systemd)", ["journalctl -u ssh", "journalctl -u ssh.service"], "journalctl -u <Dienst>"),
    B("linux", "Firewall: eingehendes TCP auf Port 22 erlauben (iptables)", ["iptables -A INPUT -p tcp --dport 22 -j ACCEPT"], "iptables -A INPUT -p tcp --dport … -j ACCEPT"),
    B("linux", "Ordner projekt per SSH nach user@host:/home/user/ kopieren", ["scp -r projekt user@host:/home/user/", "scp -r projekt/ user@host:/home/user/", "scp -r projekt user@host:/home/user"], "scp mit -r (rekursiv) Quelle Ziel"),
    B("ps", "Alle IPv4-Adressen des Rechners anzeigen", ["Get-NetIPAddress -AddressFamily IPv4"], "Get-NetIPAddress mit -AddressFamily"),
    B("ps", "Prüfen, ob Port 443 auf 10.0.0.1 erreichbar ist", ["Test-NetConnection 10.0.0.1 -Port 443", "Test-NetConnection -ComputerName 10.0.0.1 -Port 443", "tnc 10.0.0.1 -Port 443"], "Test-NetConnection <Ziel> -Port …"),
    B("ps", "Laufende Prozesse anzeigen", ["Get-Process", "gps"], "Verb-Nomen: Get-…"),
    B("ps", "Dienst Spooler neu starten", ["Restart-Service Spooler", "Restart-Service -Name Spooler"], "Verb-Nomen: Restart-…"),
    B("cmd", "Alle laufenden Prozesse auflisten", "tasklist", "task + list"),
    B("git", "Branch main hochladen und als Upstream festlegen", ["git push -u origin main", "git push --set-upstream origin main"], "git push mit -u, dann Remote und Branch"),
    B("git", "Letzten Commit zurücknehmen, Änderungen bleiben vorgemerkt", ["git reset --soft HEAD~1", "git reset --soft HEAD^", "git reset --soft HEAD~"], "git reset --soft HEAD~…"),
    B("git", "Remote origin mit https://github.com/x/y.git hinzufügen", ["git remote add origin https://github.com/x/y.git"], "git remote add <Name> <URL>"),
    B("docker", "nginx im Hintergrund starten, Port 8080 → 80, Name web", ["docker run -d -p 8080:80 --name web nginx", "docker run -d --name web -p 8080:80 nginx", "docker run --name web -d -p 8080:80 nginx", "docker run -p 8080:80 -d --name web nginx", "docker run --name web -p 8080:80 -d nginx", "docker run -p 8080:80 --name web -d nginx"], "docker run -d -p Host:Container --name … Image"),
  ],
};

const STUFEN = { leicht: 10, mittel: 15, schwer: 20 };

// Vergleich: Leerzeichen und Anführungszeichen egal, unter Linux ein vorangestelltes sudo auch.
// Windows unterscheidet nicht zwischen Groß- und Kleinschreibung, Linux, Git und Docker schon.
export function gleich(eingabe, loesung, sys) {
  const norm = (t) => {
    let s = String(t).replace(/["'„“”‚‘’]/g, "").replace(/\s+/g, " ").trim();
    if (sys === "linux") s = s.replace(/^sudo /, "");
    if (sys === "cmd" || sys === "ps") s = s.toLowerCase();
    return s;
  };
  return norm(eingabe) === norm(loesung);
}

const mische = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export function start({ dom, stufe, status, nachricht, ergebnis }) {
  const liste = BEFEHLE[stufe] || BEFEHLE.mittel;
  let stapel = [];
  return quizSpiel({
    dom,
    status,
    nachricht,
    ergebnis,
    titel: "Befehl gesucht",
    intro: `${liste.length} Aufgaben für Linux, Windows, Git und Docker. Du weißt nicht weiter? Deck den Hinweis auf, dann gibt es nur die halben Punkte.`,
    sekunden: 90,
    punkteJe: STUFEN[stufe] || STUFEN.mittel,
    naechste() {
      if (!stapel.length) stapel = mische([...liste]);
      const b = stapel.pop();
      const andere = b.loesungen.slice(1);
      return {
        frage: `<span class="quiz-os" data-sys="${b.sys}">${SYSTEME[b.sys]}</span><span class="quiz-label">Welcher Befehl?</span><span class="quiz-aufgabe">${esc(b.aufgabe)}</span>`,
        loesung: b.loesungen[0],
        freitext: true,
        platzhalter: b.sys === "ps" ? "PS> …" : b.sys === "cmd" ? "C:\\> …" : "$ …",
        hinweis: b.hinweis,
        pruefe: (e) => b.loesungen.some((l) => gleich(e, l, b.sys)),
        erklaerung: andere.length ? `Auch richtig: <span class="num">${andere.map(esc).join(" · ")}</span>` : "",
      };
    },
  });
}
