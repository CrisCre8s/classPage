import LinkGrid from "./components/LinkGrid.jsx";
import Chatbot from "./components/Chatbot.jsx";

/** App – Hauptkomponente des Klassen-Hubs */
export default function App() {
  return (
    <div className="app">
      {/* Hero image for relatability */}
      <div
        className="hero-image"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          marginTop: "2rem",
          marginBottom: "2rem",
        }}
      >
        <img
          src="https://sbsz-hsp.de/images/hdf2.jpg"
          alt="SBSZ Hermsdorf"
          style={{
            borderRadius: "16px",
            boxShadow: "0 4px 24px rgba(79,140,255,0.08)",
            maxWidth: "100%",
            height: "auto",
            display: "block",
          }}
        />
      </div>
      <header className="header">
        <h1>H-FI24-1B – Klassen-Hub</h1>
        <p>Dein zentraler Anlaufpunkt für alle wichtigen Schullinks</p>
      </header>
      <LinkGrid />
      <Chatbot />
      {/* Customer-friendly feedback form at the end */}
      <section
        className="feedback-section"
        style={{
          padding: "1.5rem",
          background: "linear-gradient(120deg, #232323 0%, #181818 100%)",
          borderRadius: "16px",
          boxShadow: "0 2px 12px rgba(255,179,0,0.06)",
          border: "1px solid #ffb30033",
          width: "80%",
          margin: "2rem auto",
        }}
      >
        <h2
          style={{
            color: "#ffb300",
            fontSize: "1.2rem",
            marginBottom: "0.7rem",
            textShadow: "0 2px 8px #ff980033",
          }}
        >
          Feedback & Wünsche
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            alert(
              "Dein Feedback wurde in den Papierkorb verschoben. Danke! 🗑️",
            );
          }}
        >
          <label
            htmlFor="feedback"
            style={{
              display: "block",
              marginBottom: "0.5rem",
              color: "#ffd580",
            }}
          >
            Was können wir verbessern?
          </label>
          <textarea
            id="feedback"
            name="feedback"
            rows={3}
            style={{
              width: "100%",
              borderRadius: "8px",
              border: "1px solid #ffb300",
              padding: "0.7rem",
              marginBottom: "1rem",
              resize: "vertical",
              background: "#181818",
              color: "#ffd580",
            }}
            required
          ></textarea>
          <button
            type="submit"
            style={{
              background: "#ffb300",
              color: "#181818",
              border: "none",
              borderRadius: "8px",
              padding: "0.6rem 1.2rem",
              fontWeight: "600",
              cursor: "pointer",
              boxShadow: "0 2px 8px #ff980033",
            }}
          >
            Absenden
          </button>
        </form>
      </section>
    </div>
  );
}
