import { resolve } from "node:path";
import { defineConfig, loadEnv } from "vite";

// Angaben für Impressum, Datenschutz und PayPal kommen aus Umgebungsvariablen (in Vercel eintragen),
// damit z. B. die Adresse nicht im öffentlichen Git-Repo steht. Beim Bauen werden sie in die HTML-Seiten
// eingesetzt; fehlt etwas, zeigt die Seite einen Hinweis statt leerer Felder.
//   IMPRESSUM_NAME, IMPRESSUM_STRASSE, IMPRESSUM_ORT, IMPRESSUM_EMAIL, IMPRESSUM_TELEFON (optional)
//   PAYPAL_LINK (z. B. https://www.paypal.me/deinname)
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function seitenDaten(env) {
  const d = {
    NAME: env.IMPRESSUM_NAME || "",
    STRASSE: env.IMPRESSUM_STRASSE || "",
    ORT: env.IMPRESSUM_ORT || "",
    EMAIL: env.IMPRESSUM_EMAIL || "",
    TELEFON: env.IMPRESSUM_TELEFON || "",
  };
  const paypal = (env.PAYPAL_LINK || "").trim();
  // nur echte PayPal-Adressen zulassen
  d.PAYPAL = /^https:\/\/(www\.)?(paypal\.me|paypal\.com)\//i.test(paypal) ? paypal : "";
  return d;
}

function rechtlichesPlugin(env) {
  const d = seitenDaten(env);
  const fehlt = ["NAME", "STRASSE", "ORT", "EMAIL"].filter((k) => !d[k]);
  return {
    name: "rechtliches",
    transformIndexHtml(html) {
      let out = html;
      // PayPal-Link im Fuß nur zeigen, wenn eingetragen
      out = out.replace(/<!--paypal-->([\s\S]*?)<!--\/paypal-->/g, (_, inhalt) => (d.PAYPAL ? inhalt : ""));
      // Hinweis, solange Angaben fehlen
      out = out.replace(/<!--fehlt-->([\s\S]*?)<!--\/fehlt-->/g, (_, inhalt) => (fehlt.length ? inhalt.replace("{{FEHLT}}", fehlt.map((k) => `IMPRESSUM_${k}`).join(", ")) : ""));
      // optionale Telefonzeile
      out = out.replace(/<!--telefon-->([\s\S]*?)<!--\/telefon-->/g, (_, inhalt) => (d.TELEFON ? inhalt : ""));
      for (const [k, v] of Object.entries(d)) out = out.replaceAll(`{{${k}}}`, esc(v || "[fehlt]"));
      return out;
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  return {
    plugins: [rechtlichesPlugin(env)],
    build: {
      rollupOptions: {
        input: {
          hub: resolve(import.meta.dirname, "index.html"),
          spiele: resolve(import.meta.dirname, "spiele.html"),
          impressum: resolve(import.meta.dirname, "impressum.html"),
          datenschutz: resolve(import.meta.dirname, "datenschutz.html"),
        },
      },
    },
  };
});
