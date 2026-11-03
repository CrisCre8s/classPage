// Blackjack gegen die Bank: 6 Kartendecks, Bank zieht bis 16 und bleibt ab 17 stehen,
// Blackjack zahlt 3:2, Verdoppeln auf die ersten zwei Karten. (Teilen gibt es hier nicht.)

const FARBEN = ["♠", "♥", "♦", "♣"];
const WERTE = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "B", "D", "K", "A"]; // Bube, Dame, König, Ass

function neuerSchuh() {
  const s = [];
  for (let d = 0; d < 6; d++) for (const f of FARBEN) for (const w of WERTE) s.push({ f, w });
  for (let i = s.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [s[i], s[j]] = [s[j], s[i]];
  }
  return s;
}
// Summe einer Hand; Asse zählen 11, außer die Hand würde überkaufen
export function summe(hand) {
  let s = 0;
  let asse = 0;
  for (const k of hand) {
    if (k.w === "A") {
      s += 11;
      asse++;
    } else s += ["B", "D", "K"].includes(k.w) ? 10 : Number(k.w);
  }
  while (s > 21 && asse) {
    s -= 10;
    asse--;
  }
  return { s, weich: asse > 0 };
}
const istBlackjack = (h) => h.length === 2 && summe(h).s === 21;
// Tempo der Auflösung (ms): Karte umdrehen, jede weitere Bankkarte, Spannung vor dem Ergebnis
const UMDREHEN = 750;
const BANK_KARTE = 1000;
const SPANNUNG = 1400;

export function baue(ziel, api) {
  ziel.innerHTML = `
    <div class="bj">
      <div class="bj-tisch">
        <div class="bj-reihe"><span class="bj-wer">Bank <b class="num" data-bank-s></b></span><div class="bj-hand" data-bank></div></div>
        <p class="bj-ergebnis" aria-live="polite">&nbsp;</p>
        <div class="bj-reihe"><span class="bj-wer">Du <b class="num" data-du-s></b></span><div class="bj-hand" data-du></div></div>
      </div>
      <div class="casino-steuerung">
        <div class="einsatz-platz"></div>
        <div class="bj-knoepfe">
          <button type="button" class="btn casino-los" data-a="geben">Karten geben</button>
          <button type="button" class="btn" data-a="karte" hidden>Karte (H)</button>
          <button type="button" class="btn btn-ghost" data-a="halten" hidden>Halten (S)</button>
          <button type="button" class="more" data-a="doppeln" hidden>Verdoppeln (D)</button>
        </div>
      </div>
      <details class="casino-regeln"><summary>Regeln</summary>
        <ul class="casino-klein">
          <li>Ziel: näher an 21 als die Bank, ohne drüber zu kommen. Bildkarten zählen 10, Asse 1 oder 11.</li>
          <li>Blackjack (Ass + 10er mit den ersten zwei Karten) zahlt 3:2, ein normaler Sieg 1:1, Gleichstand gibt den Einsatz zurück.</li>
          <li>Verdoppeln: Einsatz verdoppeln, genau eine Karte dazu.</li>
          <li>Die Bank zieht bis 16 und bleibt ab 17 stehen. Mit guter Spielweise kommen etwa 99 % zurück, die Bank hat also nur einen kleinen Vorteil.</li>
        </ul>
      </details>
    </div>`;
  const el = (s) => ziel.querySelector(s);
  const einsatz = api.einsatzWahl(el(".einsatz-platz"));
  const knopf = (a) => el(`[data-a="${a}"]`);
  const ergebnisEl = el(".bj-ergebnis");
  let schuh = neuerSchuh();
  let du = [];
  let bank = [];
  let wette = 0;
  let laeuft = false;
  let verdeckt = true;
  let fertigGewertet = true;
  let ausstehend = null;
  let sperrt = false; // zwischen Ende der Hand und Auflösung: kein neues Spiel // Auszahlung, die nach dem Spannungsmoment gutgeschrieben wird
  const timer = [];
  const tisch = el(".bj-tisch");
  const warte = (ms, fn) => timer.push(setTimeout(fn, ms));

  const ziehe = () => {
    if (schuh.length < 52) schuh = neuerSchuh();
    return schuh.pop();
  };
  const karteHtml = (k, i, zu = false) =>
    zu
      ? `<span class="bj-karte zu" style="--i:${i}"></span>`
      : `<span class="bj-karte${k.f === "♥" || k.f === "♦" ? " rot" : ""}" style="--i:${i}"><b>${k.w}</b><i>${k.f}</i><b class="unten">${k.w}</b></span>`;
  function zeichneHand(ziel_, hand, zuIndex) {
    const kinder = ziel_.children;
    if (kinder.length > hand.length) ziel_.innerHTML = "";
    hand.forEach((k, i) => {
      const zu = i === zuIndex;
      const da = kinder[i];
      if (!da) {
        ziel_.insertAdjacentHTML("beforeend", karteHtml(k, kinder.length === 0 && i > 0 ? i : 0, zu));
        return;
      }
      // verdeckte Karte wird umgedreht
      if (da.classList.contains("zu") && !zu) {
        da.outerHTML = karteHtml(k, 0).replace('class="bj-karte', 'class="bj-karte dreht');
      }
    });
  }
  function zeichne() {
    zeichneHand(el("[data-du]"), du, -1);
    zeichneHand(el("[data-bank]"), bank, verdeckt ? 1 : -1);
    el("[data-du-s]").textContent = du.length ? summe(du).s : "";
    el("[data-bank-s]").textContent = bank.length ? (verdeckt ? summe([bank[0]]).s : summe(bank).s) : "";
    knopf("geben").hidden = laeuft || sperrt;
    knopf("karte").hidden = !laeuft;
    knopf("halten").hidden = !laeuft;
    knopf("doppeln").hidden = !laeuft || du.length !== 2 || api.stand() < wette;
    einsatz.sperre(laeuft);
  }
  function geben() {
    if (laeuft || sperrt) return;
    const e = einsatz.wert();
    if (!api.setze(e)) return api.meldung("Zu wenig Guthaben für diesen Einsatz.");
    wette = e;
    fertigGewertet = false;
    ausstehend = null;
    tisch.className = "bj-tisch";
    tisch.querySelectorAll(".bj-muenze, .bj-stempel").forEach((x) => x.remove());
    el("[data-du]").innerHTML = "";
    el("[data-bank]").innerHTML = "";
    du = [ziehe(), ziehe()];
    bank = [ziehe(), ziehe()];
    verdeckt = true;
    laeuft = true;
    ergebnisEl.innerHTML = "&nbsp;";
    ergebnisEl.className = "bj-ergebnis";
    zeichne();
    // Blackjack sofort auswerten
    if (istBlackjack(du) || istBlackjack(bank)) {
      laeuft = false;
      sperrt = true;
      zeichne();
      knopf("geben").hidden = true;
      warte(700, () => aufdecken(true));
    }
  }
  function karte() {
    if (!laeuft) return;
    du.push(ziehe());
    zeichne();
    if (summe(du).s > 21) {
      laeuft = false;
      sperrt = true;
      zeichne();
      warte(500, () => ende("Überkauft!", 0, "ueberkauft"));
    } else if (summe(du).s === 21) {
      laeuft = false;
      sperrt = true;
      zeichne();
      warte(500, () => aufdecken(false));
    }
  }
  function doppeln() {
    if (!laeuft || du.length !== 2 || !api.setze(wette)) return;
    wette *= 2;
    du.push(ziehe());
    zeichne();
    laeuft = false;
    sperrt = true;
    zeichne();
    if (summe(du).s > 21) warte(500, () => ende("Überkauft!", 0, "ueberkauft"));
    else warte(600, () => aufdecken(false));
  }
  function halten() {
    if (!laeuft) return;
    laeuft = false; // keine Eingaben mehr, Bank spielt
    aufdecken(false);
  }
  // Bank deckt auf und zieht Karte für Karte, dann kommt der Vergleich
  function aufdecken() {
    laeuft = false;
    sperrt = true;
    verdeckt = false;
    zeichne();
    knopf("geben").hidden = true;
    ergebnisEl.textContent = "Die Bank deckt auf …";
    ergebnisEl.className = "bj-ergebnis";
    const bjDu = istBlackjack(du);
    const bjBank = istBlackjack(bank);
    if (bjDu || bjBank) {
      if (bjDu && bjBank) return warte(UMDREHEN, () => ende("Beide Blackjack: unentschieden", wette, "push"));
      if (bjDu) return warte(UMDREHEN, () => ende("Blackjack! 3:2", Math.round(wette * 2.5), "blackjack"));
      return warte(UMDREHEN, () => ende("Bank hat Blackjack", 0, "verloren"));
    }
    const zug = () => {
      const b = summe(bank).s;
      if (b < 17) {
        ergebnisEl.textContent = `Bank hat ${b}, sie muss ziehen …`;
        bank.push(ziehe());
        zeichne();
        knopf("geben").hidden = true;
        warte(BANK_KARTE, zug);
        return;
      }
      const d = summe(du).s;
      if (b > 21) ende("Bank überkauft, du gewinnst!", wette * 2, "gewinn");
      else if (d > b) ende(`${d} schlägt ${b}: gewonnen!`, wette * 2, "gewinn");
      else if (d === b) ende(`${d} gegen ${b}: unentschieden`, wette, "push");
      else ende(`${b} schlägt ${d}: die Bank gewinnt`, 0, "verloren");
    };
    warte(UMDREHEN, zug);
  }
  // Ergebnis: erst ein Spannungsmoment (Summen pulsieren), dann Auflösung mit Effekt
  function ende(text, auszahlung, art) {
    fertigGewertet = true;
    laeuft = false;
    verdeckt = false;
    ausstehend = auszahlung;
    zeichne();
    knopf("geben").hidden = true;
    einsatz.sperre(true);
    const sofort = art === "ueberkauft";
    if (!sofort) {
      tisch.classList.add("spannung");
      ergebnisEl.textContent = "…";
      ergebnisEl.className = "bj-ergebnis spannung-text";
    }
    warte(sofort ? 0 : SPANNUNG, () => {
      sperrt = false;
      tisch.classList.remove("spannung");
      if (ausstehend) api.gutschrift(ausstehend);
      ausstehend = null;
      const netto = auszahlung - wette;
      ergebnisEl.textContent = `${text}${netto > 0 ? ` +${api.fmt(netto)}` : netto < 0 ? ` −${api.fmt(-netto)}` : ""}`;
      ergebnisEl.className = `bj-ergebnis ${netto > 0 ? "gewinn" : netto === 0 ? "zurueck" : "nichts"}`;
      effekt(art, netto);
      zeichne();
      api.runde(netto);
    });
  }
  function effekt(art, netto) {
    tisch.classList.add(`eff-${art}`);
    if (art === "ueberkauft" || art === "verloren") {
      tisch.insertAdjacentHTML("beforeend", `<span class="bj-stempel">${art === "ueberkauft" ? "ÜBERKAUFT" : "VERLOREN"}</span>`);
    }
    if (netto > 0) {
      // Münzregen, bei Blackjack mehr
      const n = art === "blackjack" ? 34 : 18;
      tisch.insertAdjacentHTML(
        "beforeend",
        Array.from({ length: n }, () => `<span class="bj-muenze" style="left:${Math.random() * 100}%;--d:${(Math.random() - 0.5) * 120}px;animation-delay:${Math.random() * 0.5}s;animation-duration:${1.1 + Math.random() * 0.8}s"></span>`).join(""),
      );
      if (art === "blackjack") api.meldung(`BLACKJACK! +${api.fmt(netto)}`, "gewinn");
    }
  }
  ziel.querySelector(".bj-knoepfe").addEventListener("click", (e) => {
    const a = e.target.closest("[data-a]")?.dataset.a;
    if (a === "geben") geben();
    if (a === "karte") karte();
    if (a === "halten") halten();
    if (a === "doppeln") doppeln();
  });
  const onKey = (e) => {
    if (e.target.closest?.("input, textarea, select")) return;
    const k = e.key.toLowerCase();
    if ((k === " " || k === "enter") && !laeuft && !e.target.closest?.("button")) {
      e.preventDefault();
      geben();
    } else if (laeuft && k === "h") karte();
    else if (laeuft && k === "s") halten();
    else if (laeuft && k === "d") doppeln();
  };
  window.addEventListener("keydown", onKey);
  zeichne();
  return {
    stop() {
      timer.forEach(clearTimeout);
      if (ausstehend) {
        api.gutschrift(ausstehend);
        ausstehend = null;
      }
      // offene Hand: wie „Halten“, Bank zieht sofort fertig, dann auszahlen
      if (wette && !fertigGewertet) {
        if (summe(du).s <= 21 && !(istBlackjack(du) || istBlackjack(bank))) while (summe(bank).s < 17) bank.push(ziehe());
        const d = summe(du).s;
        const b = summe(bank).s;
        let aus = 0;
        if (istBlackjack(du) && !istBlackjack(bank)) aus = Math.round(wette * 2.5);
        else if (istBlackjack(du) && istBlackjack(bank)) aus = wette;
        else if (istBlackjack(bank) || d > 21) aus = 0;
        else if (b > 21 || d > b) aus = wette * 2;
        else if (d === b) aus = wette;
        if (aus) api.gutschrift(aus);
        api.runde(aus - wette);
      }
      window.removeEventListener("keydown", onKey);
      einsatz.aus();
    },
  };
}
