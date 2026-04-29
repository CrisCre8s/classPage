document.addEventListener("DOMContentLoaded", () => {
  // ===== Canvas Setup =====
  const canvas = document.getElementById("bg-canvas");
  if (!canvas) return; // Sicherheitscheck
  const ctx = canvas.getContext("2d");

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const stars = Array.from({ length: 150 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: Math.random() < 0.8 ? 1 : 2,
    speed: 0.5 + Math.random() * 2,
    brightness: Math.random(),
  }));

  window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    stars.forEach((star) => {
      star.x = Math.random() * canvas.width;
      star.y = Math.random() * canvas.height;
    });
  });

  function draw() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    stars.forEach((star) => {
      star.x -= star.speed;
      if (star.x < 0) {
        star.x = canvas.width;
        star.y = Math.random() * canvas.height;
      }
      star.brightness += 0.02;
      const alpha = 0.5 + Math.abs(Math.sin(star.brightness)) * 0.5;
      ctx.fillStyle = `rgba(255, 179, 0, ${alpha})`;
      ctx.fillRect(
        Math.floor(star.x),
        Math.floor(star.y),
        star.size,
        star.size,
      );
    });

    requestAnimationFrame(draw);
  }

  draw();

  // ===== Intro Logic =====
  const sectionHero = document.querySelector(".section-hero");
  const heroWrapper = document.querySelector(".hero-wrapper");
  const heroImg = document.querySelector(".hero-img");
  const allSections = document.querySelectorAll("section");
  const borderAround = document.querySelector(".border-around");

  if (!heroImg || !borderAround) return; // Sicherheitscheck

  borderAround.classList.add("intro-mode");

  allSections.forEach((sec, i) => {
    if (i >= 2) {
      sec.classList.add("hidden");
      sec.style.transition = "opacity 0.6s ease";
    }
  });

  heroImg.addEventListener("click", () => {
    heroImg.style.animation = "none";
    sectionHero.style.transition = "opacity 0.6s ease";
    sectionHero.style.opacity = "0";
    heroWrapper.style.transition = "opacity 0.6s ease";
    heroWrapper.style.opacity = "0";

    setTimeout(() => {
      sectionHero.style.display = "none";
      heroWrapper.style.display = "none";
      borderAround.classList.remove("intro-mode");

      allSections.forEach((sec, i) => {
        if (i >= 2) {
          sec.classList.remove("hidden");
          setTimeout(() => {
            sec.style.opacity = "1";
          }, 20);
        }
      });
    }, 600);
  });

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
      // Alle Sections ausblenden
      allSections.forEach((sec, i) => {
        if (i >= 2) {
          sec.style.transition = "opacity 0.6s ease";
          sec.style.opacity = "0";

          setTimeout(() => {
            sec.classList.add("hidden");
          }, 600);
        }
      });

      setTimeout(() => {
        // Hero + Bild wieder einblenden
        sectionHero.style.display = "";
        sectionHero.style.opacity = "0";
        heroWrapper.style.display = "";
        heroWrapper.style.opacity = "0";
        borderAround.classList.add("intro-mode");

        heroImg.style.removeProperty("animation");

        setTimeout(() => {
          sectionHero.style.transition = "opacity 0.6s ease";
          sectionHero.style.opacity = "1";
          heroWrapper.style.transition = "opacity 0.6s ease";
          heroWrapper.style.opacity = "1";
        }, 20);
      }, 600);
    });
  }
});
