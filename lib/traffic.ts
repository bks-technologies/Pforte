import { allowancePerSecond, cacheHitRate, matchRule } from "./rules";
import type { BreakerState, HttpMethod, Rule, TrafficPoint } from "./types";

/**
 * Verkehrs-Simulation, Sekunde für Sekunde. Reine Funktionen mit festem Zufallsgenerator,
 * damit Tests reproduzierbar sind. Alle Zahlen sind Beispielwerte, keine Messung.
 */

/** So viele Anfragen pro Sekunde verträgt das Legacy-Backend, bevor es in die Knie geht. */
export const BACKEND_CAPACITY = 140;
/** Grundlast am Gateway (Anfragen/s) ohne Lastspitze. */
export const BASE_LOAD = 150;
/** Dauer einer simulierten Lastspitze. */
export const SPIKE_MS = 25_000;
/** So lange fährt der Breaker nach dem Lösen den Durchlass wieder hoch. */
export const RECOVERY_MS = 20_000;

/** Verkehrsprofil der Mobile App: Anteil je Endpunkt. */
export const TRAFFIC_PROFILE: { path: string; method: HttpMethod; share: number }[] = [
  { path: "/api/v1/products", method: "GET", share: 0.38 },
  { path: "/api/v1/products/search", method: "GET", share: 0.14 },
  { path: "/api/v1/stock", method: "GET", share: 0.16 },
  { path: "/api/v1/cart", method: "POST", share: 0.14 },
  { path: "/api/v1/orders", method: "POST", share: 0.08 },
  { path: "/api/v1/customers/me", method: "GET", share: 0.1 },
];

export interface SimState {
  seed: number;
  /** Ende der laufenden Lastspitze (ms) oder 0. */
  spikeUntil: number;
}

export function createSim(seed = 20261002): SimState {
  return { seed, spikeUntil: 0 };
}

/** mulberry32: klein, schnell, reproduzierbar. */
function next(state: SimState): number {
  let t = (state.seed = (state.seed + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Eingehende Last zum Zeitpunkt t: Grundlast, langsame Welle, Rauschen, ggf. Lastspitze. */
export function incomingAt(state: SimState, t: number): number {
  const wave = Math.sin(t / 47_000) * 0.18 + Math.sin(t / 13_000) * 0.07;
  const noise = (next(state) - 0.5) * 0.16;
  let load = BASE_LOAD * (1 + wave + noise);
  if (t < state.spikeUntil) {
    // Spitze steigt schnell an und klingt langsam ab.
    const remaining = (state.spikeUntil - t) / SPIKE_MS;
    const shape = remaining > 0.85 ? (1 - remaining) / 0.15 : Math.min(1, remaining / 0.6);
    load *= 1 + 2.2 * shape;
  }
  return Math.max(0, load);
}

/** Wie viel darf der Breaker gerade ans Backend lassen? `Infinity` = kein Eingriff. */
export function breakerCap(b: BreakerState, t: number): number {
  if (b.phase === "open") return b.mode === "block" ? 0 : (BACKEND_CAPACITY * b.throttlePercent) / 100;
  if (b.phase === "half-open") {
    const progress = Math.min(1, Math.max(0, (t - b.since) / RECOVERY_MS));
    return BACKEND_CAPACITY * (0.25 + 0.75 * progress);
  }
  return Infinity;
}

/** Nach Ablauf der Erholungszeit geht half-open von selbst in closed über. */
export function settleBreaker(b: BreakerState, t: number): BreakerState {
  if (b.phase === "half-open" && t - b.since >= RECOVERY_MS) return { ...b, phase: "closed", since: t };
  return b;
}

/**
 * Antwortzeit des Backends nach Auslastung (einfaches Warteschlangenmodell):
 * bis ~60 % flach, danach steil, über 100 % in der Sättigung.
 */
export function backendLatency(load: number, jitter = 0): number {
  const u = Math.min(load, 0.97);
  const base = 85 + 55 * (u / (1 - u));
  const overload = load > 1 ? (load - 1) * 2400 : 0;
  return Math.round(Math.min(base + overload, 8000) * (1 + jitter));
}

export interface StepResult {
  point: TrafficPoint;
  breaker: BreakerState;
}

/** Eine Sekunde Verkehr durch Regeln, Cache und Breaker schicken. */
export function step(state: SimState, t: number, rules: Rule[], breakerIn: BreakerState): StepResult {
  const breaker = settleBreaker(breakerIn, t);
  const incoming = incomingAt(state, t);

  let cached = 0;
  let limited = 0;
  let passed = 0;

  for (const ep of TRAFFIC_PROFILE) {
    const n = incoming * ep.share;
    const rule = matchRule(rules, ep.path, ep.method);
    if (!rule) {
      passed += n;
      continue;
    }
    const hits = ep.method === "GET" ? n * cacheHitRate(rule.cacheTtl) : 0;
    const miss = n - hits;
    const allowed = allowancePerSecond(rule);
    const over = Math.max(0, miss - allowed);
    cached += hits;
    limited += over;
    passed += miss - over;
  }

  const cap = breakerCap(breaker, t);
  const forwarded = Math.min(passed, cap);
  const shed = passed - forwarded;
  const load = forwarded / BACKEND_CAPACITY;
  const latency = forwarded === 0 ? 0 : backendLatency(load, (next(state) - 0.5) * 0.1);

  return {
    breaker,
    point: {
      t,
      incoming: round(incoming),
      forwarded: round(forwarded),
      cached: round(cached),
      limited: round(limited),
      shed: round(shed),
      latency,
      load: Math.round(load * 100) / 100,
      breaker: breaker.phase,
    },
  };
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Durchschnitt der letzten `n` Punkte für die Kennzahlen (glättet das Sekundenrauschen). */
export function average(points: TrafficPoint[], n = 5) {
  const slice = points.slice(-n);
  const sum = (
    k: keyof Pick<TrafficPoint, "incoming" | "forwarded" | "cached" | "limited" | "shed" | "latency" | "load">,
  ) => (slice.length ? slice.reduce((a, p) => a + p[k], 0) / slice.length : 0);
  const incoming = sum("incoming");
  const forwarded = sum("forwarded");
  return {
    incoming,
    forwarded,
    cached: sum("cached"),
    limited: sum("limited"),
    shed: sum("shed"),
    latency: sum("latency"),
    load: sum("load"),
    /** Anteil der Anfragen, die das Backend nie erreichen. */
    shielded: incoming > 0 ? 1 - forwarded / incoming : 0,
  };
}
