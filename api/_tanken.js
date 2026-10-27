// Gemeinsamer Abruf der Globus-Tankstelle über die Tankerkönig-API (MTS-K, CC BY 4.0).
// Dateien mit _ am Anfang sind bei Vercel keine eigenen Endpunkte.

const BASE = "https://creativecommons.tankerkoenig.de/json";

// Standort der Globus-Tankstelle (Rodaer Str. 72, Hermsdorf) für die Umkreissuche
const LAT = 50.887;
const LNG = 11.8482;
const RADIUS_KM = 2;

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

// → { offen, preise: { e5, e10, diesel } }
export async function holePreise(key) {
  let station;
  const id = process.env.TANKERKOENIG_STATION_ID;
  if (id) {
    const data = await holeJson(`${BASE}/detail.php?id=${encodeURIComponent(id)}&apikey=${key}`);
    station = data.station;
  } else {
    const data = await holeJson(`${BASE}/list.php?lat=${LAT}&lng=${LNG}&rad=${RADIUS_KM}&type=all&sort=dist&apikey=${key}`);
    station = (data.stations || []).find((s) => `${s.brand} ${s.name}`.toLowerCase().includes("globus"));
  }
  if (!station) throw new Error("Globus-Tankstelle nicht gefunden");
  return {
    offen: station.isOpen !== false,
    preise: { e5: preis(station.e5), e10: preis(station.e10), diesel: preis(station.diesel) },
  };
}
