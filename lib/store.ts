import { describeRule, sanitizeRules } from "./rules";
import { createSim, SPIKE_MS, step, type SimState } from "./traffic";
import type { BreakerMode, BreakerState, GatewayEvent, GatewayEventKind, Rule, RuleDraft, TrafficPoint } from "./types";

/**
 * Zustand des Control Panels. Kein React: die Oberfläche liest per `subscribe`/`getSnapshot`
 * (useSyncExternalStore) und ändert nur über die Aktionen unten.
 * Der Takt läuft nur, solange jemand zuhört.
 */

export const HISTORY_SECONDS = 300;
const TICK_MS = 1000;
const STORAGE_KEY = "pforte:v1";
const OVERLOAD_THRESHOLD = 1;

export interface GatewaySnapshot {
  ready: boolean;
  paused: boolean;
  rules: Rule[];
  breaker: BreakerState;
  points: TrafficPoint[];
  events: GatewayEvent[];
  spikeUntil: number;
}

export const DEFAULT_RULES: Rule[] = [
  {
    id: "r-products",
    endpoint: "/api/v1/products",
    method: "GET",
    maxRequests: 3000,
    window: "minute",
    cacheTtl: 300,
    enabled: true,
    createdAt: 0,
  },
  {
    id: "r-cart",
    endpoint: "/api/v1/cart",
    method: "POST",
    maxRequests: 25,
    window: "second",
    cacheTtl: 0,
    enabled: true,
    createdAt: 0,
  },
];

const initialBreaker = (): BreakerState => ({ phase: "closed", mode: "throttle", throttlePercent: 30, since: 0 });

let snapshot: GatewaySnapshot = {
  ready: false,
  paused: false,
  rules: DEFAULT_RULES,
  breaker: initialBreaker(),
  points: [],
  events: [],
  spikeUntil: 0,
};

const SERVER_SNAPSHOT = snapshot;
let sim: SimState = createSim();
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();
let eventSeq = 0;

function set(patch: Partial<GatewaySnapshot>) {
  snapshot = { ...snapshot, ...patch };
  listeners.forEach((l) => l());
}

function event(kind: GatewayEventKind, text: string, t = Date.now()): GatewayEvent {
  return { id: `e${++eventSeq}`, t, kind, text };
}

function pushEvent(kind: GatewayEventKind, text: string) {
  set({ events: [event(kind, text), ...snapshot.events].slice(0, 40) });
}

/* ---------- Speicher: nur Regeln und Breaker-Einstellungen, nie der Verkehr ---------- */

function load(): Pick<GatewaySnapshot, "rules"> & { mode?: BreakerMode; throttlePercent?: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { rules: DEFAULT_RULES };
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object") return { rules: DEFAULT_RULES };
    const d = data as Record<string, unknown>;
    const pct = typeof d.throttlePercent === "number" && Number.isFinite(d.throttlePercent) ? d.throttlePercent : 30;
    return {
      rules: sanitizeRules(d.rules) ?? DEFAULT_RULES,
      mode: d.mode === "block" ? "block" : "throttle",
      throttlePercent: clampThrottle(pct),
    };
  } catch {
    return { rules: DEFAULT_RULES };
  }
}

function persist() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        rules: snapshot.rules,
        mode: snapshot.breaker.mode,
        throttlePercent: snapshot.breaker.throttlePercent,
      }),
    );
  } catch {
    // privates Fenster o. Ä.: läuft ohne Speichern weiter
  }
}

const clampThrottle = (p: number) => Math.min(90, Math.max(5, Math.round(p / 5) * 5));

/* ---------- Takt ---------- */

function init() {
  const stored = load();
  sim = createSim((Date.now() % 100_000) + 1);
  const breaker: BreakerState = {
    ...initialBreaker(),
    mode: stored.mode ?? "throttle",
    throttlePercent: stored.throttlePercent ?? 30,
  };
  // Fünf Minuten Vorlauf, damit auch die 5-Minuten-Ansicht nicht halb leer beginnt.
  const now = Date.now();
  const points: TrafficPoint[] = [];
  let b = breaker;
  for (let s = HISTORY_SECONDS; s > 0; s--) {
    const r = step(sim, now - s * TICK_MS, stored.rules, b);
    points.push(r.point);
    b = r.breaker;
  }
  set({
    ready: true,
    rules: stored.rules,
    breaker: b,
    points,
    events: [event("info", "Gateway verbunden. Verkehr ist simuliert (Beispieldaten).", now)],
  });
}

function tick() {
  if (snapshot.paused) return;
  const now = Date.now();
  const prevLast = snapshot.points.at(-1);
  // Im Hintergrund-Tab bremst der Browser setInterval. Verpasste Sekunden werden nachgerechnet,
  // damit das Diagramm keine Lücke mit schräger Linie bekommt.
  const from = prevLast ? Math.max(prevLast.t + TICK_MS, now - HISTORY_SECONDS * TICK_MS) : now;
  let breaker = snapshot.breaker;
  const newPoints: TrafficPoint[] = [];
  const events = [...snapshot.events];
  let prev = prevLast;
  for (let t = Math.min(from, now); t <= now; t += TICK_MS) {
    sim.spikeUntil = snapshot.spikeUntil;
    const r = step(sim, t, snapshot.rules, breaker);
    if (breaker.phase === "half-open" && r.breaker.phase === "closed")
      events.unshift(event("breaker", "Circuit Breaker geschlossen, voller Durchlass.", t));
    if (r.point.load > OVERLOAD_THRESHOLD && (!prev || prev.load <= OVERLOAD_THRESHOLD))
      events.unshift(event("overload", `Legacy-Backend über Kapazität (${Math.round(r.point.load * 100)} %).`, t));
    breaker = r.breaker;
    newPoints.push(r.point);
    prev = r.point;
  }

  set({
    breaker,
    points: [...snapshot.points, ...newPoints].slice(-HISTORY_SECONDS),
    events: events.slice(0, 40),
  });
}

export const gatewayStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    if (!snapshot.ready) init();
    if (!timer) timer = setInterval(tick, TICK_MS);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0 && timer) {
        clearInterval(timer);
        timer = null;
      }
    };
  },
  getSnapshot: () => snapshot,
  getServerSnapshot: () => SERVER_SNAPSHOT,
};

/* ---------- Aktionen ---------- */

export const actions = {
  addRule(draft: RuleDraft) {
    const rule: Rule = { ...draft, id: `r-${Date.now().toString(36)}`, enabled: true, createdAt: Date.now() };
    set({ rules: [rule, ...snapshot.rules] });
    pushEvent("rule", `Regel angelegt: ${rule.method} ${rule.endpoint} (${describeRule(rule)}).`);
    persist();
  },
  updateRule(id: string, draft: RuleDraft) {
    set({ rules: snapshot.rules.map((r) => (r.id === id ? { ...r, ...draft } : r)) });
    pushEvent("rule", `Regel geändert: ${draft.method} ${draft.endpoint} (${describeRule(draft)}).`);
    persist();
  },
  toggleRule(id: string) {
    const rule = snapshot.rules.find((r) => r.id === id);
    if (!rule) return;
    set({ rules: snapshot.rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)) });
    pushEvent("rule", `Regel ${rule.enabled ? "pausiert" : "aktiviert"}: ${rule.method} ${rule.endpoint}.`);
    persist();
  },
  removeRule(id: string) {
    const rule = snapshot.rules.find((r) => r.id === id);
    if (!rule) return;
    set({ rules: snapshot.rules.filter((r) => r.id !== id) });
    pushEvent("rule", `Regel gelöscht: ${rule.method} ${rule.endpoint}.`);
    persist();
  },
  resetRules() {
    set({ rules: DEFAULT_RULES });
    pushEvent("rule", "Regeln auf die Beispielwerte zurückgesetzt.");
    persist();
  },

  /** Not-Aus. Wirkt sofort im nächsten Takt, keine Rückfrage. */
  engageBreaker() {
    if (snapshot.breaker.phase === "open") return;
    const b = snapshot.breaker;
    set({ breaker: { ...b, phase: "open", since: Date.now() } });
    pushEvent(
      "breaker",
      b.mode === "block"
        ? "Circuit Breaker AUSGELÖST: alle Anfragen werden abgefangen (Cache oder 503)."
        : `Circuit Breaker AUSGELÖST: Durchlass auf ${b.throttlePercent} % der Backend-Kapazität gedrosselt.`,
    );
  },
  releaseBreaker() {
    if (snapshot.breaker.phase !== "open") return;
    set({ breaker: { ...snapshot.breaker, phase: "half-open", since: Date.now() } });
    pushEvent("breaker", "Circuit Breaker gelöst. Durchlass fährt in 20 s stufenweise hoch.");
  },
  setBreakerMode(mode: BreakerMode) {
    if (snapshot.breaker.mode === mode) return;
    set({ breaker: { ...snapshot.breaker, mode } });
    if (snapshot.breaker.phase === "open")
      pushEvent("breaker", mode === "block" ? "Breaker-Modus: Abfangen." : "Breaker-Modus: Drosseln.");
    persist();
  },
  setThrottle(percent: number) {
    const p = clampThrottle(percent);
    set({ breaker: { ...snapshot.breaker, throttlePercent: p } });
    persist();
  },

  triggerSpike() {
    const until = Date.now() + SPIKE_MS;
    set({ spikeUntil: until });
    pushEvent("spike", "Lastspitze simuliert: etwa dreifacher Verkehr für 25 s.");
  },
  togglePause() {
    set({ paused: !snapshot.paused });
  },
};
