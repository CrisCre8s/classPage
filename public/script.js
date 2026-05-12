document.addEventListener("DOMContentLoaded", () => {
  // ===== Canvas Setup =====
  const canvas = document.getElementById("bg-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d", { alpha: false });
  canvas.style.willChange = "transform";
  canvas.style.pointerEvents = "none";

  let W = (canvas.width = window.innerWidth);
  let H = (canvas.height = window.innerHeight);
  let CX = W / 2;
  let CY = H / 2;

  const STAR_COUNT = 180;

  function randomStar() {
    const angle = Math.random() * Math.PI * 2;
    return {
      angle,
      dist: 20 + Math.random() * 80,
      speed: 0.6 + Math.random() * 5,
      size: 0,
      brightness: Math.random(),
    };
  }

  const stars = Array.from({ length: STAR_COUNT }, randomStar);

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

  const FRAME_MS = 1000 / 240;
  let lastTime = 0;

  function draw(ts) {
    requestAnimationFrame(draw);
    if (ts - lastTime < FRAME_MS) return;
    lastTime = ts;

    ctx.fillStyle = "rgba(10, 10, 10, 0.25)";
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      s.dist += s.speed;
      s.size = s.dist * 0.012;

      const x = CX + Math.cos(s.angle) * s.dist;
      const y = CY + Math.sin(s.angle) * s.dist;

      if (x < 0 || x > W || y < 0 || y > H) {
        Object.assign(stars[i], randomStar());
        continue;
      }

      const alpha = Math.min(s.dist / 120, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#c8a2ff";

      const sz = Math.max(s.size, 0.5);
      ctx.fillRect(x | 0, y | 0, sz, sz);
    }

    ctx.globalAlpha = 1;
  }

  requestAnimationFrame(draw);

  // ===== Hilfsfunktionen Scroll-Lock =====
  function lockScroll() {
    document.body.classList.add("intro-lock");
    if (backgroundEl) backgroundEl.classList.add("intro-active");
  }

  function unlockScroll() {
    document.body.classList.remove("intro-lock");
    if (backgroundEl) backgroundEl.classList.remove("intro-active");
  }

  // ===== Intro Page =====
  const sectionHero = document.querySelector(".section-hero");
  const allSections = document.querySelectorAll("section");
  const borderAround = document.querySelector(".border-around");
  const backgroundEl = document.querySelector(".background");

  const pcSection = allSections[1];
  const scrElement = pcSection.querySelector(".scr");
  const scrImg = pcSection.querySelector(".scr-img");

  if (!scrElement || !borderAround) return;

  borderAround.classList.add("intro-mode");
  lockScroll();

  allSections.forEach((sec, i) => {
    if (i >= 2) {
      sec.classList.add("hidden");
      sec.style.transition = "opacity 0.6s ease";
    }
  });

  // ===== Klick auf Bildschirm =====
  function triggerIntroClick() {
    sectionHero.style.transition = "opacity 0.6s ease";
    sectionHero.style.opacity = "0";
    pcSection.style.transition = "opacity 0.6s ease";
    pcSection.style.opacity = "0";

    setTimeout(() => {
      sectionHero.style.display = "none";
      pcSection.style.display = "none";
      borderAround.classList.remove("intro-mode");
      unlockScroll();

      const items = [];
      document
        .querySelectorAll(".link-grid .link-card")
        .forEach((c) => items.push(c));
      document
        .querySelectorAll(
          ".lk-section, .berichte-section, .globus-hub-section, .back-section",
        )
        .forEach((s) => items.push(s));

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

  scrElement.addEventListener("click", (e) => {
    e.preventDefault();
    triggerIntroClick();
  });

  const bdgElement = pcSection.querySelector(".bdg");
  if (bdgElement) {
    bdgElement.style.cursor = "pointer";
    bdgElement.addEventListener("click", triggerIntroClick);
  }

  // ===== Berichtsheft =====
  const berichte = [
    { titel: "KW07_26", datei: "/berichte/SchoolBH_KW07_26.pdf", typ: "pdf" },
    { titel: "KW06_26", datei: "/berichte/SchoolBH_KW06_26.pdf", typ: "pdf" },
  ];

  const grid = document.getElementById("berichte-grid");

  berichte.forEach((bericht) => {
    const card = document.createElement("a");
    card.href = bericht.datei;
    card.target = "_blank";
    card.rel = "noopener";
    card.classList.add("bericht-card");

    const icon = bericht.typ === "pdf" ? "document-outline" : "image-outline";

    card.innerHTML = `
      <ion-icon name="${icon}"></ion-icon>
      <span class="bericht-titel">${bericht.titel}</span>
      <span class="bericht-typ">${bericht.typ.toUpperCase()}</span>
    `;

    grid.appendChild(card);
  });

  // ===== Zurück-Button =====
  const backBtn = document.getElementById("back-btn");

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      const items = [];
      document
        .querySelectorAll(".link-grid .link-card")
        .forEach((card) => items.push(card));
      document
        .querySelectorAll(
          ".lk-section, .berichte-section, .globus-hub-section, .back-section",
        )
        .forEach((sec) => items.push(sec));

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

        if (scrImg) {
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
});
