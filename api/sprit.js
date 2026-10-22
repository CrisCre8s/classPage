// Vercel Serverless Function: aktuelle Spritpreise der Globus-Tankstelle Hermsdorf
// Daten: Markttransparenzstelle für Kraftstoffe (MTS-K) über die Tankerkönig-API
// (https://creativecommons.tankerkoenig.de), Lizenz CC BY 4.0.
//
// Benötigte Umgebungsvariable in Vercel:
//   TANKERKOENIG_API_KEY   – kostenloser Key von creativecommons.tankerkoenig.de
// Optional:
//   TANKERKOENIG_STATION_ID – feste Tankstellen-ID; sonst wird die Globus-Tankstelle
//                             in Hermsdorf automatisch über die Umkreissuche gefunden.

const BASE = "https://creativecommons.tankerkoenig.de/json";

// Standort der Globus-Tankstelle (Rodaer Str. 72, Hermsdorf) für die Umkreissuche
const LAT = 50.887;
const LNG = 11.8482;
const RADIUS_KM = 2;

// Antwort 10 Minuten im Vercel-CDN zwischenspeichern → höchstens eine
// Anfrage an Tankerkönig alle 10 Minuten, egal wie viele Leute die Seite öffnen.
const CACHE = "public, s-maxage=600, stale-while-revalidate=300";

function preis(wert) {
  return typeof wert === "number" && wert > 0 ? wert : null;
}

async function holeJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": "klassen-hub-h-fi24-1b" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.message || "Tankerkönig-Fehler");
  return data;
}

export default async function handler(req, res) {
  const key = process.env.TANKERKOENIG_API_KEY;
  if (!key) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(503).json({ ok: false, fehler: "kein API-Key konfiguriert" });
  }

  try {
    let station;
    const id = process.env.TANKERKOENIG_STATION_ID;

    if (id) {
      const data = await holeJson(`${BASE}/detail.php?id=${encodeURIComponent(id)}&apikey=${key}`);
      station = data.station;
    } else {
      const data = await holeJson(
        `${BASE}/list.php?lat=${LAT}&lng=${LNG}&rad=${RADIUS_KM}&type=all&sort=dist&apikey=${key}`,
      );
      station = (data.stations || []).find((s) =>
        `${s.brand} ${s.name}`.toLowerCase().includes("globus"),
      );
    }

    if (!station) throw new Error("Globus-Tankstelle nicht gefunden");

    res.setHeader("Cache-Control", CACHE);
    return res.status(200).json({
      ok: true,
      offen: station.isOpen !== false,
      preise: {
        e5: preis(station.e5),
        e10: preis(station.e10),
        diesel: preis(station.diesel),
      },
      stand: new Date().toISOString(),
    });
  } catch (err) {
    res.setHeader("Cache-Control", "public, s-maxage=60");
    return res.status(502).json({ ok: false, fehler: String(err.message || err) });
  }
}
