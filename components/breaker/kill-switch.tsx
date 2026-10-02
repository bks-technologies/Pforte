"use client";

import { OctagonX, Power, ShieldAlert, TriangleAlert } from "lucide-react";
import { fmt, fmtDuration } from "@/lib/format";
import { BACKEND_CAPACITY, RECOVERY_MS } from "@/lib/traffic";
import type { BreakerMode, BreakerState } from "@/lib/types";
import { cx, Panel, Segmented } from "../ui/primitives";

/**
 * Not-Aus. Ein Klick, keine Rückfrage: in einer Überlast-Situation zählt jede Sekunde.
 * Lösen geht über eine Erholungsphase (half-open), damit das Backend nicht sofort wieder
 * mit voller Last getroffen wird.
 */
export function KillSwitch({
  breaker,
  now,
  load,
  shed,
  onEngage,
  onRelease,
  onMode,
  onThrottle,
}: {
  breaker: BreakerState;
  /** Zeit des letzten Messpunkts, damit die Anzeige ohne eigene Uhr mitläuft. */
  now: number;
  load: number;
  shed: number;
  onEngage: () => void;
  onRelease: () => void;
  onMode: (m: BreakerMode) => void;
  onThrottle: (p: number) => void;
}) {
  const open = breaker.phase === "open";
  const recovering = breaker.phase === "half-open";
  const overloaded = load > 1 && !open;
  const elapsed = now - breaker.since;
  const recovery = Math.min(1, Math.max(0, elapsed / RECOVERY_MS));

  return (
    <Panel
      className={cx(
        "flex flex-col transition-colors duration-200",
        open && "border-fail/60 bg-fail-soft/40 ring-1 ring-fail/30",
        overloaded && "border-warn/60",
      )}
    >
      <div className="flex items-start justify-between gap-3 px-5 pt-4">
        <div>
          <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-ink">
            <ShieldAlert className="size-[18px] text-muted" />
            Circuit Breaker
          </h2>
          <p className="mt-0.5 text-[13px] text-muted">Not-Aus bei Überlast des Legacy-Backends</p>
        </div>
        <StatusPill phase={breaker.phase} />
      </div>

      {overloaded && (
        <div
          role="alert"
          className="mx-5 mt-3 flex items-start gap-2 rounded-lg bg-warn-soft px-3 py-2 text-[13px] text-warn-ink"
        >
          <TriangleAlert className="mt-px size-4 shrink-0" />
          <span>
            Backend bei {fmt(load * 100)} % seiner Kapazität. Antwortzeiten steigen, Ausfall droht. Not-Aus empfohlen.
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-4 px-5 py-4">
        <button
          type="button"
          role="switch"
          aria-checked={open}
          onClick={open ? onRelease : onEngage}
          className={cx(
            "group relative flex h-16 w-full items-center gap-4 rounded-xl px-4 text-left font-semibold select-none active:scale-[0.99]",
            open
              ? "bg-fail text-white shadow-[0_6px_20px_-6px_var(--fail)]"
              : "border-2 border-fail/70 bg-surface text-fail-ink hover:bg-fail-soft",
          )}
        >
          <span
            className={cx(
              "relative flex size-10 shrink-0 items-center justify-center rounded-full",
              open ? "bg-white/20" : "bg-fail text-white",
            )}
          >
            {open && <span className="absolute inset-0 animate-pulse-ring rounded-full bg-white/40" aria-hidden />}
            {open ? <OctagonX className="size-5" /> : <Power className="size-5" />}
          </span>
          <span className="flex flex-col">
            <span className="text-base leading-tight">{open ? "Not-Aus aktiv · Lösen" : "Not-Aus auslösen"}</span>
            <span className={cx("text-xs font-normal", open ? "text-white/85" : "text-muted")}>
              {open
                ? `seit ${fmtDuration(elapsed)} · ${fmt(shed)} Anfragen/s abgefangen`
                : breaker.mode === "block"
                  ? "Fängt sofort alle Anfragen ab"
                  : `Drosselt sofort auf ${breaker.throttlePercent} % Durchlass`}
            </span>
          </span>
        </button>

        {recovering && (
          <div>
            <div className="mb-1 flex justify-between text-xs text-muted">
              <span>Erholung: Durchlass fährt hoch</span>
              <span className="tabular">{fmt(25 + 75 * recovery)} %</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-sunken">
              <div className="h-full rounded-full bg-warn" style={{ width: `${25 + 75 * recovery}%` }} />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-line pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[13px] font-medium text-ink">Bei Auslösung</span>
            <Segmented<BreakerMode>
              label="Modus des Circuit Breakers"
              size="sm"
              value={breaker.mode}
              onChange={onMode}
              options={[
                { value: "throttle", label: "Drosseln" },
                { value: "block", label: "Abfangen" },
              ]}
            />
          </div>
          {breaker.mode === "throttle" ? (
            <div>
              <label htmlFor="throttle" className="mb-1.5 flex justify-between text-xs text-muted">
                <span>Durchlass zum Backend</span>
                <span className="tabular font-medium text-ink">
                  {breaker.throttlePercent} % · {fmt((BACKEND_CAPACITY * breaker.throttlePercent) / 100)}/s
                </span>
              </label>
              <input
                id="throttle"
                type="range"
                min={5}
                max={90}
                step={5}
                value={breaker.throttlePercent}
                onChange={(e) => onThrottle(Number(e.target.value))}
                className="w-full accent-[var(--fail)]"
                data-native-cursor
              />
            </div>
          ) : (
            <p className="text-xs leading-relaxed text-muted">
              Kein Durchlass. GET-Anfragen mit Cache-Regel bekommen weiter die gecachte Antwort, alles andere HTTP 503
              mit <code className="font-mono text-ink">Retry-After: 30</code>.
            </p>
          )}
        </div>

        <PhaseTrack phase={breaker.phase} />
      </div>
    </Panel>
  );
}

/** Die drei Zustände des Breakers als Ablauf, der aktuelle hervorgehoben. */
function PhaseTrack({ phase }: { phase: BreakerState["phase"] }) {
  const steps: { key: BreakerState["phase"]; label: string; text: string; dot: string }[] = [
    { key: "closed", label: "Geschlossen", text: "Alles läuft durch Regeln und Cache.", dot: "bg-ok" },
    { key: "open", label: "Ausgelöst", text: "Drosseln oder abfangen, Backend erholt sich.", dot: "bg-fail" },
    { key: "half-open", label: "Erholung", text: "Durchlass steigt in 20 s von 25 auf 100 %.", dot: "bg-warn" },
  ];
  return (
    <ol className="mt-auto flex flex-col gap-2.5 border-t border-line pt-4" aria-label="Zustände des Circuit Breakers">
      {steps.map((s) => {
        const active = s.key === phase;
        return (
          <li
            key={s.key}
            className={cx("flex gap-2.5", !active && "opacity-50")}
            aria-current={active ? "step" : undefined}
          >
            <span className={cx("mt-1.5 size-2 shrink-0 rounded-full", s.dot)} aria-hidden />
            <span className="text-xs leading-snug">
              <span className={cx("font-semibold", active ? "text-ink" : "text-muted")}>{s.label}</span>
              <span className="text-muted"> · {s.text}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function StatusPill({ phase }: { phase: BreakerState["phase"] }) {
  const map = {
    closed: { label: "Geschlossen", cls: "bg-ok-soft text-ok-ink", dot: "bg-ok" },
    open: { label: "Ausgelöst", cls: "bg-fail text-white", dot: "bg-white" },
    "half-open": { label: "Erholung", cls: "bg-warn-soft text-warn-ink", dot: "bg-warn" },
  }[phase];
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", map.cls)}>
      <span className={cx("size-1.5 rounded-full", map.dot)} aria-hidden />
      {map.label}
    </span>
  );
}
