/**
 * Vercel Serverless Function \u2013 /api/chat
 * Leitet Chat-Nachrichten an das Vercel AI Gateway weiter.
 * Der API-Key wird aus der Umgebungsvariable AI_GATEWAY_KEY gelesen.
 */

const SYSTEM_PROMPT = 'Du bist ein hilfreicher Assistent fuer Berufsschueler der Klasse H-FI24-1B an der SBSZ Hermsdorf. Beantworte Fragen rund um Schule, IT und Berufsausbildung. Antworte immer auf Deutsch.';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Nur POST erlaubt' });
  }

  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Ungueltige Nachricht' });
  }

  const apiKey = process.env.AI_GATEWAY_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API-Key nicht konfiguriert' });
  }

  try {
    const response = await fetch('https://gateway.ai.vercel.app/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'openai:gpt-4o-mini',
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      console.error('AI Gateway Fehler:', await response.text());
      return res.status(502).json({ error: 'AI Gateway Fehler' });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'Keine Antwort erhalten.';
    return res.status(200).json({ reply });
  } catch (error) {
    console.error('Serverfehler:', error);
    return res.status(500).json({ error: 'Interner Serverfehler' });
  }
}