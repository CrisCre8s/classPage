/** LinkCard – Einzelne Karte mit Icon, Titel und Beschreibung oder Globus-Hub-Layout */
export default function LinkCard(props) {
  // Globus-Hub Speziallayout
  if (props.globusHub) {
    return (
      <section className="globus-hub">
        <div className="globus-hub-header">
          <ion-icon
            name={props.icon}
            style={{ fontSize: "2.2rem", color: "#facc15" }}
          ></ion-icon>
          <h2>{props.name}</h2>
        </div>
        <p className="globus-hub-desc">{props.beschreibung}</p>
        <a
          href={props.url}
          target="_blank"
          rel="noopener noreferrer"
          className="globus-hub-link"
        >
          Zu den aktuellen Rabatten &rarr;
        </a>
        <div className="globus-hub-info">
          <div>
            <strong>Öffnungszeiten:</strong>
            <ul>
              {props.oeffnungszeiten.map((o, i) => (
                <li key={i}>
                  {o.tag}: {o.zeit}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <strong>Kontakt:</strong>
            <div>{props.kontakt.adresse}</div>
            <div>
              Tel:{" "}
              <a href={`tel:${props.kontakt.telefon.replace(/\s+/g, "")}`}>
                {props.kontakt.telefon}
              </a>
            </div>
            <div>
              <a
                href={props.kontakt.web}
                target="_blank"
                rel="noopener noreferrer"
              >
                Webseite
              </a>
            </div>
          </div>
        </div>
      </section>
    );
  }
  // Standard-Link
  return (
    <a
      href={props.url}
      target="_blank"
      rel="noopener noreferrer"
      className="link-card"
    >
      <ion-icon name={props.icon}></ion-icon>
      <span className="card-title">{props.title}</span>
      <span className="card-desc">{props.description}</span>
    </a>
  );
}
