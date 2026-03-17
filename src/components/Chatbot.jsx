import { useState, useRef, useEffect } from 'react';

/**
 * Chatbot \u2013 Schwebendes Chat-Widget (unten rechts).
 * Kommuniziert mit /api/chat (Vercel Serverless Function),
 * damit der API-Key nicht im Frontend sichtbar ist.
 */
export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Hallo! Wie kann ich dir helfen?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  // Automatisch ans Ende scrollen bei neuen Nachrichten
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  /** Nachricht an die API senden und Antwort anhaengen */
  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const updated = [...messages, { role: 'user', text }];
    setMessages(updated);
    setInput('');
    setLoading(true);

    try {
      // Chat-Verlauf fuer die API vorbereiten
      const history = updated.map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok) throw new Error('API-Fehler');
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: 'bot', text: data.reply || 'Keine Antwort erhalten.' },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'bot', text: 'Fehler bei der Verbindung zum Assistenten.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  /** Enter-Taste zum Senden */
  const onKey = (e) => { if (e.key === 'Enter') send(); };

  return (
    <>
      {/* Schwebender Chatbot-Button */}
      <button className="chat-fab" onClick={() => setOpen((v) => !v)} aria-label="Chat oeffnen">
        <ion-icon name={open ? 'close-outline' : 'chatbubbles-outline'}></ion-icon>
      </button>

      {/* Chat-Overlay */}
      {open && (
        <div className="chat-overlay">
          <div className="chat-header">
            <span>Klassen-Assistent</span>
            <button onClick={() => setOpen(false)} aria-label="Chat schliessen">\u2715</button>
          </div>
          <div className="chat-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-bubble ${msg.role}`}>{msg.text}</div>
            ))}
            {loading && <div className="chat-bubble bot loading">Denkt nach ...</div>}
            <div ref={endRef} />
          </div>
          <div className="chat-input-row">
            <input
              type="text"
              placeholder="Nachricht eingeben ..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
            />
            <button onClick={send} aria-label="Senden">
              <ion-icon name="send-outline"></ion-icon>
            </button>
          </div>
        </div>
      )}
    </>
  );
}