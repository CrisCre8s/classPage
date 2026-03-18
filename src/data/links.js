/**
 * Link-Daten fuer den Klassen-Hub.
 * Neue Links einfach als weiteres Objekt anfuegen.
 */
const links = [
  {
    title: "Schulwebseite",
    url: "https://sbsz-hsp.com/",
    description: "Offizielle Webseite der SBSZ Hermsdorf",
    icon: "home-outline",
  },
  {
    title: "Stundenplan & Vertretungsplan",
    url: "https://sbsz-hsp.com/davinci-timetable.html",
    description: "Aktueller Stunden- und Vertretungsplan der Klasse",
    icon: "calendar-outline",
  },
  {
    title: "Klassenbuch & Noten",
    url: "https://sbsz-hsp.com/hip/default.php",
    description: "Notenübersicht und Klassenbucheintragungen",
    icon: "school-outline",
  },
  {
    title: "Azubi-Portal",
    url: "https://azubi.gfi.ihk.de/",
    description: "Azubi-Infocenter und AzubiCard prüfen",
    icon: "person-outline",
    extraClass: "shift-right",
  },
  {
    globusHub: true,
    icon: "pricetags-outline",
    name: "Globus Hermsdorf",
    beschreibung:
      "Hier findest du alle wichtigen Informationen rund um deinen Globus. Von Rabatten bis zu Spritpreisen.",
    url: "https://produkte.globus.de/hermsdorf/mein-globus-preise-rabatte/",
    oeffnungszeiten: [
      { tag: "Montag - Samstag", zeit: "08:00 - 20:00 Uhr" },
      { tag: "Sonntag", zeit: "geschlossen" },
    ],
    kontakt: {
      adresse: "Am Globus 1, 07629 Hermsdorf",
      telefon: "+49 36601 930",
      web: "https://www.globus.de/hermsdorf/",
    },
  },
];

export default links;
