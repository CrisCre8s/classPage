// Gemeinsame Eingabe für Rasterspiele: Pfeiltasten/WASD, Wischen und Leertaste.
// Gibt eine Funktion zurück, die alle Listener wieder entfernt.

const TASTEN = {
  ArrowUp: "hoch", w: "hoch", W: "hoch",
  ArrowDown: "runter", s: "runter", S: "runter",
  ArrowLeft: "links", a: "links", A: "links",
  ArrowRight: "rechts", d: "rechts", D: "rechts",
};

export const RICHTUNG = {
  hoch: { x: 0, y: -1 },
  runter: { x: 0, y: 1 },
  links: { x: -1, y: 0 },
  rechts: { x: 1, y: 0 },
};

export function richtungsEingabe(canvas, { richtung, leertaste, tippen, kontinuierlich = true }) {
  const onKey = (e) => {
    if (TASTEN[e.key]) {
      e.preventDefault();
      richtung(TASTEN[e.key]);
    } else if (e.key === " ") {
      e.preventDefault();
      leertaste?.();
    }
  };
  let start = null;
  let gewischt = false;
  const onDown = (e) => {
    start = { x: e.clientX, y: e.clientY };
    gewischt = false;
  };
  const onMove = (e) => {
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.hypot(dx, dy) < 22) return;
    richtung(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "rechts" : "links") : dy > 0 ? "runter" : "hoch");
    gewischt = true;
    // bei „kontinuierlich“ (Snake) darf man im selben Wisch weiterlenken, sonst ein Zug pro Wisch (2048)
    start = kontinuierlich ? { x: e.clientX, y: e.clientY } : null;
  };
  const onUp = () => {
    if (start && !gewischt) tippen?.();
    start = null;
  };

  window.addEventListener("keydown", onKey);
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  return () => {
    window.removeEventListener("keydown", onKey);
    canvas.removeEventListener("pointerdown", onDown);
    canvas.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerup", onUp);
    canvas.removeEventListener("pointercancel", onUp);
  };
}

// Nachricht-Overlay anklicken → Aktion (Start, Weiter, Neues Spiel)
export function overlayKlick(fn) {
  const msg = document.getElementById("stage-msg");
  const h = (e) => {
    if (e.target.closest("button")) return;
    fn();
  };
  msg.addEventListener("click", h);
  return () => msg.removeEventListener("click", h);
}
