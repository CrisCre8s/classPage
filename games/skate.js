// Stick-Skater: Strichmännchen auf dem Skateboard über die Dächer einer Stadt bei Nacht.
// Unterschiedliche Höhen, Treppen (springen!), Geländer an Treppen und über Lücken zum Grinden,
// Rampen, Kisten, Kegel und Münzen. Wird in voller Bildschirmauflösung gezeichnet.
import { overlayKlick } from "./eingabe.js";

export const HILFE = "→ oder D anschieben (halten = weiter schieben) · Leertaste/↑ springen (halten = höher) · in der Luft: ↑ Kickflip · ↓ Shove-it · ← Backflip · Handy: tippen springt, wischen = Trick · P: Pause";

const W = 960; // logische Größe; gezeichnet wird in echter Bildschirmauflösung
const H = 480;
const SPIELER_X = 220;
const SCHWERKRAFT = 2300;
const SPRUNG = 740;
const STUFE_B = 32; // Treppenstufe: Breite
const STUFE_H = 21; //                Höhe

// Stufen unterscheiden sich in Länge der freien Strecken, Anzahl der Hindernisse und Sprünge
// flachLang: freie Strecke zwischen zwei Abschnitten · nachSprung: Auslauf nach Treppe/Lücke
// hindernis: Anteil der Strecken mit Kegel/Kiste/Rail/Kicker · gewichte: wie oft welcher Abschnitt kommt
const STUFEN = {
  leicht: { max: 430, schub: 105, reibung: 16, leben: 3, flachLang: [900, 1300], nachSprung: [600, 800], hindernis: 0.3, treppe: [3, 4], luecke: [70, 100], gewichte: { flach: 6, treppe: 2, luecke: 1, hoch: 2, kicker: 1 }, railChance: 0.5, wand: false },
  mittel: { max: 510, schub: 100, reibung: 18, leben: 2, flachLang: [650, 1000], nachSprung: [480, 640], hindernis: 0.55, treppe: [4, 6], luecke: [90, 140], gewichte: { flach: 4, treppe: 3, luecke: 2, hoch: 2, kicker: 1 }, railChance: 0.55, wand: true },
  schwer: { max: 590, schub: 95, reibung: 20, leben: 1, flachLang: [460, 760], nachSprung: [380, 500], hindernis: 0.8, treppe: [5, 8], luecke: [120, 180], gewichte: { flach: 3, treppe: 3, luecke: 3, hoch: 2, kicker: 2 }, railChance: 0.6, wand: true },
};
const SCHUB_DAUER = 0.4; // so lange dauert ein Anschieben mit dem Fuß

const TRICKS = {
  kickflip: { name: "Kickflip", dauer: 0.42, punkte: 100 },
  shove: { name: "Shove-it", dauer: 0.38, punkte: 80 },
  backflip: { name: "Backflip", dauer: 0.72, punkte: 300 },
};

const zufall = (a, b) => a + Math.random() * (b - a);
const ganz = (a, b) => Math.floor(zufall(a, b + 1));
const lerp = (a, b, k) => a + (b - a) * k;

export function start({ canvas, stufe, passeCanvas, status, nachricht, ergebnis }) {
  const S = STUFEN[stufe] || STUFEN.mittel;
  const ctx = passeCanvas(canvas, W, H);
  const grob = window.matchMedia("(pointer: coarse)").matches;

  // ---------- HD: Zeichenfläche so groß wie auf dem Bildschirm ----------
  let skala = 1;
  function passeAufloesung() {
    const breite = canvas.getBoundingClientRect().width;
    if (!breite) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const px = Math.max(W, Math.round(breite * dpr));
    if (canvas.width !== px) {
      canvas.width = px;
      canvas.height = Math.round((px * H) / W);
    }
    skala = canvas.width / W;
  }
  const ro = new ResizeObserver(passeAufloesung);
  ro.observe(canvas);

  // ---------- Hintergrund (einmal erzeugt) ----------
  const ebenen = [
    { f: 0.08, farbe: "#171329", hMin: 120, hMax: 260, fenster: 0.15 },
    { f: 0.2, farbe: "#1f1a36", hMin: 90, hMax: 220, fenster: 0.35 },
    { f: 0.38, farbe: "#29224a", hMin: 60, hMax: 170, fenster: 0.55 },
  ].map((e) => {
    const liste = [];
    let x = 0;
    while (x < 2200) {
      const b = zufall(60, 140);
      const h = zufall(e.hMin, e.hMax);
      const fenster = [];
      for (let fy = 14; fy < h - 16; fy += 20) for (let fx = 10; fx < b - 12; fx += 18) if (Math.random() < e.fenster) fenster.push([fx, fy, Math.random()]);
      liste.push({ x, b, h, fenster, antenne: Math.random() < 0.25 });
      x += b + zufall(6, 26);
    }
    return { ...e, liste, breite: x };
  });
  const sterne = Array.from({ length: 90 }, () => ({ x: Math.random() * W, y: Math.random() * 260, r: Math.random() < 0.15 ? 1.6 : 0.9, p: Math.random() * 6 }));

  // ---------- Zustand ----------
  let zustand, raf, zuletzt;
  let kamX, kamY, tempo, punkte, meter, leben, unverwundbar, muenzenZahl;
  let teile, objekte, muenzen, cursor, ebene;
  let sp; // Spieler
  let popups, teilchen;

  function neu() {
    kamX = 0;
    tempo = 0; // Tempo kommt nur vom Anschieben
    punkte = 0;
    meter = 0;
    leben = S.leben;
    unverwundbar = 0;
    muenzenZahl = 0;
    teile = [];
    objekte = [];
    muenzen = [];
    ebene = 0;
    cursor = -400;
    flach(1100, false);
    sp = { y: 0, vy: 0, amBoden: true, auf: null, halten: false, haltZeit: 0, trick: null, kombi: [], sturz: null, absprung: null, schub: null };
    kamY = -H * 0.68;
    popups = [];
    teilchen = [];
    erzeuge();
    zeigeStatus();
  }

  // ---------- Strecke erzeugen ----------
  function flach(laenge, mitHindernis = true) {
    const f = { art: "flach", x0: cursor, x1: cursor + laenge, y: ebene };
    teile.push(f);
    if (mitHindernis && laenge > 380 && Math.random() < S.hindernis) {
      const mitte = cursor + laenge * zufall(0.4, 0.6);
      const r = Math.random();
      if (r < 0.28) {
        objekte.push({ art: "kegel", x: mitte, y: ebene, w: 24, h: 32 });
        bogen(mitte - 110, ebene - 40, mitte + 130, ebene - 40, 120, 5);
      } else if (r < 0.52) {
        const w = zufall(80, 130);
        const h = zufall(38, 54);
        objekte.push({ art: "kiste", x: mitte - w / 2, y: ebene, w, h });
        linie(mitte - w / 2 + 14, ebene - h - 34, mitte + w / 2 - 14, ebene - h - 34, 3);
      } else if (r < 0.8) {
        const w = zufall(180, 280);
        objekte.push({ art: "rail", x0: mitte - w / 2, x1: mitte + w / 2, y0: ebene - 40, y1: ebene - 40 });
        linie(mitte - w / 2 + 20, ebene - 76, mitte + w / 2 - 10, ebene - 76, Math.round(w / 45));
      } else {
        objekte.push({ art: "kicker", x0: mitte - 45, x1: mitte + 45, y: ebene, h: 44 });
        bogen(mitte + 30, ebene - 80, mitte + 330, ebene - 30, 150, 6);
      }
    } else if (mitHindernis && Math.random() < 0.5) {
      linie(cursor + 80, ebene - 34, cursor + laenge - 80, ebene - 34, Math.max(2, Math.round(laenge / 90)));
    }
    cursor += laenge;
  }

  function treppe() {
    const n = ganz(...S.treppe);
    const x0 = cursor;
    const t = { art: "treppe", x0, x1: x0 + n * STUFE_B, y0: ebene, y1: ebene + n * STUFE_H, n };
    teile.push(t);
    if (Math.random() < S.railChance) {
      // Geländer die Treppe hinunter (zum Grinden)
      const steig = (t.y1 - t.y0) / (t.x1 - t.x0);
      objekte.push({ art: "rail", x0: x0 - 40, x1: t.x1 + 30, y0: ebene - 38 - steig * 40, y1: t.y1 - 38 + steig * 30, treppe: true });
      linie(x0 - 20, ebene - 38 - steig * 20 - 34, t.x1 + 10, t.y1 - 38 + steig * 10 - 34, Math.max(3, Math.round(n * 0.8)));
    } else {
      bogen(x0 - 60, ebene - 50, t.x1 + 90, t.y1 - 40, 90, 5);
    }
    cursor = t.x1;
    ebene = t.y1;
    flach(ganz(...S.nachSprung));
  }

  function luecke() {
    const mitRail = Math.random() < S.railChance * 0.8;
    const w = mitRail ? zufall(S.luecke[1], S.luecke[1] + 120) : zufall(...S.luecke);
    const tiefer = !mitRail && ebene < 160 && Math.random() < 0.35 ? ganz(30, 80) : 0;
    teile.push({ art: "luecke", x0: cursor, x1: cursor + w });
    if (mitRail) {
      objekte.push({ art: "rail", x0: cursor - 90, x1: cursor + w + 90, y0: ebene - 36, y1: ebene - 36, luecke: true });
      linie(cursor - 40, ebene - 70, cursor + w + 40, ebene - 70, Math.round(w / 40) + 2);
    } else {
      bogen(cursor - 70, ebene - 40, cursor + w + 70, ebene + tiefer - 40, 110, Math.max(4, Math.round(w / 40)));
    }
    cursor += w;
    ebene += tiefer;
    flach(ganz(...S.nachSprung));
  }

  function hoch() {
    if (ebene < -180) return treppe();
    const h = ganz(36, 62);
    if (S.wand && Math.random() < 0.4) {
      // Kante nach oben: nur mit Sprung
      ebene -= Math.min(h, 52);
      bogen(cursor - 90, ebene + 20, cursor + 90, ebene - 30, 80, 4);
      flach(ganz(...S.nachSprung));
    } else {
      teile.push({ art: "rampe", x0: cursor, x1: cursor + 130, y0: ebene, y1: ebene - h });
      cursor += 130;
      ebene -= h;
      flach(ganz(...S.nachSprung));
    }
  }

  function kicker() {
    const x0 = cursor + 160;
    flachStueck(cursor, x0 + 90);
    objekte.push({ art: "kicker", x0, x1: x0 + 90, y: ebene, h: 46 });
    const w = zufall(...S.luecke) + 40;
    teile.push({ art: "luecke", x0: x0 + 130, x1: x0 + 130 + w });
    bogen(x0 + 70, ebene - 90, x0 + 160 + w, ebene - 40, 140, 6);
    cursor = x0 + 130 + w;
    flach(ganz(...S.nachSprung));
  }
  function flachStueck(x0, x1) {
    teile.push({ art: "flach", x0, x1, y: ebene });
    cursor = x1;
  }

  // Münzen
  function bogen(xa, ya, xb, yb, hoehe, n) {
    for (let i = 0; i < n; i++) {
      const k = n === 1 ? 0.5 : i / (n - 1);
      muenzen.push({ x: lerp(xa, xb, k), y: lerp(ya, yb, k) - Math.sin(k * Math.PI) * hoehe, weg: 0 });
    }
  }
  function linie(xa, ya, xb, yb, n) {
    for (let i = 0; i < n; i++) {
      const k = n === 1 ? 0.5 : i / (n - 1);
      muenzen.push({ x: lerp(xa, xb, k), y: lerp(ya, yb, k), weg: 0 });
    }
  }

  function waehle() {
    const g = { ...S.gewichte };
    if (ebene > 200) g.treppe = 0; // nicht endlos nach unten
    if (ebene < -200) g.hoch = 0;
    const eintraege = Object.entries(g).filter(([, v]) => v > 0);
    let r = Math.random() * eintraege.reduce((a, [, v]) => a + v, 0);
    for (const [k, v] of eintraege) if ((r -= v) <= 0) return k;
    return "flach";
  }

  function erzeuge() {
    while (cursor < kamX + W + 900) {
      const art = waehle();
      if (art === "flach") flach(ganz(...S.flachLang));
      else if (art === "treppe") treppe();
      else if (art === "luecke") luecke();
      else if (art === "hoch") hoch();
      else kicker();
    }
    const grenze = kamX - 200;
    teile = teile.filter((t) => t.x1 > grenze);
    objekte = objekte.filter((o) => (o.x1 ?? o.x + o.w) > grenze);
    muenzen = muenzen.filter((m) => m.x > grenze);
  }

  // ---------- Flächen ----------
  // Treppe: Oberkante der Stufe an Stelle x
  const treppenY = (t, x) => t.y0 + Math.min(t.n, Math.floor((x - t.x0) / STUFE_B) + 1) * STUFE_H;

  function flaechenBei(x) {
    const l = [];
    for (const t of teile) {
      if (x < t.x0 || x > t.x1) continue;
      if (t.art === "flach") l.push({ y: t.y, art: "boden", f: t });
      else if (t.art === "rampe") l.push({ y: lerp(t.y0, t.y1, (x - t.x0) / (t.x1 - t.x0)), art: "rampe", f: t });
      else if (t.art === "treppe") l.push({ y: treppenY(t, x), art: "treppe", f: t });
    }
    for (const o of objekte) {
      if (o.art === "kiste" && x >= o.x && x <= o.x + o.w) l.push({ y: o.y - o.h, art: "kiste", f: o });
      else if (o.art === "rail" && x >= o.x0 && x <= o.x1) l.push({ y: lerp(o.y0, o.y1, (x - o.x0) / (o.x1 - o.x0)), art: "rail", f: o });
      else if (o.art === "kicker" && x >= o.x0 && x <= o.x1) l.push({ y: o.y - (o.h * (x - o.x0)) / (o.x1 - o.x0), art: "kicker", f: o });
    }
    return l;
  }
  function yAuf(f, art, x) {
    if (art === "boden") return f.y;
    if (art === "rampe") return lerp(f.y0, f.y1, (x - f.x0) / (f.x1 - f.x0));
    if (art === "kiste") return f.y - f.h;
    if (art === "rail") return lerp(f.y0, f.y1, (x - f.x0) / (f.x1 - f.x0));
    if (art === "kicker") return f.y - (f.h * (x - f.x0)) / (f.x1 - f.x0);
    return null;
  }
  const imBereich = (f, x) => x >= (f.x0 ?? f.x) && x <= (f.x1 ?? f.x + f.w);

  // feste Körper, in die man nicht hineinfahren darf: Oberkante an Stelle x
  function festeOberkanten(x) {
    const l = [];
    for (const t of teile) {
      if (x < t.x0 || x > t.x1) continue;
      if (t.art === "flach") l.push(t.y);
      else if (t.art === "rampe") l.push(lerp(t.y0, t.y1, (x - t.x0) / (t.x1 - t.x0)));
      else if (t.art === "treppe") l.push(treppenY(t, x));
    }
    for (const o of objekte) {
      if (o.art === "kiste" && x > o.x + 4 && x < o.x + o.w) l.push(o.y - o.h);
      if (o.art === "kegel" && x > o.x - 6 && x < o.x + o.w + 6) l.push(o.y - o.h + 6);
    }
    return l;
  }

  // ---------- Spiel ----------
  function zeigeStatus() {
    status(`${Math.floor(punkte + meter)} Pkt · ${Math.floor(meter)} m · ● ${muenzenZahl}${"  " + "♥".repeat(Math.max(0, leben))}`);
  }
  function popup(text, farbe = "#f5d97a", gross = false) {
    popups.push({ text, x: kamX + SPIELER_X, y: sp.y - 110, t: 0, farbe, gross });
  }

  function springen() {
    if (zustand !== "laeuft" || sp.sturz || !sp.amBoden) return;
    sp.vy = -SPRUNG + (sp.auf?.art === "rail" ? 60 : 0);
    sp.amBoden = false;
    sp.halten = true;
    sp.haltZeit = 0;
    sp.kombi = [];
    sp.absprung = { x: kamX + SPIELER_X, von: sp.auf };
    sp.auf = null;
    staub(kamX + SPIELER_X, sp.y, 5);
  }
  function trick(art) {
    if (zustand !== "laeuft" || sp.sturz || sp.amBoden || sp.trick) return;
    sp.trick = { art, t: 0 };
  }

  function sturz(grund) {
    if (sp.sturz || unverwundbar > 0) return;
    sp.sturz = { t: 0, vy: -420, dreh: 0, bx: 0 };
    sp.trick = null;
    sp.kombi = [];
    sp.amBoden = false;
    leben--;
    zeigeStatus();
    popup(grund, "#ff6b81", true);
  }

  function landen(fl, wx) {
    if (fl.art === "treppe") {
      if (unverwundbar > 0) {
        // nach dem Neustart: auf die unterste Stufe setzen statt Sturz
        sp.y = fl.f.y1;
        sp.amBoden = false;
        return;
      }
      sp.y = fl.y;
      sturz("Treppe!");
      return;
    }
    if (sp.trick) {
      if (sp.trick.t / TRICKS[sp.trick.art].dauer < 0.8 && unverwundbar <= 0) {
        sp.y = fl.y;
        sturz("Bail!");
        return;
      }
      if (sp.trick.t / TRICKS[sp.trick.art].dauer >= 0.8) sp.kombi.push(sp.trick.art);
      sp.trick = null;
    }
    sp.y = fl.y;
    sp.vy = 0;
    sp.amBoden = true;
    sp.auf = fl;
    sp.halten = false;
    staub(wx, fl.y, 8);
    let bonus = 0;
    const texte = [];
    if (sp.kombi.length) {
      bonus += sp.kombi.reduce((a, k) => a + TRICKS[k].punkte, 0) * sp.kombi.length;
      texte.push(sp.kombi.map((k) => TRICKS[k].name).join(" + ") + (sp.kombi.length > 1 ? ` ×${sp.kombi.length}` : ""));
      sp.kombi = [];
    }
    // über eine ganze Treppe oder Lücke gesprungen?
    const ab = sp.absprung;
    if (ab && fl.art !== "rail") {
      for (const t of teile) {
        if (t.art === "treppe" && ab.x <= t.x0 + 4 && wx >= t.x1) {
          bonus += t.n * 40;
          texte.push(`${t.n}-Stair`);
        }
        if (t.art === "luecke" && ab.x <= t.x0 && wx >= t.x1) {
          bonus += 120;
          texte.push("Gap");
        }
      }
    }
    sp.absprung = null;
    if (fl.art === "rail") {
      texte.push(fl.f.luecke ? "Gap-Grind" : fl.f.treppe ? "Handrail" : "Grind");
      bonus += fl.f.luecke ? 150 : fl.f.treppe ? 100 : 30;
    }
    if (texte.length) {
      punkte += bonus;
      popup(`${texte.join(" + ")} +${bonus}`, fl.art === "rail" ? "#9fd0ff" : "#f5d97a", texte.length > 1);
      zeigeStatus();
    }
  }

  function staub(x, y, n) {
    for (let i = 0; i < n; i++) teilchen.push({ art: "staub", x: x + zufall(-14, 14), y: y - 2, vx: zufall(-80, 40), vy: zufall(-60, -10), t: 0, leben: zufall(0.3, 0.5), r: zufall(3, 6) });
  }

  function schritt(dt) {
    // Anschieben: der hintere Fuß tritt kurz auf den Boden; in der Mitte gibt es Schwung
    if (sp.schub) {
      const vorher = sp.schub.t;
      sp.schub.t += dt;
      if (vorher < SCHUB_DAUER * 0.45 && sp.schub.t >= SCHUB_DAUER * 0.45 && sp.amBoden) {
        tempo = Math.min(S.max, tempo + S.schub * (1 - 0.65 * (tempo / S.max)));
        staub(kamX + SPIELER_X - 22, sp.y, 2);
      }
      if (sp.schub.t >= SCHUB_DAUER || !sp.amBoden) sp.schub = null;
    }
    if (!sp.schub && schubHalten && sp.amBoden && !sp.sturz && sp.auf?.art !== "rail") sp.schub = { t: 0 };
    // Rollwiderstand am Boden, kaum in der Luft; bergauf langsamer, Geländer bergab schneller
    if (sp.amBoden && !sp.sturz) {
      tempo -= (S.reibung + tempo * 0.045) * dt;
      const f = sp.auf?.f;
      if (sp.auf?.art === "rampe" || sp.auf?.art === "rail") {
        const sinus = Math.sin(Math.atan2(f.y1 - f.y0, f.x1 - f.x0));
        tempo += sinus * 520 * dt;
      } else if (sp.auf?.art === "kicker") tempo -= Math.sin(Math.atan2(f.h, f.x1 - f.x0)) * 360 * dt;
    } else tempo -= tempo * 0.02 * dt;
    tempo = Math.max(0, Math.min(S.max * 1.12, tempo));
    const vorherX = kamX;
    if (!sp.sturz) kamX += tempo * dt;
    else if (sp.sturz.t < 0.5) kamX += tempo * dt * (1 - sp.sturz.t * 2);
    meter += (kamX - vorherX) / 40;
    unverwundbar = Math.max(0, unverwundbar - dt);
    erzeuge();
    const wx = kamX + SPIELER_X;

    // Münzen einsammeln
    for (const m of muenzen) {
      if (m.weg) continue;
      if (Math.abs(m.x - wx) < 24 && Math.abs(m.y - (sp.y - 36)) < 44 && !sp.sturz) {
        m.weg = 0.001;
        muenzenZahl++;
        punkte += 25;
        for (let i = 0; i < 6; i++) teilchen.push({ art: "funkel", x: m.x, y: m.y, vx: zufall(-120, 120), vy: zufall(-160, 40), t: 0, leben: 0.4, r: 2.5 });
      }
    }

    if (sp.sturz) {
      const s = sp.sturz;
      s.t += dt;
      s.vy += SCHWERKRAFT * dt;
      const vorher = sp.y;
      sp.y += s.vy * dt;
      const boden = flaechenBei(wx).filter((o) => o.art !== "rail" && vorher <= o.y + 4 && sp.y >= o.y).sort((a, b) => a.y - b.y)[0];
      if (boden && s.vy > 0) {
        sp.y = boden.y;
        s.vy *= -0.3;
      }
      s.dreh += dt * 7 * (s.t < 0.6 ? 1 : 0.2);
      if (s.t > 1.15) {
        if (leben <= 0) return ende();
        neustartNachSturz(wx);
      }
      return;
    }

    if (sp.trick) {
      sp.trick.t += dt;
      if (sp.trick.t >= TRICKS[sp.trick.art].dauer && !sp.amBoden) {
        sp.kombi.push(sp.trick.art);
        sp.trick = null;
      }
    }

    if (sp.amBoden) {
      const auf = sp.auf;
      let y = auf && imBereich(auf.f, wx) ? yAuf(auf.f, auf.art, wx) : null;
      if (y !== null && auf.art === "boden") {
        // auf flachem Boden: höher liegende erreichbare Fläche (Rampe, Kicker) übernimmt
        const besser = flaechenBei(wx).filter((o) => o.art !== "treppe" && o.y < y && o.y >= y - 10).sort((a, b) => a.y - b.y)[0];
        if (besser) {
          sp.auf = besser;
          y = besser.y;
        }
      }
      if (y === null) {
        // Ende der Fläche: nahtlos weiter auf etwa gleicher Höhe?
        const weiter = flaechenBei(wx).filter((o) => o.art !== "treppe" && o.y >= sp.y - 10 && o.y <= sp.y + 8).sort((a, b) => a.y - b.y)[0];
        if (weiter) {
          sp.auf = weiter;
          y = weiter.y;
        }
      }
      if (y !== null) {
        sp.y = y;
        sp.letzterBoden = y;
        if (sp.auf.art === "rail") {
          punkte += 70 * dt;
          if (Math.random() < 0.8) teilchen.push({ art: "funke", x: wx - 10, y: sp.y + 2, vx: -zufall(80, 260), vy: -zufall(40, 240), t: 0, leben: 0.35, r: 2 });
        }
      } else if (auf?.art === "kicker") {
        sp.amBoden = false;
        sp.vy = -(300 + tempo * 0.95);
        sp.absprung = { x: wx, von: auf };
        sp.auf = null;
        sp.kombi = [];
        popup("Air!", "#9fd0ff");
      } else {
        // Kante, Treppe oder Lücke: fallen
        sp.amBoden = false;
        sp.vy = auf?.art === "rail" && auf.f.y1 > auf.f.y0 ? 120 : 0;
        sp.absprung = { x: wx, von: auf };
        sp.auf = null;
      }
    } else {
      const vorherY = sp.y;
      sp.haltZeit += dt;
      const g = sp.halten && sp.vy < 0 && sp.haltZeit < 0.25 ? SCHWERKRAFT * 0.42 : SCHWERKRAFT;
      sp.vy += g * dt;
      sp.y += sp.vy * dt;
      if (sp.vy > 0) {
        const kand = flaechenBei(wx)
          .filter((o) => vorherY <= o.y + 3 + Math.abs(sp.vy * dt) * 0.15 && sp.y >= o.y)
          .sort((a, b) => a.y - b.y);
        if (kand.length) landen(kand[0], wx);
      }
      if (sp.y > (sp.letzterBoden ?? 0) + 380) {
        sturz("Abgestürzt!");
        return;
      }
    }

    // in etwas Festes hineingefahren?
    if (!sp.sturz && unverwundbar <= 0) {
      const tief = festeOberkanten(wx + 6).some((oy) => sp.y > oy + 7 && !(sp.auf && sp.auf.art === "rail"));
      if (tief) sturz("Autsch!");
      // unter einem Geländer durchfahren geht nicht
      for (const o of objekte) {
        if (o.art !== "rail" || !(wx > o.x0 + 6 && wx < o.x1)) continue;
        const ry = lerp(o.y0, o.y1, (wx - o.x0) / (o.x1 - o.x0));
        if (sp.y > ry + 10 && sp.y - 60 < ry && sp.amBoden) sturz("Autsch!");
      }
    }
  }

  function ebeneUnter(x) {
    const l = flaechenBei(x).map((o) => o.y);
    return l.length ? Math.max(...l) : ebene + 200;
  }

  function neustartNachSturz(wx) {
    // nächste sichere, flache Stelle suchen
    const ziel = teile.find((t) => t.art === "flach" && t.x1 > wx + 120 && t.x1 - Math.max(t.x0, wx) > 260);
    const x = ziel ? Math.max(ziel.x0 + 60, wx) : wx;
    kamX = x - SPIELER_X;
    objekte = objekte.filter((o) => (o.x0 ?? o.x) > x + 380 || (o.x1 ?? o.x + o.w) < x - 40);
    sp.sturz = null;
    sp.y = ziel ? ziel.y : sp.y;
    sp.letzterBoden = sp.y;
    sp.vy = 0;
    sp.amBoden = true;
    sp.auf = ziel ? { y: ziel.y, art: "boden", f: ziel } : null;
    sp.absprung = null;
    unverwundbar = 1.6;
    tempo *= 0.4;
  }

  function ende() {
    zustand = "ende";
    const gesamt = Math.floor(punkte + meter);
    const neuer = ergebnis({ punkte: gesamt });
    nachricht(`<p class="big">Game Over</p><p>${gesamt} Punkte · ${Math.floor(meter)} m · ${muenzenZahl} Münzen${neuer ? " · neuer Highscore!" : ""}</p><p class="small">Leertaste oder Klick für ein neues Spiel</p>`);
  }

  // ---------- Zeichnen ----------
  function zeichneHimmel(t) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#07060d");
    g.addColorStop(0.55, "#181332");
    g.addColorStop(1, "#33264f");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    for (const s of sterne) {
      ctx.globalAlpha = 0.45 + 0.4 * Math.sin(t / 700 + s.p);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Mond mit Schein
    const mg = ctx.createRadialGradient(780, 90, 10, 780, 90, 110);
    mg.addColorStop(0, "rgba(245, 230, 184, 0.35)");
    mg.addColorStop(1, "rgba(245, 230, 184, 0)");
    ctx.fillStyle = mg;
    ctx.fillRect(660, 0, 240, 220);
    ctx.fillStyle = "#f5e6b8";
    ctx.beginPath();
    ctx.arc(780, 90, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(200, 185, 140, 0.35)";
    [[770, 82, 6], [792, 100, 4], [784, 76, 3]].forEach(([x, y, r]) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function zeichneStadt(t) {
    for (const e of ebenen) {
      const off = (kamX * e.f) % e.breite;
      const basis = H + 40 - kamY * 0 - (kamY + H * 0.68) * e.f * 0.6;
      for (const rep of [0, e.breite]) {
        for (const h of e.liste) {
          const x = h.x - off + rep;
          if (x > W || x + h.b < 0) continue;
          const top = basis - h.h - 120;
          ctx.fillStyle = e.farbe;
          ctx.fillRect(x, top, h.b, H - top + 40);
          if (h.antenne) {
            ctx.fillRect(x + h.b / 2 - 1, top - 18, 2, 18);
            ctx.fillStyle = Math.sin(t / 400 + h.x) > 0 ? "#e5566f" : "#5a2030";
            ctx.fillRect(x + h.b / 2 - 2, top - 20, 4, 4);
          }
          for (const [fx, fy, p] of h.fenster) {
            ctx.fillStyle = p > 0.85 ? "rgba(159, 208, 255, 0.55)" : `rgba(245, 217, 122, ${0.25 + p * 0.35})`;
            ctx.fillRect(x + fx, top + fy, 7, 9);
          }
        }
      }
    }
    // leichter Dunst über der Stadt
    const d = ctx.createLinearGradient(0, H * 0.55, 0, H);
    d.addColorStop(0, "rgba(51, 38, 79, 0)");
    d.addColorStop(1, "rgba(51, 38, 79, 0.55)");
    ctx.fillStyle = d;
    ctx.fillRect(0, H * 0.55, W, H * 0.45);
  }

  // Welt: Dächer, Treppen, Rampen (in Weltkoordinaten)
  function zeichneWelt() {
    const unten = kamY + H + 60;
    for (const t of teile) {
      if (t.x1 < kamX - 20 || t.x0 > kamX + W + 20) continue;
      if (t.art === "luecke") continue;
      ctx.beginPath();
      if (t.art === "flach") {
        ctx.moveTo(t.x0, t.y);
        ctx.lineTo(t.x1, t.y);
      } else if (t.art === "rampe") {
        ctx.moveTo(t.x0, t.y0);
        ctx.lineTo(t.x1, t.y1);
      } else if (t.art === "treppe") {
        ctx.moveTo(t.x0, t.y0);
        for (let i = 0; i < t.n; i++) {
          ctx.lineTo(t.x0 + i * STUFE_B, t.y0 + (i + 1) * STUFE_H);
          ctx.lineTo(t.x0 + (i + 1) * STUFE_B, t.y0 + (i + 1) * STUFE_H);
        }
      }
      const xr = t.x1;
      ctx.lineTo(xr, unten);
      ctx.lineTo(t.x0, unten);
      ctx.closePath();
      const top = t.y ?? Math.min(t.y0, t.y1);
      const g = ctx.createLinearGradient(0, top, 0, top + 220);
      g.addColorStop(0, "#3b3456");
      g.addColorStop(0.08, "#2b2541");
      g.addColorStop(1, "#141120");
      ctx.fillStyle = g;
      ctx.fill();
      // helle Oberkante
      ctx.strokeStyle = t.art === "rampe" ? "#d4b8ff" : "#6f6596";
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (t.art === "flach") {
        ctx.moveTo(t.x0, t.y + 1.5);
        ctx.lineTo(t.x1, t.y + 1.5);
      } else if (t.art === "rampe") {
        ctx.moveTo(t.x0, t.y0 + 1.5);
        ctx.lineTo(t.x1, t.y1 + 1.5);
      } else {
        for (let i = 0; i < t.n; i++) {
          ctx.moveTo(t.x0 + i * STUFE_B, t.y0 + (i + 1) * STUFE_H + 1.5);
          ctx.lineTo(t.x0 + (i + 1) * STUFE_B, t.y0 + (i + 1) * STUFE_H + 1.5);
        }
      }
      ctx.stroke();
      if (t.art === "flach") {
        // Fugen, Dachkante
        ctx.fillStyle = "rgba(0,0,0,0.22)";
        const start = Math.ceil(t.x0 / 70) * 70;
        for (let x = start; x < t.x1; x += 70) ctx.fillRect(x, t.y + 4, 2, 18);
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        ctx.fillRect(t.x0, t.y + 3, t.x1 - t.x0, 6);
      }
      if (t.art === "treppe") {
        // Stufen-Vorderseiten etwas dunkler
        for (let i = 0; i < t.n; i++) {
          const sx = t.x0 + i * STUFE_B;
          const sy = t.y0 + i * STUFE_H;
          ctx.fillStyle = "rgba(0,0,0,0.35)";
          ctx.fillRect(sx, sy + 3, 4, STUFE_H);
          ctx.fillStyle = "rgba(255,255,255,0.07)";
          ctx.fillRect(sx + 4, sy + STUFE_H + 3, STUFE_B - 4, 5);
        }
      }
      // Seitenwand nur an echten Kanten (Lücke oder tiefer weiter), nicht zwischen gleich hohen Stücken
      const endY = t.y ?? t.y1;
      const danach = teile.find((n) => n !== t && Math.abs(n.x0 - t.x1) < 1);
      const danachY = danach ? (danach.y ?? danach.y0) : null;
      if (!danach || danach.art === "luecke" || danachY > endY + 1) {
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(t.x1 - 4, endY + 3, 4, unten - endY);
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(t.x1 - 6, endY + 3, 2, unten - endY);
      }
    }
  }

  function zeichneObjekte(t) {
    for (const o of objekte) {
      const ox0 = o.x0 ?? o.x;
      const ox1 = o.x1 ?? o.x + o.w;
      if (ox1 < kamX - 20 || ox0 > kamX + W + 20) continue;
      if (o.art === "kegel") {
        const g = ctx.createLinearGradient(o.x, 0, o.x + o.w, 0);
        g.addColorStop(0, "#ffb070");
        g.addColorStop(1, "#e2611c");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(o.x + 2, o.y);
        ctx.lineTo(o.x + o.w / 2, o.y - o.h);
        ctx.lineTo(o.x + o.w - 2, o.y);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(o.x + 7, o.y - 18, o.w - 14, 5);
        ctx.fillStyle = "#b44a14";
        ctx.fillRect(o.x - 4, o.y - 4, o.w + 8, 4);
      } else if (o.art === "kiste") {
        const g = ctx.createLinearGradient(0, o.y - o.h, 0, o.y);
        g.addColorStop(0, "#a8794a");
        g.addColorStop(1, "#6e4b28");
        ctx.fillStyle = g;
        ctx.fillRect(o.x, o.y - o.h, o.w, o.h);
        ctx.strokeStyle = "#4b3119";
        ctx.lineWidth = 2;
        ctx.strokeRect(o.x + 1, o.y - o.h + 1, o.w - 2, o.h - 2);
        ctx.beginPath();
        ctx.moveTo(o.x + 4, o.y - o.h + 4);
        ctx.lineTo(o.x + o.w - 4, o.y - 4);
        ctx.moveTo(o.x + o.w - 4, o.y - o.h + 4);
        ctx.lineTo(o.x + 4, o.y - 4);
        ctx.stroke();
        ctx.fillStyle = "#d7a974";
        ctx.fillRect(o.x, o.y - o.h, o.w, 3);
      } else if (o.art === "kicker") {
        ctx.fillStyle = "#3a3355";
        ctx.beginPath();
        ctx.moveTo(o.x0, o.y);
        ctx.lineTo(o.x1, o.y - o.h);
        ctx.lineTo(o.x1, o.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#f5d97a";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(o.x0, o.y);
        ctx.lineTo(o.x1, o.y - o.h);
        ctx.stroke();
      } else if (o.art === "rail") {
        // Pfosten bis zur Fläche darunter
        ctx.fillStyle = "#5d5974";
        const posten = [o.x0 + 12, o.x1 - 12];
        if (!o.luecke) posten.push((o.x0 + o.x1) / 2);
        for (const px of posten) {
          const ry = lerp(o.y0, o.y1, (px - o.x0) / (o.x1 - o.x0));
          const fl = flaechenBei(px).filter((f) => f.art !== "rail" && f.y > ry).sort((a, b) => a.y - b.y)[0];
          if (fl) ctx.fillRect(px - 2, ry, 4, fl.y - ry);
        }
        const g = ctx.createLinearGradient(0, o.y0 - 4, 0, o.y0 + 4);
        ctx.lineCap = "round";
        ctx.strokeStyle = "#8f8ba6";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(o.x0, o.y0);
        ctx.lineTo(o.x1, o.y1);
        ctx.stroke();
        ctx.strokeStyle = "#e9e7f2";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(o.x0, o.y0 - 1.5);
        ctx.lineTo(o.x1, o.y1 - 1.5);
        ctx.stroke();
        void g;
      }
    }
    // Münzen: drehen sich, glänzen
    for (const m of muenzen) {
      if (m.x < kamX - 30 || m.x > kamX + W + 30) continue;
      if (m.weg) {
        m.weg += 0.016;
        if (m.weg > 0.35) continue;
        ctx.globalAlpha = 1 - m.weg / 0.35;
      }
      const dreh = Math.abs(Math.cos(t / 260 + m.x * 0.02));
      const y = m.y - (m.weg ? m.weg * 120 : Math.sin(t / 400 + m.x) * 2);
      const glow = ctx.createRadialGradient(m.x, y, 2, m.x, y, 18);
      glow.addColorStop(0, "rgba(255, 214, 90, 0.4)");
      glow.addColorStop(1, "rgba(255, 214, 90, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(m.x - 18, y - 18, 36, 36);
      const g = ctx.createLinearGradient(m.x - 9, y - 9, m.x + 9, y + 9);
      g.addColorStop(0, "#fff3a8");
      g.addColorStop(0.5, "#ffc93a");
      g.addColorStop(1, "#c48a12");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(m.x, y, 9 * Math.max(0.15, dreh), 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#a06d0a";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      if (dreh > 0.4) {
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.fillRect(m.x - 2 * dreh, y - 5, 2 * dreh, 7);
      }
      ctx.globalAlpha = 1;
    }
  }

  // Skateboard in echten Proportionen von der Seite: dünnes Ahorn-Deck mit Griptape und
  // hochgezogenen Kicktails, Achsen (Grundplatte, Lenkgummis, Hänger), Rollen aus Urethan mit Kugellager.
  // winkel = Drehung um die Längsachse (Kickflip); 0 = normal. Ursprung = Boden unter der Brettmitte.
  const ROLLE_R = 3.6;
  const ACHSE_Y = -ROLLE_R; // Achsmitte über dem Boden
  const DECK_Y = -10.4; // Unterkante Deck (Mitte)
  const DECK_DICKE = 2.2;
  const DECK_BREITE = 13; // so hoch wirkt das Deck, wenn es senkrecht steht
  const SPUR = 10; // Abstand der beiden Rollen einer Achse (von vorn gesehen)
  function deckProfil(y0) {
    // Mittelteil flach, Kicktails mit ca. 20° nach oben
    const pts = [];
    for (let i = 0; i <= 28; i++) {
      const x = -35 + (70 * i) / 28;
      const k = Math.max(0, Math.abs(x) - 22) / 13;
      pts.push([x, y0 - 6.2 * (k * k * 0.55 + k * 0.45)]);
    }
    return pts;
  }
  function zeichneBrett(winkel = 0) {
    const c = Math.cos(winkel);
    const s = Math.sin(winkel);
    const mitte = DECK_Y - DECK_DICKE / 2; // Drehachse = Deckmitte
    // Hilfsfunktion: Punkt (Höhe über Deckmitte h, Seitenversatz q) nach der Drehung
    const proj = (h, q) => mitte - h * c - q * s; // h > 0 = über der Deckmitte
    const unterseiteSichtbar = s > 0.05;
    const flaeche = Math.abs(s) * DECK_BREITE; // sichtbare Breite der Deckfläche

    const achsen = () => {
      for (const ax of [-17, 17]) {
        // Höhe unter der Deckmitte: Grundplatte, Hänger, Achse
        const hB = -(DECK_DICKE / 2 + 1.4);
        const yB = proj(hB, 0);
        const yA = proj(-(-mitte + ACHSE_Y), 0);
        // Grundplatte
        ctx.fillStyle = "#6f6c7c";
        ctx.fillRect(ax - 5.5, Math.min(proj(-DECK_DICKE / 2, 0), yB), 11, Math.abs(yB - proj(-DECK_DICKE / 2, 0)) + 0.6);
        // Lenkgummi (rot) und Hänger (Alu)
        const yG = lerp(yB, yA, 0.35);
        ctx.fillStyle = "#e5566f";
        ctx.beginPath();
        ctx.ellipse(ax, yG, 2.4, 1.3, 0, 0, Math.PI * 2);
        ctx.fill();
        const g = ctx.createLinearGradient(ax - 6, 0, ax + 6, 0);
        g.addColorStop(0, "#8d8a99");
        g.addColorStop(0.45, "#e8e6ef");
        g.addColorStop(1, "#7b788a");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(ax - 2.2, yG);
        ctx.lineTo(ax + 2.2, yG);
        ctx.lineTo(ax + 4.6, yA + (yA > yG ? -0.6 : 0.6));
        ctx.lineTo(ax - 4.6, yA + (yA > yG ? -0.6 : 0.6));
        ctx.closePath();
        ctx.fill();
        // Rollen: zwei pro Achse; von der Seite liegen sie hintereinander, beim Drehen gehen sie auseinander
        const rollen = [proj(-(-mitte + ACHSE_Y), SPUR / 2), proj(-(-mitte + ACHSE_Y), -SPUR / 2)];
        rollen.sort((a, b) => a - b);
        rollen.forEach((ry, i) => {
          const hinten = i === 0 && Math.abs(rollen[1] - rollen[0]) < 0.5 ? false : i === 0;
          const rx = ax + (i === 0 ? 0.6 : 0);
          const gr = ctx.createRadialGradient(rx - 1.2, ry - 1.2, 0.3, rx, ry, ROLLE_R);
          gr.addColorStop(0, hinten ? "#d8d2c4" : "#fffaf0");
          gr.addColorStop(0.75, hinten ? "#b9b2a2" : "#ebe3d2");
          gr.addColorStop(1, hinten ? "#8f897b" : "#b7ae9b");
          ctx.fillStyle = gr;
          ctx.beginPath();
          ctx.arc(rx, ry, ROLLE_R, 0, Math.PI * 2);
          ctx.fill();
          // Kugellager
          ctx.fillStyle = "#3c3b46";
          ctx.beginPath();
          ctx.arc(rx, ry, 1.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#c9c7d3";
          ctx.beginPath();
          ctx.arc(rx, ry, 0.7, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    };

    const deck = () => {
      const oben = deckProfil(0);
      // Fläche (Griptape oder Unterseite), sichtbar beim Drehen
      if (flaeche > 0.6) {
        ctx.beginPath();
        oben.forEach(([x, y], i) => {
          const yy = mitte + y * c + flaeche / 2;
          i ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy);
        });
        for (let i = oben.length - 1; i >= 0; i--) ctx.lineTo(oben[i][0], mitte + oben[i][1] * c - flaeche / 2);
        ctx.closePath();
        if (unterseiteSichtbar) {
          const g = ctx.createLinearGradient(-35, 0, 35, 0);
          g.addColorStop(0, "#b48ef0");
          g.addColorStop(0.5, "#f5d97a");
          g.addColorStop(1, "#e5566f");
          ctx.fillStyle = g;
        } else ctx.fillStyle = "#1c1a22";
        ctx.fill();
        if (!unterseiteSichtbar) {
          ctx.fillStyle = "rgba(255,255,255,0.07)";
          for (let i = 0; i < 18; i++) ctx.fillRect(-28 + ((i * 41) % 56), mitte - flaeche / 2 + (((i * 7) % 10) / 10) * flaeche, 0.8, 0.8);
        }
      }
      // Holzkante: helles Ahorn mit Schichtlinien, oben ein dünner Streifen Griptape
      const dicke = DECK_DICKE * Math.max(0.35, Math.abs(c));
      const kante = (dy) => oben.map(([x, y]) => [x, mitte + y * c + dy]);
      const o = kante(-dicke / 2 + (s >= 0 ? -flaeche / 2 : flaeche / 2) * 0);
      const u = kante(dicke / 2);
      ctx.beginPath();
      o.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      for (let i = u.length - 1; i >= 0; i--) ctx.lineTo(u[i][0], u[i][1]);
      ctx.closePath();
      ctx.fillStyle = "#e3c497";
      ctx.fill();
      ctx.strokeStyle = "rgba(150, 100, 50, 0.55)";
      ctx.lineWidth = 0.35;
      for (const f of [0.35, 0.65]) {
        ctx.beginPath();
        o.forEach(([x, y], i) => {
          const yy = lerp(y, u[i][1], f);
          i ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy);
        });
        ctx.stroke();
      }
      // Griptape-Kante auf der Oberseite (zeigt nach oben, solange das Brett richtig herum ist)
      if (c > 0.2) {
        ctx.strokeStyle = "#141218";
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        o.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
      } else if (c < -0.2) {
        ctx.strokeStyle = "#141218";
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        u.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
      }
    };

    // Reihenfolge: liegt die Unterseite (mit den Achsen) zur Kamera, kommen die Achsen nach vorn
    if (unterseiteSichtbar) {
      deck();
      achsen();
    } else {
      achsen();
      deck();
    }
  }

  function zeichneFahrer(t) {
    const x = kamX + SPIELER_X;
    const y = sp.y;
    if (unverwundbar > 0 && Math.floor(t / 90) % 2) return;
    const inLuft = !sp.amBoden && !sp.sturz;
    const grind = sp.amBoden && sp.auf?.art === "rail";
    let hocke = inLuft ? 13 : sp.halten ? 7 : grind ? 6 : 2;
    let drehen = 0;
    let boardX = 1;
    let brettWinkel = 0;
    if (sp.trick) {
      const k = Math.min(1, sp.trick.t / TRICKS[sp.trick.art].dauer);
      if (sp.trick.art === "kickflip") brettWinkel = k * Math.PI * 2;
      if (sp.trick.art === "shove") boardX = Math.cos(k * Math.PI * 2);
      if (sp.trick.art === "backflip") drehen = -k * Math.PI * 2;
    }
    let neigung = 0;
    if (sp.amBoden && sp.auf) {
      const f = sp.auf.f;
      if (sp.auf.art === "rampe" || sp.auf.art === "rail") neigung = Math.atan2(f.y1 - f.y0, f.x1 - f.x0);
      if (sp.auf.art === "kicker") neigung = -Math.atan2(f.h, f.x1 - f.x0);
    } else if (inLuft) neigung = Math.max(-0.35, Math.min(0.4, sp.vy / 2200));

    // Schatten auf dem Boden
    if (!sp.sturz) {
      const bodenY = flaechenBei(x).filter((o) => o.y >= y - 2).sort((a, b) => a.y - b.y)[0]?.y;
      if (bodenY !== undefined) {
        const abst = Math.min(1, (bodenY - y) / 200);
        ctx.fillStyle = `rgba(0,0,0,${0.35 * (1 - abst)})`;
        ctx.beginPath();
        ctx.ellipse(x, bodenY + 1, 28 * (1 - abst * 0.5), 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.save();
    ctx.translate(x, y);
    if (sp.sturz) {
      const s = sp.sturz;
      ctx.save();
      ctx.translate(70 * s.t + 20, -40 * Math.sin(Math.min(1, s.t * 2) * Math.PI));
      ctx.rotate(s.t * 9);
      zeichneBrett(0);
      ctx.restore();
      ctx.translate(-14 * s.t, -20);
      ctx.rotate(-s.dreh);
      ctx.translate(0, 20);
      hocke = 9;
    } else {
      ctx.rotate(neigung);
      ctx.translate(0, -38);
      ctx.rotate(drehen);
      ctx.translate(0, 38);
      ctx.save();
      ctx.scale(boardX, 1);
      zeichneBrett(brettWinkel);
      ctx.restore();
    }

    ctx.translate(0, -7); // Füße stehen auf dem Griptape
    const wedeln = grind ? Math.sin(t / 80) * 9 : Math.sin(t / 260) * 2;
    const hy = -42 + hocke * 1.4;
    const sy = -68 + hocke * 1.5;
    // beim Anschieben geht der hintere Fuß vom Brett nach unten-hinten auf den Boden
    let fussX = -10;
    let fussY = -6;
    let knieX = -9;
    let knieY = -24 + hocke;
    if (sp.schub && !sp.sturz) {
      const k = Math.sin((sp.schub.t / SCHUB_DAUER) * Math.PI);
      fussX = -10 - 22 * k;
      fussY = -6 + 10 * k;
      knieX = -9 - 8 * k;
      knieY = -24 + hocke + 4 * k;
    }
    const koerper = () => {
      ctx.beginPath();
      ctx.moveTo(fussX, fussY);
      ctx.lineTo(knieX, knieY);
      ctx.lineTo(0, hy);
      ctx.lineTo(10, -24 + hocke * 0.8);
      ctx.lineTo(11, -6);
      ctx.moveTo(0, hy);
      ctx.lineTo(4, sy);
      ctx.moveTo(3, sy + 5);
      ctx.lineTo(-11, sy + 15 - wedeln * 0.6);
      ctx.lineTo(-24, sy + 19 - wedeln);
      ctx.moveTo(4, sy + 5);
      ctx.lineTo(17, sy + 13 + wedeln * 0.6);
      ctx.lineTo(30, sy + 11 + wedeln);
    };
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    // dunkler Rand für Kontrast, dann weißer Strich
    ctx.strokeStyle = "rgba(10, 8, 18, 0.7)";
    ctx.lineWidth = 8;
    koerper();
    ctx.stroke();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4.2;
    koerper();
    ctx.stroke();
    // Schuhe
    ctx.fillStyle = "#e5566f";
    ctx.fillRect(fussX - 5, fussY - 3, 10, 4);
    ctx.fillRect(7, -9, 10, 4);
    // Kopf mit Kappe
    ctx.fillStyle = "#14111c";
    ctx.beginPath();
    ctx.arc(7, sy - 12, 9.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(10, 8, 18, 0.7)";
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3.6;
    ctx.stroke();
    ctx.fillStyle = "#b48ef0";
    ctx.beginPath();
    ctx.arc(7, sy - 14, 10, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(7, sy - 15.5, 15, 3.4);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(11, sy - 11, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function zeichneTeilchen(dt) {
    teilchen = teilchen.filter((p) => (p.t += dt) < p.leben);
    for (const p of teilchen) {
      const k = p.t / p.leben;
      const x = p.x + p.vx * p.t;
      const y = p.y + p.vy * p.t + (p.art === "staub" ? 0 : 700 * p.t * p.t);
      ctx.globalAlpha = 1 - k;
      if (p.art === "staub") {
        ctx.fillStyle = "#8e86a6";
        ctx.beginPath();
        ctx.arc(x, y, p.r * (1 + k), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = p.art === "funkel" ? "#fff3a8" : `rgb(255, ${200 + Math.random() * 55}, 140)`;
        ctx.fillRect(x - p.r / 2, y - p.r / 2, p.r, p.r);
      }
    }
    ctx.globalAlpha = 1;
  }

  function zeichnePopups(dt) {
    popups = popups.filter((p) => (p.t += dt) < 1.2);
    ctx.textAlign = "center";
    for (const p of popups) {
      ctx.font = `${p.gross ? 15 : 12}px "Press Start 2P", monospace`;
      ctx.globalAlpha = 1 - Math.max(0, p.t - 0.8) / 0.4;
      const y = p.y - p.t * 46;
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#0b0a10";
      ctx.strokeText(p.text, p.x, y);
      ctx.fillStyle = p.farbe;
      ctx.fillText(p.text, p.x, y);
    }
    ctx.globalAlpha = 1;
  }

  function zeichne(t, dt) {
    ctx.setTransform(skala, 0, 0, skala, 0, 0);
    ctx.imageSmoothingEnabled = true;
    zeichneHimmel(t);
    zeichneStadt(t);
    ctx.save();
    ctx.translate(-kamX, -kamY);
    zeichneWelt();
    zeichneObjekte(t);
    zeichneFahrer(t);
    zeichneTeilchen(dt);
    zeichnePopups(dt);
    ctx.restore();
    // Hinweis, solange man (fast) steht
    if (zustand === "laeuft" && tempo < 90 && !sp.sturz) {
      ctx.globalAlpha = 0.55 + 0.45 * Math.sin(t / 260);
      ctx.font = '13px "Press Start 2P", monospace';
      ctx.textAlign = "center";
      ctx.fillStyle = "#f5d97a";
      ctx.fillText(grob ? "Links tippen: anschieben" : "→ oder D: anschieben", W / 2, H - 28);
      ctx.globalAlpha = 1;
    }
    // Tempo-Linien bei hoher Geschwindigkeit
    if (zustand === "laeuft" && tempo > S.max * 0.85) {
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 6; i++) {
        const yy = ((i * 97 + t * 0.05) % H);
        const xx = W - ((t * 1.4 + i * 211) % (W + 200));
        ctx.beginPath();
        ctx.moveTo(xx, yy);
        ctx.lineTo(xx + 80, yy);
        ctx.stroke();
      }
    }
  }

  function kameraNachfuehren(dt) {
    // Spieler bleibt bei ca. 68 % der Höhe; in der Luft folgt die Kamera ruhiger
    let ziel = (sp.amBoden || sp.sturz ? sp.y : Math.max(sp.y, ebeneUnter(kamX + SPIELER_X) - 60)) - H * 0.68;
    // beim Fallen in eine Lücke nicht ins Leere hinterherschauen
    ziel = Math.min(ziel, (sp.letzterBoden ?? 0) + 140 - H * 0.68);
    kamY = lerp(kamY, ziel, Math.min(1, dt * (sp.amBoden ? 5 : 2.2)));
  }

  function loop(t) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.033, (t - (zuletzt || t)) / 1000);
    zuletzt = t;
    if (zustand === "laeuft") {
      schritt(dt);
      kameraNachfuehren(dt);
      if (zustand === "laeuft" && t - statusZeit > 150) {
        statusZeit = t;
        zeigeStatus();
      }
    }
    zeichne(t, zustand === "laeuft" ? dt : 0);
  }
  let statusZeit = 0;

  function los() {
    if (zustand === "ende") neu();
    if (zustand !== "laeuft") {
      zustand = "laeuft";
      nachricht(null);
    }
  }
  function pause() {
    if (zustand !== "laeuft") return;
    zustand = "pause";
    nachricht(`<p class="big">Pause</p><p class="small">Leertaste oder Klick zum Weiterfahren</p>`);
  }

  // ---------- Eingabe ----------
  const onKeyDown = (e) => {
    if (e.target.closest?.("input, select, textarea")) return;
    const k = e.key;
    if ([" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "W", "s", "S", "a", "A", "d", "D"].includes(k)) e.preventDefault();
    if (e.repeat) return;
    if (k === "p" || k === "P" || k === "Escape") return zustand === "laeuft" ? pause() : null;
    if (zustand !== "laeuft") {
      if (k === " " || k === "Enter" || k === "ArrowUp") los();
      return;
    }
    if (k === "ArrowRight" || k === "d" || k === "D") {
      schubHalten = true;
      anschieben();
    } else if (k === " " || k === "ArrowUp" || k === "w" || k === "W") {
      if (sp.amBoden) springen();
      else trick("kickflip");
    } else if (k === "ArrowDown" || k === "s" || k === "S") trick("shove");
    else if (k === "ArrowLeft" || k === "a" || k === "A") trick("backflip");
  };
  const onKeyUp = (e) => {
    if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") sp.halten = false;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") schubHalten = false;
  };
  let schubHalten = false;
  function anschieben() {
    if (zustand !== "laeuft" || sp.sturz || !sp.amBoden || sp.schub || sp.auf?.art === "rail") return;
    sp.schub = { t: 0 };
  }
  let zeiger = null;
  const onDown = (e) => {
    if (zustand !== "laeuft") return los();
    const r = canvas.getBoundingClientRect();
    const links = e.clientX - r.left < r.width * 0.4;
    zeiger = { x: e.clientX, y: e.clientY, warAmBoden: sp.amBoden, gewischt: false, schieben: links };
    if (links) {
      // linke Seite: anschieben (gedrückt halten = weiter schieben)
      schubHalten = true;
      anschieben();
    } else if (sp.amBoden) springen();
  };
  const onMove = (e) => {
    if (!zeiger || zeiger.gewischt) return;
    const dx = e.clientX - zeiger.x;
    const dy = e.clientY - zeiger.y;
    if (Math.hypot(dx, dy) < 26) return;
    zeiger.gewischt = true;
    if (Math.abs(dy) > Math.abs(dx)) trick(dy < 0 ? "kickflip" : "shove");
    else trick(dx < 0 ? "backflip" : "kickflip");
  };
  const onUp = () => {
    if (zeiger && !zeiger.gewischt && !zeiger.warAmBoden && !zeiger.schieben) trick("kickflip");
    zeiger = null;
    sp.halten = false;
    schubHalten = false;
  };
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  const ausOverlay = overlayKlick(() => zustand !== "laeuft" && los());

  zustand = "bereit";
  neu();
  passeAufloesung();
  nachricht(`<p class="big">Stick-Skater</p><p>Über die Dächer: Treppen und Lücken überspringen, Geländer runtergrinden, Münzen sammeln. Tricks zählen nur, wenn du sie zu Ende drehst.</p><p><b>→</b> oder <b>D</b> schiebt an (halten = weiter schieben), <b>Leertaste</b> springt. Handy: links tippen = anschieben, rechts = springen.</p><p class="small">${S.leben} Leben · Leertaste, ↑ oder Klick zum Start</p>`);
  raf = requestAnimationFrame(loop);
  document.fonts?.load('12px "Press Start 2P"');

  return {
    pause,
    stop() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      ausOverlay();
    },
  };
}
