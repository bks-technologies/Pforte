import { describe, expect, it } from "vitest";
import { BACKEND_CAPACITY, breakerCap, createSim, RECOVERY_MS, settleBreaker, step } from "@/lib/traffic";
import type { BreakerState, Rule } from "@/lib/types";

const closed: BreakerState = { phase: "closed", mode: "throttle", throttlePercent: 30, since: 0 };
const products: Rule = {
  id: "p",
  endpoint: "/api/v1/products",
  method: "GET",
  maxRequests: 100,
  window: "minute",
  cacheTtl: 300,
  enabled: true,
  createdAt: 0,
};

describe("step", () => {
  it("ist mit gleichem Startwert reproduzierbar", () => {
    const a = step(createSim(7), 1000, [], closed).point;
    const b = step(createSim(7), 1000, [], closed).point;
    expect(a).toEqual(b);
  });
  it("verliert keine Anfrage: eingehend = weitergeleitet + Cache + 429 + abgefangen", () => {
    const sim = createSim(3);
    for (let t = 0; t < 60_000; t += 1000) {
      const p = step(sim, t, [products], { ...closed, phase: "open" }).point;
      expect(p.forwarded + p.cached + p.limited + p.shed).toBeCloseTo(p.incoming, 0);
    }
  });
  it("ohne Regeln geht alles ans Backend", () => {
    const p = step(createSim(1), 0, [], closed).point;
    expect(p.forwarded).toBe(p.incoming);
    expect(p.cached + p.limited + p.shed).toBe(0);
  });
  it("Regel mit Cache und Limit entlastet das Backend", () => {
    const without = step(createSim(1), 0, [], closed).point;
    const withRule = step(createSim(1), 0, [products], closed).point;
    expect(withRule.forwarded).toBeLessThan(without.forwarded);
    expect(withRule.cached).toBeGreaterThan(0);
    expect(withRule.limited).toBeGreaterThan(0);
  });
  it("Lastspitze erhöht die Last", () => {
    const calm = step(createSim(1), 10_000, [], closed).point;
    const sim = createSim(1);
    sim.spikeUntil = 10_000 + 10_000;
    expect(step(sim, 10_000, [], closed).point.incoming).toBeGreaterThan(calm.incoming * 1.5);
  });
});

describe("Circuit Breaker", () => {
  it("Abfangen lässt nichts durch, Drosseln begrenzt auf den Anteil", () => {
    const p = step(createSim(1), 0, [], { ...closed, phase: "open", mode: "block" }).point;
    expect(p.forwarded).toBe(0);
    expect(p.shed).toBe(p.incoming);
    expect(p.latency).toBe(0);
    expect(breakerCap({ ...closed, phase: "open", throttlePercent: 30 }, 0)).toBeCloseTo(BACKEND_CAPACITY * 0.3);
  });
  it("half-open fährt hoch und schließt nach der Erholungszeit", () => {
    const b: BreakerState = { ...closed, phase: "half-open", since: 0 };
    expect(breakerCap(b, 0)).toBeCloseTo(BACKEND_CAPACITY * 0.25);
    expect(breakerCap(b, RECOVERY_MS / 2)).toBeGreaterThan(breakerCap(b, 0));
    expect(settleBreaker(b, RECOVERY_MS - 1).phase).toBe("half-open");
    expect(settleBreaker(b, RECOVERY_MS).phase).toBe("closed");
    expect(breakerCap(closed, 0)).toBe(Infinity);
  });
});
