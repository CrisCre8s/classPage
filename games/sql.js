// SQL-Sprint: Eine kleine Datenbank ist zu sehen, ihr schreibt die passende SELECT-Abfrage.
// Die Seite führt sie wirklich aus (sql-engine.js) und vergleicht das Ergebnis mit der Musterlösung.
import { fuehreAus, gleichesErgebnis, SqlFehler } from "./sql-engine.js";

export const DOM = true;
export const HILFE = "Abfrage schreiben · Strg+Enter oder „Ausführen“ · 6 Aufgaben pro Runde · weniger Versuche = mehr Punkte";

export const DB = {
  kunden: {
    spalten: ["id", "name", "stadt", "alter"],
    zeilen: [
      [1, "Anna", "Berlin", 28],
      [2, "Ben", "Hamburg", 35],
      [3, "Clara", "Berlin", 42],
      [4, "David", "München", 19],
      [5, "Emma", "Jena", 31],
      [6, "Mia", "Hamburg", 24],
      [7, "Max", "Berlin", 37],
      [8, "Noah", "Jena", 52],
    ],
  },
  bestellungen: {
    spalten: ["id", "kunde_id", "produkt", "preis", "menge"],
    zeilen: [
      [1, 1, "Maus", 19.9, 2],
      [2, 1, "Monitor", 189, 1],
      [3, 2, "Tastatur", 49.5, 1],
      [4, 3, "Laptop", 899, 1],
      [5, 3, "Maus", 19.9, 1],
      [6, 5, "Headset", 59, 2],
      [7, 6, "USB-Stick", 9.9, 5],
      [8, 7, "Monitor", 189, 2],
      [9, 7, "Kabel", 4.5, 10],
      [10, 8, "Drucker", 129, 1],
    ],
  },
  mitarbeiter: {
    spalten: ["id", "name", "abteilung", "gehalt", "eintritt"],
    zeilen: [
      [1, "Schmidt", "IT", 4200, 2018],
      [2, "Meier", "Vertrieb", 3600, 2020],
      [3, "Wagner", "IT", 3900, 2021],
      [4, "Becker", "Lager", 2900, 2016],
      [5, "Hoffmann", "Vertrieb", 3300, 2022],
      [6, "Koch", "IT", 4800, 2014],
      [7, "Richter", "Lager", 3100, 2019],
      [8, "Klein", "Vertrieb", 3800, 2017],
    ],
  },
};

// { s: Stufe, t: Text, q: Musterlösung, tab: gezeigte Tabellen, tipp: Hinweis }
export const AUFGABEN = [
  { s: 1, t: "Zeige alle Spalten aller Kunden.", q: "SELECT * FROM kunden", tab: ["kunden"], tipp: "SELECT * FROM …" },
  { s: 1, t: "Zeige die Namen aller Kunden aus Berlin.", q: "SELECT name FROM kunden WHERE stadt = 'Berlin'", tab: ["kunden"], tipp: "WHERE stadt = 'Berlin' (Text in einfachen Anführungszeichen)" },
  { s: 1, t: "Zeige Name und Alter aller Kunden, die älter als 30 sind.", q: "SELECT name, alter FROM kunden WHERE alter > 30", tab: ["kunden"], tipp: "Zwei Spalten mit Komma trennen, dann WHERE alter > 30" },
  { s: 1, t: "Zeige alle Spalten der Mitarbeiter aus der Abteilung IT.", q: "SELECT * FROM mitarbeiter WHERE abteilung = 'IT'", tab: ["mitarbeiter"], tipp: "SELECT * … WHERE abteilung = 'IT'" },
  { s: 1, t: "Zeige Produkt und Preis aller Bestellungen, die weniger als 20 € kosten.", q: "SELECT produkt, preis FROM bestellungen WHERE preis < 20", tab: ["bestellungen"], tipp: "WHERE preis < 20" },
  { s: 1, t: "Zeige die Namen aller Kunden, alphabetisch sortiert.", q: "SELECT name FROM kunden ORDER BY name", tab: ["kunden"], tipp: "ORDER BY name (aufsteigend ist Standard)" },
  { s: 1, t: "Zeige Name und Gehalt aller Mitarbeiter mit mindestens 3500 € Gehalt.", q: "SELECT name, gehalt FROM mitarbeiter WHERE gehalt >= 3500", tab: ["mitarbeiter"], tipp: "mindestens = >=" },
  { s: 2, t: "Wie viele Kunden gibt es?", q: "SELECT COUNT(*) FROM kunden", tab: ["kunden"], tipp: "COUNT(*) zählt Zeilen" },
  { s: 2, t: "Zeige die Namen der Kunden aus Hamburg oder Jena.", q: "SELECT name FROM kunden WHERE stadt = 'Hamburg' OR stadt = 'Jena'", tab: ["kunden"], tipp: "OR oder stadt IN ('Hamburg', 'Jena')" },
  { s: 2, t: "Zeige Name und Gehalt aller Mitarbeiter, das höchste Gehalt zuerst.", q: "SELECT name, gehalt FROM mitarbeiter ORDER BY gehalt DESC", tab: ["mitarbeiter"], tipp: "ORDER BY … DESC sortiert absteigend" },
  { s: 2, t: "Zeige die Namen aller Kunden, die mit M beginnen.", q: "SELECT name FROM kunden WHERE name LIKE 'M%'", tab: ["kunden"], tipp: "LIKE 'M%' (% steht für beliebig viele Zeichen)" },
  { s: 2, t: "Wie hoch ist das durchschnittliche Gehalt aller Mitarbeiter?", q: "SELECT AVG(gehalt) FROM mitarbeiter", tab: ["mitarbeiter"], tipp: "AVG(spalte) bildet den Durchschnitt" },
  { s: 2, t: "Zeige Produkt und Preis der 3 teuersten Bestellungen.", q: "SELECT produkt, preis FROM bestellungen ORDER BY preis DESC LIMIT 3", tab: ["bestellungen"], tipp: "ORDER BY preis DESC, dann LIMIT 3" },
  { s: 2, t: "In welchen Städten wohnen Kunden? Jede Stadt nur einmal.", q: "SELECT DISTINCT stadt FROM kunden", tab: ["kunden"], tipp: "SELECT DISTINCT entfernt doppelte Zeilen" },
  { s: 2, t: "Zeige die Namen der Mitarbeiter, die zwischen 2017 und 2020 angefangen haben.", q: "SELECT name FROM mitarbeiter WHERE eintritt BETWEEN 2017 AND 2020", tab: ["mitarbeiter"], tipp: "BETWEEN 2017 AND 2020 (Grenzen gehören dazu)" },
  { s: 3, t: "Wie viele Kunden wohnen in jeder Stadt? Zeige Stadt und Anzahl.", q: "SELECT stadt, COUNT(*) FROM kunden GROUP BY stadt", tab: ["kunden"], tipp: "GROUP BY stadt, dazu COUNT(*)" },
  { s: 3, t: "Zeige je Abteilung das Durchschnittsgehalt.", q: "SELECT abteilung, AVG(gehalt) FROM mitarbeiter GROUP BY abteilung", tab: ["mitarbeiter"], tipp: "GROUP BY abteilung mit AVG(gehalt)" },
  { s: 3, t: "Zeige für jede Bestellung das Produkt und den Gesamtpreis (preis × menge).", q: "SELECT produkt, preis * menge FROM bestellungen", tab: ["bestellungen"], tipp: "Man kann in SELECT rechnen: preis * menge" },
  { s: 3, t: "Zeige zu jeder Bestellung den Namen des Kunden und das Produkt.", q: "SELECT k.name, b.produkt FROM bestellungen b JOIN kunden k ON b.kunde_id = k.id", tab: ["kunden", "bestellungen"], tipp: "JOIN kunden ON bestellungen.kunde_id = kunden.id" },
  { s: 3, t: "Zeige je Kunde (Name) die Summe aller Bestellungen (preis × menge).", q: "SELECT k.name, SUM(b.preis * b.menge) FROM kunden k JOIN bestellungen b ON b.kunde_id = k.id GROUP BY k.name", tab: ["kunden", "bestellungen"], tipp: "JOIN, dann GROUP BY name mit SUM(preis * menge)" },
  { s: 3, t: "Welche Abteilungen haben mehr als 2 Mitarbeiter? Zeige nur die Abteilung.", q: "SELECT abteilung FROM mitarbeiter GROUP BY abteilung HAVING COUNT(*) > 2", tab: ["mitarbeiter"], tipp: "GROUP BY abteilung HAVING COUNT(*) > 2" },
  { s: 3, t: "Zeige die Namen der Kunden, die keine Bestellung haben.", q: "SELECT k.name FROM kunden k LEFT JOIN bestellungen b ON b.kunde_id = k.id WHERE b.id IS NULL", tab: ["kunden", "bestellungen"], tipp: "LEFT JOIN und dann WHERE bestellungen.id IS NULL" },
];

const STUFEN = { leicht: { bis: 1, punkte: 30 }, mittel: { bis: 2, punkte: 40 }, schwer: { bis: 3, punkte: 50 } };
const PRO_RUNDE = 6;
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const zahl = (v) => (v === null ? "NULL" : typeof v === "number" ? (Number.isInteger(v) ? String(v) : v.toFixed(2).replace(".", ",")) : esc(v));

function tabelleHtml(name, spalten, zeilen, klasse = "") {
  return `<div class="sql-tab-wrap ${klasse}">${name ? `<p class="sql-tab-name">${esc(name)}</p>` : ""}<table class="sql-tab"><thead><tr>${spalten.map((s) => `<th>${esc(s)}</th>`).join("")}</tr></thead><tbody>${zeilen
    .map((z) => `<tr>${z.map((v) => `<td class="${typeof v === "number" ? "num" : ""}">${zahl(v)}</td>`).join("")}</tr>`)
    .join("")}</tbody></table></div>`;
}

export function start({ dom, stufe, status, nachricht, ergebnis }) {
  const S = STUFEN[stufe] || STUFEN.mittel;
  // auf Mittel und Schwer kommen auch leichtere Aufgaben vor, aber nicht nur
  const pool = AUFGABEN.filter((a) => a.s <= S.bis);
  dom.innerHTML = `
    <div class="sql">
      <div class="sql-kopf"><span class="sql-fortschritt num"></span><span class="quiz-serie num"></span></div>
      <p class="sql-aufgabe" aria-live="polite"></p>
      <div class="sql-tabellen"></div>
      <label class="sql-eingabe-label" for="sql-eingabe">Deine Abfrage</label>
      <textarea id="sql-eingabe" class="sql-eingabe num" rows="3" spellcheck="false" autocapitalize="off" autocorrect="off" placeholder="SELECT … FROM …"></textarea>
      <div class="sql-knoepfe">
        <button class="btn" type="button" data-a="ausfuehren">Ausführen</button>
        <button class="more" type="button" data-a="tipp">Tipp (halbe Punkte)</button>
        <button class="more" type="button" data-a="loesung">Lösung zeigen</button>
        <button class="btn btn-ghost" type="button" data-a="weiter" hidden>Weiter</button>
      </div>
      <p class="sql-meldung" aria-live="polite"></p>
      <div class="sql-ergebnis"></div>
    </div>`;
  const el = (s) => dom.querySelector(s);
  const eingabe = el(".sql-eingabe");
  const meldung = el(".sql-meldung");
  const knopf = (a) => el(`[data-a="${a}"]`);
  let runde, nr, aufgabe, soll, versuche, tipp, geloest, punkte, richtig, start, liste;

  const mische = (a) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  function zeigeStatus() {
    status(`${punkte} Pkt · Aufgabe ${Math.min(nr + 1, PRO_RUNDE)} von ${PRO_RUNDE}`);
    el(".sql-fortschritt").textContent = `Aufgabe ${Math.min(nr + 1, PRO_RUNDE)} / ${PRO_RUNDE}`;
  }
  function zeigeAufgabe() {
    aufgabe = runde[nr];
    soll = fuehreAus(DB, aufgabe.q);
    versuche = 0;
    tipp = false;
    geloest = false;
    el(".sql-aufgabe").textContent = aufgabe.t;
    el(".sql-tabellen").innerHTML = aufgabe.tab.map((t) => tabelleHtml(t, DB[t].spalten, DB[t].zeilen)).join("");
    el(".sql-ergebnis").innerHTML = "";
    meldung.textContent = "";
    meldung.className = "sql-meldung";
    eingabe.value = "";
    eingabe.disabled = false;
    knopf("ausfuehren").hidden = false;
    knopf("tipp").hidden = false;
    knopf("loesung").hidden = false;
    knopf("weiter").hidden = true;
    zeigeStatus();
    if (!window.matchMedia("(pointer: coarse)").matches) eingabe.focus({ preventScroll: true });
  }
  function ausfuehren() {
    if (geloest) return;
    const sql = eingabe.value.trim();
    if (!sql) return;
    let ist;
    try {
      ist = fuehreAus(DB, sql);
    } catch (e) {
      meldung.className = "sql-meldung fehler";
      meldung.textContent = e instanceof SqlFehler ? `Fehler: ${e.message}` : "Fehler: Die Abfrage konnte nicht ausgeführt werden.";
      el(".sql-ergebnis").innerHTML = "";
      return;
    }
    versuche++;
    el(".sql-ergebnis").innerHTML = tabelleHtml("Dein Ergebnis", ist.spalten, ist.zeilen.slice(0, 20), "ist");
    const v = gleichesErgebnis(ist, soll);
    if (v.ok) {
      const wert = Math.max(Math.round(S.punkte / 3), S.punkte - (versuche - 1) * Math.round(S.punkte / 4));
      const plus = tipp ? Math.round(wert / 2) : wert;
      punkte += plus;
      richtig++;
      meldung.className = "sql-meldung ok";
      meldung.textContent = `Richtig! +${plus} Punkte${versuche > 1 ? ` (${versuche}. Versuch)` : ""}`;
      fertigeAufgabe();
    } else {
      meldung.className = "sql-meldung falsch";
      meldung.textContent = `Noch nicht: ${v.grund}`;
    }
  }
  function fertigeAufgabe() {
    geloest = true;
    eingabe.disabled = true;
    knopf("ausfuehren").hidden = true;
    knopf("tipp").hidden = true;
    knopf("loesung").hidden = true;
    knopf("weiter").hidden = false;
    knopf("weiter").textContent = nr + 1 >= PRO_RUNDE ? "Auswertung" : "Weiter";
    knopf("weiter").focus({ preventScroll: true });
    liste.push({ t: aufgabe.t, q: aufgabe.q, ok: meldung.classList.contains("ok") });
    zeigeStatus();
  }
  function weiter() {
    nr++;
    if (nr >= PRO_RUNDE) return fertig();
    zeigeAufgabe();
  }
  function fertig() {
    const sek = Math.round((performance.now() - start) / 1000);
    const neu = ergebnis({ punkte });
    const zeilen = liste.map((a) => `<li><span>${a.ok ? "✓" : "✗"} ${esc(a.t)}</span><span class="num">${esc(a.q)}</span></li>`).join("");
    nachricht(`<p class="big">${punkte} Punkte</p><p>${richtig} von ${PRO_RUNDE} gelöst · ${Math.floor(sek / 60)}:${String(sek % 60).padStart(2, "0")} min${neu ? " · neuer Highscore!" : ""}</p><div class="quiz-auswertung"><p class="small">Musterlösungen:</p><ul>${zeilen}</ul></div><p><button class="btn" type="button" data-neu>Neue Runde</button></p>`);
    document.querySelector("#stage-msg [data-neu]")?.addEventListener("click", (e) => {
      e.stopPropagation();
      los();
    });
  }
  function los() {
    // erst die Aufgaben der eigenen Stufe, dann auffüllen
    const eigene = mische(pool.filter((a) => a.s === S.bis));
    const rest = mische(pool.filter((a) => a.s < S.bis));
    runde = [...eigene.slice(0, Math.max(3, PRO_RUNDE - rest.length)), ...rest].slice(0, PRO_RUNDE);
    runde = mische(runde);
    nr = 0;
    punkte = 0;
    richtig = 0;
    liste = [];
    start = performance.now();
    nachricht(null);
    zeigeAufgabe();
  }

  knopf("ausfuehren").addEventListener("click", ausfuehren);
  knopf("weiter").addEventListener("click", weiter);
  knopf("tipp").addEventListener("click", () => {
    if (geloest) return;
    tipp = true;
    meldung.className = "sql-meldung";
    meldung.textContent = `Tipp: ${aufgabe.tipp}`;
  });
  knopf("loesung").addEventListener("click", () => {
    if (geloest) return;
    meldung.className = "sql-meldung falsch";
    meldung.innerHTML = `Lösung: <code>${esc(aufgabe.q)}</code> (0 Punkte)`;
    el(".sql-ergebnis").innerHTML = tabelleHtml("Erwartetes Ergebnis", soll.spalten, soll.zeilen, "ist");
    fertigeAufgabe();
  });
  eingabe.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      ausfuehren();
    }
  });

  status("SQL-Sprint");
  nachricht(`<p class="big">SQL-Sprint</p><p>${PRO_RUNDE} Aufgaben zu einer kleinen Datenbank mit Kunden, Bestellungen und Mitarbeitern. Schreib die SELECT-Abfrage, die Seite führt sie aus und prüft das Ergebnis.</p><p class="small">Erster Versuch = volle Punkte · Tipp = halbe Punkte</p><p><button class="btn" type="button" data-start>Los geht's</button></p>`);
  document.querySelector("#stage-msg [data-start]")?.addEventListener("click", (e) => {
    e.stopPropagation();
    los();
  });
  return {
    pause() {},
    stop() {
      dom.innerHTML = "";
    },
  };
}
