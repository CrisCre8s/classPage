// Titel als LED-Matrix: "H-FI24-1B" wird aus den echten 8×8-Bitmaps der Pixelschrift
// gezeichnet und beim Laden Zeile für Zeile in den „Framebuffer“ geschrieben.
// Darunter stehen die ASCII-Bytes des Namens. Fährt man über einen Buchstaben,
// leuchten er und sein Byte auf. Ab und zu kippt ein einzelnes Bit (Bit-Flip).

const TEXT = "H-FI24-1B";
const GELB = "#f5d97a";
const reduziert = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let canvas, ctx, hexEl, bits, zelle, punkt;
let sichtbareZeilen = 8;
let hoverChar = -1;
let flip = null;
let flipTimer = null;

function hex(ch) {
  return ch.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0");
}

// Bitmap aus der Schrift lesen: Press Start 2P ist auf ein 8×8-Raster gebaut
function leseBits() {
  const off = document.createElement("canvas");
  off.width = TEXT.length * 8;
  off.height = 8;
  const o = off.getContext("2d", { willReadFrequently: true });
  o.font = '8px "Press Start 2P"';
  o.textBaseline = "top";
  o.fillStyle = "#fff";
  [...TEXT].forEach((ch, i) => o.fillText(ch, i * 8, 0));
  const { data } = o.getImageData(0, 0, off.width, 8);

  const b = [];
  for (let y = 0; y < 8; y++) {
    b.push([]);
    for (let x = 0; x < off.width; x++) b[y].push(data[(y * off.width + x) * 4 + 3] > 110);
  }
  return b;
}

function groesse() {
  zelle = window.matchMedia("(max-width: 760px)").matches ? 3 : 4;
  punkt = zelle - 1; // 1px Lücke zwischen den LEDs
  const dpr = window.devicePixelRatio || 1;
  const w = TEXT.length * 8 * zelle;
  const h = 8 * zelle;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function zeichne() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < bits[0].length; x++) {
      const charIdx = x >> 3;
      let an = bits[y][x];
      const geflippt = flip && flip.x === x && flip.y === y;
      if (geflippt) an = !an;
      const geschrieben = y < sichtbareZeilen;

      if (an && geschrieben) {
        ctx.fillStyle = geflippt || charIdx === hoverChar ? GELB : "#ffffff";
      } else {
        ctx.fillStyle = "rgba(255, 255, 255, 0.06)"; // unbeleuchtete LED
      }
      ctx.fillRect(x * zelle, y * zelle, punkt, punkt);
    }
  }
  // Schreibstrahl: die gerade geschriebene Zeile
  if (sichtbareZeilen < 8) {
    ctx.fillStyle = "rgba(245, 217, 122, 0.35)";
    ctx.fillRect(0, sichtbareZeilen * zelle, canvas.width, punkt);
  }
}

function markiereByte(i, klasse, an) {
  hexEl?.querySelector(`[data-i="${i}"]`)?.classList.toggle(klasse, an);
}

// Zeile für Zeile in den Framebuffer schreiben
export function bootTitel() {
  if (!ctx) return;
  if (reduziert) {
    sichtbareZeilen = 8;
    zeichne();
    return;
  }
  sichtbareZeilen = 0;
  const start = performance.now();
  const schritt = (t) => {
    sichtbareZeilen = Math.min(8, Math.floor((t - start) / 55));
    zeichne();
    if (sichtbareZeilen < 8) requestAnimationFrame(schritt);
  };
  requestAnimationFrame(schritt);
}

function planeBitFlip() {
  clearTimeout(flipTimer);
  flipTimer = setTimeout(() => {
    if (!document.hidden && !document.body.classList.contains("power-off") && hoverChar < 0) {
      const x = Math.floor(Math.random() * bits[0].length);
      const y = Math.floor(Math.random() * 8);
      const i = x >> 3;
      flip = { x, y };
      markiereByte(i, "flip", true);
      zeichne();
      setTimeout(() => {
        flip = null;
        markiereByte(i, "flip", false);
        zeichne();
      }, 650);
    }
    planeBitFlip();
  }, 3500 + Math.random() * 4500);
}

function setzeHover(i) {
  if (i === hoverChar) return;
  if (hoverChar >= 0) markiereByte(hoverChar, "on", false);
  hoverChar = i;
  if (i >= 0) markiereByte(i, "on", true);
  zeichne();
}

export async function initTitel() {
  const h1 = document.querySelector(".title");
  canvas = document.getElementById("title-canvas");
  hexEl = document.getElementById("title-hex");
  if (!h1 || !canvas) return;

  // ASCII-Bytes unter dem Titel
  if (hexEl) hexEl.innerHTML = [...TEXT].map((ch, i) => `<span data-i="${i}" title="'${ch}'">${hex(ch)}</span>`).join("");

  try {
    await document.fonts.load('8px "Press Start 2P"');
  } catch {}
  if (!document.fonts.check('8px "Press Start 2P"')) return; // ohne Schrift bleibt der normale Text stehen

  ctx = canvas.getContext("2d");
  bits = leseBits();
  groesse();
  h1.classList.add("has-matrix");
  bootTitel();

  canvas.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    setzeHover(Math.min(TEXT.length - 1, Math.floor(((e.clientX - r.left) / r.width) * TEXT.length)));
  });
  canvas.addEventListener("pointerleave", () => setzeHover(-1));
  // Auf dem Handy gibt es kein „Wegfahren“: nach dem Antippen wieder lösen
  canvas.addEventListener("pointerup", (e) => {
    if (e.pointerType !== "mouse") setTimeout(() => setzeHover(-1), 1200);
  });
  hexEl?.addEventListener("pointerover", (e) => {
    const i = e.target.closest("[data-i]")?.dataset.i;
    if (i != null) setzeHover(Number(i));
  });
  hexEl?.addEventListener("pointerleave", () => setzeHover(-1));

  let t;
  window.addEventListener("resize", () => {
    clearTimeout(t);
    t = setTimeout(() => {
      groesse();
      zeichne();
    }, 150);
  });

  if (!reduziert) planeBitFlip();
}
