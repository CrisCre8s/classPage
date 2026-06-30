import { startCanvas, stopCanvas } from "./canvas.js";

export function getMonitorOn() {
  return monitorOn;
}

export let monitorOn = false;
let isProcessing = false; // ← NEUE Variable zur Kontrolle

let pcSection, scrElement, scrImg;

export function initMonitor(pc) {
  pcSection = pc;
  scrElement = pc.querySelector(".scr");
  scrImg = pc.querySelector(".scr-img");
}

export function getScrElement() {
  return scrElement;
}
export function getScrImg() {
  return scrImg;
}

function powerOn() {
  monitorOn = true;

  const led = pcSection.querySelector(".led");
  if (led) led.classList.add("led-on");

  scrElement.classList.add("scr-poweron", "scr-on");
  setTimeout(() => scrElement.classList.remove("scr-poweron"), 600);

  startCanvas();
}

function powerOff() {
  monitorOn = false;

  const led = pcSection.querySelector(".led");
  if (led) led.classList.remove("led-on");

  scrElement.classList.add("scr-poweroff");
  setTimeout(() => {
    scrElement.classList.remove("scr-on", "scr-poweroff");
    if (scrImg) {
      scrImg.style.animation = "none";
      void scrImg.offsetWidth;
      scrImg.style.removeProperty("animation");
    }
  }, 400);

  stopCanvas();
}

export function togglePower() {
  // ← NEUE Schutzmaßnahme
  if (isProcessing) return; // Verhindert mehrfache Klicks

  isProcessing = true;

  if (monitorOn) {
    powerOff();
  } else {
    powerOn();
  }

  // Nach der längsten Animation wieder freigeben (600ms für powerOn)
  setTimeout(() => {
    isProcessing = false;
  }, 600);
}

export function resetMonitorState() {
  // Zustand beibehalten — wird von intro.js beim Zurück-Button genutzt
}
