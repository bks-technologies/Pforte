import { parseXml, XmlError } from "./xml";

/**
 * Payload-Transformer: liest eine Legacy-Antwort (XML oder JSON), wendet eine Liste von
 * Zuordnungen an und baut daraus die schlanke Antwort für die Mobile App.
 * Alles, was keine Zuordnung hat, verlässt das Gateway nicht.
 */

export type Op = "text" | "id" | "cents" | "flag" | "sum" | "date" | "list";

export interface Mapping {
  /** Zielfeld, Punkt-Pfad (`price.amount`). */
  target: string;
  /** Quelle, Punkt-Pfad. `[]` sammelt aus Arrays, `[0]` nimmt ein Element. */
  source: string;
  op: Op;
  note: string;
}

export const OP_LABELS: Record<Op, string> = {
  text: "Text",
  id: "ID ohne Nullen",
  cents: "Betrag → Cent",
  flag: "J/N → Boolean",
  sum: "Summe",
  date: "Datum → ISO",
  list: "Liste",
};

export type SourceFormat = "xml" | "json";

export type ParseResult = { ok: true; data: unknown } | { ok: false; error: string; line?: number };

export function parseSource(src: string, format: SourceFormat): ParseResult {
  try {
    return { ok: true, data: format === "xml" ? parseXml(src) : JSON.parse(src) };
  } catch (e) {
    if (e instanceof XmlError) return { ok: false, error: e.message, line: lineOf(src, e.position) };
    const msg = e instanceof Error ? e.message : String(e);
    const pos = /position (\d+)/.exec(msg);
    return { ok: false, error: `JSON ungültig: ${msg}`, line: pos ? lineOf(src, Number(pos[1])) : undefined };
  }
}

function lineOf(src: string, pos: number): number {
  return src.slice(0, pos).split("\n").length;
}

/** Wert unter einem Pfad lesen. Bei `[]` kommt ein Array zurück (auch wenn die Quelle nur ein Element hat). */
export function getPath(data: unknown, path: string): unknown {
  let current: unknown[] = [data];
  let collecting = false;
  for (const raw of path.split(".")) {
    const m = /^([^[\]]+)(?:\[(\d*)\])?$/.exec(raw);
    if (!m) return undefined;
    const [, key, index] = m;
    const nextValues: unknown[] = [];
    for (const v of current) {
      if (v === null || typeof v !== "object") continue;
      const child = (v as Record<string, unknown>)[key];
      if (child === undefined) continue;
      if (index === undefined) nextValues.push(child);
      else if (index === "") {
        collecting = true;
        nextValues.push(...(Array.isArray(child) ? child : [child]));
      } else {
        const arr = Array.isArray(child) ? child : [child];
        if (arr[Number(index)] !== undefined) nextValues.push(arr[Number(index)]);
      }
    }
    current = nextValues;
  }
  if (collecting) return current;
  return current[0];
}

function setPath(target: Record<string, unknown>, path: string, value: unknown) {
  const keys = path.split(".");
  let obj = target;
  for (const k of keys.slice(0, -1)) {
    if (typeof obj[k] !== "object" || obj[k] === null) obj[k] = {};
    obj = obj[k] as Record<string, unknown>;
  }
  obj[keys[keys.length - 1]] = value;
}

const asText = (v: unknown) => (v === undefined || v === null ? "" : typeof v === "object" ? "" : String(v).trim());

/** „149,90“, „1.249,00“, „149.90“ oder 149.9 → 14990 */
export function toCents(v: unknown): number | null {
  if (typeof v === "number") return Math.round(v * 100);
  let s = asText(v).replace(/\s|€|EUR/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

/** 20260914, „14.09.2026“, „/Date(1789344000000)/“ oder ISO → „2026-09-14“ */
export function toIsoDate(v: unknown): string | null {
  const s = asText(v);
  let m = /^(\d{4})(\d{2})(\d{2})$/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = /^\/Date\((\d+)\)\/$/.exec(s);
  if (m) return new Date(Number(m[1])).toISOString().slice(0, 10);
  m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  return m ? m[1] : null;
}

export interface FieldResult {
  mapping: Mapping;
  value: unknown;
  /** Quelle fehlt oder Wert ließ sich nicht umwandeln. */
  problem: string | null;
}

function apply(op: Op, raw: unknown): { value: unknown; problem: string | null } {
  if (raw === undefined) return { value: null, problem: "Quelle nicht gefunden" };
  switch (op) {
    case "text": {
      const s = asText(raw);
      return { value: s || null, problem: s ? null : "leer" };
    }
    case "id": {
      const s = asText(raw).replace(/^0+(?=\d)/, "");
      return { value: s || null, problem: s ? null : "leer" };
    }
    case "cents": {
      const c = toCents(raw);
      return { value: c, problem: c === null ? "kein Betrag" : null };
    }
    case "flag": {
      const s = asText(raw).toUpperCase();
      if (["J", "JA", "Y", "1", "TRUE", "X"].includes(s)) return { value: true, problem: null };
      if (["N", "NEIN", "0", "FALSE", ""].includes(s)) return { value: false, problem: null };
      return { value: null, problem: `unbekannt: ${s}` };
    }
    case "sum": {
      const list = Array.isArray(raw) ? raw : [raw];
      const nums = list.map((x) => Number(asText(x).replace(",", ".")));
      if (nums.some((n) => !Number.isFinite(n))) return { value: null, problem: "keine Zahl" };
      return { value: nums.reduce((a, b) => a + b, 0), problem: null };
    }
    case "date": {
      const d = toIsoDate(raw);
      return { value: d, problem: d ? null : "kein Datum" };
    }
    case "list": {
      const list = (Array.isArray(raw) ? raw : [raw]).map(asText).filter(Boolean);
      return { value: list, problem: null };
    }
  }
}

export interface TransformResult {
  output: Record<string, unknown>;
  fields: FieldResult[];
  bytesIn: number;
  bytesOut: number;
  /** Blätter (Werte) in der Quelle, zum Vergleich mit den übernommenen Feldern. */
  sourceFields: number;
}

const byteLength = (s: string) => new TextEncoder().encode(s).length;

function countLeaves(v: unknown): number {
  if (v === null || typeof v !== "object") return 1;
  const children = Array.isArray(v) ? v : Object.values(v);
  return children.reduce((a: number, c) => a + countLeaves(c), 0);
}

export function transform(src: string, data: unknown, mappings: Mapping[]): TransformResult {
  const output: Record<string, unknown> = {};
  const fields = mappings.map((mapping) => {
    const { value, problem } = apply(mapping.op, getPath(data, mapping.source));
    setPath(output, mapping.target, value);
    return { mapping, value, problem };
  });
  return {
    output,
    fields,
    bytesIn: byteLength(src),
    bytesOut: byteLength(JSON.stringify(output)),
    sourceFields: countLeaves(data),
  };
}
