// C#-Code: kleine Code-Stücke lesen und verstehen. Was gibt der Code aus, welche Zeile ist richtig,
// was bedeutet static, wie schreibt man eine Property? Passend zur LK (Konstruktor, static, get; set;,
// Unterprogramme, Überladung, Standardparameter; Merksätze: Rückgabewert gehört nicht zur Signatur,
// return gibt einen Wert zurück und beendet die Methode).
import { quizSpiel, esc } from "./quiz-ui.js";

export const DOM = true;
export const HILFE = "Antwort antippen oder Taste 1–4 · 120 Sekunden · bei Fehlern hält die Zeit an, mit „Weiter“ oder Enter geht's zur nächsten Frage";

const code = (zeilen) => `<pre class="quiz-code">${esc(zeilen.join("\n"))}</pre>`;
// { s: Stufe 1–3, t: Thema, f: Frage, c: Code (Zeilen), o: Optionen (erste = richtig), e: Erklärung }
export const FRAGEN = [
  // ---------- Basics und Variablen ----------
  { s: 1, t: "Variablen", f: "Was gibt der Code aus?", c: ["int a = 7;", "int b = 2;", "Console.WriteLine(a / b);"], o: ["3", "3.5", "4", "Fehler"], e: "int / int ist eine Ganzzahl-Division, der Rest fällt weg." },
  { s: 1, t: "Variablen", f: "Was gibt der Code aus?", c: ["int a = 7;", "int b = 2;", "Console.WriteLine(a % b);"], o: ["1", "3", "3.5", "0"], e: "% ist der Rest der Division: 7 = 3 · 2 + 1." },
  { s: 1, t: "Datentypen", f: "Welcher Datentyp passt für „true“ oder „false“?", o: ["bool", "int", "string", "char"], e: "bool kennt nur true und false." },
  { s: 1, t: "Datentypen", f: "Welche Zeile kompiliert NICHT?", o: ["int zahl = \"5\";", "string text = \"5\";", "double d = 5;", "char c = '5';"], e: "Ein string lässt sich nicht einfach einem int zuweisen. Man bräuchte int.Parse(\"5\")." },
  { s: 1, t: "Strings", f: "Was gibt der Code aus?", c: ["string name = \"Lea\";", "Console.WriteLine($\"Hallo {name}!\");"], o: ["Hallo Lea!", "Hallo {name}!", "Hallo name!", "$Hallo Lea!"], e: "Mit $ vor dem String werden Ausdrücke in {} eingesetzt (String-Interpolation)." },
  { s: 1, t: "Strings", f: "Was gibt der Code aus?", c: ["string a = \"5\";", "string b = \"3\";", "Console.WriteLine(a + b);"], o: ["53", "8", "5 3", "Fehler"], e: "+ hängt Strings aneinander, gerechnet wird nicht." },
  { s: 1, t: "Bedingungen", f: "Was gibt der Code aus?", c: ["int x = 10;", "if (x > 5 && x < 10)", "    Console.WriteLine(\"A\");", "else", "    Console.WriteLine(\"B\");"], o: ["B", "A", "AB", "nichts"], e: "x < 10 ist bei x = 10 falsch, also greift else." },
  { s: 1, t: "Schleifen", f: "Wie oft wird „Hi“ ausgegeben?", c: ["for (int i = 0; i < 3; i++)", "    Console.WriteLine(\"Hi\");"], o: ["3", "2", "4", "unendlich"], e: "i nimmt die Werte 0, 1 und 2 an." },
  { s: 1, t: "Variablen", f: "Was gibt der Code aus?", c: ["int x = 5;", "x += 3;", "x++;", "Console.WriteLine(x);"], o: ["9", "8", "6", "53"], e: "5 + 3 = 8, dann um 1 erhöht: 9." },
  { s: 1, t: "Arrays", f: "Was gibt der Code aus?", c: ["int[] z = { 4, 8, 15 };", "Console.WriteLine(z[1]);"], o: ["8", "4", "15", "Fehler"], e: "Arrays beginnen bei Index 0, z[1] ist das zweite Element." },
  { s: 1, t: "Methoden", f: "Was bedeutet void bei einer Methode?", o: ["Sie gibt keinen Wert zurück", "Sie ist privat", "Sie ist statisch", "Sie hat keine Parameter"], e: "void heißt „leer“: Die Methode liefert nichts zurück." },

  // ---------- Klassen und Konstruktor ----------
  { s: 1, t: "Konstruktor", f: "Wie ruft man den Konstruktor dieser Klasse richtig auf?", c: ["class Auto", "{", "    public Auto(string marke) { }", "}"], o: ["Auto a = new Auto(\"VW\");", "Auto a = Auto(\"VW\");", "Auto a = new Auto;", "Auto a = Auto.new(\"VW\");"], e: "Objekte entstehen mit new, danach Klassenname und die Parameter des Konstruktors." },
  { s: 1, t: "Konstruktor", f: "Woran erkennt man einen Konstruktor?", o: ["Er heißt wie die Klasse und hat keinen Rückgabetyp", "Er heißt immer Main", "Er gibt immer void zurück", "Er beginnt mit static"], e: "Ein Konstruktor hat den Namen der Klasse und keinen Rückgabetyp, auch kein void." },
  { s: 2, t: "Konstruktor", f: "Was gibt der Code aus?", c: ["class Hund", "{", "    public string Name;", "    public Hund(string name) { Name = name; }", "}", "", "Hund h = new Hund(\"Bello\");", "Console.WriteLine(h.Name);"], o: ["Bello", "Name", "null", "Fehler"], e: "Der Konstruktor speichert den Parameter im Feld Name." },
  { s: 2, t: "Konstruktor", f: "Was passiert hier?", c: ["class Punkt", "{", "    public Punkt(int x, int y) { }", "}", "", "Punkt p = new Punkt();"], o: ["Kompilierfehler: Es gibt keinen Konstruktor ohne Parameter", "p ist (0, 0)", "p ist null", "Laufzeitfehler"], e: "Sobald man einen eigenen Konstruktor schreibt, gibt es keinen automatischen leeren Konstruktor mehr." },
  { s: 2, t: "Konstruktor", f: "Wozu dient this in diesem Konstruktor?", c: ["public Person(string name)", "{", "    this.name = name;", "}"], o: ["Es meint das Feld des Objekts, nicht den Parameter", "Es ruft einen anderen Konstruktor auf", "Es macht das Feld statisch", "Es ist hier ein Fehler"], e: "this.name ist das Feld, name allein ist der gleichnamige Parameter." },
  { s: 3, t: "Konstruktor", f: "Was gibt der Code aus?", c: ["class A", "{", "    public A() : this(5) { Console.Write(\"B\"); }", "    public A(int x) { Console.Write(\"A\" + x); }", "}", "", "new A();"], o: ["A5B", "BA5", "B", "A5"], e: ": this(5) ruft zuerst den anderen Konstruktor auf, danach läuft der eigene Rumpf." },
  { s: 3, t: "Konstruktor", f: "Welche Aussage zur Konstruktorverkettung mit base(…) stimmt?", c: ["class Tier { public Tier(string n) { } }", "class Katze : Tier", "{", "    public Katze() : base(\"Mimi\") { }", "}"], o: ["base(\"Mimi\") ruft den Konstruktor der Basisklasse Tier auf", "base erzeugt ein zweites Objekt", "base ist nur bei static erlaubt", "Ohne base läuft kein Konstruktor"], e: "Mit : base(…) gibt die abgeleitete Klasse Werte an den Konstruktor der Basisklasse weiter." },

  // ---------- static und Klassenvariablen ----------
  { s: 1, t: "static", f: "Was ist eine Klassenvariable (static-Feld)?", o: ["Eine Variable, die sich alle Objekte der Klasse teilen", "Eine Variable, die jedes Objekt einzeln hat", "Eine Variable, die man nicht ändern kann", "Eine lokale Variable in einer Methode"], e: "static-Felder gehören zur Klasse, nicht zu einem einzelnen Objekt." },
  { s: 2, t: "static", f: "Was gibt der Code aus?", c: ["class Zaehler", "{", "    public static int Anzahl = 0;", "    public Zaehler() { Anzahl++; }", "}", "", "new Zaehler(); new Zaehler(); new Zaehler();", "Console.WriteLine(Zaehler.Anzahl);"], o: ["3", "1", "0", "Fehler"], e: "Alle drei Objekte erhöhen dieselbe Klassenvariable." },
  { s: 2, t: "static", f: "Wie ruft man eine statische Methode richtig auf?", c: ["class Rechner", "{", "    public static int Doppelt(int x) => x * 2;", "}"], o: ["Rechner.Doppelt(4);", "new Rechner().Doppelt(4);", "Doppelt.Rechner(4);", "Rechner->Doppelt(4);"], e: "Statische Methoden ruft man über den Klassennamen auf, ohne Objekt." },
  { s: 2, t: "static", f: "Warum kompiliert dieser Code nicht?", c: ["class Konto", "{", "    public int Stand;", "    public static void Zeige() { Console.WriteLine(Stand); }", "}"], o: ["Eine statische Methode kann nicht direkt auf ein Objekt-Feld zugreifen", "Console.WriteLine ist in static verboten", "int darf nicht public sein", "Zeige braucht einen Rückgabewert"], e: "static-Methoden gehören zur Klasse und kennen kein bestimmtes Objekt, also auch kein Stand." },
  { s: 3, t: "static", f: "Was gibt der Code aus?", c: ["class Box", "{", "    public static int S = 1;", "    public int I = 1;", "}", "", "Box a = new Box(); Box b = new Box();", "Box.S = 5; a.I = 5;", "Console.WriteLine(Box.S + b.I);"], o: ["6", "10", "2", "Fehler"], e: "S teilen sich alle (5), I hat jedes Objekt selbst: b.I ist noch 1." },
  { s: 1, t: "static", f: "Warum ist Main normalerweise static?", o: ["Damit das Programm starten kann, ohne vorher ein Objekt zu erzeugen", "Weil Main nichts zurückgibt", "Damit Main schneller läuft", "Weil Main privat ist"], e: "Beim Start gibt es noch kein Objekt, also muss Main zur Klasse selbst gehören." },
  { s: 3, t: "static", f: "Welche Aussage über eine static class stimmt?", o: ["Von ihr kann man kein Objekt mit new erzeugen", "Sie darf nur ein Feld haben", "Sie muss von einer anderen Klasse erben", "Ihre Methoden dürfen nicht static sein"], e: "Eine statische Klasse (z. B. Math) enthält nur statische Mitglieder und wird nie instanziiert." },

  // ---------- Properties (get; set;) ----------
  { s: 1, t: "Property", f: "Welche Zeile ist eine automatische Property?", o: ["public string Name { get; set; }", "public string Name();", "public string Name = get set;", "public get set Name;"], e: "Auto-Properties schreibt man mit { get; set; } hinter Typ und Namen." },
  { s: 1, t: "Property", f: "Was macht der get-Teil einer Property?", o: ["Er liefert den Wert beim Lesen", "Er speichert einen neuen Wert", "Er löscht den Wert", "Er macht die Property statisch"], e: "get wird beim Lesen ausgeführt, set beim Schreiben." },
  { s: 2, t: "Property", f: "Was gibt der Code aus?", c: ["class Person", "{", "    public string Name { get; set; } = \"Max\";", "}", "", "Person p = new Person();", "p.Name = \"Mia\";", "Console.WriteLine(p.Name);"], o: ["Mia", "Max", "Name", "null"], e: "Der Startwert ist Max, danach wird Mia zugewiesen." },
  { s: 2, t: "Property", f: "Was passiert bei p.Alter = 20;?", c: ["class Person", "{", "    public int Alter { get; private set; }", "}"], o: ["Kompilierfehler außerhalb der Klasse, weil set privat ist", "Alter wird 20", "Alter bleibt 0, ohne Fehler", "Laufzeitfehler"], e: "Mit private set kann nur die Klasse selbst den Wert ändern." },
  { s: 2, t: "Property", f: "Wofür steht value im set-Teil?", c: ["private int _alter;", "public int Alter", "{", "    get { return _alter; }", "    set { _alter = value; }", "}"], o: ["Für den Wert, der gerade zugewiesen wird", "Für den alten Wert", "Für den Standardwert 0", "Für den Namen der Property"], e: "value ist der Wert rechts vom = bei der Zuweisung." },
  { s: 3, t: "Property", f: "Was gibt der Code aus?", c: ["class Konto", "{", "    private int _stand;", "    public int Stand", "    {", "        get => _stand;", "        set { if (value >= 0) _stand = value; }", "    }", "}", "", "var k = new Konto();", "k.Stand = 50; k.Stand = -10;", "Console.WriteLine(k.Stand);"], o: ["50", "-10", "0", "40"], e: "Der set-Teil ignoriert negative Werte, der Stand bleibt 50." },
  { s: 3, t: "Property", f: "Welche Property kann man nach dem Erzeugen des Objekts nicht mehr ändern?", o: ["public string Id { get; init; }", "public string Id { get; set; }", "public static string Id { get; set; }", "public string Id;"], e: "init erlaubt das Setzen nur beim Erzeugen (z. B. new X { Id = \"1\" })." },
  { s: 3, t: "Property", f: "Was gibt der Code aus?", c: ["class Rechteck", "{", "    public int B { get; set; }", "    public int H { get; set; }", "    public int Flaeche => B * H;", "}", "", "var r = new Rechteck { B = 3, H = 4 };", "r.B = 5;", "Console.WriteLine(r.Flaeche);"], o: ["20", "12", "0", "Fehler"], e: "Flaeche wird bei jedem Lesen neu berechnet: 5 · 4 = 20." },

  // ---------- Unterprogramme (Methoden) und return ----------
  { s: 1, t: "Unterprogramme", f: "Warum schreibt man Unterprogramme (Methoden)?", o: ["Damit Code wiederverwendbar und übersichtlich wird", "Damit das Programm schneller kompiliert", "Weil C# sonst nicht startet", "Damit alle Variablen global werden"], e: "Ein Unterprogramm fasst Code unter einem Namen zusammen. Man schreibt ihn einmal und ruft ihn beliebig oft auf." },
  { s: 1, t: "Unterprogramme", f: "Was gibt der Code aus?", c: ["static int Quadrat(int x)", "{", "    return x * x;", "}", "", "Console.WriteLine(Quadrat(4));"], o: ["16", "8", "4", "Fehler"], e: "Quadrat(4) rechnet 4 · 4 und gibt 16 mit return zurück." },
  { s: 1, t: "Unterprogramme", f: "Welcher Teil ist hier der Rückgabetyp?", c: ["static double Mittelwert(int a, int b)"], o: ["double", "static", "Mittelwert", "int a, int b"], e: "Der Rückgabetyp steht direkt vor dem Methodennamen. In den Klammern stehen die Parameter." },
  { s: 1, t: "return", f: "Was macht return in einer Methode?", o: ["Es gibt einen Wert zurück und beendet die Methode", "Es gibt einen Wert auf der Konsole aus, die Methode läuft weiter", "Es startet die Methode von vorn", "Es beendet das ganze Programm"], e: "Merksatz: return gibt einen Wert zurück und beendet die Funktion sofort." },
  { s: 2, t: "return", f: "Was gibt der Code aus?", c: ["static string Test()", "{", "    return \"A\";", "    Console.WriteLine(\"B\");", "}", "", "Console.WriteLine(Test());"], o: ["A", "AB", "BA", "B"], e: "Nach return ist die Methode zu Ende. Die Zeile mit B wird nie erreicht (der Compiler warnt: unerreichbarer Code)." },
  { s: 2, t: "return", f: "Was gibt der Code aus?", c: ["static int Pruefe(int x)", "{", "    if (x < 0) return -1;", "    return 1;", "}", "", "Console.WriteLine(Pruefe(-5));"], o: ["-1", "1", "-11", "Fehler"], e: "Bei x = -5 greift das erste return. Die Methode endet sofort, das zweite return wird nicht mehr erreicht." },
  { s: 2, t: "return", f: "Welche Methode kompiliert NICHT?", o: ["static int Zahl() { }", "static void Hallo() { }", "static int Eins() { return 1; }", "static void Nix() { return; }"], e: "Wer int als Rückgabetyp angibt, muss auf jedem Weg einen int mit return liefern. Bei void darf return ohne Wert stehen und beendet nur die Methode." },

  // ---------- Signatur und Überladung ----------
  { s: 2, t: "Signatur", f: "Was gehört zur Signatur einer Methode?", o: ["Der Name und die Parameterliste (Anzahl, Typen, Reihenfolge)", "Der Name und der Rückgabetyp", "Nur der Rückgabetyp", "Der Code im Methodenrumpf"], e: "Merksatz: Der Rückgabewert gehört nicht zur Signatur. Sie besteht aus dem Namen und den Parametertypen." },
  { s: 2, t: "Signatur", f: "Kompiliert diese Klasse?", c: ["class Mathe", "{", "    static int Teile(int a, int b) => a / b;", "    static double Teile(int a, int b) => (double)a / b;", "}"], o: ["Nein: gleiche Signatur, nur der Rückgabetyp ist anders", "Ja, wegen der verschiedenen Rückgabetypen", "Ja, aber nur die zweite Methode wird benutzt", "Nein, weil => hier nicht erlaubt ist"], e: "Der Rückgabetyp gehört nicht zur Signatur. Beide Methoden heißen Teile(int, int), das ist doppelt." },
  { s: 1, t: "Überladung", f: "Was bedeutet Überladung (Overloading)?", o: ["Mehrere Methoden mit gleichem Namen, aber unterschiedlichen Parametern", "Eine Methode ruft sich selbst auf", "Eine Methode der Basisklasse wird mit override ersetzt", "Eine Methode hat zu viele Zeilen"], e: "Überladene Methoden teilen den Namen und unterscheiden sich in Anzahl, Typ oder Reihenfolge der Parameter." },
  { s: 2, t: "Überladung", f: "Was gibt der Code aus?", c: ["static void Zeige(int x) => Console.Write(\"int \");", "static void Zeige(double x) => Console.Write(\"double \");", "static void Zeige(string x) => Console.Write(\"string \");", "", "Zeige(5); Zeige(5.0); Zeige(\"5\");"], o: ["int double string", "int int int", "double double string", "Fehler"], e: "C# wählt die Überladung, deren Parametertyp zum Argument passt: 5 ist int, 5.0 ist double, \"5\" ist string." },
  { s: 2, t: "Überladung", f: "Es gibt schon static int Summe(int a, int b). Welche weitere Methode ist NICHT erlaubt?", o: ["static long Summe(int x, int y)", "static int Summe(int a, int b, int c)", "static double Summe(double a, double b)", "static int Summe(int[] zahlen)"], e: "Andere Parameternamen oder ein anderer Rückgabetyp reichen nicht. Es bleibt Summe(int, int)." },
  { s: 3, t: "Überladung", f: "Was gibt der Code aus?", c: ["static int Mal(int a, int b) => a * b;", "static int Mal(int a, int b, int c) => a * b * c;", "", "Console.WriteLine(Mal(2, 3) + Mal(1, 2, 3));"], o: ["12", "6", "11", "Fehler"], e: "Mal(2, 3) nimmt die Version mit 2 Parametern (6), Mal(1, 2, 3) die mit 3 (6). Zusammen 12." },
  { s: 3, t: "Überladung", f: "Was gibt der Code aus?", c: ["static void F(long x) => Console.Write(\"long\");", "static void F(double x) => Console.Write(\"double\");", "", "F(3);"], o: ["long", "double", "Fehler: mehrdeutig", "nichts"], e: "3 ist ein int. Eine F(int) gibt es nicht, also nimmt C# die bessere Umwandlung: int → long passt genauer als int → double." },

  // ---------- Standardparameter ----------
  { s: 1, t: "Standardparameter", f: "Was gibt der Code aus?", c: ["static void Gruss(string name = \"Gast\")", "{", "    Console.WriteLine($\"Hallo {name}\");", "}", "", "Gruss();"], o: ["Hallo Gast", "Hallo ", "Fehler: Parameter fehlt", "Hallo name"], e: "Lässt man das Argument weg, wird der Standardwert \"Gast\" eingesetzt." },
  { s: 2, t: "Standardparameter", f: "Was gibt der Code aus?", c: ["static int Plus(int a, int b = 10) => a + b;", "", "Console.WriteLine(Plus(5) + Plus(5, 1));"], o: ["21", "16", "30", "Fehler"], e: "Plus(5) nimmt b = 10 (15), Plus(5, 1) überschreibt den Standardwert (6). 15 + 6 = 21." },
  { s: 2, t: "Standardparameter", f: "Welche Methode kompiliert NICHT?", o: ["static void F(int a = 1, int b)", "static void F(int a, int b = 2)", "static void F(int a = 1, int b = 2)", "static void F(int a)"], e: "Parameter mit Standardwert müssen hinter allen Pflichtparametern stehen." },
  { s: 3, t: "Standardparameter", f: "Was gibt der Code aus?", c: ["static string Box(string t, int breite = 5, char z = '*')", "    => t.PadLeft(breite, z);", "", "Console.WriteLine(Box(\"ab\", z: '-'));"], o: ["---ab", "***ab", "ab---", "Fehler"], e: "Mit dem benannten Argument z: überspringt man breite (bleibt 5). \"ab\" wird links mit - auf 5 Zeichen aufgefüllt." },
  { s: 3, t: "Standardparameter", f: "Welcher Standardwert ist erlaubt?", o: ["int x = 3 * 4", "DateTime d = DateTime.Now", "int[] a = new int[3]", "string s = Console.ReadLine()"], e: "Standardwerte müssen schon beim Kompilieren feststehen (Konstanten). 3 * 4 ist ein konstanter Ausdruck." },

  // ---------- Objekte und Referenzen ----------
  { s: 2, t: "Objekte", f: "Was gibt der Code aus?", c: ["class P { public int X; }", "", "P a = new P();", "P b = a;", "b.X = 9;", "Console.WriteLine(a.X);"], o: ["9", "0", "Fehler", "null"], e: "a und b zeigen auf dasselbe Objekt (Referenztyp)." },
  { s: 2, t: "Zugriff", f: "Was bedeutet private bei einem Feld?", o: ["Nur Code in derselben Klasse darf darauf zugreifen", "Jeder darf darauf zugreifen", "Nur abgeleitete Klassen dürfen zugreifen", "Das Feld ist statisch"], e: "private schützt das Feld vor Zugriffen von außen (Kapselung)." },
  { s: 3, t: "Objekte", f: "Was gibt der Code aus?", c: ["static void Erhoehe(int x) { x++; }", "", "int z = 1;", "Erhoehe(z);", "Console.WriteLine(z);"], o: ["1", "2", "0", "Fehler"], e: "int ist ein Werttyp: Die Methode bekommt eine Kopie, z bleibt 1." },
  { s: 3, t: "Vererbung", f: "Was gibt der Code aus?", c: ["class Tier { public virtual string Laut() => \"...\"; }", "class Hund : Tier { public override string Laut() => \"Wuff\"; }", "", "Tier t = new Hund();", "Console.WriteLine(t.Laut());"], o: ["Wuff", "...", "Fehler", "Tier"], e: "override ersetzt die virtuelle Methode, es zählt der echte Typ des Objekts (Polymorphie)." },
  { s: 2, t: "Listen", f: "Was gibt der Code aus?", c: ["var liste = new List<string>();", "liste.Add(\"a\");", "liste.Add(\"b\");", "Console.WriteLine(liste.Count);"], o: ["2", "1", "0", "Fehler"], e: "Count ist die Anzahl der Elemente in der Liste." },
  { s: 3, t: "Null", f: "Was gibt der Code aus?", c: ["string? s = null;", "Console.WriteLine(s ?? \"leer\");"], o: ["leer", "null", "Fehler", "nichts"], e: "?? liefert den rechten Wert, wenn links null steht." },
];

const STUFEN = { leicht: { bis: 1, punkte: 10 }, mittel: { bis: 2, punkte: 15 }, schwer: { bis: 3, punkte: 20 } };

const mische = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export function start({ dom, stufe, status, nachricht, ergebnis }) {
  const S = STUFEN[stufe] || STUFEN.mittel;
  const pool = FRAGEN.filter((f) => f.s <= S.bis);
  let stapel = [];
  return quizSpiel({
    dom,
    status,
    nachricht,
    ergebnis,
    titel: "C#-Code",
    intro: `${pool.length} Fragen zu Variablen, Konstruktoren, static, Properties, Methoden mit return, Überladung und Standardparametern. Lies den Code genau. Bei einem Fehler hält die Zeit an, bis du auf „Weiter“ tippst.`,
    sekunden: 120,
    weiterKnopf: true,
    punkteJe: S.punkte,
    naechste() {
      if (!stapel.length) stapel = mische([...pool]);
      const f = stapel.pop();
      const reihenfolge = mische([0, 1, 2, 3]);
      return {
        frage: `<span class="quiz-label">${esc(f.t)}</span><span class="quiz-text">${esc(f.f)}</span>${f.c ? code(f.c) : ""}`,
        optionen: reihenfolge.map((i) => f.o[i]),
        richtigIndex: reihenfolge.indexOf(0),
        loesung: f.o[0],
        erklaerung: esc(f.e),
      };
    },
  });
}
