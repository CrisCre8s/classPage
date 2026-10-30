// Kleine SQL-Engine für den SQL-Sprint: führt SELECT-Abfragen auf Tabellen im Speicher aus.
// Unterstützt: SELECT [DISTINCT] … FROM t [alias] [INNER|LEFT JOIN t2 [alias] ON …] [WHERE …]
// [GROUP BY …] [HAVING …] [ORDER BY … [ASC|DESC]] [LIMIT n], Ausdrücke mit + - * /,
// = <> != < > <= >=, AND OR NOT, LIKE, IN (…), BETWEEN, IS [NOT] NULL,
// COUNT(*) COUNT(x) SUM AVG MIN MAX, UPPER LOWER LENGTH ROUND.

export class SqlFehler extends Error {}

const SCHLUESSEL = new Set(
  "SELECT DISTINCT FROM WHERE AND OR NOT JOIN INNER LEFT OUTER ON GROUP BY HAVING ORDER ASC DESC LIMIT AS LIKE IN BETWEEN IS NULL".split(" "),
);
const AGGREGATE = new Set(["COUNT", "SUM", "AVG", "MIN", "MAX"]);
const FUNKTIONEN = new Set([...AGGREGATE, "UPPER", "LOWER", "LENGTH", "ROUND"]);

function zerlege(sql) {
  const t = [];
  let i = 0;
  while (i < sql.length) {
    const c = sql[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (c === "-" && sql[i + 1] === "-") {
      while (i < sql.length && sql[i] !== "\n") i++;
      continue;
    }
    if (c === "'" || c === '"') {
      let j = i + 1;
      let s = "";
      while (j < sql.length) {
        if (sql[j] === c && sql[j + 1] === c) {
          s += c;
          j += 2;
        } else if (sql[j] === c) break;
        else s += sql[j++];
      }
      if (j >= sql.length) throw new SqlFehler("Ein Text in Anführungszeichen ist nicht geschlossen.");
      t.push({ art: "text", wert: s });
      i = j + 1;
      continue;
    }
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(sql[i + 1]))) {
      let j = i;
      while (j < sql.length && /[0-9.]/.test(sql[j])) j++;
      t.push({ art: "zahl", wert: Number(sql.slice(i, j)) });
      i = j;
      continue;
    }
    if (/[A-Za-z_äöüÄÖÜß]/.test(c)) {
      let j = i;
      while (j < sql.length && /[A-Za-z0-9_äöüÄÖÜß]/.test(sql[j])) j++;
      const w = sql.slice(i, j);
      const gross = w.toUpperCase();
      t.push(SCHLUESSEL.has(gross) ? { art: "wort", wert: gross } : { art: "name", wert: w.toLowerCase(), roh: w });
      i = j;
      continue;
    }
    const zwei = sql.slice(i, i + 2);
    if (["<>", "!=", "<=", ">="].includes(zwei)) {
      t.push({ art: "op", wert: zwei === "!=" ? "<>" : zwei });
      i += 2;
      continue;
    }
    if ("=<>+-*/(),.;".includes(c)) {
      t.push({ art: "op", wert: c });
      i++;
      continue;
    }
    throw new SqlFehler(`Unbekanntes Zeichen „${c}“.`);
  }
  return t;
}

function parse(sql) {
  const t = zerlege(sql);
  let p = 0;
  const sieh = (o = 0) => t[p + o];
  const ist = (art, wert, o = 0) => sieh(o) && sieh(o).art === art && (wert === undefined || sieh(o).wert === wert);
  const wort = (w) => ist("wort", w);
  const nimm = (art, wert, text) => {
    if (!ist(art, wert)) throw new SqlFehler(text || `Erwartet: ${wert || art}${sieh() ? `, gefunden: „${sieh().roh || sieh().wert}“` : " (Abfrage endet zu früh)"}.`);
    return t[p++];
  };

  function primaer() {
    if (ist("op", "(")) {
      p++;
      const e = ausdruck();
      nimm("op", ")");
      return e;
    }
    if (ist("zahl")) return { art: "wert", wert: t[p++].wert };
    if (ist("text")) return { art: "wert", wert: t[p++].wert };
    if (wort("NULL")) {
      p++;
      return { art: "wert", wert: null };
    }
    if (ist("op", "-")) {
      p++;
      return { art: "bin", op: "-", a: { art: "wert", wert: 0 }, b: primaer() };
    }
    if (ist("op", "*")) {
      p++;
      return { art: "stern" };
    }
    if (ist("name")) {
      const n = t[p++];
      if (ist("op", "(")) {
        const f = n.wert.toUpperCase();
        if (!FUNKTIONEN.has(f)) throw new SqlFehler(`Unbekannte Funktion ${n.roh}().`);
        p++;
        let distinct = false;
        if (wort("DISTINCT")) {
          p++;
          distinct = true;
        }
        const args = [];
        if (!ist("op", ")")) {
          args.push(ausdruck());
          while (ist("op", ",")) {
            p++;
            args.push(ausdruck());
          }
        }
        nimm("op", ")");
        return { art: "fn", f, args, distinct };
      }
      if (ist("op", ".")) {
        p++;
        if (ist("op", "*")) {
          p++;
          return { art: "stern", tab: n.wert };
        }
        const s = nimm("name", undefined, "Nach dem Punkt fehlt der Spaltenname.");
        return { art: "spalte", tab: n.wert, name: s.wert, roh: `${n.roh}.${s.roh}` };
      }
      return { art: "spalte", name: n.wert, roh: n.roh };
    }
    throw new SqlFehler(sieh() ? `Unerwartet: „${sieh().roh || sieh().wert}“.` : "Die Abfrage endet zu früh.");
  }
  function produkt() {
    let a = primaer();
    while (ist("op", "*") || ist("op", "/")) a = { art: "bin", op: t[p++].wert, a, b: primaer() };
    return a;
  }
  function summe() {
    let a = produkt();
    while (ist("op", "+") || ist("op", "-")) a = { art: "bin", op: t[p++].wert, a, b: produkt() };
    return a;
  }
  function vergleich() {
    const a = summe();
    if (ist("op") && ["=", "<>", "<", ">", "<=", ">="].includes(sieh().wert)) return { art: "bin", op: t[p++].wert, a, b: summe() };
    let nicht = false;
    if (wort("NOT") && (ist("wort", "LIKE", 1) || ist("wort", "IN", 1) || ist("wort", "BETWEEN", 1))) {
      p++;
      nicht = true;
    }
    if (wort("LIKE")) {
      p++;
      return { art: "like", a, b: summe(), nicht };
    }
    if (wort("IN")) {
      p++;
      nimm("op", "(");
      const liste = [ausdruck()];
      while (ist("op", ",")) {
        p++;
        liste.push(ausdruck());
      }
      nimm("op", ")");
      return { art: "in", a, liste, nicht };
    }
    if (wort("BETWEEN")) {
      p++;
      const von = summe();
      nimm("wort", "AND");
      return { art: "between", a, von, bis: summe(), nicht };
    }
    if (wort("IS")) {
      p++;
      let n = false;
      if (wort("NOT")) {
        p++;
        n = true;
      }
      nimm("wort", "NULL");
      return { art: "isnull", a, nicht: n };
    }
    return a;
  }
  function nicht() {
    if (wort("NOT")) {
      p++;
      return { art: "not", a: nicht() };
    }
    return vergleich();
  }
  function und() {
    let a = nicht();
    while (wort("AND")) {
      p++;
      a = { art: "and", a, b: nicht() };
    }
    return a;
  }
  function ausdruck() {
    let a = und();
    while (wort("OR")) {
      p++;
      a = { art: "or", a, b: und() };
    }
    return a;
  }
  function tabelle() {
    const n = nimm("name", undefined, "Nach FROM bzw. JOIN fehlt der Tabellenname.");
    let alias = n.wert;
    if (wort("AS")) p++;
    if (ist("name")) alias = t[p++].wert;
    return { name: n.wert, roh: n.roh, alias };
  }

  nimm("wort", "SELECT", "Eine Abfrage beginnt mit SELECT.");
  const q = { distinct: false, spalten: [], joins: [], gruppe: [], ordnung: [] };
  if (wort("DISTINCT")) {
    p++;
    q.distinct = true;
  }
  do {
    if (ist("op", ",")) p++;
    const e = ausdruck();
    let alias = null;
    if (wort("AS")) {
      p++;
      alias = nimm("name", undefined, "Nach AS fehlt ein Name.").roh;
    } else if (ist("name")) alias = t[p++].roh;
    q.spalten.push({ e, alias });
  } while (ist("op", ","));
  nimm("wort", "FROM", "Es fehlt FROM mit der Tabelle.");
  q.von = tabelle();
  while (wort("JOIN") || wort("INNER") || wort("LEFT")) {
    let links = false;
    if (wort("LEFT")) {
      p++;
      links = true;
      if (wort("OUTER")) p++;
    } else if (wort("INNER")) p++;
    nimm("wort", "JOIN");
    const tab = tabelle();
    nimm("wort", "ON", "Bei JOIN fehlt ON mit der Verknüpfung.");
    q.joins.push({ tab, on: ausdruck(), links });
  }
  if (wort("WHERE")) {
    p++;
    q.wo = ausdruck();
  }
  if (wort("GROUP")) {
    p++;
    nimm("wort", "BY");
    q.gruppe.push(ausdruck());
    while (ist("op", ",")) {
      p++;
      q.gruppe.push(ausdruck());
    }
  }
  if (wort("HAVING")) {
    p++;
    q.having = ausdruck();
  }
  if (wort("ORDER")) {
    p++;
    nimm("wort", "BY");
    do {
      if (ist("op", ",")) p++;
      const e = ausdruck();
      let ab = false;
      if (wort("ASC")) p++;
      else if (wort("DESC")) {
        p++;
        ab = true;
      }
      q.ordnung.push({ e, ab });
    } while (ist("op", ","));
  }
  if (wort("LIMIT")) {
    p++;
    q.limit = nimm("zahl", undefined, "Nach LIMIT fehlt eine Zahl.").wert;
  }
  if (ist("op", ";")) p++;
  if (p < t.length) throw new SqlFehler(`Unerwartet: „${sieh().roh || sieh().wert}“.`);
  return q;
}

const hatAggregat = (e) => e && (e.art === "fn" ? AGGREGATE.has(e.f) || e.args.some(hatAggregat) : ["bin", "and", "or"].includes(e.art) ? hatAggregat(e.a) || hatAggregat(e.b) : ["not", "like", "in", "between", "isnull"].includes(e.art) ? hatAggregat(e.a) : false);

function vergleiche(a, b) {
  if (a === null || b === null) return null;
  if (typeof a === "number" && typeof b === "string" && b.trim() !== "" && !isNaN(b)) b = Number(b);
  if (typeof b === "number" && typeof a === "string" && a.trim() !== "" && !isNaN(a)) a = Number(a);
  if (typeof a === "string" && typeof b === "string") {
    const x = a.toLowerCase();
    const y = b.toLowerCase();
    return x < y ? -1 : x > y ? 1 : 0;
  }
  return a < b ? -1 : a > b ? 1 : 0;
}

// db = { tabellenname: { spalten: [...], zeilen: [[...], ...] } }
export function fuehreAus(db, sql) {
  const q = parse(sql);
  const tabelleHolen = (tab) => {
    const d = db[tab.name];
    if (!d) throw new SqlFehler(`Die Tabelle „${tab.roh}“ gibt es nicht. Vorhanden: ${Object.keys(db).join(", ")}.`);
    return d;
  };
  // Zeilen als Liste von { alias: { spalte: wert } }
  const basis = tabelleHolen(q.von);
  let zeilen = basis.zeilen.map((z) => ({ [q.von.alias]: Object.fromEntries(basis.spalten.map((s, i) => [s, z[i]])) }));
  const quellen = [{ alias: q.von.alias, spalten: basis.spalten }];

  function spaltenWert(zeile, e) {
    if (e.tab) {
      const z = zeile[e.tab];
      if (!z && !quellen.some((q2) => q2.alias === e.tab)) throw new SqlFehler(`Unbekannte Tabelle bzw. Alias „${e.tab}“.`);
      const quelle = quellen.find((q2) => q2.alias === e.tab);
      if (!quelle.spalten.includes(e.name)) throw new SqlFehler(`Die Spalte „${e.roh}“ gibt es nicht.`);
      return z ? z[e.name] : null;
    }
    const treffer = quellen.filter((q2) => q2.spalten.includes(e.name));
    if (!treffer.length) throw new SqlFehler(`Die Spalte „${e.roh}“ gibt es nicht.`);
    if (treffer.length > 1) throw new SqlFehler(`„${e.roh}“ ist mehrdeutig, bitte mit Tabelle angeben (z. B. ${treffer[0].alias}.${e.name}).`);
    return zeile[treffer[0].alias]?.[e.name] ?? null;
  }

  function werte(e, zeile, gruppe, aliasWerte) {
    switch (e.art) {
      case "wert":
        return e.wert;
      case "spalte":
        if (aliasWerte && !e.tab && e.roh.toLowerCase() in aliasWerte) return aliasWerte[e.roh.toLowerCase()];
        return spaltenWert(zeile, e);
      case "stern":
        throw new SqlFehler("* ist hier nicht erlaubt.");
      case "bin": {
        const a = werte(e.a, zeile, gruppe, aliasWerte);
        const b = werte(e.b, zeile, gruppe, aliasWerte);
        if (["+", "-", "*", "/"].includes(e.op)) {
          if (a === null || b === null) return null;
          if (e.op === "+") return Number(a) + Number(b);
          if (e.op === "-") return Number(a) - Number(b);
          if (e.op === "*") return Number(a) * Number(b);
          if (Number(b) === 0) return null;
          return Number(a) / Number(b);
        }
        const v = vergleiche(a, b);
        if (v === null) return null;
        return { "=": v === 0, "<>": v !== 0, "<": v < 0, ">": v > 0, "<=": v <= 0, ">=": v >= 0 }[e.op];
      }
      case "and": {
        const a = werte(e.a, zeile, gruppe, aliasWerte);
        const b = werte(e.b, zeile, gruppe, aliasWerte);
        return a === false || b === false ? false : a === null || b === null ? null : true;
      }
      case "or": {
        const a = werte(e.a, zeile, gruppe, aliasWerte);
        const b = werte(e.b, zeile, gruppe, aliasWerte);
        return a === true || b === true ? true : a === null || b === null ? null : false;
      }
      case "not": {
        const a = werte(e.a, zeile, gruppe, aliasWerte);
        return a === null ? null : !a;
      }
      case "like": {
        const a = werte(e.a, zeile, gruppe, aliasWerte);
        const m = werte(e.b, zeile, gruppe, aliasWerte);
        if (a === null || m === null) return null;
        const re = new RegExp("^" + String(m).replace(/[.+^${}()|[\]\\?*]/g, "\\$&").replace(/%/g, ".*").replace(/_/g, ".") + "$", "i");
        return re.test(String(a)) !== e.nicht;
      }
      case "in": {
        const a = werte(e.a, zeile, gruppe, aliasWerte);
        if (a === null) return null;
        return e.liste.some((x) => vergleiche(a, werte(x, zeile, gruppe, aliasWerte)) === 0) !== e.nicht;
      }
      case "between": {
        const a = werte(e.a, zeile, gruppe, aliasWerte);
        const v1 = vergleiche(a, werte(e.von, zeile, gruppe, aliasWerte));
        const v2 = vergleiche(a, werte(e.bis, zeile, gruppe, aliasWerte));
        if (v1 === null || v2 === null) return null;
        return (v1 >= 0 && v2 <= 0) !== e.nicht;
      }
      case "isnull": {
        const a = werte(e.a, zeile, gruppe, aliasWerte);
        return (a === null) !== e.nicht;
      }
      case "fn": {
        if (AGGREGATE.has(e.f)) {
          if (!gruppe) throw new SqlFehler(`${e.f}() ist hier nicht erlaubt.`);
          let liste;
          if (e.f === "COUNT" && (!e.args.length || e.args[0].art === "stern")) return gruppe.length;
          if (e.args.length !== 1) throw new SqlFehler(`${e.f}() braucht genau einen Wert.`);
          liste = gruppe.map((z) => werte(e.args[0], z, null)).filter((v) => v !== null);
          if (e.distinct) liste = [...new Map(liste.map((v) => [typeof v === "string" ? v.toLowerCase() : v, v])).values()];
          if (e.f === "COUNT") return liste.length;
          if (!liste.length) return null;
          if (e.f === "SUM") return liste.reduce((s, v) => s + Number(v), 0);
          if (e.f === "AVG") return liste.reduce((s, v) => s + Number(v), 0) / liste.length;
          const sortiert = [...liste].sort(vergleiche);
          return e.f === "MIN" ? sortiert[0] : sortiert[sortiert.length - 1];
        }
        const args = e.args.map((a) => werte(a, zeile, gruppe, aliasWerte));
        if (args[0] === null || args[0] === undefined) return null;
        if (e.f === "UPPER") return String(args[0]).toUpperCase();
        if (e.f === "LOWER") return String(args[0]).toLowerCase();
        if (e.f === "LENGTH") return String(args[0]).length;
        if (e.f === "ROUND") {
          const f = 10 ** (args[1] || 0);
          return Math.round(Number(args[0]) * f) / f;
        }
        return null;
      }
    }
    throw new SqlFehler("Ausdruck nicht verstanden.");
  }

  // JOINs
  for (const j of q.joins) {
    const d = tabelleHolen(j.tab);
    quellen.push({ alias: j.tab.alias, spalten: d.spalten });
    const rechts = d.zeilen.map((z) => Object.fromEntries(d.spalten.map((s, i) => [s, z[i]])));
    const neu = [];
    for (const z of zeilen) {
      let treffer = false;
      for (const r of rechts) {
        const kombi = { ...z, [j.tab.alias]: r };
        if (werte(j.on, kombi) === true) {
          neu.push(kombi);
          treffer = true;
        }
      }
      if (!treffer && j.links) neu.push({ ...z, [j.tab.alias]: null });
    }
    zeilen = neu;
  }
  if (q.wo) {
    if (hatAggregat(q.wo)) throw new SqlFehler("In WHERE sind COUNT, SUM usw. nicht erlaubt, dafür gibt es HAVING.");
    zeilen = zeilen.filter((z) => werte(q.wo, z) === true);
  }

  // Spalten (mit * aufgelöst)
  const spalten = [];
  for (const s of q.spalten) {
    if (s.e.art === "stern") {
      for (const qu of quellen) if (!s.e.tab || s.e.tab === qu.alias) for (const sp of qu.spalten) spalten.push({ e: { art: "spalte", tab: qu.alias, name: sp, roh: sp }, name: sp });
    } else spalten.push({ e: s.e, name: s.alias || anzeigeName(s.e) });
  }

  const gruppiert = q.gruppe.length || spalten.some((s) => hatAggregat(s.e)) || hatAggregat(q.having);
  let ergebnisse; // [{ werte: [...], zeile, gruppe }]
  if (gruppiert) {
    const gruppen = new Map();
    for (const z of zeilen) {
      const k = JSON.stringify(q.gruppe.map((g) => {
        const v = werte(g, z);
        return typeof v === "string" ? v.toLowerCase() : v;
      }));
      if (!gruppen.has(k)) gruppen.set(k, []);
      gruppen.get(k).push(z);
    }
    if (!q.gruppe.length && !gruppen.size) gruppen.set("[]", []);
    ergebnisse = [...gruppen.values()].map((g) => ({ zeile: g[0] || {}, gruppe: g }));
    if (q.having) ergebnisse = ergebnisse.filter((r) => werte(q.having, r.zeile, r.gruppe) === true);
  } else ergebnisse = zeilen.map((z) => ({ zeile: z, gruppe: null }));
  for (const r of ergebnisse) r.werte = spalten.map((s) => werte(s.e, r.zeile, r.gruppe));

  if (q.distinct) {
    const gesehen = new Set();
    ergebnisse = ergebnisse.filter((r) => {
      const k = JSON.stringify(r.werte.map((v) => (typeof v === "string" ? v.toLowerCase() : v)));
      if (gesehen.has(k)) return false;
      gesehen.add(k);
      return true;
    });
  }
  if (q.ordnung.length) {
    const schluessel = (r, o) => {
      if (o.e.art === "wert" && typeof o.e.wert === "number") return r.werte[o.e.wert - 1];
      const aliasWerte = Object.fromEntries(spalten.map((s, i) => [String(s.name).toLowerCase(), r.werte[i]]));
      return werte(o.e, r.zeile, r.gruppe, aliasWerte);
    };
    ergebnisse.forEach((r) => (r.sort = q.ordnung.map((o) => schluessel(r, o))));
    ergebnisse.sort((a, b) => {
      for (let i = 0; i < q.ordnung.length; i++) {
        const x = a.sort[i];
        const y = b.sort[i];
        if (x === y) continue;
        if (x === null) return 1;
        if (y === null) return -1;
        const v = vergleiche(x, y);
        if (v) return q.ordnung[i].ab ? -v : v;
      }
      return 0;
    });
  }
  if (q.limit !== undefined) ergebnisse = ergebnisse.slice(0, q.limit);
  return { spalten: spalten.map((s) => s.name), zeilen: ergebnisse.map((r) => r.werte), sortiert: q.ordnung.length > 0 };
}

function anzeigeName(e) {
  if (e.art === "spalte") return e.roh;
  if (e.art === "fn") return `${e.f}(${e.args.map((a) => (a.art === "stern" ? "*" : anzeigeName(a))).join(", ")})`;
  if (e.art === "bin") return `${anzeigeName(e.a)} ${e.op} ${anzeigeName(e.b)}`;
  if (e.art === "wert") return String(e.wert);
  return "Ausdruck";
}

// Ergebnis einer Eingabe mit der Musterlösung vergleichen (Spaltennamen egal, Reihenfolge nur bei ORDER BY)
export function gleichesErgebnis(ist, soll) {
  if (ist.zeilen.length !== soll.zeilen.length) return { ok: false, grund: `Du bekommst ${ist.zeilen.length} Zeile${ist.zeilen.length === 1 ? "" : "n"}, erwartet sind ${soll.zeilen.length}.` };
  if (ist.spalten.length !== soll.spalten.length) return { ok: false, grund: `Du bekommst ${ist.spalten.length} Spalte${ist.spalten.length === 1 ? "" : "n"}, erwartet sind ${soll.spalten.length}.` };
  const norm = (v) => (v === null ? "∅" : typeof v === "number" ? String(Math.round(v * 100) / 100) : String(v).toLowerCase());
  const zeile = (z) => z.map(norm).join("\u0001");
  const a = ist.zeilen.map(zeile);
  const b = soll.zeilen.map(zeile);
  if (soll.sortiert) {
    if (a.every((z, i) => z === b[i])) return { ok: true };
    const gleicheMenge = [...a].sort().join("\u0002") === [...b].sort().join("\u0002");
    return { ok: false, grund: gleicheMenge ? "Die Zeilen stimmen, aber die Reihenfolge nicht (ORDER BY?)." : "Die Werte stimmen nicht mit dem erwarteten Ergebnis überein." };
  }
  return [...a].sort().join("\u0002") === [...b].sort().join("\u0002") ? { ok: true } : { ok: false, grund: "Die Werte stimmen nicht mit dem erwarteten Ergebnis überein." };
}
