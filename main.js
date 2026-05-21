import { initCanvas } from "./canvas.js";
import {
  initMonitor,
  togglePower,
  getScrElement,
  getMonitorOn,
} from "./monitor.js";
import { initVoid } from "./void.js";
import { initBerichte } from "./berichte.js";
import { initIntro, triggerIntroClick } from "./intro.js";

document.addEventListener("DOMContentLoaded", () => {
  if (!initCanvas()) return;

  const allSections = document.querySelectorAll("section");
  const pcSection = allSections[1];

  initMonitor(pcSection);
  initVoid();
  initBerichte();
  initIntro(pcSection);

  // Power-Buttons
  const pBtn = pcSection.querySelector(".pbtn");
  if (pBtn) pBtn.addEventListener("click", togglePower);

  const bdgElement = pcSection.querySelector(".bdg");
  if (bdgElement) bdgElement.addEventListener("click", togglePower);

  // Klick auf Bildschirm
  const scrElement = getScrElement();
  if (scrElement) {
    scrElement.addEventListener("click", (e) => {
      e.preventDefault();
      if (!getMonitorOn()) return;
      triggerIntroClick();
    });
  }
});
