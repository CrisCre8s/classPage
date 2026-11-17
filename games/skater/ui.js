// Stick-Skater – Menüs als aufgeklebte Comic-Sticker und Panels: Startbildschirm, Weltkarte als Comic-Seite,
// Levelauswahl, Garderobe/Shop, Erfolge, Einstellungen, Pause und Ergebnis.
import { LEVEL, WELTEN, STERNE_FUER_WELT, levelName, levelDerWelt } from "./level.js";
import { TRICKS } from "./logik.js";
import { KOSTUEME, BOARDS, ERFOLGE, sterneGesamt, sterneVonLevel, weltFrei, levelFrei, itemBesessen, itemKaufbar } from "./fortschritt.js";

const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const zahl = (n) => Math.floor(n).toLocaleString("de-DE");
const stern = (an, i = 0, pop = false) => `<span class="sk-stern${an ? " an" : ""}${pop ? " pop" : ""}" style="--i:${i}" aria-hidden="true">★</span>`;
const sterne = (arr, pop = false) => arr.map((a, i) => stern(a, i, pop)).join("");
const tropfen = (n) => `<span class="sk-tropfen"><i aria-hidden="true"></i>${zahl(n)}</span>`;
const WELT_FARBEN = [["#ff2bd6", "#00e5ff", "#3a1162"], ["#39ff88", "#1de9d0", "#06303a"], ["#ff8a1f", "#ffd31a", "#4a1a0c"], ["#ffd400", "#2f6bff", "#0d1426"], ["#ff4fa0", "#ff8a3c", "#5a2a78"], ["#ff00a8", "#00ffd0", "#220040"]];

const trickListe = () => `<ul class="sk-tricks">${Object.values(TRICKS)
  .map((t) => `<li><kbd>${t.tasten}</kbd><b>${esc(t.name)}</b><small>${t.punkte}</small></li>`)
  .join("")}</ul>`;

export function erstelleUI(wurzel, aktion) {
  const ui = { name: null, wurzel };
  wurzel.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-a]");
    if (!b || b.disabled || !wurzel.contains(b)) return;
    ev.preventDefault();
    aktion(b.dataset.a, b.dataset.w, b);
  });
  wurzel.addEventListener("input", (ev) => {
    const el = ev.target;
    if (el.dataset.e) aktion("einstellung", el.dataset.e, el);
  });
  wurzel.addEventListener("change", (ev) => {
    const el = ev.target;
    if (el.dataset.e && el.type === "checkbox") aktion("einstellung", el.dataset.e, el);
  });

  function setze(name, html) {
    ui.name = name;
    wurzel.innerHTML = html;
    wurzel.hidden = !html;
    wurzel.className = `sk-ui sk-${name}`;
    const erstes = wurzel.querySelector("[data-fokus]") || wurzel.querySelector("button:not([disabled])");
    if (erstes && !matchMedia("(pointer: coarse)").matches) erstes.focus({ preventScroll: true });
  }
  ui.aus = () => setze("leer", "");

  ui.titel = (f) =>
    setze(
      "titel",
      `<div class="sk-titel">
        <h2 class="sk-logo" aria-label="Stick-Skater"><span>STICK</span><span>SKATER</span></h2>
        <p class="sk-unter">Risse in der Realität. Ein Board. Sechs Welten.</p>
        <div class="sk-menue">
          <button type="button" class="sk-knopf gelb gross" data-a="karte" data-fokus>SPIELEN</button>
          <button type="button" class="sk-knopf cyan" data-a="garderobe">GARDEROBE</button>
          <button type="button" class="sk-knopf magenta" data-a="erfolge">ERFOLGE</button>
          <button type="button" class="sk-knopf gelb" data-a="tricks">TRICKS</button>
          <button type="button" class="sk-knopf weiss" data-a="einstellungen">EINSTELLUNGEN</button>
        </div>
        <p class="sk-konto">${tropfen(f.tropfen)} <span class="sk-sterne-ges">★ ${sterneGesamt(f)}/${LEVEL.length * 3}</span></p>
        ${f.uebernommen ? `<p class="sk-hinweis">Aus dem alten Stick-Skater übernommen: ${zahl(f.uebernommen)} Münzen → Tinten-Tropfen.</p>` : ""}
        <p class="sk-steuer">Leertaste/Tippen = Ollie (kurz = klein, halten = hoch) · Pfeile/Wischen in der Luft = Tricks, zwei Pfeile = Kombi-Trick · beim Grinden ← → = Balance</p>
      </div>`,
    );

  ui.karte = (f) => {
    const ges = sterneGesamt(f);
    setze(
      "karte",
      `<div class="sk-seite">
        <header class="sk-kopf"><button type="button" class="sk-knopf klein weiss" data-a="titel">◀ ZURÜCK</button><h2>WELTKARTE</h2><span class="sk-konto">${tropfen(f.tropfen)} <b>★ ${ges}</b></span></header>
        <div class="sk-raster">
        ${WELTEN.map((w, i) => {
          const frei = weltFrei(f, i);
          const ids = levelDerWelt(i);
          const st = ids.reduce((a, l) => a + sterneVonLevel(f, l).filter(Boolean).length, 0);
          const [c1, c2, c3] = WELT_FARBEN[i];
          return `<button type="button" class="sk-panel${frei ? "" : " zu"}" style="--c1:${c1};--c2:${c2};--c3:${c3};--r:${((i * 37) % 5) - 2}deg" data-a="${frei ? "welt" : "zu"}" data-w="${i}" ${frei ? "" : `aria-label="${esc(w.name)} – gesperrt, braucht ${STERNE_FUER_WELT[i]} Sterne"`}>
            <span class="sk-nr">${i + 1}</span>
            <span class="sk-pname">${esc(w.name)}</span>
            <span class="sk-pkurz">${esc(w.kurz)}</span>
            ${frei ? `<span class="sk-pst">★ ${st}/15${f.endlos[i] ? ` · ∞ ${zahl(f.endlos[i])}` : ""}</span>` : `<span class="sk-schloss" aria-hidden="true">🔒</span><span class="sk-pst">★ ${ges}/${STERNE_FUER_WELT[i]}</span>`}
          </button>`;
        }).join("")}
        </div>
      </div>`,
    );
  };

  ui.welt = (f, w) => {
    const W = WELTEN[w];
    const ids = levelDerWelt(w);
    const [c1, c2, c3] = WELT_FARBEN[w];
    setze(
      "welt",
      `<div class="sk-seite" style="--c1:${c1};--c2:${c2};--c3:${c3}">
        <header class="sk-kopf"><button type="button" class="sk-knopf klein weiss" data-a="karte">◀ KARTE</button><h2>${esc(W.name)}</h2><span class="sk-konto">${tropfen(f.tropfen)}</span></header>
        <div class="sk-level">
        ${ids
          .map((i, k) => {
            const l = LEVEL[i];
            const frei = levelFrei(f, i);
            return `<button type="button" class="sk-lvl${frei ? "" : " zu"}${f.geschafft[i] ? " ok" : ""}" style="--r:${((k * 53) % 5) - 2}deg" data-a="${frei ? "level" : "zu"}" data-w="${i}">
              <span class="sk-nr">${levelName(i)}</span>
              <span class="sk-pname">${esc(l.name)}</span>
              <span class="sk-lst">${sterne(sterneVonLevel(f, i))}</span>
              <span class="sk-aufg">${l.aufgaben.map((a, j) => `<span class="${sterneVonLevel(f, i)[j] ? "ok" : ""}">${esc(a.text)}</span>`).join("")}</span>
              ${f.best[i] ? `<span class="sk-best">Best: ${zahl(f.best[i])}</span>` : ""}
              ${frei ? "" : `<span class="sk-schloss" aria-hidden="true">🔒</span>`}
            </button>`;
          })
          .join("")}
          <button type="button" class="sk-lvl endlos" data-a="endlos" data-w="${w}">
            <span class="sk-nr">∞</span><span class="sk-pname">ENDLOS</span>
            <span class="sk-aufg"><span>So weit du kommst. Drei Leben, es wird immer schneller.</span></span>
            <span class="sk-best">Highscore: ${zahl(f.endlos[w] || 0)}</span>
          </button>
        </div>
      </div>`,
    );
  };

  ui.garderobe = (f, tab = "kostuem") => {
    const liste = tab === "kostuem" ? KOSTUEME : BOARDS;
    const aktuell = tab === "kostuem" ? f.kostuem : f.board;
    setze(
      "garderobe",
      `<div class="sk-seite">
        <header class="sk-kopf"><button type="button" class="sk-knopf klein weiss" data-a="titel">◀ ZURÜCK</button><h2>GARDEROBE</h2><span class="sk-konto">${tropfen(f.tropfen)}</span></header>
        <div class="sk-shop">
          <div class="sk-vorschau"><canvas class="sk-vorschau-canvas" width="320" height="300" aria-label="Vorschau deiner Figur"></canvas></div>
          <div class="sk-shopliste">
            <div class="sk-tabs" role="tablist">
              <button type="button" role="tab" aria-selected="${tab === "kostuem"}" class="sk-tab${tab === "kostuem" ? " an" : ""}" data-a="tab" data-w="kostuem">KOSTÜME</button>
              <button type="button" role="tab" aria-selected="${tab === "board"}" class="sk-tab${tab === "board" ? " an" : ""}" data-a="tab" data-w="board">BOARDS</button>
            </div>
            <ul>
            ${liste
              .map((it) => {
                const hat = itemBesessen(f, tab, it.id);
                const k = itemKaufbar(f, tab, it);
                const erfolg = it.erfolg ? ERFOLGE.find((e) => e.id === it.erfolg) : null;
                let knopf;
                if (hat) knopf = it.id === aktuell ? `<span class="sk-an">AN</span>` : `<button type="button" class="sk-knopf klein cyan" data-a="anziehen" data-w="${tab}:${it.id}">ANZIEHEN</button>`;
                else if (k.geht) knopf = `<button type="button" class="sk-knopf klein gelb" data-a="kaufen" data-w="${tab}:${it.id}">${k.kosten ? `${tropfen(k.kosten)}` : "ABHOLEN"}</button>`;
                else if (k.grund === "tropfen") knopf = `<button type="button" class="sk-knopf klein grau" disabled>${tropfen(k.kosten)}</button>`;
                else knopf = `<span class="sk-erfolg-nur">🏆 ${esc(erfolg?.name || "Erfolg")}</span>`;
                return `<li class="${it.id === aktuell ? "aktiv" : ""}">
                  <button type="button" class="sk-probe" data-a="probe" data-w="${tab}:${it.id}" aria-label="${esc(it.name)} ansehen"><b>${esc(it.name)}</b><small>${esc(it.text)}${it.alternativ && !hat ? ` · oder ${zahl(it.alternativ)} Tropfen` : ""}</small></button>
                  ${knopf}
                </li>`;
              })
              .join("")}
            </ul>
          </div>
        </div>
      </div>`,
    );
  };

  ui.erfolge = (f) =>
    setze(
      "erfolge",
      `<div class="sk-seite">
        <header class="sk-kopf"><button type="button" class="sk-knopf klein weiss" data-a="titel">◀ ZURÜCK</button><h2>ERFOLGE</h2><span class="sk-konto">${f.erfolge.length}/${ERFOLGE.length}</span></header>
        <ul class="sk-erfolge">
          ${ERFOLGE.map((e, i) => `<li class="${f.erfolge.includes(e.id) ? "ok" : ""}" style="--r:${((i * 41) % 5) - 2}deg"><span aria-hidden="true">${f.erfolge.includes(e.id) ? "🏆" : "🔒"}</span><b>${esc(e.name)}</b><small>${esc(e.text)}</small></li>`).join("")}
        </ul>
      </div>`,
    );

  ui.tricks = () =>
    setze(
      "tricks",
      `<div class="sk-seite schmal">
        <header class="sk-kopf"><button type="button" class="sk-knopf klein weiss" data-a="titel">◀ ZURÜCK</button><h2>TRICKS</h2><span></span></header>
        <div class="sk-einst">
          <p class="sk-trickhilfe">In der Luft: eine Pfeiltaste für einen Grundtrick. Zwei Pfeiltasten gleichzeitig (oder die zweite ganz kurz danach) machen daraus einen Kombi-Trick. Handy: wischen – schräg wischen oder zweimal schnell wischen für Kombis. Der Trick muss vor der Landung fertig sein, also lang springen (Leertaste halten) für die großen Tricks.</p>
          ${trickListe()}
        </div>
      </div>`,
    );

  ui.einstellungen = (f, zurueck = "titel") => {
    const e = f.einstellungen;
    setze(
      "einstellungen",
      `<div class="sk-seite schmal">
        <header class="sk-kopf"><button type="button" class="sk-knopf klein weiss" data-a="${zurueck}">◀ ZURÜCK</button><h2>EINSTELLUNGEN</h2><span></span></header>
        <div class="sk-einst">
          <label>Musik <input type="range" min="0" max="1" step="0.05" value="${e.musik}" data-e="musik"></label>
          <label>Effekte (Ton) <input type="range" min="0" max="1" step="0.05" value="${e.effekte}" data-e="effekte"></label>
          <label>Effektstärke (Glitch, Bildzittern, Blitze) <input type="range" min="0" max="1" step="0.05" value="${e.effektStaerke}" data-e="effektStaerke"></label>
          <label class="sk-check"><input type="checkbox" ${e.blitzeReduziert ? "checked" : ""} data-e="blitzeReduziert"> Blitzeffekte reduzieren <small>(kein Stroboskop, sanftere Übergänge – für alle, die empfindlich auf Lichtblitze reagieren)</small></label>
          ${zurueck === "titel" ? `<button type="button" class="sk-knopf klein grau" data-a="loeschen">Fortschritt löschen …</button>` : ""}
        </div>
      </div>`,
    );
  };

  ui.pause = (l, sterneVorher, stand) =>
    setze(
      "pause",
      `<div class="sk-box">
        <h2 class="sk-gross">PAUSE</h2>
        <details class="sk-pausetricks"><summary>Trickliste</summary>${trickListe()}</details>
        ${l ? `<ul class="sk-aufgliste">${l.aufgaben.map((a, i) => `<li class="${sterneVorher[i] || stand[i] ? "ok" : ""}">${stern(sterneVorher[i] || stand[i])} ${esc(a.text)}</li>`).join("")}</ul>` : ""}
        <div class="sk-menue">
          <button type="button" class="sk-knopf gelb gross" data-a="weiter" data-fokus>WEITER</button>
          <button type="button" class="sk-knopf cyan" data-a="nochmal">NEUSTART</button>
          <button type="button" class="sk-knopf weiss" data-a="pauseEinst">EINSTELLUNGEN</button>
          <button type="button" class="sk-knopf magenta" data-a="karte">ZUR KARTE</button>
        </div>
      </div>`,
    );

  ui.ergebnis = (d) =>
    setze(
      "ergebnis",
      `<div class="sk-box ${d.gewonnen ? "gewonnen" : "verloren"}">
        <h2 class="sk-gross">${d.endlos ? "ENDE!" : d.gewonnen ? "GESCHAFFT!" : "GESTÜRZT!"}</h2>
        <p class="sk-lname">${esc(d.titel)}</p>
        ${d.endlos ? "" : `<div class="sk-ergsterne">${sterne(d.sterne, true)}</div>`}
        <p class="sk-punkte">${zahl(d.punkte)} <small>Punkte</small>${d.neuBest ? ` <em>NEUER REKORD!</em>` : ""}</p>
        <p class="sk-konto">+${tropfen(d.tropfenPlus)} <small>(${zahl(d.tropfenLevel)} gesammelt + ${zahl(d.tropfenPunkte)} für Punkte)</small></p>
        ${d.endlos ? "" : `<ul class="sk-aufgliste">${d.aufgaben.map((a, i) => `<li class="${d.sterne[i] ? "ok" : ""}">${stern(d.sterne[i])} ${esc(a.text)}</li>`).join("")}</ul>`}
        ${d.neueWelt != null ? `<p class="sk-neu">🔓 Neue Welt frei: <b>${esc(WELTEN[d.neueWelt].name)}</b></p>` : ""}
        ${d.erfolge.map((e) => `<p class="sk-neu">🏆 Erfolg: <b>${esc(e.name)}</b></p>`).join("")}
        <div class="sk-menue zeile">
          ${d.weiterLevel != null ? `<button type="button" class="sk-knopf gelb gross" data-a="level" data-w="${d.weiterLevel}" data-fokus>WEITER ▶</button>` : ""}
          <button type="button" class="sk-knopf cyan" data-a="nochmal" ${d.weiterLevel == null ? "data-fokus" : ""}>NOCHMAL</button>
          <button type="button" class="sk-knopf weiss" data-a="karte">KARTE</button>
        </div>
      </div>`,
    );

  ui.frage = (text, ja, nein = "zurueck") =>
    setze(
      "frage",
      `<div class="sk-box"><p class="sk-lname">${esc(text)}</p><div class="sk-menue zeile"><button type="button" class="sk-knopf magenta" data-a="${ja}">JA</button><button type="button" class="sk-knopf weiss" data-a="${nein}" data-fokus>NEIN</button></div></div>`,
    );

  return ui;
}
