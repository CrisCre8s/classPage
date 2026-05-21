import { monitorOn, getScrImg, togglePower } from "./monitor.js";
import { stopCanvas } from "./canvas.js";

let sectionHero, allSections, borderAround, backgroundEl, pcSection;

export function lockScroll() {
  document.body.classList.add("intro-lock");
  if (backgroundEl) backgroundEl.classList.add("intro-active");
}

export function unlockScroll() {
  document.body.classList.remove("intro-lock");
  if (backgroundEl) backgroundEl.classList.remove("intro-active");
}

function getHubItems() {
  const items = [];
  document
    .querySelectorAll(".link-grid .link-card")
    .forEach((c) => items.push(c));
  document
    .querySelectorAll(
      ".lk-section, .berichte-section, .globus-hub-section, .void-section, .back-section",
    )
    .forEach((s) => items.push(s));
  return items;
}

export function triggerIntroClick() {
  sectionHero.style.transition = "opacity 0.6s ease";
  sectionHero.style.opacity = "0";
  pcSection.style.transition = "opacity 0.6s ease";
  pcSection.style.opacity = "0";

  setTimeout(() => {
    sectionHero.style.display = "none";
    pcSection.style.display = "none";
    borderAround.classList.remove("intro-mode");
    unlockScroll();

    const items = getHubItems();

    allSections.forEach((sec, i) => {
      if (i >= 2) {
        sec.classList.remove("hidden");
        sec.style.opacity = "1";
      }
    });

    items.forEach((item, index) => {
      item.style.opacity = "0";
      item.style.transform = "translateY(-20px)";
      item.style.transition = "opacity 0.5s ease, transform 0.5s ease";
      setTimeout(
        () => {
          item.style.opacity = "1";
          item.style.transform = "translateY(0)";
        },
        100 + index * 200,
      );
    });
  }, 600);
}

export function initIntro(pc) {
  sectionHero = document.querySelector(".section-hero");
  allSections = document.querySelectorAll("section");
  borderAround = document.querySelector(".border-around");
  backgroundEl = document.querySelector(".background");
  pcSection = pc;

  borderAround.classList.add("intro-mode");
  lockScroll();

  allSections.forEach((sec, i) => {
    if (i >= 2) {
      sec.classList.add("hidden");
      sec.style.transition = "opacity 0.6s ease";
    }
  });

  const backBtn = document.getElementById("back-btn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      const items = getHubItems();
      const reversed = [...items].reverse();

      reversed.forEach((item, index) => {
        item.style.transition = "opacity 0.5s ease, transform 0.5s ease";
        setTimeout(() => {
          item.style.opacity = "0";
          item.style.transform = "translateY(-20px)";
        }, index * 150);
      });

      const totalDelay = reversed.length * 150 + 500;

      setTimeout(() => {
        allSections.forEach((sec, i) => {
          if (i >= 2) sec.classList.add("hidden");
        });

        items.forEach((item) => {
          item.style.removeProperty("opacity");
          item.style.removeProperty("transform");
          item.style.removeProperty("transition");
        });

        sectionHero.style.display = "";
        sectionHero.style.opacity = "0";
        pcSection.style.display = "";
        pcSection.style.opacity = "0";
        borderAround.classList.add("intro-mode");
        lockScroll();

        const scrImg = getScrImg();
        if (monitorOn && scrImg) {
          scrImg.style.animation = "none";
          void scrImg.offsetWidth;
          scrImg.style.removeProperty("animation");
        }

        setTimeout(() => {
          sectionHero.style.transition = "opacity 0.6s ease";
          sectionHero.style.opacity = "1";
          pcSection.style.transition = "opacity 0.6s ease";
          pcSection.style.opacity = "1";
        }, 20);
      }, totalDelay);
    });
  }
}
