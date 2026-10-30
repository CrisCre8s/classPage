// Klassen-Bestenliste: Highscores mit Namen für alle sichtbar, gespeichert im selben Upstash Redis wie der Tankverlauf.
//
// GET  /api/bestenliste?spiel=snake&stufe=mittel        → Top 10
// POST /api/bestenliste {aktion:"start", spiel, stufe}  → Spielmarke (beim Spielstart holen)
// POST /api/bestenliste {aktion:"eintragen", marke, name, wert} → Eintrag (nur mit gültiger Marke)
// DELETE /api/bestenliste?spiel=…&stufe=…&name=…        → Eintrag löschen (Header Authorization: Bearer <BESTENLISTE_ADMIN>)
//
// Regeln gegen Fake-Einträge (kein perfekter Schutz, aber mehr als ein offenes Formular):
//  1. Ohne Spielmarke kein Eintrag. Die Marke gibt es nur beim Spielstart, sie gilt einmal und 3 Stunden.
//  2. Der Wert muss zur Spielzeit passen: Mindestdauer je Spiel, höchstens so viele Punkte pro Sekunde,
//     wie beim echten Spielen möglich sind, und eine feste Obergrenze. Bestzeiten nicht schneller als machbar.
//  3. Pro Name höchstens 8 Einträge pro Stunde. Pro IP höchstens 60 Einträge und 1000 Spielmarken pro Stunde
//     (großzügig, weil die ganze Klasse im Schulnetz dieselbe IP hat).
//  4. Namen: 2–16 Zeichen, nur Buchstaben, Ziffern, Leerzeichen, Punkt, Binde- und Unterstrich,
//     keine Links, keine Beleidigungen. Pro Name zählt nur der beste Wert.
//  5. Wer trotzdem Unsinn einträgt, wird über die Admin-Löschung entfernt.
import { redis, redisPipeline, speicherDa } from "./_verlauf.js";

const MARKE_SEK = 3 * 3600;
const STUFEN = ["leicht", "mittel", "schwer", "alle"];

// Punkte-Spiele: minSek = kürzeste glaubwürdige Runde, proSek = Punkte pro Sekunde (großzügig), basis, max
const PUNKTE = {
  snake: { minSek: 3, proSek: 40, basis: 50, max: 50000 },
  bits: { minSek: 5, proSek: 400, basis: 500, max: 500000 },
  z2048: { minSek: 10, proSek: 300, basis: 100, max: 1000000 },
  mauer: { minSek: 5, proSek: 150, basis: 300, max: 200000 },
  skate: { minSek: 3, proSek: 600, basis: 500, max: 2000000 },
  schlagzeug: { minSek: 10, proSek: 4000, basis: 0, max: 2000000 },
  bloecke: { minSek: 5, proSek: 3000, basis: 0, max: 5000000 },
  flatter: { minSek: 1, proSek: 2, basis: 2, max: 5000 },
  invasion: { minSek: 3, proSek: 120, basis: 100, max: 1000000 },
  bubble: { minSek: 5, proSek: 400, basis: 1500, max: 2000000 },
  // Lernspiele mit fester Zeit: die Runde läuft immer bis zum Ende
  binaer: { minSek: 55, proSek: 50, basis: 0, max: 4000 },
  ports: { minSek: 55, proSek: 50, basis: 0, max: 4000 },
  subnetz: { minSek: 85, proSek: 30, basis: 0, max: 5000 },
  befehle: { minSek: 85, proSek: 30, basis: 0, max: 5000 },
  osi: { minSek: 85, proSek: 40, basis: 0, max: 5000 },
  csharp: { minSek: 115, proSek: 30, basis: 0, max: 5000 },
  gatter: { minSek: 115, proSek: 15, basis: 0, max: 3000 },
  sql: { minSek: 30, proSek: 5, basis: 0, max: 300 },
};
// Zeit-Spiele: schnellste glaubwürdige Zeit in Sekunden je Stufe
const ZEIT = {
  minen: { leicht: 3, mittel: 10, schwer: 25 },
  memory: { leicht: 6, mittel: 8, schwer: 10 },
  sudoku: { leicht: 60, mittel: 90, schwer: 120 },
};
// Spiele ohne Schwierigkeitsgrade landen unter „alle“
const OHNE_STUFEN = new Set(["schlagzeug", "flatter"]);

const VERBOTEN = ["arsch", "fick", "fotz", "hure", "nutte", "nazi", "hitler", "wichs", "schwanz", "penis", "fuck", "shit", "bitch", "cunt", "nigg", "neger", "spast", "behindert", "schwuchtel", "schlampe", "admin", "porn", "opfer"];

function pruefeName(roh) {
  const name = String(roh ?? "").normalize("NFC").replace(/\s+/g, " ").trim();
  if (name.length < 2 || name.length > 16) return { fehler: "Der Name braucht 2 bis 16 Zeichen." };
  if (!/^[\p{L}\p{N} ._-]+$/u.test(name)) return { fehler: "Nur Buchstaben, Ziffern, Leerzeichen, Punkt, - und _ erlaubt." };
  if (/https?|www\.|\.(de|com|net|org|io)\b/i.test(name)) return { fehler: "Keine Links im Namen." };
  // Leetspeak grob zurückübersetzen, dann gegen die Liste prüfen
  const flach = name
    .toLowerCase()
    .replace(/0/g, "o").replace(/1/g, "i").replace(/3/g, "e").replace(/4/g, "a").replace(/5/g, "s").replace(/7/g, "t").replace(/8/g, "b")
    .replace(/[^\p{L}]/gu, "");
  if (VERBOTEN.some((w) => flach.includes(w))) return { fehler: "Bitte einen anderen Namen wählen." };
  return { name, schluessel: name.toLowerCase() };
}

const ipVon = (req) => String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unbekannt").split(",")[0].trim();
const istZeit = (spiel) => Boolean(ZEIT[spiel]);
const bekannt = (spiel) => Boolean(PUNKTE[spiel] || ZEIT[spiel]);
const listeKey = (spiel, stufe) => `bl:liste:${spiel}:${stufe}`;
const infoKey = (spiel, stufe) => `bl:info:${spiel}:${stufe}`;

function stufeAus(spiel, stufe) {
  if (OHNE_STUFEN.has(spiel)) return "alle";
  return STUFEN.includes(stufe) && stufe !== "alle" ? stufe : null;
}

async function top(spiel, stufe, anzahl = 10) {
  const befehl = istZeit(spiel) ? ["ZRANGE", listeKey(spiel, stufe), 0, anzahl - 1, "WITHSCORES"] : ["ZRANGE", listeKey(spiel, stufe), 0, anzahl - 1, "REV", "WITHSCORES"];
  const roh = await redis(befehl);
  const mitglieder = [];
  for (let i = 0; i < roh.length; i += 2) mitglieder.push({ schluessel: roh[i], wert: Number(roh[i + 1]) });
  if (!mitglieder.length) return [];
  const infos = await redis(["HMGET", infoKey(spiel, stufe), ...mitglieder.map((m) => m.schluessel)]);
  return mitglieder.map((m, i) => {
    let info = {};
    try {
      info = JSON.parse(infos[i] || "{}");
    } catch {}
    return { platz: i + 1, name: info.name || m.schluessel, wert: m.wert, datum: info.datum || null };
  });
}

// Zählt pro IP und Zweck; true = noch erlaubt
async function zaehle(zweck, ip, grenze) {
  const key = `bl:rate:${zweck}:${ip}`;
  const [n] = await redisPipeline([["INCR", key], ["EXPIRE", key, 3600, "NX"]]);
  return n <= grenze;
}

function lesbar(body) {
  if (!body) return {};
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  return body;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!speicherDa()) return res.status(503).json({ ok: false, fehler: "Die Bestenliste ist noch nicht eingerichtet." });

  try {
    if (req.method === "GET") {
      const spiel = String(req.query.spiel || "");
      const stufe = stufeAus(spiel, String(req.query.stufe || ""));
      if (!bekannt(spiel) || !stufe) return res.status(400).json({ ok: false, fehler: "Unbekanntes Spiel oder unbekannte Stufe." });
      res.setHeader("Cache-Control", "public, s-maxage=10, stale-while-revalidate=30");
      return res.status(200).json({ ok: true, spiel, stufe, zeit: istZeit(spiel), liste: await top(spiel, stufe) });
    }

    if (req.method === "DELETE") {
      const admin = process.env.BESTENLISTE_ADMIN;
      const auth = String(req.headers.authorization || "");
      if (!admin || auth !== `Bearer ${admin}`) return res.status(401).json({ ok: false, fehler: "Nicht erlaubt." });
      const spiel = String(req.query.spiel || "");
      const stufe = stufeAus(spiel, String(req.query.stufe || ""));
      const schluessel = String(req.query.name || "").trim().toLowerCase();
      if (!bekannt(spiel) || !stufe || !schluessel) return res.status(400).json({ ok: false, fehler: "spiel, stufe und name angeben." });
      const [weg] = await redisPipeline([["ZREM", listeKey(spiel, stufe), schluessel], ["HDEL", infoKey(spiel, stufe), schluessel]]);
      return res.status(200).json({ ok: true, geloescht: weg });
    }

    if (req.method !== "POST") return res.status(405).json({ ok: false, fehler: "Nur GET, POST und DELETE." });

    const body = lesbar(req.body);
    const ip = ipVon(req);

    if (body.aktion === "start") {
      const spiel = String(body.spiel || "");
      const stufe = stufeAus(spiel, String(body.stufe || ""));
      if (!bekannt(spiel) || !stufe) return res.status(400).json({ ok: false, fehler: "Unbekanntes Spiel." });
      if (!(await zaehle("start", ip, 1000))) return res.status(429).json({ ok: false, fehler: "Zu viele Spielstarts, bitte später nochmal." });
      const marke = crypto.randomUUID();
      await redis(["SET", `bl:marke:${marke}`, JSON.stringify({ spiel, stufe, t: Date.now() }), "EX", MARKE_SEK]);
      return res.status(200).json({ ok: true, marke });
    }

    if (body.aktion === "eintragen") {
      const marke = String(body.marke || "");
      if (!/^[0-9a-f-]{36}$/.test(marke)) return res.status(400).json({ ok: false, fehler: "Keine gültige Spielmarke." });
      const n = pruefeName(body.name);
      if (n.fehler) return res.status(400).json({ ok: false, fehler: n.fehler });
      const wert = Number(body.wert);
      if (!Number.isFinite(wert) || wert <= 0) return res.status(400).json({ ok: false, fehler: "Kein gültiges Ergebnis." });
      if (!(await zaehle("eintrag-name", n.schluessel, 8)) || !(await zaehle("eintrag-ip", ip, 60))) return res.status(429).json({ ok: false, fehler: "Zu viele Einträge in der letzten Stunde." });

      // Marke einmalig verbrauchen
      const roh = await redis(["GETDEL", `bl:marke:${marke}`]);
      if (!roh) return res.status(400).json({ ok: false, fehler: "Die Spielmarke ist abgelaufen oder wurde schon benutzt." });
      const { spiel, stufe, t } = JSON.parse(roh);
      const dauer = (Date.now() - t) / 1000;

      let gerundet;
      if (istZeit(spiel)) {
        gerundet = Math.round(wert);
        const min = ZEIT[spiel][stufe] ?? 5;
        if (gerundet < min || gerundet > dauer + 5) return res.status(400).json({ ok: false, fehler: "Diese Zeit passt nicht zur Spieldauer." });
      } else {
        gerundet = Math.floor(wert);
        const r = PUNKTE[spiel];
        if (dauer < r.minSek || gerundet > r.max || gerundet > r.basis + r.proSek * dauer) return res.status(400).json({ ok: false, fehler: "Dieses Ergebnis passt nicht zur Spieldauer." });
      }

      const liste = listeKey(spiel, stufe);
      const info = infoKey(spiel, stufe);
      // pro Name zählt nur der beste Wert (Punkte: höher, Zeit: niedriger)
      const [geaendert] = await redisPipeline([["ZADD", liste, istZeit(spiel) ? "LT" : "GT", "CH", gerundet, n.schluessel]]);
      const neu = (await redis(["HEXISTS", info, n.schluessel])) === 0;
      if (geaendert || neu) await redis(["HSET", info, n.schluessel, JSON.stringify({ name: n.name, datum: new Date().toISOString().slice(0, 10) })]);
      // nur die besten 100 behalten
      await redis(istZeit(spiel) ? ["ZREMRANGEBYRANK", liste, 100, -1] : ["ZREMRANGEBYRANK", liste, 0, -101]);
      const rang = await redis([istZeit(spiel) ? "ZRANK" : "ZREVRANK", liste, n.schluessel]);
      return res.status(200).json({ ok: true, platz: rang == null ? null : rang + 1, verbessert: Boolean(geaendert || neu), liste: await top(spiel, stufe) });
    }

    return res.status(400).json({ ok: false, fehler: "Unbekannte Aktion." });
  } catch (err) {
    return res.status(502).json({ ok: false, fehler: "Die Bestenliste ist gerade nicht erreichbar." });
  }
}
