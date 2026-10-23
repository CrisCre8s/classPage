// Rechnet den Computerzug im Hintergrund, damit die Seite nicht einfriert
import { besterZug } from "./schach-engine.js";

self.onmessage = (e) => {
  const { pos, stufe, id } = e.data;
  const zug = besterZug(pos, stufe);
  self.postMessage({ id, zug });
};
