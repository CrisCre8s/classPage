document.addEventListener("DOMContentLoaded", () => {
  // ===== Canvas Setup =====
  const canvas = document.getElementById("bg-canvas");
  if (!canvas) return;
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
      ctx.fillStyle = `rgba(200, 162, 255, ${alpha})`;
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

  // ===== Intro Page =====
  const sectionHero = document.querySelector(".section-hero");
  const allSections = document.querySelectorAll("section");
  const borderAround = document.querySelector(".border-around");

  // Die PC-Section ist die zweite Section (Index 1)
  const pcSection = allSections[1];
  const scrElement = pcSection.querySelector(".scr");
  const scrImg = pcSection.querySelector(".scr-img");

  if (!scrElement || !borderAround) return;

  borderAround.classList.add("intro-mode");

  // Alle Sections ab Index 2 verstecken (Hubs)
  allSections.forEach((sec, i) => {
    if (i >= 2) {
      sec.classList.add("hidden");
      sec.style.transition = "opacity 0.6s ease";
    }
  });

  // ===== Hubs-Einblend-Animation (Klick auf Bildschirm) =====
  scrElement.addEventListener("click", (e) => {
    e.preventDefault();

    // Intro (Hero-Text + PC) ausblenden
    sectionHero.style.transition = "opacity 0.6s ease";
    sectionHero.style.opacity = "0";
    pcSection.style.transition = "opacity 0.6s ease";
    pcSection.style.opacity = "0";

    setTimeout(() => {
      sectionHero.style.display = "none";
      pcSection.style.display = "none";
      borderAround.classList.remove("intro-mode");

      // Alle animierbaren Elemente sammeln
      const items = [];

      // Einzelne Link-Cards aus dem Grid
      document.querySelectorAll(".link-grid .link-card").forEach((card) => {
        items.push(card);
      });

      // Berichtsheft, Globus, Zurueck-Button als ganze Sections
      document
        .querySelectorAll(
          ".berichte-section, .globus-hub-section, .back-section",
        )
        .forEach((sec) => {
          items.push(sec);
        });

      // Alle Sections einblenden (Container sichtbar machen)
      allSections.forEach((sec, i) => {
        if (i >= 2) {
          sec.classList.remove("hidden");
          sec.style.opacity = "1";
        }
      });

      // Einzelne Items verstecken und nacheinander einblenden
      items.forEach((item, index) => {
        item.style.opacity = "0";
        item.style.transform = "translateY(-20px)";
        item.style.transition = "opacity 0.5s ease, transform 0.5s ease";

        setTimeout(
          () => {
            item.style.opacity = "1";
            item.style.transform = "translateY(0)";
          },
          100 + index * 350,
        );
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

  // ===== Zurueck-Button =====
  const backBtn = document.getElementById("back-btn");

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      const items = [];
      document
        .querySelectorAll(".link-grid .link-card")
        .forEach((card) => items.push(card));
      document
        .querySelectorAll(
          ".berichte-section, .globus-hub-section, .back-section",
        )
        .forEach((sec) => items.push(sec));

      // Reihenfolge umkehren (bottom-to-top)
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
        // Sections verstecken
        allSections.forEach((sec, i) => {
          if (i >= 2) {
            sec.classList.add("hidden");
          }
        });

        // Inline-Styles zuruecksetzen
        items.forEach((item) => {
          item.style.removeProperty("opacity");
          item.style.removeProperty("transform");
          item.style.removeProperty("transition");
        });

        // Intro wieder einblenden
        sectionHero.style.display = "";
        sectionHero.style.opacity = "0";
        pcSection.style.display = "";
        pcSection.style.opacity = "0";
        borderAround.classList.add("intro-mode");

        // Pulse-Animation auf dem Schulbild neu starten
        if (scrImg) {
          scrImg.style.animation = "none";
          void scrImg.offsetWidth;
          scrImg.style.removeProperty("animation");
        }

        // Fade-In des Intros
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
