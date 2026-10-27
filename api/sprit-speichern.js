// Täglicher Cron-Job (vercel.json): Preis abrufen und für den Wochenverlauf speichern,
// auch an Tagen, an denen niemand die Seite öffnet. Sonst speichert /api/sprit nebenbei.
// Ist CRON_SECRET gesetzt, schickt Vercel ihn mit; fremde Aufrufe werden dann abgelehnt.
import { holePreise } from "./_tanken.js";
import { speichere, speicherDa, sperre } from "./_verlauf.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const geheim = process.env.CRON_SECRET;
  if (geheim && req.headers.authorization !== `Bearer ${geheim}`) return res.status(401).json({ ok: false });
  const key = process.env.TANKERKOENIG_API_KEY;
  if (!key || !speicherDa()) return res.status(503).json({ ok: false, fehler: "API-Key oder Speicher fehlt" });
  try {
    // höchstens alle 5 Minuten wirklich bei Tankerkönig nachfragen
    if (!(await sperre(300))) return res.status(200).json({ ok: true, uebersprungen: true });
    const { offen, preise } = await holePreise(key);
    if (offen) await speichere(preise);
    return res.status(200).json({ ok: true, offen });
  } catch (err) {
    return res.status(502).json({ ok: false, fehler: String(err.message || err) });
  }
}
