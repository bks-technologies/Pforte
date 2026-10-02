import type { HttpMethod, RateWindow, Rule, RuleDraft } from "./types";

export const METHODS: HttpMethod[] = ["GET", "POST", "PUT", "DELETE", "ANY"];

export const WINDOWS: { value: RateWindow; label: string; short: string; seconds: number }[] = [
  { value: "second", label: "pro Sekunde", short: "s", seconds: 1 },
  { value: "minute", label: "pro Minute", short: "Min", seconds: 60 },
  { value: "hour", label: "pro Stunde", short: "Std", seconds: 3600 },
];

export const LIMITS = {
  maxRequests: { min: 1, max: 1_000_000 },
  cacheTtl: { min: 0, max: 86_400 },
  endpointLength: 120,
} as const;

export function windowSeconds(w: RateWindow): number {
  return WINDOWS.find((x) => x.value === w)?.seconds ?? 60;
}

/** Erlaubte Anfragen pro Sekunde, gemittelt über das Fenster. */
export function allowancePerSecond(rule: Pick<Rule, "maxRequests" | "window">): number {
  return rule.maxRequests / windowSeconds(rule.window);
}

/** Pfad normalisieren: Leerraum weg, doppelte Schrägstriche zusammen, kein Schrägstrich am Ende. */
export function normalizeEndpoint(raw: string): string {
  let e = raw.trim().replace(/\/{2,}/g, "/");
  if (e.length > 1 && e.endsWith("/")) e = e.slice(0, -1);
  return e;
}

const ENDPOINT_RE = /^\/[A-Za-z0-9\-._~/{}:]*(\*)?$/;

export type RuleErrors = Partial<Record<"endpoint" | "maxRequests" | "cacheTtl" | "method", string>>;

export type RuleValidation = { ok: true; draft: RuleDraft } | { ok: false; errors: RuleErrors };

/**
 * Prüft Formularwerte. Zahlen kommen als Text aus dem Formular und werden hier gelesen,
 * damit „1.000“ oder „ 300 “ genauso ankommen wie 300.
 */
export function validateRule(
  input: { endpoint: string; method: string; maxRequests: string | number; window: string; cacheTtl: string | number },
  existing: Rule[],
  ignoreId?: string,
): RuleValidation {
  const errors: RuleErrors = {};
  const endpoint = normalizeEndpoint(input.endpoint);

  if (!endpoint) errors.endpoint = "Pfad fehlt.";
  else if (!endpoint.startsWith("/")) errors.endpoint = "Pfad muss mit / beginnen.";
  else if (endpoint.length > LIMITS.endpointLength) errors.endpoint = `Höchstens ${LIMITS.endpointLength} Zeichen.`;
  else if (!ENDPOINT_RE.test(endpoint)) errors.endpoint = "Nur Buchstaben, Ziffern, - . _ ~ / {} und ein * am Ende.";

  const method = METHODS.includes(input.method as HttpMethod) ? (input.method as HttpMethod) : null;
  if (!method) errors.method = "Unbekannte Methode.";

  const windowValue = WINDOWS.some((w) => w.value === input.window) ? (input.window as RateWindow) : "minute";

  const max = parseCount(input.maxRequests);
  if (max === null) errors.maxRequests = "Ganze Zahl eingeben.";
  else if (max < LIMITS.maxRequests.min || max > LIMITS.maxRequests.max)
    errors.maxRequests = `Zwischen ${LIMITS.maxRequests.min} und ${LIMITS.maxRequests.max.toLocaleString("de-DE")}.`;

  const ttl = parseCount(input.cacheTtl);
  if (ttl === null) errors.cacheTtl = "Ganze Zahl eingeben.";
  else if (ttl < LIMITS.cacheTtl.min || ttl > LIMITS.cacheTtl.max)
    errors.cacheTtl = "Zwischen 0 und 86.400 Sekunden (24 Std).";
  else if (ttl > 0 && method && method !== "GET" && method !== "ANY")
    errors.cacheTtl = "Nur GET-Antworten werden gecacht. TTL auf 0 setzen.";

  if (!errors.endpoint && method) {
    const clash = existing.find(
      (r) =>
        r.id !== ignoreId && r.endpoint === endpoint && (r.method === method || r.method === "ANY" || method === "ANY"),
    );
    if (clash) errors.endpoint = `Für ${clash.method} ${clash.endpoint} gibt es schon eine Regel.`;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    draft: { endpoint, method: method!, maxRequests: max!, window: windowValue, cacheTtl: ttl! },
  };
}

function parseCount(v: string | number): number | null {
  if (typeof v === "number") return Number.isInteger(v) ? v : null;
  const s = v.trim().replace(/[.\s]/g, "");
  if (!/^\d+$/.test(s)) return null;
  return Number(s);
}

/**
 * Welche Regel greift für einen Pfad? Exakter Treffer vor Präfix (`/api/v1/*`),
 * bei mehreren Präfixen der längste. Deaktivierte Regeln zählen nicht.
 */
export function matchRule(rules: Rule[], path: string, method: HttpMethod = "GET"): Rule | null {
  const candidates = rules.filter((r) => r.enabled && (r.method === "ANY" || r.method === method));
  const exact = candidates.find((r) => r.endpoint === path);
  if (exact) return exact;
  let best: Rule | null = null;
  for (const r of candidates) {
    if (!r.endpoint.endsWith("*")) continue;
    const prefix = r.endpoint.slice(0, -1);
    if (path.startsWith(prefix) && (!best || prefix.length > best.endpoint.length - 1)) best = r;
  }
  return best;
}

/**
 * Anteil der GET-Anfragen, die bei gegebener TTL aus dem Cache kommen.
 * Vereinfachtes Modell (keine echte Messung): steigt mit der TTL und sättigt bei 85 %,
 * weil ein Teil der Anfragen immer individuelle Parameter trägt.
 */
export function cacheHitRate(ttl: number): number {
  if (ttl <= 0) return 0;
  return 0.85 * (ttl / (ttl + 60));
}

export function describeRule(r: Pick<Rule, "maxRequests" | "window" | "cacheTtl">): string {
  const w = WINDOWS.find((x) => x.value === r.window)!;
  const limit = `${r.maxRequests.toLocaleString("de-DE")}/${w.short}`;
  return r.cacheTtl > 0 ? `${limit} · Cache ${formatTtl(r.cacheTtl)}` : `${limit} · ohne Cache`;
}

export function formatTtl(s: number): string {
  if (s === 0) return "aus";
  if (s < 60) return `${s} s`;
  if (s < 3600) return s % 60 === 0 ? `${s / 60} Min` : `${s} s`;
  return s % 3600 === 0 ? `${s / 3600} Std` : `${Math.round(s / 60)} Min`;
}
