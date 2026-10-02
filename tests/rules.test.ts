import { describe, expect, it } from "vitest";
import {
  allowancePerSecond,
  cacheHitRate,
  matchRule,
  normalizeEndpoint,
  sanitizeRules,
  validateRule,
} from "@/lib/rules";
import type { Rule } from "@/lib/types";

const rule = (p: Partial<Rule>): Rule => ({
  id: Math.random().toString(36),
  endpoint: "/api/v1/products",
  method: "GET",
  maxRequests: 100,
  window: "minute",
  cacheTtl: 300,
  enabled: true,
  createdAt: 0,
  ...p,
});

const input = { endpoint: "/api/v1/products", method: "GET", maxRequests: "100", window: "minute", cacheTtl: "300" };

describe("validateRule", () => {
  it("nimmt das Beispiel aus der Aufgabe an", () => {
    const r = validateRule(input, []);
    expect(r).toEqual({
      ok: true,
      draft: { endpoint: "/api/v1/products", method: "GET", maxRequests: 100, window: "minute", cacheTtl: 300 },
    });
  });
  it("liest Tausenderpunkte und Leerraum", () => {
    const r = validateRule({ ...input, maxRequests: " 1.000 " }, []);
    expect(r.ok && r.draft.maxRequests).toBe(1000);
  });
  it("lehnt Pfad ohne Schrägstrich, Kommazahlen und Null ab", () => {
    const r = validateRule({ ...input, endpoint: "api", maxRequests: "1,5", cacheTtl: "-1" }, []);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["cacheTtl", "endpoint", "maxRequests"]);
    expect(validateRule({ ...input, maxRequests: "0" }, []).ok).toBe(false);
  });
  it("verbietet Cache bei POST", () => {
    const r = validateRule({ ...input, method: "POST" }, []);
    expect(!r.ok && r.errors.cacheTtl).toMatch(/GET/);
  });
  it("erkennt Dubletten, auch über ANY, aber nicht beim Bearbeiten derselben Regel", () => {
    const existing = [rule({ id: "a" })];
    expect(validateRule(input, existing).ok).toBe(false);
    expect(validateRule({ ...input, method: "ANY", cacheTtl: "0" }, existing).ok).toBe(false);
    expect(validateRule(input, existing, "a").ok).toBe(true);
    expect(validateRule({ ...input, method: "POST", cacheTtl: "0" }, existing).ok).toBe(true);
  });
  it("normalisiert Pfade", () => {
    expect(normalizeEndpoint("  /api//v1/products/ ")).toBe("/api/v1/products");
  });
});

describe("matchRule", () => {
  const rules = [
    rule({ id: "wild", endpoint: "/api/*" }),
    rule({ id: "v1", endpoint: "/api/v1/*" }),
    rule({ id: "exact", endpoint: "/api/v1/products" }),
    rule({ id: "off", endpoint: "/api/v1/stock", enabled: false }),
  ];
  it("exakt vor Präfix, längstes Präfix gewinnt, deaktiviert zählt nicht", () => {
    expect(matchRule(rules, "/api/v1/products")?.id).toBe("exact");
    expect(matchRule(rules, "/api/v1/products/search")?.id).toBe("v1");
    expect(matchRule(rules, "/api/v2/x")?.id).toBe("wild");
    expect(matchRule(rules, "/api/v1/stock")?.id).toBe("v1");
    expect(matchRule(rules, "/health")).toBeNull();
  });
  it("beachtet die Methode", () => {
    expect(matchRule([rule({ method: "POST" })], "/api/v1/products", "GET")).toBeNull();
  });
});

describe("Kennzahlen", () => {
  it("rechnet das Fenster auf Sekunden um", () => {
    expect(allowancePerSecond({ maxRequests: 120, window: "minute" })).toBe(2);
    expect(allowancePerSecond({ maxRequests: 3600, window: "hour" })).toBe(1);
  });
  it("Cache-Trefferquote steigt mit TTL und bleibt unter 85 %", () => {
    expect(cacheHitRate(0)).toBe(0);
    expect(cacheHitRate(300)).toBeGreaterThan(cacheHitRate(30));
    expect(cacheHitRate(86_400)).toBeLessThan(0.85);
  });
});

describe("sanitizeRules", () => {
  it("verwirft Müll und behält gültige Regeln", () => {
    const good = rule({ id: "ok" });
    const out = sanitizeRules([null, "x", { foo: 1 }, { ...good, maxRequests: -5, id: "neg" }, good, { ...good }]);
    expect(out).toEqual([good]);
  });
  it("kein Array ergibt null (dann gelten die Beispielregeln)", () => {
    expect(sanitizeRules({ rules: 1 })).toBeNull();
    expect(sanitizeRules(undefined)).toBeNull();
  });
});
