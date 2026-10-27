// Vercel Serverless Function: aktuelle Spritpreise der Globus-Tankstelle Hermsdorf
// Daten: Markttransparenzstelle für Kraftstoffe (MTS-K) über die Tankerkönig-API
// (https://creativecommons.tankerkoenig.de), Lizenz CC BY 4.0.
//
// Benötigte Umgebungsvariable in Vercel:
//   TANKERKOENIG_API_KEY   – kostenloser Key von creativecommons.tankerkoenig.de
// Optional:
//   TANKERKOENIG_STATION_ID – feste Tankstellen-ID; sonst wird die Globus-Tankstelle
//                             in Hermsdorf automatisch über die Umkreissuche gefunden.
//   KV_REST_API_URL / KV_REST_API_TOKEN – Redis-Datenbank für den Wochenverlauf (siehe api/_verlauf.js)

import { holePreise } from "./_tanken.js";
import { speichere } from "./_verlauf.js";

// Antwort 10 Minuten im Vercel-CDN zwischenspeichern → höchstens eine
// Anfrage an Tankerkönig alle 10 Minuten, egal wie viele Leute die Seite öffnen.
const CACHE = "public, s-maxage=600, stale-while-revalidate=300";

export default async function handler(req, res) {
  const key = process.env.TANKERKOENIG_API_KEY;
  if (!key) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(503).json({ ok: false, fehler: "kein API-Key konfiguriert" });
  }

  try {
    const { offen, preise } = await holePreise(key);
    // nebenbei für den Wochenverlauf merken (nur wenn geöffnet, sonst sind die Preise veraltet)
    if (offen) await speichere(preise).catch(() => {});
    res.setHeader("Cache-Control", CACHE);
    return res.status(200).json({ ok: true, offen, preise, stand: new Date().toISOString() });
  } catch (err) {
    res.setHeader("Cache-Control", "public, s-maxage=60");
    return res.status(502).json({ ok: false, fehler: String(err.message || err) });
  }
}
