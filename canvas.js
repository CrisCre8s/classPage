export const STAR_COUNT = 180;
export const stars = [];

export let canvasActive = false;
export let canvasFadeOut = false;
export let canvasFadeAlpha = 1;
export let canvasBoostMultiplier = 1;
export let animFrameId = null;
export let voidSpeedMultiplier = 1;

export function setCanvasActive(v) {
  canvasActive = v;
}
export function setCanvasFadeOut(v) {
  canvasFadeOut = v;
}
export function setCanvasFadeAlpha(v) {
  canvasFadeAlpha = v;
}
export function setCanvasBoostMultiplier(v) {
  canvasBoostMultiplier = v;
}
export function setAnimFrameId(v) {
  animFrameId = v;
}
export function setVoidSpeedMultiplier(v) {
  voidSpeedMultiplier = v;
}

let canvas, ctx, W, H, CX, CY;
let voidActive = false;
export function setVoidActive(v) {
  voidActive = v;
}
export function isVoidActive() {
  return voidActive;
}

export function randomStar() {
  const angle = Math.random() * Math.PI * 2;
  return {
    angle,
    dist: 20 + Math.random() * 80,
    speed: 0.6 + Math.random() * 5,
    size: 0,
    brightness: Math.random(),
    scale: 0.5 + Math.random() * 3,
    hue: Math.floor(Math.random() * 360),
  };
}

const FRAME_MS = 1000 / 240;
let lastTime = 0;

export function draw(ts) {
  if (!canvasActive && !voidActive && !canvasFadeOut) return;
  animFrameId = requestAnimationFrame(draw);
  if (ts - lastTime < FRAME_MS) return;
  lastTime = ts;

  if (canvasFadeOut) {
    canvasFadeAlpha -= 0.018;
    if (canvasFadeAlpha <= 0) {
      canvasFadeOut = false;
      canvasActive = false;
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
      ctx.clearRect(0, 0, W, H);
      canvas.style.opacity = "0";
      return;
    }
    canvas.style.opacity = canvasFadeAlpha;
  }

  ctx.fillStyle = "rgba(10, 10, 10, 0.25)";
  ctx.fillRect(0, 0, W, H);

  const speedMult = voidActive ? voidSpeedMultiplier : canvasBoostMultiplier;

  for (let i = 0; i < stars.length; i++) {
    const s = stars[i];
    s.dist += s.speed * speedMult;
    s.size = s.dist * 0.012;

    const x = CX + Math.cos(s.angle) * s.dist;
    const y = CY + Math.sin(s.angle) * s.dist;

    if (x < 0 || x > W || y < 0 || y > H) {
      Object.assign(stars[i], randomStar());
      continue;
    }

    const alpha = Math.min(s.dist / 120, 1);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = voidActive ? `hsl(${s.hue}, 100%, 70%)` : "#c8a2ff";

    const sz = Math.max(s.size * (voidActive ? s.scale : 1), 0.5);
    ctx.fillRect(x | 0, y | 0, sz, sz);
  }

  ctx.globalAlpha = 1;
}

export function startCanvas() {
  if (canvasActive) return;
  canvasActive = true;
  canvasFadeOut = false;
  canvasFadeAlpha = 1;

  stars.length = 0;
  for (let i = 0; i < STAR_COUNT; i++) {
    const angle = (i / STAR_COUNT) * Math.PI * 2;
    stars.push({
      angle,
      dist: 1.4,
      speed: 3 + Math.random() * 2,
      size: 0,
      brightness: Math.random(),
      scale: 0.5 + Math.random() * 3,
      hue: Math.floor(Math.random() * 360),
    });
  }

  canvas.style.transition = "opacity 0.2s ease";
  canvas.style.opacity = "1";

  canvasBoostMultiplier = 3;

  setTimeout(() => {
    let step = 0;
    const steps = 30;
    const interval = setInterval(() => {
      step++;
      canvasBoostMultiplier = 3 - (2 * step) / steps;
      if (step >= steps) {
        canvasBoostMultiplier = 1;
        clearInterval(interval);
      }
    }, 25);
  }, 200);

  animFrameId = requestAnimationFrame(draw);
}

export function stopCanvas() {
  canvasFadeOut = true;
  canvasFadeAlpha = 1;
  canvas.style.transition = "none";
  if (!animFrameId) {
    animFrameId = requestAnimationFrame(draw);
  }
}

export function initCanvas() {
  canvas = document.getElementById("bg-canvas");
  if (!canvas) return false;

  ctx = canvas.getContext("2d", { alpha: false });
  canvas.style.willChange = "transform";
  canvas.style.pointerEvents = "none";
  canvas.style.opacity = "0";
  canvas.style.transition = "opacity 0.6s ease";

  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
  CX = W / 2;
  CY = H / 2;

  for (let i = 0; i < STAR_COUNT; i++) stars.push(randomStar());

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
      CX = W / 2;
      CY = H / 2;
    }, 200);
  });

  return true;
}
