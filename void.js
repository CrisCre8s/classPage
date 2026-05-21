import {
  stars,
  STAR_COUNT,
  randomStar,
  animFrameId,
  setAnimFrameId,
  canvasActive,
  setVoidActive,
  setVoidSpeedMultiplier,
  draw,
} from "./canvas.js";

let voidActive = false;
let voidStarted = false;
let voidSpeedMultiplier = 1;

let voidBtn, voidTarget, voidUI;

function lockScroll() {
  document.body.classList.add("intro-lock");
}
function unlockScroll() {
  document.body.classList.remove("intro-lock");
}

function spawnExplosion() {
  stars.length = 0;
  for (let i = 0; i < STAR_COUNT; i++) {
    const angle = (i / STAR_COUNT) * Math.PI * 2;
    stars.push({
      angle,
      dist: 5,
      speed: 0.6 + Math.random() * 5,
      size: 0,
      brightness: Math.random(),
      scale: 0.5 + Math.random() * 3,
      hue: Math.floor(Math.random() * 360),
    });
  }
}

function enterVoid() {
  voidActive = true;
  voidStarted = false;
  voidSpeedMultiplier = 0;
  stars.length = 0;
  setVoidActive(true);
  setVoidSpeedMultiplier(0);

  voidTarget.style.transition = "opacity 0.6s ease";
  voidTarget.style.opacity = "0";
  voidTarget.style.pointerEvents = "none";
  lockScroll();
  voidUI.style.display = "flex";

  if (!animFrameId) {
    setAnimFrameId(requestAnimationFrame(draw));
  }

  setTimeout(() => document.body.focus(), 100);

  if (document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen().catch(() => {});
  }
}

function exitVoid() {
  voidActive = false;
  voidStarted = false;
  voidSpeedMultiplier = 1;
  setVoidActive(false);
  setVoidSpeedMultiplier(1);

  voidTarget.style.transition = "opacity 0.6s ease";
  voidTarget.style.opacity = "1";
  voidTarget.style.pointerEvents = "";
  unlockScroll();
  voidUI.style.display = "none";

  stars.length = 0;
  for (let i = 0; i < STAR_COUNT; i++) stars.push(randomStar());

  if (!canvasActive) {
    cancelAnimationFrame(animFrameId);
    setAnimFrameId(null);
    document.getElementById("bg-canvas").style.opacity = "0";
  }

  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
}

export function initVoid() {
  voidBtn = document.getElementById("void-btn");
  voidTarget = document.querySelector(".border-around");
  voidUI = document.getElementById("void-ui");

  if (voidBtn) voidBtn.addEventListener("click", enterVoid);

  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement && voidActive) exitVoid();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && voidActive) {
      exitVoid();
      return;
    }
    if (!voidActive) return;

    if (e.key === "Enter") {
      if (!voidStarted) {
        voidStarted = true;
        voidSpeedMultiplier = 1;
        setVoidSpeedMultiplier(1);
        voidUI.style.display = "none";
        spawnExplosion();
        return;
      }
      voidSpeedMultiplier = 1;
      setVoidSpeedMultiplier(1);
      spawnExplosion();
      return;
    }

    if (!voidStarted) return;

    if (e.key === "ArrowUp") {
      voidSpeedMultiplier = Math.min(voidSpeedMultiplier + 0.3, 6);
      setVoidSpeedMultiplier(voidSpeedMultiplier);
    }
    if (e.key === "ArrowDown") {
      voidSpeedMultiplier = Math.max(voidSpeedMultiplier - 0.3, 0.1);
      setVoidSpeedMultiplier(voidSpeedMultiplier);
    }
  });
}
