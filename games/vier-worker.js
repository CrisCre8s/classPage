// Rechnet den Computerzug für „Vier in einer Reihe“ im Hintergrund
import { besterZug } from "./vier-engine.js";

self.onmessage = (e) => {
  const { brett, stufe, id } = e.data;
  self.postMessage({ id, spalte: besterZug(brett, 2, stufe) });
};
