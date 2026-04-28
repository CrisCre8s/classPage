// ===== Canvas Setup =====
const canvas = document.getElementById("bg-canvas");
const ctx = canvas.getContext("2d"); // ✅ ctx definieren!

// ✅ Größe setzen BEVOR Sterne erstellt werden
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

// ===== Sternfeld =====
const stars = Array.from({ length: 150 }, () => ({
  x: Math.random() * canvas.width, // ✅ jetzt > 0
  y: Math.random() * canvas.height,
  size: Math.random() < 0.8 ? 1 : 2,
  speed: 0.5 + Math.random() * 2,
  brightness: Math.random(),
}));

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
    ctx.fillRect(Math.floor(star.x), Math.floor(star.y), star.size, star.size);
  });

  requestAnimationFrame(draw);
}

draw(); // ✅ Animation starten!

// ===== Intro Logic =====
const sectionHero = document.querySelector(".section-hero");
const heroWrapper = document.querySelector(".hero-wrapper");
const heroImg = document.querySelector(".hero-img");
const allSections = document.querySelectorAll("section");
const borderAround = document.querySelector(".border-around");

borderAround.classList.add("intro-mode");

allSections.forEach((sec, i) => {
  if (i >= 2) {
    sec.style.display = "none";
    sec.style.opacity = "0";
    sec.style.transition = "opacity 0.6s ease";
    sec.style.pointerEvents = "none";
  }
});

heroImg.style.cursor = "pointer";
heroImg.title = "Klicke hier, um zum Hub zu kommen!";
heroImg.style.animation = "pulse 2.5s infinite";

const style = document.createElement("style");
style.textContent = `
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.3; }
  }
`;
document.head.appendChild(style);

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
        sec.style.display = "block";
        sec.style.pointerEvents = "auto";
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
