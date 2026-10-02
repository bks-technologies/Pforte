// Gemeinsame Typen. Alles hier ist reine Daten-Beschreibung, keine Logik und kein React.

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "ANY";
export type RateWindow = "second" | "minute" | "hour";

/** Eine Gateway-Regel: Ratenbegrenzung und Cache für einen Endpunkt (oder ein Präfix mit `*`). */
export interface Rule {
  id: string;
  endpoint: string;
  method: HttpMethod;
  maxRequests: number;
  window: RateWindow;
  /** Sekunden, 0 = kein Cache. */
  cacheTtl: number;
  enabled: boolean;
  createdAt: number;
}

export type RuleDraft = Omit<Rule, "id" | "createdAt" | "enabled">;

/**
 * Circuit Breaker.
 * closed    = Verkehr läuft normal durch
 * open      = Not-Aus aktiv: gedrosselt (throttle) oder komplett abgefangen (block)
 * half-open = nach dem Lösen: Durchlass wird über `RECOVERY_MS` stufenweise wieder hochgefahren
 */
export type BreakerPhase = "closed" | "open" | "half-open";
export type BreakerMode = "throttle" | "block";

export interface BreakerState {
  phase: BreakerPhase;
  mode: BreakerMode;
  /** Anteil der Backend-Kapazität, der im Modus `throttle` noch durchgelassen wird (5–90). */
  throttlePercent: number;
  /** Zeitpunkt des letzten Phasenwechsels. */
  since: number;
}

/** Ein Messpunkt je Sekunde. Alle Mengen in Anfragen pro Sekunde. */
export interface TrafficPoint {
  t: number;
  incoming: number;
  /** An das Legacy-System weitergeleitet. */
  forwarded: number;
  /** Direkt aus dem Gateway-Cache beantwortet. */
  cached: number;
  /** Durch Regeln abgewiesen (HTTP 429). */
  limited: number;
  /** Durch den Circuit Breaker abgefangen (HTTP 503 mit Retry-After). */
  shed: number;
  /** Mittlere Antwortzeit des Legacy-Backends in ms. */
  latency: number;
  /** Auslastung des Backends, 1 = Kapazitätsgrenze. */
  load: number;
  breaker: BreakerPhase;
}

export type GatewayEventKind = "rule" | "breaker" | "spike" | "overload" | "info";

export interface GatewayEvent {
  id: string;
  t: number;
  kind: GatewayEventKind;
  text: string;
}
