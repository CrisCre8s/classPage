// Stick-Skater – Einstieg für die Klassenseite: verbindet Logik, Rendering, Ton, Eingabe und Menüs.
// Spiel-Logik läuft mit festem Zeitschritt (120 Hz), gezeichnet wird mit requestAnimationFrame.
import { LEVEL, WELTEN, levelName } from "./level.js";
import { laden, speichern, loeschen, sterneVonLevel, weltFrei, levelFrei, KOSTUEME, BOARDS, kaufen, pruefeErfolge, boardWerte } from "./fortschritt.js";
import { baueStrecke } from "./strecke.js";
import { DT, neuesSpiel, schritt, autopilot, aufgabeErfuellt, WELT_STILE } from "./logik.js";
import { erstelleRenderer } from "./render.js";
import { erstelleTon } from "./ton.js";
import { erstelleEingabe } from "./eingabe.js";
import { erstelleUI } from "./ui.js";
import { zeichneFigur } from "./figur.js";
import { palette } from "./welten.js";

export const DOM = true;
export const HILFE =
  "Leertaste oder Tippen: Ollie (gedrückt halten = höher). In der Luft Pfeiltasten oder Wischen: ↑ Kickflip, ↓ Heelflip, ← 360 Shove-it, → Impossible – vor der Landung fertig werden! Geländer, Rohre und Kanten: draufspringen = Grind, mit ← → (Handy: linke/rechte Seite halten) die Balance halten. Combo: Punkte multiplizieren sich, bis du wieder normal landest. Leuchtende Risse: 8 Sekunden Parallelwelt mit doppelten Punkten. Am Boden: → anschieben, ← bremsen. Esc oder P: Pause.";

const LEER = { sprung: false, sprungNeu: false, trick: null, links: false, rechts: false };

export function start({ dom, status, ergebnis }) {
  dom.innerHTML = `
    <div class="skater">
      <canvas class="sk-canvas" aria-label="Stick-Skater – Spielfläche"></canvas>
      <div class="sk-ui" hidden></div>
      <div class="sk-touch" hidden>
        <button type="button" class="sk-tk" data-seite="knopfL" aria-label="Bremsen (beim Grinden: Balance links)">◀</button>
        <button type="button" class="sk-tk" data-seite="knopfR" aria-label="Anschieben (beim Grinden: Balance rechts)">▶</button>
      </div>
      <button type="button" class="sk-pausek" hidden aria-label="Pause">❚❚</button>
      <div class="sk-quer" hidden aria-live="polite"><span aria-hidden="true">📱↻</span> Querformat empfohlen</div>
    </div>`;
  const wurzel = dom.querySelector(".skater");
  const canvas = wurzel.querySelector(".sk-canvas");
  const uiEl = wurzel.querySelector(".sk-ui");
  const touchEl = wurzel.querySelector(".sk-touch");
  const pauseK = wurzel.querySelector(".sk-pausek");
  const querEl = wurzel.querySelector(".sk-quer");
  const grob = matchMedia("(pointer: coarse)").matches;

  let f = laden();
  speichern(f);
  const r = erstelleRenderer(canvas, f.einstellungen);
  const ton = erstelleTon();
  let modus = "menue"; // menue | spiel | pause | ende
  let s = null;
  let lauf = null;
  let demo = null;
  let demoMerk = {};
  let demoWelt = 0;
  let endeT = 0;
  let acc = 0;
  let last = performance.now();
  let raf = 0;
  let warnUhr = 0;
  let probe = null; // Garderobe: Vorschau eines Teils
  let gardTab = "kostuem";


  // Schrift fürs Canvas laden
  document.fonts?.load?.("30px Bangers").catch(() => {});

  const eingabe = erstelleEingabe(canvas, {
    zustand: () => (s && modus === "spiel" ? s.p.zustand : "aus"),
    pause: () => (modus === "spiel" ? pausieren() : modus === "pause" ? weiter() : null),
    aktiv: () => modus === "spiel" || (modus === "ende" && endeT < 1.9),
    pausiert: () => modus === "pause",
  });
  for (const b of touchEl.querySelectorAll(".sk-tk")) eingabe.knopf(b, b.dataset.seite);
  let testInfo = false;
  try {
    testInfo = localStorage.getItem("skater-debug") === "1";
  } catch {
    /* egal */
  }
  if (testInfo) window.__skater = () => ({ modus, par: s?.par?.stil || null, zustand: s?.p.zustand, x: s?.p.x, y: s?.p.y, fertig: s?.fertig, punkte: s?.punkte, combo: s?.combo.n, tricks: s?.stat.tricks, leben: s?.leben, ui: ui.name });
  pauseK.addEventListener("click", () => pausieren());

  // Ton startet erst nach einer Berührung/Taste (Browser-Regel)
  const tonAn = () => {
    if (ton.init()) {
      ton.setzeLautstaerke(f.einstellungen.musik, f.einstellungen.effekte);
      ton.musik(modus === "menue" ? null : s?.welt ?? null);
    }
  };
  wurzel.addEventListener("pointerdown", tonAn);
  window.addEventListener("keydown", tonAn);

  const ui = erstelleUI(uiEl, aktion);

  // ---------- Demo im Hintergrund der Menüs ----------
  function neueDemo(w) {
    demoWelt = w;
    const st = baueStrecke({ bausteine: [], welt: w, seed: 7 + Math.floor(Math.random() * 1000), endlos: true });
    demo = neuesSpiel({ st, board: boardWerte(f), endlos: true, leben: 99 });
    demoMerk = {};
    r.vorbereiten(w, WELT_STILE[w].slice(0, 1));
    r.zuruecksetzen();
  }

  // ---------- Bildschirme ----------
  function zeige(name, arg) {
    if (name !== "spiel") {
      touchEl.hidden = true;
      pauseK.hidden = true;
    }
    switch (name) {
      case "titel":
        ui.titel(f);
        if (f.uebernommen) {
          delete f.uebernommen;
          speichern(f);
        }
        break;
      case "karte":
        ui.karte(f);
        break;
      case "welt":
        ui.welt(f, arg);
        break;
      case "garderobe":
        ui.garderobe(f, gardTab);
        break;
      case "erfolge":
        ui.erfolge(f);
        break;
      case "einstellungen":
        ui.einstellungen(f, arg || "titel");
        break;
      default:
    }
  }
  function zumMenue(name = "titel", arg) {
    modus = "menue";
    s = null;
    lauf = null;
    querEl.hidden = true;
    ton.setParallel(false);
    ton.pause(false);
    ton.musik(null);
    r.hud = false;
    const w = name === "welt" ? arg : demoWelt;
    if (!demo || w !== demoWelt) neueDemo(w);
    zeige(name, arg);
    status("");
  }

  function aktion(a, w, el) {
    ton.fx("klick");
    switch (a) {
      case "titel":
      case "karte":
      case "garderobe":
      case "erfolge":
      case "einstellungen":
        probe = null;
        if (a === "karte" && (modus === "pause" || modus === "ende")) return zumMenue("karte");
        if (a === "karte" && demoWelt !== 0) neueDemo(0);
        zeige(a);
        break;
      case "welt":
        if (Number(w) !== demoWelt) neueDemo(Number(w));
        zeige("welt", Number(w));
        break;
      case "zu":
        ton.fx("nein");
        el.classList.remove("wackel");
        void el.offsetWidth;
        el.classList.add("wackel");
        break;
      case "level":
        starteLevel(Number(w));
        break;
      case "endlos":
        starteEndlos(Number(w));
        break;
      case "nochmal":
        if (lauf?.level != null) starteLevel(lauf.level);
        else if (lauf?.endlos != null) starteEndlos(lauf.endlos);
        break;
      case "weiter":
        weiter();
        break;
      case "pauseEinst":
        ui.einstellungen(f, "pauseZurueck");
        break;
      case "pauseZurueck":
        zeigePause();
        break;
      case "tab":
        gardTab = w;
        probe = null;
        zeige("garderobe");
        break;
      case "probe": {
        const [art, id] = w.split(":");
        probe = { art, id };
        break;
      }
      case "anziehen": {
        const [art, id] = w.split(":");
        if (art === "kostuem") f.kostuem = id;
        else f.board = id;
        probe = null;
        speichern(f);
        zeige("garderobe");
        break;
      }
      case "kaufen": {
        const [art, id] = w.split(":");
        const item = (art === "kostuem" ? KOSTUEME : BOARDS).find((x) => x.id === id);
        if (item && kaufen(f, art, item)) {
          ton.fx("kauf");
          probe = null;
        } else ton.fx("nein");
        zeige("garderobe");
        break;
      }
      case "einstellung": {
        const k = w;
        f.einstellungen[k] = el.type === "checkbox" ? el.checked : parseFloat(el.value);
        ton.setzeLautstaerke(f.einstellungen.musik, f.einstellungen.effekte);
        speichern(f);
        break;
      }
      case "loeschen":
        ui.frage("Wirklich den ganzen Stick-Skater-Fortschritt löschen? Sterne, Tropfen, Kostüme und Erfolge sind dann weg.", "loeschenJa", "einstellungen");
        break;
      case "loeschenJa":
        loeschen();
        f = laden();
        r.einst = f.einstellungen;
        speichern(f);
        zeige("titel");
        break;
      default:
    }
  }

  // ---------- Level und Endlos ----------
  function starteLevel(i) {
    const l = LEVEL[i];
    if (!levelFrei(f, i)) return;
    const st = baueStrecke({ bausteine: l.strecke, welt: l.welt, seed: i + 1 });
    s = neuesSpiel({ st, board: boardWerte(f) });
    lauf = { level: i, sterneVorher: [...sterneVonLevel(f, i)], freiVorher: WELTEN.map((_, w) => weltFrei(f, w)), aufgabenGezeigt: false };
    los(l.welt, `${l.box ? `${l.box} ` : ""}Level ${levelName(i)}: „${l.name}“`);
    status(`${WELTEN[l.welt].name} · Level ${levelName(i)}`);
  }
  function starteEndlos(w) {
    const st = baueStrecke({ bausteine: [], welt: w, seed: Math.floor(Math.random() * 1e6), endlos: true });
    s = neuesSpiel({ st, board: boardWerte(f), endlos: true });
    lauf = { endlos: w, freiVorher: WELTEN.map((_, k) => weltFrei(f, k)), aufgabenGezeigt: true };
    los(w, `Endlos in ${WELTEN[w].name}. Drei Leben. Es wird immer schneller …`);
    status(`${WELTEN[w].name} · Endlos`);
  }
  function los(welt, text) {
    r.vorbereiten(welt, WELT_STILE[welt]);
    r.zuruecksetzen();
    r.hud = true;
    r.erzaehl(text, 3.4);
    ton.musik(welt);
    ton.setParallel(false);
    ton.pause(false);
    eingabe.loslassen();
    modus = "spiel";
    acc = 0;
    last = performance.now();
    ui.aus();
    touchEl.hidden = !grob;
    pauseK.hidden = false;
    querEl.hidden = !r.hochkant;
  }

  function pausieren() {
    if (modus !== "spiel") return;
    modus = "pause";
    ton.pause(true);
    eingabe.loslassen();
    zeigePause();
  }
  function zeigePause() {
    const l = lauf?.level != null ? LEVEL[lauf.level] : null;
    const stand = l ? l.aufgaben.map((a) => a.typ !== "ohneSturz" && aufgabeErfuellt(s, a)) : [];
    ui.pause(l, lauf?.sterneVorher || [], stand);
    pauseK.hidden = true;
    touchEl.hidden = true;
  }
  function weiter() {
    if (modus !== "pause") return;
    modus = "spiel";
    ton.pause(false);
    ui.aus();
    last = performance.now();
    touchEl.hidden = !grob;
    pauseK.hidden = false;
  }

  function auswerten() {
    const gewonnen = s.fertig === "ziel";
    const punkte = Math.floor(s.punkte);
    let sterneJetzt = [false, false, false];
    let neuBest = false;
    let titel;
    let aufgaben = [];
    let weiterLevel = null;
    if (lauf.level != null) {
      const i = lauf.level;
      const l = LEVEL[i];
      aufgaben = l.aufgaben;
      titel = `Level ${levelName(i)} · ${l.name}`;
      if (gewonnen) {
        sterneJetzt = l.aufgaben.map((a) => aufgabeErfuellt(s, a));
        f.geschafft[i] = true;
        f.stat.geschafft = (f.stat.geschafft || 0) + 1;
        neuBest = punkte > (f.best[i] || 0);
        if (neuBest) f.best[i] = punkte;
      }
      f.sterne[i] = lauf.sterneVorher.map((v, k) => v || sterneJetzt[k]);
      if (gewonnen && i + 1 < LEVEL.length && levelFrei(f, i + 1)) weiterLevel = i + 1;
    } else {
      const w = lauf.endlos;
      titel = `Endlos · ${WELTEN[w].name} · ${Math.floor(s.p.x / 40)} m`;
      neuBest = punkte > (f.endlos[w] || 0);
      if (neuBest) f.endlos[w] = punkte;
    }
    const tropfenPunkte = Math.floor(punkte / 500);
    const plus = s.tropfen + tropfenPunkte;
    f.tropfen += plus;
    const S = f.stat;
    S.tropfenGesamt = (S.tropfenGesamt || 0) + plus;
    S.risse = (S.risse || 0) + s.stat.risse;
    S.grinds = (S.grinds || 0) + s.stat.grindsGesamt;
    S.maxCombo = Math.max(S.maxCombo || 0, s.stat.maxCombo);
    S.bestLauf = Math.max(S.bestLauf || 0, lauf.level != null ? punkte : 0);
    const erfolge = pruefeErfolge(f);
    const neueWelt = WELTEN.findIndex((_, w) => !lauf.freiVorher[w] && weltFrei(f, w));
    // Weiter-Knopf: auch in die gerade freigeschaltete Welt
    if (weiterLevel == null && neueWelt >= 0) weiterLevel = LEVEL.findIndex((l) => l.welt === neueWelt);
    speichern(f);
    ergebnis({ gewonnen, punkte, zeit: Math.round(s.t) });
    ui.ergebnis({
      gewonnen,
      endlos: lauf.level == null,
      titel,
      punkte,
      neuBest,
      sterne: lauf.level != null ? f.sterne[lauf.level] : [],
      aufgaben,
      tropfenPlus: plus,
      tropfenLevel: s.tropfen,
      tropfenPunkte,
      neueWelt: neueWelt >= 0 ? neueWelt : null,
      erfolge,
      weiterLevel,
    });
    // Sterne ploppen mit Ton
    (lauf.level != null ? f.sterne[lauf.level] : []).forEach((an, k) => an && setTimeout(() => ton.fx("stern", { n: k }), 350 + k * 260));
    touchEl.hidden = true;
    pauseK.hidden = true;
  }

  // ---------- Ereignisse → Ton ----------
  function verarbeite(sp, mitTon) {
    if (!sp.ev.length) return;
    r.ereignisse(sp, sp.ev);
    if (mitTon)
      for (const e of sp.ev) {
        if (e.typ === "riss") ton.setParallel(true);
        if (e.typ === "zurueck") ton.setParallel(false);
        if (["ollie", "land", "trickStart", "trick", "grind", "combo", "tropfen", "sturz", "riss", "zurueck", "knack", "ziel", "aus"].includes(e.typ)) ton.fx(e.typ, e);
      }
    sp.ev.length = 0;
  }

  // ---------- Hauptschleife ----------
  function bild(jetzt) {
    raf = requestAnimationFrame(bild);
    const dt = Math.min(0.05, Math.max(0, (jetzt - last) / 1000));
    last = jetzt;
    const sp = modus === "menue" ? demo : s;
    if (modus === "spiel" || modus === "ende") {
      acc += dt;
      let n = 0;
      while (acc >= DT && n < 10) {
        schritt(s, modus === "spiel" ? eingabe.e : LEER);
        eingabe.verbraucht();
        acc -= DT;
        n++;
      }
      if (n >= 10) acc = 0;
      verarbeite(s, true);
      if (s.par && s.par.dauer - s.par.t < 2) {
        warnUhr -= dt;
        if (warnUhr <= 0) {
          ton.fx("warn");
          warnUhr = Math.max(0.08, (s.par.dauer - s.par.t) * 0.15);
        }
      }
      ton.dauer(modus === "spiel" ? s.p.zustand : "aus", s.p.vx);
      if (modus === "spiel" && lauf && !lauf.aufgabenGezeigt && s.t > 3.6) {
        lauf.aufgabenGezeigt = true;
        r.erzaehl(`Sterne: ${LEVEL[lauf.level].aufgaben.map((a) => a.text).join(" · ")}`, 4.2);
      }
      if (modus === "spiel" && s.fertig) {
        modus = "ende";
        endeT = 0;
        touchEl.hidden = true;
        pauseK.hidden = true;
      }
      if (modus === "ende") {
        endeT += dt;
        if (endeT > 1.9 && endeT - dt <= 1.9) auswerten();
      }
    } else if (modus === "menue" && demo) {
      acc += dt;
      let n = 0;
      while (acc >= DT && n < 10) {
        const ein = autopilot(demo, demoMerk);
        schritt(demo, ein);
        acc -= DT;
        n++;
      }
      if (n >= 10) acc = 0;
      verarbeite(demo, false);
      ton.dauer("aus", 0);
      if (demo.fertig || demo.leben < 90) neueDemo(demoWelt);
    }
    if (sp) {
      const l = lauf?.level != null ? LEVEL[lauf.level] : null;
      r.zeichne(sp, modus === "pause" ? 0 : dt, {
        kostuem: f.kostuem,
        board: f.board,
        hud: modus !== "menue",
        aufgaben: l?.aufgaben,
        sterneVorher: lauf?.sterneVorher,
        flackern: true,
      });
      for (const t of r.tonEv) if (modus === "spiel") ton.fx(t);
      r.tonEv.length = 0;
    }
    if (ui.name === "garderobe") vorschau(jetzt / 1000);
  }

  // ---------- Vorschau in der Garderobe ----------
  function vorschau(t) {
    const c = uiEl.querySelector(".sk-vorschau-canvas");
    if (!c) return;
    const g = c.getContext("2d");
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const b = c.clientWidth || 320;
    const h = c.clientHeight || 300;
    if (c.width !== Math.round(b * dpr)) {
      c.width = Math.round(b * dpr);
      c.height = Math.round(h * dpr);
    }
    g.setTransform(c.width / 320, 0, 0, c.height / 300, 0, 0);
    const P = palette(0, null);
    g.fillStyle = "#fff3e0";
    g.fillRect(0, 0, 320, 300);
    g.fillStyle = "#ff2bd6";
    g.globalAlpha = 0.18;
    for (let y = 0; y < 300; y += 10) for (let x = (y / 10) % 2 ? 5 : 0; x < 320; x += 10) {
      g.beginPath();
      g.arc(x, y, 2.4, 0, 7);
      g.fill();
    }
    g.globalAlpha = 1;
    g.strokeStyle = "#0b0a10";
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(10, 250);
    g.lineTo(310, 250);
    g.stroke();
    const kostuem = probe?.art === "kostuem" ? probe.id : f.kostuem;
    const board = probe?.art === "board" ? probe.id : f.board;
    const frame = Math.floor(t * 12);
    const zq = frame / 12;
    const zyk = zq % 2.6;
    const q = { c: 0.15 + Math.sin(zq * 6) * 0.04, lean: 0.06, arme: "locker", phase: zq, fuss: 0, brett: { rot: 0, art: null, ph: 0 }, bal: 0, schiebt: false };
    let y = 0;
    if (zyk > 1.1 && zyk < 1.9) {
      const u = (zyk - 1.1) / 0.8;
      y = -Math.sin(u * Math.PI) * 38;
      q.c = 0.65;
      q.arme = "trick";
      q.brett.art = ["kickflip", "shove360", "heelflip", "impossible"][Math.floor(zq / 2.6) % 4];
      q.brett.ph = Math.min(1, u * 1.15);
      q.fuss = Math.sin(Math.min(1, u * 1.15) * Math.PI);
    }
    zeichneFigur(g, 160, 250 + y, q, { P, kostuem, board, frame, zeit: t, groesse: 2.2 });
    r.comicText(g, KOSTUEME.find((k) => k.id === kostuem)?.name.toUpperCase() || "", 160, 30, 26, "#ffe600", -0.05);
  }

  // ---------- Größe / Hochformat ----------
  const ro = new ResizeObserver(() => {
    r.groesse();
    if (modus === "spiel" || modus === "pause") querEl.hidden = !r.hochkant;
  });
  ro.observe(canvas);

  zumMenue("titel");
  raf = requestAnimationFrame(bild);

  return {
    pause() {
      if (modus === "spiel") pausieren();
    },
    stop() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      eingabe.stop();
      ton.stop();
      window.removeEventListener("keydown", tonAn);
      dom.innerHTML = "";
    },
  };
}
