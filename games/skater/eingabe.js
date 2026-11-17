// Stick-Skater – Eingabe: Tastatur, Maus und Touch.
// Leertaste / Tippen = Ollie (gedrückt halten = höher). Pfeiltasten oder Wischen in der Luft = Tricks
// (↑ Kickflip, ↓ Heelflip, ← 360 Shove-it, → Impossible). Am Boden: → anschieben, ← bremsen.
// Beim Grinden: ← → bzw. linke/rechte Bildschirmhälfte gedrückt halten = Balance, kurz tippen = abspringen.

export function erstelleEingabe(flaeche, { zustand, pause, aktiv, pausiert }) {
  const e = { sprung: false, sprungNeu: false, tricks: [], links: false, rechts: false };
  const tasten = { links: false, rechts: false, knopfL: false, knopfR: false, beruehrL: false, beruehrR: false };
  const zeiger = new Map();

  const TASTEN = { ArrowUp: "hoch", ArrowDown: "runter", ArrowLeft: "links", ArrowRight: "rechts", KeyW: "hoch", KeyS: "runter", KeyA: "links", KeyD: "rechts" };
  function runter(ev) {
    if ((ev.code === "Escape" || ev.code === "KeyP") && (aktiv() || pausiert())) {
      ev.preventDefault();
      pause();
      return;
    }
    if (!aktiv()) return;
    if (ev.target && /input|select|textarea/i.test(ev.target.tagName)) return;
    if (ev.code === "Space") {
      ev.preventDefault();
      if (!ev.repeat) e.sprungNeu = true;
      e.sprung = true;
      return;
    }
    const r = TASTEN[ev.code];
    if (!r) return;
    ev.preventDefault();
    if (r === "links") tasten.links = true;
    if (r === "rechts") tasten.rechts = true;
    if (!ev.repeat && zustand() === "luft") e.tricks.push(r);
    mische();
  }
  function hoch(ev) {
    if (ev.code === "Space") e.sprung = false;
    const r = TASTEN[ev.code];
    if (r === "links") tasten.links = false;
    if (r === "rechts") tasten.rechts = false;
    mische();
  }
  function mische() {
    e.links = tasten.links || tasten.knopfL || tasten.beruehrL;
    e.rechts = tasten.rechts || tasten.knopfR || tasten.beruehrR;
  }

  // ---------- Zeiger (Touch und Maus) auf der Spielfläche ----------
  function zDown(ev) {
    if (!aktiv()) return;
    if (ev.pointerType === "mouse" && ev.button !== 0) return;
    ev.preventDefault();
    flaeche.setPointerCapture?.(ev.pointerId);
    const z = zustand();
    const box = flaeche.getBoundingClientRect();
    const seite = ev.clientX - box.left < box.width / 2 ? "L" : "R";
    const info = { x: ev.clientX, y: ev.clientY, t: performance.now(), gewischt: false, seite, grind: z === "grind", sprung: false };
    zeiger.set(ev.pointerId, info);
    if (z === "boden" || z === "ziel") {
      e.sprungNeu = true;
      e.sprung = true;
      info.sprung = true;
    } else if (z === "grind") {
      // erst nach kurzer Zeit als Balance werten, damit Tippen = Abspringen bleibt
      info.uhr = setTimeout(() => {
        if (!zeiger.has(ev.pointerId) || info.gewischt) return;
        if (seite === "L") tasten.beruehrL = true;
        else tasten.beruehrR = true;
        mische();
      }, 140);
    }
  }
  function zMove(ev) {
    const info = zeiger.get(ev.pointerId);
    if (!info || info.gewischt) return;
    const dx = ev.clientX - info.x;
    const dy = ev.clientY - info.y;
    if (Math.hypot(dx, dy) < 26) return;
    info.gewischt = true;
    // 8 Richtungen: schräg wischen = Kombi-Trick (z. B. hoch + links)
    const w = Math.atan2(dy, dx);
    const sektor = Math.round(w / (Math.PI / 4));
    const RICHTUNG = { 0: ["rechts"], 1: ["runter", "rechts"], 2: ["runter"], 3: ["runter", "links"], 4: ["links"], "-4": ["links"], "-3": ["hoch", "links"], "-2": ["hoch"], "-1": ["hoch", "rechts"] };
    if (zustand() === "luft") e.tricks.push(...RICHTUNG[sektor]);
  }
  function zUp(ev) {
    const info = zeiger.get(ev.pointerId);
    if (!info) return;
    zeiger.delete(ev.pointerId);
    clearTimeout(info.uhr);
    if (info.sprung) e.sprung = [...zeiger.values()].some((z) => z.sprung);
    if (info.grind && !info.gewischt && performance.now() - info.t < 180 && zustand() === "grind") e.sprungNeu = true;
    if (info.seite === "L") tasten.beruehrL = [...zeiger.values()].some((z) => z.seite === "L" && z.grind);
    else tasten.beruehrR = [...zeiger.values()].some((z) => z.seite === "R" && z.grind);
    mische();
  }

  // ---------- Touch-Knöpfe ◀ ▶ (bremsen/anschieben, beim Grinden Balance) ----------
  function knopf(el, seite) {
    const an = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      tasten[seite] = true;
      mische();
    };
    const aus = (ev) => {
      ev.preventDefault();
      tasten[seite] = false;
      mische();
    };
    el.addEventListener("pointerdown", an);
    el.addEventListener("pointerup", aus);
    el.addEventListener("pointercancel", aus);
    el.addEventListener("pointerleave", aus);
  }

  window.addEventListener("keydown", runter);
  window.addEventListener("keyup", hoch);
  flaeche.addEventListener("pointerdown", zDown);
  flaeche.addEventListener("pointermove", zMove);
  flaeche.addEventListener("pointerup", zUp);
  flaeche.addEventListener("pointercancel", zUp);

  return {
    e,
    knopf,
    // nach jedem Logik-Schritt: einmalige Signale löschen
    verbraucht() {
      e.sprungNeu = false;
      e.tricks.length = 0;
    },
    loslassen() {
      for (const k of Object.keys(tasten)) tasten[k] = false;
      e.sprung = false;
      e.sprungNeu = false;
      e.tricks.length = 0;
      zeiger.clear();
      mische();
    },
    stop() {
      window.removeEventListener("keydown", runter);
      window.removeEventListener("keyup", hoch);
      flaeche.removeEventListener("pointerdown", zDown);
      flaeche.removeEventListener("pointermove", zMove);
      flaeche.removeEventListener("pointerup", zUp);
      flaeche.removeEventListener("pointercancel", zUp);
    },
  };
}
