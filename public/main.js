/* ============================================================
   Klassen-Hub – Hauptskript
   ============================================================ */

// ---- Link-Daten (einfach erweiterbar) ----
const links = [
  {
    title: "Stundenplan",
    url: "https://sbsz-hsp.com/davinci-timetable.html?account=private",
    desc: "Aktueller Stunden- und Vertretungsplan",
    emoji: "📅",
  },
  {
    title: "Klassenbuch & Noten",
    url: "https://sbsz-hsp.com/hip/default.php?err=user&user=H-FI24-1B",
    desc: "Klassenbuch, Noten und Fehlzeiten einsehen",
    emoji: "📓",
  },
  {
    title: "Schulwebseite",
    url: "https://sbsz-hsp.com/",
    desc: "Offizielle Webseite des SBSZ Hermsdorf",
    emoji: "🏫",
  },
  // Weitere Links hier ergaenzen:
  // { title: "...", url: "...", desc: "...", emoji: "..." },
];

// ---- Link-Karten rendern ----
function renderLinks() {
  const grid = document.getElementById("link-grid");
  grid.innerHTML = links
    .map(
      (l) => `
    <a href="${l.url}" target="_blank" rel="noopener noreferrer" class="link-card">
      <span class="emoji">${l.emoji}</span>
      <span class="title">${l.title}</span>
      <span class="desc">${l.desc}</span>
    </a>`
    )
    .join("");
}

document.addEventListener("DOMContentLoaded", renderLinks);

// ============================================================
// Chatbot
// ============================================================

const chatFab = document.getElementById("chat-fab");
const chatWindow = document.getElementById("chat-window");
const chatClose = document.getElementById("chat-close");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatMessages = document.getElementById("chat-messages");

// Chat-Verlauf (wird an die API gesendet)
let conversationHistory = [];

// Fenster oeffnen / schliessen
chatFab.addEventListener("click", () => {
  chatWindow.classList.toggle("hidden");
  if (!chatWindow.classList.contains("hidden")) {
    chatInput.focus();
  }
});

chatClose.addEventListener("click", () => {
  chatWindow.classList.add("hidden");
});

// Nachricht senden
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;

  // Nutzernachricht anzeigen
  addBubble(text, "user");
  chatInput.value = "";

  // Verlauf aktualisieren
  conversationHistory.push({ role: "user", content: text });

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: conversationHistory }),
    });

    if (!res.ok) throw new Error("Serverfehler");

    const data = await res.json();
    const reply = data.reply || "Entschuldigung, ich konnte keine Antwort generieren.";

    // Assistenten-Antwort anzeigen
    addBubble(reply, "assistant");
    conversationHistory.push({ role: "assistant", content: reply });
  } catch (err) {
    addBubble("⚠️ Verbindungsfehler. Bitte spaeter erneut versuchen.", "assistant");
    console.error(err);
  }
});

// Chat-Blase hinzufuegen
function addBubble(text, role) {
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${role}`;
  bubble.textContent = text;
  chatMessages.appendChild(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}
