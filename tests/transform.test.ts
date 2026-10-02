import { describe, expect, it } from "vitest";
import { MAPPINGS, SAMPLES } from "@/lib/samples";
import { getPath, parseSource, toCents, toIsoDate, transform } from "@/lib/transform";
import { parseXml } from "@/lib/xml";

const expected = {
  id: "4711",
  name: "Akkuschrauber 18 V",
  subtitle: "inkl. 2 Akkus und Koffer",
  price: { amount: 14990, currency: "EUR" },
  stock: 15,
  available: true,
  images: ["https://cdn.example.com/art/0004711_1.jpg", "https://cdn.example.com/art/0004711_2.jpg"],
  updatedAt: "2026-09-14",
};

describe("Transformer", () => {
  for (const format of ["xml", "json"] as const) {
    it(`${format}: beide Legacy-Formate ergeben dieselbe schlanke Antwort`, () => {
      const parsed = parseSource(SAMPLES[format], format);
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) return;
      const r = transform(SAMPLES[format], parsed.data, MAPPINGS[format]);
      expect(r.output).toEqual(expected);
      expect(r.fields.every((f) => f.problem === null)).toBe(true);
      expect(r.bytesOut).toBeLessThan(r.bytesIn / 3);
    });
  }
  it("Einkaufspreis und interne Notiz verlassen das Gateway nicht", () => {
    const parsed = parseSource(SAMPLES.xml, "xml");
    if (!parsed.ok) throw new Error();
    const out = JSON.stringify(transform(SAMPLES.xml, parsed.data, MAPPINGS.xml).output);
    expect(out).not.toMatch(/7140|71,40|Lieferant|4100|c2Vzc2lvbi/);
  });
  it("meldet fehlende Quellen pro Feld statt abzustürzen", () => {
    const r = transform("{}", {}, MAPPINGS.json);
    expect(r.fields.every((f) => f.problem)).toBe(true);
  });
});

describe("Umwandlungen", () => {
  it("Beträge", () => {
    expect(toCents("149,90")).toBe(14990);
    expect(toCents("1.249,00")).toBe(124900);
    expect(toCents("149.90")).toBe(14990);
    expect(toCents("0,1")).toBe(10);
    expect(toCents("abc")).toBeNull();
  });
  it("Datum", () => {
    expect(toIsoDate("20260914")).toBe("2026-09-14");
    expect(toIsoDate("14.09.2026")).toBe("2026-09-14");
    expect(toIsoDate("/Date(1789344000000)/")).toBe("2026-09-14");
    expect(toIsoDate("gestern")).toBeNull();
  });
  it("Pfade mit [] sammeln auch Einzelelemente", () => {
    expect(getPath({ a: { b: { c: "1" } } }, "a.b[].c")).toEqual(["1"]);
    expect(getPath({ a: [{ c: 1 }, { c: 2 }] }, "a[1].c")).toBe(2);
  });
});

describe("XML", () => {
  it("Attribute, Wiederholungen, Entitäten, CDATA, Namespaces", () => {
    const x = parseXml('<?xml version="1.0"?><n:A x="1" xmlns:n="u"><B>a &amp; b</B><B><![CDATA[<c>]]></B><C/></n:A>');
    expect(x).toEqual({ A: { "@x": "1", B: ["a & b", "<c>"], C: "" } });
  });
  it("meldet falsche Verschachtelung mit Zeile", () => {
    const r = parseSource("<A>\n<B></A>", "xml");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.line).toBe(2);
  });
});
