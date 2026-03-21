// Feedback Form
document.getElementById("feedback-form").addEventListener("submit", (e) => {
  e.preventDefault();
  alert(
    "Sorry, dieses Feature ist noch in Arbeit! Aber deine Rückmeldung ist uns wichtig. Bitte melde dich bei Christian direkt!",
  );
});

// Chatbot toggle
const fab = document.getElementById("chat-fab");
const overlay = document.getElementById("chat-overlay");
const closeBtn = document.getElementById("chat-close");
const sendBtn = document.getElementById("chat-send");
const input = document.getElementById("chat-input");
const messages = document.getElementById("chat-messages");

fab.addEventListener("click", () => {
  overlay.style.display = overlay.style.display === "none" ? "flex" : "none";
});

closeBtn.addEventListener("click", () => {
  overlay.style.display = "none";
});

async function sendMessage() {
  const text = input.value.trim();
  if (!text) return;

  // User bubble
  messages.innerHTML += `<div class="chat-bubble user">${text}</div>`;
  input.value = "";
  messages.scrollTop = messages.scrollHeight;

  // Loading bubble
  const loading = document.createElement("div");
  loading.className = "chat-bubble bot loading";
  loading.textContent = "...";
  messages.appendChild(loading);
  messages.scrollTop = messages.scrollHeight;

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
    const data = await res.json();
    loading.classList.remove("loading");
    loading.textContent = data.reply ?? "Keine Antwort erhalten.";
  } catch {
    loading.classList.remove("loading");
    loading.textContent = "Fehler beim Abrufen der Antwort.";
  }

  messages.scrollTop = messages.scrollHeight;
}

sendBtn.addEventListener("click", sendMessage);
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});
