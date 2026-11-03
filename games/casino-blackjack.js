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
  const timer = [];

  const ziehe = () => {
    if (schuh.length < 52) schuh = neuerSchuh();
    return schuh.pop();
  };
  const karteHtml = (k, i, zu = false) =>
    zu
      ? `<span class="bj-karte zu" style="--i:${i}"></span>`
      : `<span class="bj-karte${k.f === "♥" || k.f === "♦" ? " rot" : ""}" style="--i:${i}"><b>${k.w}</b><i>${k.f}</i><b class="unten">${k.w}</b></span>`;
  function zeichne() {
    el("[data-du]").innerHTML = du.map((k, i) => karteHtml(k, i)).join("");
    el("[data-bank]").innerHTML = bank.map((k, i) => karteHtml(k, i, verdeckt && i === 1)).join("");
    el("[data-du-s]").textContent = du.length ? summe(du).s : "";
    el("[data-bank-s]").textContent = bank.length ? (verdeckt ? summe([bank[0]]).s : summe(bank).s) : "";
    knopf("geben").hidden = laeuft;
    knopf("karte").hidden = !laeuft;
    knopf("halten").hidden = !laeuft;
    knopf("doppeln").hidden = !laeuft || du.length !== 2 || api.stand() < wette;
    einsatz.sperre(laeuft);
  }
  function geben() {
    if (laeuft) return;
    const e = einsatz.wert();
    if (!api.setze(e)) return api.meldung("Zu wenig Guthaben für diesen Einsatz.");
    wette = e;
    fertigGewertet = false;
    du = [ziehe(), ziehe()];
    bank = [ziehe(), ziehe()];
    verdeckt = true;
    laeuft = true;
    ergebnisEl.innerHTML = "&nbsp;";
    ergebnisEl.className = "bj-ergebnis";
    zeichne();
    // Blackjack sofort auswerten
    if (istBlackjack(du) || istBlackjack(bank)) aufdecken(true);
  }
  function karte() {
    if (!laeuft) return;
    du.push(ziehe());
    zeichne();
    if (summe(du).s > 21) setTimeout(() => ende("Überkauft!", 0), 350);
    else if (summe(du).s === 21) setTimeout(halten, 300);
  }
  function doppeln() {
    if (!laeuft || du.length !== 2 || !api.setze(wette)) return;
    wette *= 2;
    du.push(ziehe());
    zeichne();
    if (summe(du).s > 21) setTimeout(() => ende("Überkauft!", 0), 350);
    else setTimeout(halten, 450);
  }
  function halten() {
    if (!laeuft) return;
    laeuft = false; // keine Eingaben mehr, Bank spielt
    aufdecken(false);
  }
  // Bank deckt auf und zieht Karte für Karte
  function aufdecken(sofort) {
    laeuft = false;
    verdeckt = false;
    zeichne();
    knopf("geben").hidden = true;
    const bjDu = istBlackjack(du);
    const bjBank = istBlackjack(bank);
    if (bjDu || bjBank) {
      if (bjDu && bjBank) return ende("Beide Blackjack: unentschieden", wette);
      if (bjDu) return ende("Blackjack! 3:2", Math.round(wette * 2.5), true);
      return ende("Bank hat Blackjack", 0);
    }
    const zug = () => {
      const b = summe(bank).s;
      if (b < 17) {
        bank.push(ziehe());
        zeichne();
        knopf("geben").hidden = true;
        timer.push(setTimeout(zug, 550));
        return;
      }
      const d = summe(du).s;
      if (b > 21) ende("Bank überkauft, du gewinnst!", wette * 2, true);
      else if (d > b) ende(`${d} schlägt ${b}: gewonnen!`, wette * 2, true);
      else if (d === b) ende(`${d} gegen ${b}: unentschieden`, wette);
      else ende(`${b} schlägt ${d}: die Bank gewinnt`, 0);
    };
    timer.push(setTimeout(zug, sofort ? 0 : 450));
  }
  function ende(text, auszahlung, sieg = false) {
    fertigGewertet = true;
    laeuft = false;
    verdeckt = false;
    if (auszahlung) api.gutschrift(auszahlung);
    const netto = auszahlung - wette;
    ergebnisEl.textContent = `${text}${netto > 0 ? ` +${api.fmt(netto)}` : netto < 0 ? ` −${api.fmt(-netto)}` : ""}`;
    ergebnisEl.className = `bj-ergebnis ${sieg ? "gewinn" : netto === 0 ? "zurueck" : "nichts"}`;
    zeichne();
    api.runde();
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
        api.runde();
      }
      window.removeEventListener("keydown", onKey);
      einsatz.aus();
    },
  };
}
