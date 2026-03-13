/* ============================================================
   Vercel Serverless Function – KI-Chat
   Leitet Anfragen an den Vercel AI Gateway weiter.
   Der API-Key bleibt serverseitig in der Umgebungsvariable.
   ============================================================ */

export default async function handler(req, res) {
  // Nur POST erlauben
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Methode nicht erlaubt" });
  }

  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Ungueltige Anfrage: 'messages' Array fehlt." });
  }

  const API_KEY = process.env.AI_GATEWAY_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: "AI Gateway Key nicht konfiguriert." });
  }

  // Systemkontext fuer den Chatbot
  const systemMessage = {
    role: "system",
    content:
      "Du bist ein hilfreicher Assistent fuer Berufsschueler der Klasse H-FI24-1B " +
      "an der SBSZ Hermsdorf. Beantworte Fragen rund um Schule, IT und Berufsausbildung. " +
      "Antworte immer auf Deutsch, freundlich und praezise.",
  };

  try {
    // Anfrage an Vercel AI Gateway (OpenAI-kompatible API)
    const response = await fetch("https://gateway.ai.vercel.app/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: "openai:gpt-4o-mini",
        messages: [systemMessage, ...messages],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway Fehler:", errorText);
      return res.status(502).json({ error: "AI Gateway antwortet nicht." });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content ?? "Keine Antwort erhalten.";

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Serverfehler:", err);
    return res.status(500).json({ error: "Interner Serverfehler." });
  }
}
