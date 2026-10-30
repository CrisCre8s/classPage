// Speicher für den Wochenverlauf der Spritpreise: Upstash Redis (über den Vercel Marketplace).
// Pro Stunde (deutsche Zeit) wird der zuletzt gesehene Preis abgelegt, 9 Tage lang.
//
// Umgebungsvariablen (setzt Vercel beim Verbinden der Datenbank automatisch):
//   KV_REST_API_URL und KV_REST_API_TOKEN   (oder UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN)

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const HALTEN_SEK = 9 * 24 * 3600;

export const speicherDa = () => Boolean(URL_ && TOKEN);

export async function redis(befehl) {
  const res = await fetch(URL_, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(befehl),
  });
  if (!res.ok) throw new Error(`Redis HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

// mehrere Befehle in einem Aufruf (Upstash-Pipeline); Ergebnis: Liste der Einzelergebnisse
export async function redisPipeline(befehle) {
  const res = await fetch(`${URL_}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(befehle),
  });
  if (!res.ok) throw new Error(`Redis HTTP ${res.status}`);
  const data = await res.json();
  const fehler = data.find((d) => d.error);
  if (fehler) throw new Error(fehler.error);
  return data.map((d) => d.result);
}

// "2026-10-27T14" in deutscher Zeit (Sommer-/Winterzeit wird von Intl erledigt)
const FORMAT = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" });
export function stundeVon(date) {
  return FORMAT.format(date).replace(" ", "T");
}

export async function speichere(preise, jetzt = new Date()) {
  if (!speicherDa()) return false;
  const wert = JSON.stringify({ ...preise, t: jetzt.toISOString() });
  await redis(["SET", `sprit:h:${stundeVon(jetzt)}`, wert, "EX", HALTEN_SEK]);
  return true;
}

// Sperre gegen zu häufige Abrufe (z. B. wenn jemand den Speicher-Endpunkt oft aufruft)
export async function sperre(sekunden) {
  if (!speicherDa()) return true;
  return (await redis(["SET", "sprit:sperre", "1", "NX", "EX", sekunden])) === "OK";
}

const WT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const SORTEN = ["e5", "e10", "diesel"];

// Letzte 7 Tage (deutsche Zeit) mit Schnitt, Tiefst- und Höchstpreis je Sorte
export async function leseWoche(jetzt = new Date()) {
  const stunden = [];
  for (let i = 0; i < 8 * 24; i++) stunden.push(stundeVon(new Date(jetzt.getTime() - i * 3600e3)));
  const eindeutig = [...new Set(stunden)];
  const werte = await redis(["MGET", ...eindeutig.map((s) => `sprit:h:${s}`)]);
  const proTag = new Map();
  let letzter = null;
  eindeutig.forEach((stunde, i) => {
    if (!werte[i]) return;
    let p;
    try {
      p = JSON.parse(werte[i]);
    } catch {
      return;
    }
    const tag = stunde.slice(0, 10);
    if (!proTag.has(tag)) proTag.set(tag, []);
    proTag.get(tag).push({ stunde: Number(stunde.slice(11, 13)), ...p });
    if (!letzter || p.t > letzter.t) letzter = p;
  });
  const heute = stundeVon(jetzt).slice(0, 10);
  const tage = [];
  for (let i = 6; i >= 0; i--) {
    // Kalendertag i Tage vor heute (12 Uhr mittags rechnen, damit Zeitumstellung nicht stört)
    const [y, m, d] = heute.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d - i, 12));
    const datum = dt.toISOString().slice(0, 10);
    const proben = proTag.get(datum) || [];
    const eintrag = { datum, wt: WT[dt.getUTCDay()], proben: proben.length };
    for (const s of SORTEN) {
      const liste = proben.map((p) => p[s]).filter((v) => typeof v === "number");
      eintrag[s] = liste.length
        ? { schnitt: liste.reduce((a, b) => a + b, 0) / liste.length, min: Math.min(...liste), max: Math.max(...liste) }
        : null;
    }
    tage.push(eintrag);
  }
  return { tage, letzter };
}
