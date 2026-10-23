import { resolve } from "node:path";
import { defineConfig } from "vite";

// Zwei Seiten: der Hub (index.html) und die Spiele (spiele.html)
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        hub: resolve(import.meta.dirname, "index.html"),
        spiele: resolve(import.meta.dirname, "spiele.html"),
      },
    },
  },
});
