// Wochenverlauf der Spritpreise (letzte 7 Tage) aus dem Redis-Speicher.
import { leseWoche, speicherDa } from "./_verlauf.js";

export default async function handler(req, res) {
  if (!speicherDa()) {
    res.setHeader("Cache-Control", "public, s-maxage=3600");
    return res.status(503).json({ ok: false, fehler: "kein Speicher eingerichtet" });
  }
  try {
    const { tage, letzter } = await leseWoche();
    res.setHeader("Cache-Control", "public, s-maxage=900, stale-while-revalidate=600");
    return res.status(200).json({ ok: true, tage, letzter });
  } catch (err) {
    res.setHeader("Cache-Control", "public, s-maxage=60");
    return res.status(502).json({ ok: false, fehler: String(err.message || err) });
  }
}
