// Pop-Würfel: 3×3-Zauberwürfel in 3D (Three.js) im Comic-/Pop-Art-Look.
// Wertung: Zeit vom ersten Zug nach dem Mischen bis gelöst. Stufe = Anzahl Mischzüge.
import * as T from "./lib/three.module.js";

export const DOM = true;
export const HILFE =
  "Mischen, dann lösen · Hintergrund ziehen: Ansicht drehen · auf einem Feld ziehen: Ebene drehen · Tasten R L U D F B, mit Shift gegen den Uhrzeigersinn · Strg+Z rückgängig · die Zeit läuft ab dem ersten Zug nach dem Mischen";
const MISCHZUEGE = { leicht: 8, mittel: 15, schwer: 25 };

// =====================================================================
// Würfelzustand ohne Grafik (ganzzahlig, dadurch exakt)
// =====================================================================
// Jeder der 26 Steine hat eine Position (-1..1 je Achse) und eine Ausrichtung (3×3-Matrix aus -1/0/1).
// Ein Zug dreht alle Steine einer Ebene um 90° um eine Achse.
const ACHSEN = ["x", "y", "z"];
const FARBE_SEITE = { px: "rot", nx: "orange", py: "weiss", ny: "gelb", pz: "magenta", nz: "cyan" };
// Notation: Achse, Ebene, Richtung (+1 = gegen den Uhrzeigersinn um +Achse, Rechte-Hand-Regel)
const ZUEGE = { R: ["x", 1, -1], L: ["x", -1, 1], U: ["y", 1, -1], D: ["y", -1, 1], F: ["z", 1, -1], B: ["z", -1, 1] };

function drehMatrix(achse, s) {
  if (achse === "x") return [[1, 0, 0], [0, 0, -s], [0, s, 0]];
  if (achse === "y") return [[0, 0, s], [0, 1, 0], [-s, 0, 0]];
  return [[0, -s, 0], [s, 0, 0], [0, 0, 1]];
}
const malVek = (m, v) => [0, 1, 2].map((i) => m[i][0] * v[0] + m[i][1] * v[1] + m[i][2] * v[2]);
function malMat(a, b) {
  const r = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) r[i][j] += a[i][k] * b[k][j];
  return r;
}
export function neuerWuerfel() {
  const steine = [];
  for (let x = -1; x <= 1; x++)
    for (let y = -1; y <= 1; y++)
      for (let z = -1; z <= 1; z++) {
        if (!x && !y && !z) continue;
        const aufkleber = [];
        if (x) aufkleber.push({ n: [x, 0, 0], farbe: FARBE_SEITE[x > 0 ? "px" : "nx"] });
        if (y) aufkleber.push({ n: [0, y, 0], farbe: FARBE_SEITE[y > 0 ? "py" : "ny"] });
        if (z) aufkleber.push({ n: [0, 0, z], farbe: FARBE_SEITE[z > 0 ? "pz" : "nz"] });
        steine.push({ pos: [x, y, z], m: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], aufkleber });
      }
  return steine;
}
const inEbene = (stein, achse, ebene) => stein.pos[ACHSEN.indexOf(achse)] === ebene;
export function zugAnwenden(steine, zug) {
  const r = drehMatrix(zug.achse, zug.richtung);
  for (const s of steine) {
    if (!inEbene(s, zug.achse, zug.ebene)) continue;
    s.pos = malVek(r, s.pos);
    s.m = malMat(r, s.m);
  }
}
const gegenzug = (z) => ({ achse: z.achse, ebene: z.ebene, richtung: -z.richtung });
export function ausNotation(text) {
  const z = ZUEGE[text[0].toUpperCase()];
  if (!z) return null;
  const strich = text.includes("'");
  return { achse: z[0], ebene: z[1], richtung: strich ? -z[2] : z[2] };
}
export function istGeloest(steine) {
  const seite = {};
  for (const s of steine)
    for (const a of s.aufkleber) {
      const n = malVek(s.m, a.n).join(",");
      if (seite[n] && seite[n] !== a.farbe) return false;
      seite[n] = a.farbe;
    }
  return true;
}
// zufällige Züge, nie zweimal hintereinander dieselbe Achse (sonst heben sie sich teils auf)
export function mischFolge(n, zufall = Math.random) {
  const folge = [];
  let letzte = null;
  while (folge.length < n) {
    const achse = ACHSEN[Math.floor(zufall() * 3)];
    if (achse === letzte) continue;
    letzte = achse;
    folge.push({ achse, ebene: zufall() < 0.5 ? -1 : 1, richtung: zufall() < 0.5 ? -1 : 1 });
  }
  return folge;
}

// =====================================================================
// Spiel
// =====================================================================
export function start({ dom, stufe, status, nachricht, ergebnis }) {
  dom.innerHTML = `
    <div class="wuerfel">
      <canvas class="wuerfel-hinter" aria-hidden="true"></canvas>
      <div class="wuerfel-buehne" aria-label="3D-Zauberwürfel. Ansicht drehen: auf den Hintergrund ziehen. Ebene drehen: auf einem Feld ziehen."></div>
      <canvas class="wuerfel-effekte" aria-hidden="true"></canvas>
      <div class="wuerfel-blitz" aria-hidden="true"></div>
      <div class="wuerfel-hud" role="status" aria-live="off">
        <div class="wuerfel-panel"><small>ZEIT</small><b data-zeit>0:00.00</b></div>
        <div class="wuerfel-panel"><small>ZÜGE</small><b data-zuege>0</b></div>
      </div>
      <div class="wuerfel-leiste">
        <button class="wuerfel-blase" type="button" data-a="mischen">MISCHEN!</button>
        <button class="wuerfel-blase cyan" type="button" data-a="rueck">RÜCKGÄNGIG</button>
        <button class="wuerfel-blase magenta" type="button" data-a="reset">ZURÜCKSETZEN</button>
      </div>
    </div>`;
  const wurzel = dom.querySelector(".wuerfel");
  const buehne = wurzel.querySelector(".wuerfel-buehne");
  const effekte = wurzel.querySelector(".wuerfel-effekte");
  const hinter = wurzel.querySelector(".wuerfel-hinter");
  const blitz = wurzel.querySelector(".wuerfel-blitz");
  const fx = effekte.getContext("2d");
  const istHandy = matchMedia("(pointer: coarse)").matches;
  const mischZahl = MISCHZUEGE[stufe] || 15;

  // ---------- Renderer ----------
  let renderer;
  try {
    renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch {
    wurzel.innerHTML = `<p class="wuerfel-fehler">Dein Browser kann hier kein 3D (WebGL) anzeigen.</p>`;
    return { stop() { dom.innerHTML = ""; } };
  }
  const PR = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(PR);
  renderer.setClearColor(0x000000, 0);
  buehne.appendChild(renderer.domElement);

  const szene = new T.Scene();
  const kamera = new T.PerspectiveCamera(34, 1, 0.1, 100);
  const wuerfelGruppe = new T.Group();
  szene.add(wuerfelGruppe);

  // ---------- Cel-Shading mit Halbton-Punkten und Kreuzschraffur ----------
  const lichtWelt = new T.Vector3();
  const celVertex = `
    varying vec3 vN;
    void main() {
      vN = normalize(mat3(modelMatrix) * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`;
  const celFragment = `
    uniform vec3 uFarbe;
    uniform vec3 uLicht;
    uniform float uPR;
    uniform float uPunkt;
    varying vec3 vN;
    void main() {
      vec3 n = normalize(vN);
      float d = dot(n, normalize(uLicht));
      vec3 farbe = uFarbe;
      vec2 fc = gl_FragCoord.xy / uPR;
      // harte Stufen statt weichem Verlauf
      if (d > 0.78) {
        farbe = mix(farbe, vec3(1.0), 0.16);
      } else if (d <= 0.28) {
        // Schatten als Ben-Day-Punkte (um 45° gedreht), im tiefen Schatten größer
        float tiefe = d > 0.0 ? 0.28 : 0.62;
        vec2 r = mat2(0.7071, -0.7071, 0.7071, 0.7071) * fc / uPunkt;
        vec2 c = fract(r) - 0.5;
        float punkt = 1.0 - step(sqrt(tiefe) * 0.56, length(c));
        farbe = mix(farbe * 0.9, farbe * 0.25, punkt);
        if (d <= -0.35) {
          // Kreuzschraffur im dunkelsten Bereich
          float a = step(mod(fc.x + fc.y, 7.0), 1.3);
          float b = step(mod(fc.x - fc.y, 7.0), 1.3);
          farbe = mix(farbe, vec3(0.03, 0.02, 0.05), max(a, b) * 0.8);
        }
      }
      gl_FragColor = vec4(farbe, 1.0);
    }`;
  const materialien = [];
  function celMaterial(hex, vorn = false) {
    const m = new T.ShaderMaterial({
      // Aufkleber liegen knapp über dem Körper: Tiefenversatz verhindert Flimmern (Z-Fighting)
      polygonOffset: vorn,
      polygonOffsetFactor: vorn ? -2 : 0,
      polygonOffsetUnits: vorn ? -2 : 0,
      uniforms: { uFarbe: { value: new T.Color(hex) }, uLicht: { value: lichtWelt }, uPR: { value: PR }, uPunkt: { value: 6.0 } },
      vertexShader: celVertex,
      fragmentShader: celFragment,
    });
    materialien.push(m);
    return m;
  }
  const FARBEN = { rot: "#ff2a3d", orange: "#ff8a00", weiss: "#fdfbf2", gelb: "#ffe600", magenta: "#ff2bd6", cyan: "#00e5ff" };
  const MAT = {};
  for (const [k, v] of Object.entries(FARBEN)) MAT[k] = celMaterial(v, true);
  const matKoerper = celMaterial("#1c1726");
  const matHuelle = new T.MeshBasicMaterial({ color: 0x07060a, side: T.BackSide });
  materialien.push(matHuelle);

  function rundesQuadrat(g, r) {
    const s = new T.Shape();
    const h = g / 2;
    s.moveTo(-h + r, -h);
    s.lineTo(h - r, -h);
    s.quadraticCurveTo(h, -h, h, -h + r);
    s.lineTo(h, h - r);
    s.quadraticCurveTo(h, h, h - r, h);
    s.lineTo(-h + r, h);
    s.quadraticCurveTo(-h, h, -h, h - r);
    s.lineTo(-h, -h + r);
    s.quadraticCurveTo(-h, -h, -h + r, -h);
    return new T.ShapeGeometry(s, 4);
  }
  const geoKoerper = new T.BoxGeometry(0.95, 0.95, 0.95);
  const geoHuelle = new T.BoxGeometry(1.085, 1.085, 1.085); // Inverted Hull: schwarze Tuschekontur
  const geoAufkleber = rundesQuadrat(0.8, 0.12);

  // ---------- Steine ----------
  let steine = neuerWuerfel();
  const steinObjekte = [];
  const aufkleberMeshes = [];
  function baueSteine() {
    for (const o of steinObjekte) wuerfelGruppe.remove(o);
    steinObjekte.length = 0;
    aufkleberMeshes.length = 0;
    steine.forEach((s, i) => {
      const g = new T.Group();
      g.add(new T.Mesh(geoHuelle, matHuelle));
      g.add(new T.Mesh(geoKoerper, matKoerper));
      for (const a of s.aufkleber) {
        const m = new T.Mesh(geoAufkleber, MAT[a.farbe]);
        const n = new T.Vector3(...a.n);
        m.position.copy(n).multiplyScalar(0.487);
        m.lookAt(n.clone().multiplyScalar(2));
        m.userData = { stein: i, n: a.n };
        g.add(m);
        aufkleberMeshes.push(m);
      }
      wuerfelGruppe.add(g);
      steinObjekte.push(g);
    });
    synchronisiere();
  }
  const tmpM = new T.Matrix4();
  function synchronisiere() {
    steine.forEach((s, i) => {
      const o = steinObjekte[i];
      o.position.set(s.pos[0], s.pos[1], s.pos[2]);
      const m = s.m;
      tmpM.set(m[0][0], m[0][1], m[0][2], 0, m[1][0], m[1][1], m[1][2], 0, m[2][0], m[2][1], m[2][2], 0, 0, 0, 0, 1);
      o.quaternion.setFromRotationMatrix(tmpM);
    });
  }

  // ---------- Spielstand ----------
  let modus = "frei"; // frei | mischen | bereit | laeuft | pause | geloest
  let startZeit = 0;
  let endZeit = 0;
  let pausiertBei = 0;
  let zugZahl = 0;
  const verlauf = [];
  const schlange = [];
  let animation = null;
  const elZeit = wurzel.querySelector("[data-zeit]");
  const elZuege = wurzel.querySelector("[data-zuege]");
  const zeitText = (ms) => {
    const cs = Math.floor(ms / 10);
    return `${Math.floor(cs / 6000)}:${String(Math.floor((cs % 6000) / 100)).padStart(2, "0")}.${String(cs % 100).padStart(2, "0")}`;
  };
  const vergangen = () => (modus === "laeuft" ? performance.now() - startZeit : modus === "pause" ? pausiertBei - startZeit : modus === "geloest" ? endZeit - startZeit : 0);
  function hud() {
    elZeit.textContent = zeitText(vergangen());
    elZuege.textContent = String(zugZahl);
  }
  status(`Mischen drücken (${mischZahl} Züge), dann lösen`);

  function zug(z, quelle = "spieler") {
    if (!z || modus === "mischen" || modus === "pause") return;
    if (modus === "geloest") modus = "frei";
    schlange.push({ ...z, quelle });
  }
  function naechsteAnimation() {
    if (animation || !schlange.length) return;
    const z = schlange.shift();
    if (z.quelle !== "mischen") {
      if (modus === "bereit") {
        modus = "laeuft";
        startZeit = performance.now();
        status("Die Zeit läuft!");
      }
      if (z.quelle === "spieler") {
        zugZahl++;
        verlauf.push(z);
      } else zugZahl = Math.max(0, zugZahl - 1);
      knoepfe();
    }
    const schnell = z.quelle === "mischen";
    const pivot = new T.Group();
    wuerfelGruppe.add(pivot);
    const teile = [];
    steine.forEach((s, i) => {
      if (inEbene(s, z.achse, z.ebene)) {
        pivot.add(steinObjekte[i]);
        teile.push(i);
      }
    });
    animation = { z, pivot, teile, t: 0, dauer: schnell ? 0.14 : 0.34 };
    glitchStart(schnell ? 0.45 : 1);
    speedlinesStart(z, schnell ? 0.6 : 1);
    if (!schnell || Math.random() < 0.25) sfx(schnell ? "SHUFFLE!" : ["TWIST!", "ZACK!", "WHAM!", "KRRK!", "SWOOSH!", "CLACK!"][Math.floor(Math.random() * 6)], schnell);
    if (!schnell) navigator.vibrate?.(12);
  }
  function animationSchritt(dt) {
    const a = animation;
    if (!a) return;
    a.t += dt;
    // „Animation auf Zweiern“: nur 12 Bilder pro Sekunde, leicht ruckelig wie im Zeichentrick
    const schritte = Math.max(2, Math.round(a.dauer * 12));
    const k = Math.min(1, Math.ceil((a.t / a.dauer) * schritte) / schritte);
    const e = k < 1 ? 1 - Math.pow(1 - k, 2.2) : 1;
    a.pivot.rotation.set(0, 0, 0);
    a.pivot.rotation[a.z.achse] = (Math.PI / 2) * a.z.richtung * e;
    if (a.t >= a.dauer) {
      zugAnwenden(steine, a.z);
      for (const i of a.teile) wuerfelGruppe.add(steinObjekte[i]);
      wuerfelGruppe.remove(a.pivot);
      synchronisiere();
      animation = null;
      nachZug(a.z);
    }
  }
  function nachZug(z) {
    if (z.quelle === "mischen" && !schlange.some((s) => s.quelle === "mischen")) {
      modus = "bereit";
      zugZahl = 0;
      verlauf.length = 0;
      status("Los! Die Zeit startet mit deinem ersten Zug");
      knoepfe();
    }
    if (modus === "laeuft" && !schlange.length && istGeloest(steine)) geloest();
  }

  // ---------- Buttons ----------
  const btn = (a) => wurzel.querySelector(`[data-a="${a}"]`);
  function knoepfe() {
    btn("mischen").disabled = modus === "mischen";
    btn("rueck").disabled = modus === "mischen" || modus === "geloest" || !verlauf.length;
  }
  wurzel.querySelector(".wuerfel-leiste").addEventListener("click", (e) => {
    const a = e.target.closest("[data-a]")?.dataset.a;
    if (a === "mischen") mischen();
    if (a === "rueck") rueckgaengig();
    if (a === "reset") zuruecksetzen();
  });
  function mischen(folge = mischFolge(mischZahl)) {
    if (modus === "mischen") return;
    if (modus === "pause") nachricht(null);
    boomWeg();
    nachricht(null);
    schlange.length = 0;
    modus = "mischen";
    zugZahl = 0;
    verlauf.length = 0;
    status("Mischen …");
    for (const z of folge) schlange.push({ ...z, quelle: "mischen" });
    knoepfe();
  }
  function rueckgaengig() {
    if (modus === "mischen" || modus === "geloest" || modus === "pause") return;
    const z = verlauf.pop();
    if (!z) return;
    schlange.push({ ...gegenzug(z), quelle: "rueck" });
    knoepfe();
  }
  function zuruecksetzen() {
    boomWeg();
    nachricht(null);
    schlange.length = 0;
    if (animation) {
      for (const i of animation.teile) wuerfelGruppe.add(steinObjekte[i]);
      wuerfelGruppe.remove(animation.pivot);
      animation = null;
    }
    steine = neuerWuerfel();
    baueSteine();
    modus = "frei";
    zugZahl = 0;
    verlauf.length = 0;
    knoepfe();
    status(`Mischen drücken (${mischZahl} Züge), dann lösen`);
    sfx("RESET!", false);
    glitchStart(0.8);
  }

  // ---------- Tastatur ----------
  const onKey = (e) => {
    if (e.repeat || e.target.closest?.("input, textarea, select")) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      rueckgaengig();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const z = ausNotation(e.key.toUpperCase() + (e.shiftKey ? "'" : ""));
    if (z) {
      e.preventDefault();
      zug(z);
      knoepfe();
    }
  };
  window.addEventListener("keydown", onKey);

  // ---------- Maus / Touch ----------
  const ray = new T.Raycaster();
  const zeiger = new T.Vector2();
  const ansicht = { theta: -0.62, phi: 1.02, abstand: 11.5 };
  let ziehen = null;
  const leinwand = renderer.domElement;
  function rechteck() {
    return leinwand.getBoundingClientRect();
  }
  function aufBildschirm(v) {
    const p = v.clone().project(kamera);
    const r = rechteck();
    return new T.Vector2((p.x * 0.5 + 0.5) * r.width, (-p.y * 0.5 + 0.5) * r.height);
  }
  leinwand.addEventListener("pointerdown", (e) => {
    if (ziehen) return;
    leinwand.setPointerCapture(e.pointerId);
    const r = rechteck();
    zeiger.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(zeiger, kamera);
    const treffer = ray.intersectObjects(aufkleberMeshes, false)[0];
    if (treffer && modus !== "mischen" && modus !== "pause") {
      const s = steine[treffer.object.userData.stein];
      ziehen = { art: "ebene", id: e.pointerId, x: e.clientX, y: e.clientY, punkt: treffer.point.clone(), normale: malVek(s.m, treffer.object.userData.n), stein: s };
    } else ziehen = { art: "ansicht", id: e.pointerId, lx: e.clientX, ly: e.clientY };
  });
  leinwand.addEventListener("pointermove", (e) => {
    if (!ziehen || e.pointerId !== ziehen.id) return;
    if (ziehen.art === "ansicht") {
      ansicht.theta -= (e.clientX - ziehen.lx) * 0.0085;
      ansicht.phi = Math.min(Math.PI - 0.2, Math.max(0.2, ansicht.phi - (e.clientY - ziehen.ly) * 0.0085));
      ziehen.lx = e.clientX;
      ziehen.ly = e.clientY;
      return;
    }
    const d = new T.Vector2(e.clientX - ziehen.x, e.clientY - ziehen.y);
    if (d.length() < (istHandy ? 14 : 10)) return;
    // Für jede Achse senkrecht zur Feldnormale ausrechnen, wohin sich der berührte Punkt bei einer
    // Drehung bewegt, und die Achse nehmen, die am besten zur Wischrichtung passt
    const p0 = aufBildschirm(ziehen.punkt);
    let beste = null;
    ACHSEN.forEach((achse, ai) => {
      if (ziehen.normale[ai] !== 0) return;
      const a = new T.Vector3(ai === 0 ? 1 : 0, ai === 1 ? 1 : 0, ai === 2 ? 1 : 0);
      const tangente = new T.Vector3().crossVectors(a, ziehen.punkt);
      const st = aufBildschirm(ziehen.punkt.clone().addScaledVector(tangente, 0.25)).sub(p0);
      if (st.length() < 1e-3) return;
      const passt = st.dot(d) / st.length();
      if (!beste || Math.abs(passt) > Math.abs(beste.passt)) beste = { achse, ai, passt };
    });
    if (beste) {
      zug({ achse: beste.achse, ebene: ziehen.stein.pos[beste.ai], richtung: beste.passt > 0 ? 1 : -1 });
      knoepfe();
    }
    ziehen = null;
  });
  const loslassen = (e) => {
    if (ziehen && e.pointerId === ziehen.id) ziehen = null;
  };
  leinwand.addEventListener("pointerup", loslassen);
  leinwand.addEventListener("pointercancel", loslassen);
  leinwand.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      ansicht.abstand = Math.min(18, Math.max(8, ansicht.abstand + Math.sign(e.deltaY) * 0.6));
    },
    { passive: false }
  );

  // ---------- Nachbearbeitung: verrutschter Offsetdruck + Glitch ----------
  const ziel = renderer.capabilities.isWebGL2 && T.WebGLMultisampleRenderTarget ? new T.WebGLMultisampleRenderTarget(1, 1, { format: T.RGBAFormat }) : new T.WebGLRenderTarget(1, 1, { format: T.RGBAFormat });
  const postSzene = new T.Scene();
  const postKamera = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const postMat = new T.ShaderMaterial({
    uniforms: { tBild: { value: ziel.texture }, uVersatz: { value: new T.Vector2() }, uGlitch: { value: 0 }, uZeit: { value: 0 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader: `
      uniform sampler2D tBild;
      uniform vec2 uVersatz;
      uniform float uGlitch;
      uniform float uZeit;
      varying vec2 vUv;
      float hash(float n) { return fract(sin(n) * 43758.5453); }
      void main() {
        vec2 uv = vUv;
        // Glitch: einzelne Streifen springen seitlich
        float band = floor(uv.y * 22.0);
        uv.x += step(0.72, hash(band + floor(uZeit * 30.0))) * (hash(band * 3.1 + uZeit) - 0.5) * 0.05 * uGlitch;
        vec2 o = uVersatz * (1.0 + uGlitch * 5.0);
        // Druckplatten leicht verrutscht
        vec4 r = texture2D(tBild, uv + o);
        vec4 g = texture2D(tBild, uv);
        vec4 b = texture2D(tBild, uv - o * vec2(1.0, -0.6));
        gl_FragColor = vec4(r.r, g.g, b.b, max(max(r.a, g.a), b.a));
      }`,
    depthTest: false,
    depthWrite: false,
  });
  const postGeo = new T.PlaneGeometry(2, 2);
  postSzene.add(new T.Mesh(postGeo, postMat));

  // ---------- Effekte ----------
  let glitch = 0;
  const glitchStart = (s) => (glitch = Math.max(glitch, s));
  let linien = [];
  function speedlinesStart(z, staerke) {
    const n = Math.round(9 * staerke);
    for (let i = 0; i < n; i++)
      linien.push({ w: Math.random() * Math.PI * 2, r: 0.33 + Math.random() * 0.16, l: 0.25 + Math.random() * 0.35, t: 0, dauer: 0.22 + Math.random() * 0.12, dreh: z.richtung, dick: 3 + Math.random() * 5 });
  }
  function sfx(text, klein) {
    const el = document.createElement("div");
    el.className = "wuerfel-sfx";
    el.textContent = text;
    el.style.left = `${25 + Math.random() * 50}%`;
    el.style.top = `${18 + Math.random() * 22}%`;
    el.style.setProperty("--w", `${(Math.random() - 0.5) * 24}deg`);
    if (klein) el.classList.add("klein");
    el.style.color = ["#ffe600", "#00e5ff", "#ff2bd6", "#ff8a00"][Math.floor(Math.random() * 4)];
    wurzel.appendChild(el);
    setTimeout(() => el.remove(), 700);
  }

  // ---------- Gelöst: BOOM! ----------
  let explosion = [];
  let boomEl = null;
  const zeiten = [];
  function geloest() {
    modus = "geloest";
    endZeit = performance.now();
    const ms = endZeit - startZeit;
    knoepfe();
    hud();
    status(`Gelöst in ${zeitText(ms)} · ${zugZahl} Züge`);
    const r = wurzel.getBoundingClientRect();
    const cx = r.width / 2;
    const cy = r.height * 0.46;
    const farben = ["#ffe600", "#ff2bd6", "#00e5ff", "#ff2a3d", "#ff8a00", "#ffffff"];
    for (let i = 0; i < 200; i++) {
      const w = Math.random() * Math.PI * 2;
      const v = 160 + Math.random() * 800;
      explosion.push({ x: cx, y: cy, vx: Math.cos(w) * v, vy: Math.sin(w) * v - 120, r: 3 + Math.random() * 12, farbe: farben[i % farben.length], t: 0, leben: 0.9 + Math.random() * 1.1 });
    }
    for (let ring = 0; ring < 3; ring++) explosion.push({ ring: true, x: cx, y: cy, t: -ring * 0.12, leben: 1.1, farbe: farben[ring + 1] });
    let n = 0;
    const blitzFarben = ["#ffe600", "#ff2bd6", "#00e5ff", "#ffffff"];
    const id = setInterval(() => {
      blitz.style.background = blitzFarben[n % blitzFarben.length];
      blitz.style.opacity = n % 2 ? "0" : "0.55";
      if (++n > 7) {
        clearInterval(id);
        blitz.style.opacity = "0";
      }
    }, 70);
    zeiten.push(id);
    glitchStart(1.4);
    boomEl = document.createElement("div");
    boomEl.className = "wuerfel-boom";
    boomEl.innerHTML = `<span class="wort">BOOM!</span><span class="unter">SOLVED! ${zeitText(ms)}</span>`;
    wurzel.appendChild(boomEl);
    navigator.vibrate?.([40, 40, 80]);
    // Nach dem großen Knall: Ergebnis melden (Bestzeit, Bestenliste) und Fenster zeigen
    zeiten.push(
      setTimeout(() => {
        boomWeg();
        const sek = ms / 1000;
        const neu = ergebnis({ gewonnen: true, zeit: sek });
        nachricht(`<p class="big">Gelöst!</p><p>${zeitText(ms)} min · ${zugZahl} Züge${neu ? " · neue Bestzeit!" : ""}</p><p><button class="btn" type="button" data-wuerfel-neu>Nochmal mischen</button></p>`);
        document.querySelector("#stage-msg [data-wuerfel-neu]")?.addEventListener("click", (e) => {
          e.stopPropagation();
          mischen();
        });
      }, 2300)
    );
  }
  function boomWeg() {
    boomEl?.remove();
    boomEl = null;
  }

  // ---------- Effekt-Ebene ----------
  function zeichneEffekte(dt, b, h) {
    const s = effekte.width / Math.max(1, b);
    fx.setTransform(1, 0, 0, 1, 0, 0);
    fx.clearRect(0, 0, effekte.width, effekte.height);
    fx.setTransform(s, 0, 0, s, 0, 0);
    const mitte = aufBildschirm(new T.Vector3(0, 0, 0));
    const R = Math.min(b, h);
    linien = linien.filter((l) => (l.t += dt) < l.dauer);
    fx.lineCap = "round";
    for (const l of linien) {
      const k = l.t / l.dauer;
      const w0 = l.w + l.dreh * k * 0.9;
      fx.strokeStyle = `rgba(10, 8, 16, ${0.9 * (1 - k)})`;
      fx.lineWidth = l.dick * (1 - k * 0.6);
      fx.beginPath();
      fx.arc(mitte.x, mitte.y, l.r * R, w0, w0 + l.l * l.dreh, l.dreh < 0);
      fx.stroke();
    }
    explosion = explosion.filter((p) => (p.t += dt) < p.leben);
    for (const p of explosion) {
      if (p.t < 0) continue;
      const k = p.t / p.leben;
      if (p.ring) {
        const rad = 40 + k * Math.max(b, h) * 0.7;
        fx.fillStyle = p.farbe;
        for (let i = 0; i < 46; i++) {
          const w2 = (i / 46) * Math.PI * 2;
          fx.beginPath();
          fx.arc(p.x + Math.cos(w2) * rad, p.y + Math.sin(w2) * rad, 9 * (1 - k) + 1, 0, Math.PI * 2);
          fx.fill();
        }
        continue;
      }
      // auf Zweiern bewegen: Position nur alle 1/12 s
      const tz = Math.floor(p.t * 12) / 12;
      const x = p.x + p.vx * tz;
      const y = p.y + p.vy * tz + 500 * tz * tz;
      const r = p.r * (1 - k * 0.7);
      fx.fillStyle = "#0b0a10";
      fx.beginPath();
      fx.arc(x + 2.5, y + 2.5, r, 0, Math.PI * 2);
      fx.fill();
      fx.fillStyle = p.farbe;
      fx.beginPath();
      fx.arc(x, y, r, 0, Math.PI * 2);
      fx.fill();
    }
  }

  // ---------- Hintergrund: dunkle Stadt mit Graffiti, Spritzern und Aquarellflecken ----------
  function maleHintergrund(b, h) {
    const s = Math.min(window.devicePixelRatio || 1, 1.5);
    hinter.width = Math.round(b * s);
    hinter.height = Math.round(h * s);
    const g = hinter.getContext("2d");
    g.setTransform(s, 0, 0, s, 0, 0);
    let saat = 7;
    const z = () => (saat = (saat * 16807) % 2147483647) / 2147483647;
    const vl = g.createLinearGradient(0, 0, 0, h);
    vl.addColorStop(0, "#1b0b33");
    vl.addColorStop(0.55, "#2a0f3d");
    vl.addColorStop(1, "#0b0712");
    g.fillStyle = vl;
    g.fillRect(0, 0, b, h);
    g.globalCompositeOperation = "screen";
    const aqua = ["rgba(255,43,214,0.28)", "rgba(0,229,255,0.24)", "rgba(255,230,0,0.18)", "rgba(255,138,0,0.2)"];
    for (let i = 0; i < 9; i++) {
      const x = z() * b;
      const y = z() * h * 0.8;
      const r = (0.12 + z() * 0.22) * Math.max(b, h);
      const rg = g.createRadialGradient(x, y, r * 0.1, x, y, r);
      rg.addColorStop(0, aqua[i % aqua.length]);
      rg.addColorStop(0.7, aqua[i % aqua.length].replace(/[\d.]+\)$/, "0.08)"));
      rg.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = rg;
      g.beginPath();
      for (let k = 0; k <= 24; k++) {
        const w = (k / 24) * Math.PI * 2;
        const rr = r * (0.75 + z() * 0.3);
        if (k) g.lineTo(x + Math.cos(w) * rr, y + Math.sin(w) * rr);
        else g.moveTo(x + Math.cos(w) * rr, y + Math.sin(w) * rr);
      }
      g.fill();
    }
    g.globalCompositeOperation = "source-over";
    const boden = h * 0.82;
    for (let reihe = 0; reihe < 2; reihe++) {
      let x = -20;
      while (x < b + 20) {
        const bw = 40 + z() * 90;
        const bh = (reihe ? 0.18 : 0.3) * h + z() * h * (reihe ? 0.22 : 0.28);
        g.fillStyle = reihe ? "#0a0611" : "#170b25";
        g.fillRect(x, boden - bh + reihe * 40, bw, bh + h);
        if (!reihe)
          for (let fy = boden - bh + 12; fy < boden; fy += 16)
            for (let fx2 = x + 8; fx2 < x + bw - 8; fx2 += 14)
              if (z() < 0.35) {
                g.fillStyle = z() < 0.5 ? "rgba(255,230,0,0.55)" : "rgba(0,229,255,0.45)";
                g.fillRect(fx2, fy, 6, 8);
              }
        x += bw + 4;
      }
    }
    const spray = ["#ff2bd6", "#00e5ff", "#ffe600", "#ff8a00", "#39ff88"];
    g.lineCap = "round";
    g.lineJoin = "round";
    for (let i = 0; i < 14; i++) {
      const x = z() * b;
      const y = h * 0.55 + z() * h * 0.38;
      g.strokeStyle = spray[i % spray.length];
      g.globalAlpha = 0.55 + z() * 0.3;
      g.lineWidth = 4 + z() * 9;
      g.shadowColor = g.strokeStyle;
      g.shadowBlur = 12;
      g.beginPath();
      g.moveTo(x, y);
      for (let k = 0; k < 3; k++) g.bezierCurveTo(x + (z() - 0.3) * 160, y + (z() - 0.5) * 90, x + (z() - 0.2) * 200, y + (z() - 0.5) * 90, x + (k + 1) * (40 + z() * 60), y + (z() - 0.5) * 50);
      g.stroke();
    }
    g.shadowBlur = 0;
    g.globalAlpha = 0.5;
    g.font = `${Math.round(Math.min(b, h) * 0.09)}px Bangers, Impact, sans-serif`;
    const tags = ["POW", "ZAP!", "SKRR", "H-FI24", "OK!"];
    for (let i = 0; i < 4; i++) {
      g.save();
      g.translate(z() * b * 0.9, h * 0.62 + z() * h * 0.3);
      g.rotate((z() - 0.5) * 0.5);
      g.fillStyle = spray[(i + 2) % spray.length];
      g.strokeStyle = "#0b0a10";
      g.lineWidth = 5;
      g.strokeText(tags[i % tags.length], 0, 0);
      g.fillText(tags[i % tags.length], 0, 0);
      g.restore();
    }
    g.globalAlpha = 1;
    for (let i = 0; i < 22; i++) {
      const x = z() * b;
      const y = z() * h;
      g.fillStyle = spray[Math.floor(z() * spray.length)];
      g.globalAlpha = 0.5 + z() * 0.4;
      const r = 4 + z() * 18;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
      for (let k = 0; k < 7; k++) {
        const w = z() * Math.PI * 2;
        const d = r * (1.3 + z() * 2.5);
        g.beginPath();
        g.arc(x + Math.cos(w) * d, y + Math.sin(w) * d, 1 + z() * r * 0.3, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.globalAlpha = 1;
    g.fillStyle = "rgba(0,0,0,0.35)";
    for (let y = 0; y < h; y += 9)
      for (let x = (y / 9) % 2 ? 4.5 : 0; x < b; x += 9) {
        g.beginPath();
        g.arc(x, y, 1 + 1.6 * (y / h), 0, Math.PI * 2);
        g.fill();
      }
  }

  // ---------- Größe (nach dem Container, nicht nach dem Fenster) ----------
  let breite = 1;
  let hoehe = 1;
  function groesse() {
    const r = wurzel.getBoundingClientRect();
    const b = Math.max(1, Math.round(r.width));
    const h = Math.max(1, Math.round(r.height));
    if (b === breite && h === hoehe) return;
    breite = b;
    hoehe = h;
    renderer.setSize(b, h, false);
    kamera.aspect = b / h;
    // Hochformat: Blickwinkel so weit öffnen, dass der Würfel auch in der Breite ganz zu sehen ist
    kamera.fov = b < h ? (2 * Math.atan(Math.tan((31 * Math.PI) / 360) / (b / h)) * 180) / Math.PI : 41; // etwas Luft für Anzeige oben und Knöpfe unten
    kamera.updateProjectionMatrix();
    ziel.setSize(Math.round(b * PR), Math.round(h * PR));
    postMat.uniforms.uVersatz.value.set(1.6 / b, 1.2 / h);
    effekte.width = Math.round(b * PR);
    effekte.height = Math.round(h * PR);
    maleHintergrund(b, h);
  }
  const beobachter = new ResizeObserver(groesse);
  beobachter.observe(wurzel);

  // ---------- Hauptschleife ----------
  let letzte = performance.now();
  let raf = 0;
  function bild(jetzt) {
    raf = requestAnimationFrame(bild);
    const dt = Math.min(0.05, (jetzt - letzte) / 1000);
    letzte = jetzt;
    groesse();
    if (modus !== "pause") {
      naechsteAnimation();
      animationSchritt(dt);
    }
    if (modus === "geloest") ansicht.theta += dt * 0.6;
    const { theta, phi, abstand } = ansicht;
    kamera.position.set(abstand * Math.sin(phi) * Math.sin(theta), abstand * Math.cos(phi), abstand * Math.sin(phi) * Math.cos(theta));
    kamera.lookAt(0, 0, 0);
    // Licht kommt immer von oben links vorn (relativ zur Kamera)
    lichtWelt.set(-0.38, 0.62, 0.86).applyQuaternion(kamera.quaternion).normalize();
    glitch = Math.max(0, glitch - dt * 5);
    postMat.uniforms.uGlitch.value = glitch;
    postMat.uniforms.uZeit.value = jetzt / 1000;
    const zittern = glitch > 0.05 ? glitch * 5 : 0;
    buehne.style.transform = zittern ? `translate(${(Math.random() - 0.5) * zittern}px, ${(Math.random() - 0.5) * zittern}px)` : "";
    renderer.setRenderTarget(ziel);
    renderer.clear();
    renderer.render(szene, kamera);
    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(postSzene, postKamera);
    zeichneEffekte(dt, breite, hoehe);
    hud();
  }

  baueSteine();
  groesse();
  knoepfe();
  hud();
  document.fonts?.load?.('40px "Bangers"').then(() => {
    breite = 0; // Hintergrund mit der Comic-Schrift neu malen
  }).catch(() => {});
  raf = requestAnimationFrame(bild);
  if (import.meta.env?.DEV) window.__wuerfel = { modus: () => modus, istGeloest: () => istGeloest(steine), mischen: (txt) => mischen(txt.split(" ").map(ausNotation)) };

  return {
    pause() {
      if (modus !== "laeuft") return;
      modus = "pause";
      pausiertBei = performance.now();
      nachricht(`<p class="big">Pause</p><p><button class="btn" type="button" data-wuerfel-weiter>Weiter</button></p>`);
      document.querySelector("#stage-msg [data-wuerfel-weiter]")?.addEventListener("click", (e) => {
        e.stopPropagation();
        startZeit += performance.now() - pausiertBei;
        modus = "laeuft";
        nachricht(null);
      });
    },
    stop() {
      cancelAnimationFrame(raf);
      zeiten.forEach((id) => (clearTimeout(id), clearInterval(id)));
      window.removeEventListener("keydown", onKey);
      beobachter.disconnect();
      for (const m of materialien) m.dispose();
      postMat.dispose();
      [geoKoerper, geoHuelle, geoAufkleber, postGeo].forEach((g) => g.dispose());
      ziel.dispose();
      renderer.dispose();
      renderer.forceContextLoss?.();
      dom.innerHTML = "";
    },
  };
}
