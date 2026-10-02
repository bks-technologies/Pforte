"use client";

import { Activity, Pause, Play } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import { fmt, fmtClock } from "@/lib/format";
import { BACKEND_CAPACITY } from "@/lib/traffic";
import type { BreakerPhase, TrafficPoint } from "@/lib/types";
import { Button, cx, Panel, PanelHeader, Segmented } from "../ui/primitives";

type Range = "60" | "300";
type SeriesKey = "incoming" | "forwarded";

const SERIES: { key: SeriesKey; label: string; color: string }[] = [
  { key: "incoming", label: "Eingehend am Gateway", color: "var(--series-in)" },
  { key: "forwarded", label: "An Legacy weitergeleitet", color: "var(--series-out)" },
];

/** Zusammenhängende Abschnitte, in denen der Breaker nicht geschlossen war. */
function breakerRanges(points: TrafficPoint[]) {
  const ranges: { from: number; to: number; phase: BreakerPhase }[] = [];
  for (const p of points) {
    const last = ranges.at(-1);
    if (p.breaker === "closed") continue;
    if (last && last.phase === p.breaker && p.t - last.to <= 1500) last.to = p.t;
    else ranges.push({ from: p.t, to: p.t, phase: p.breaker });
  }
  return ranges;
}

export function TrafficChart({
  points,
  paused,
  onTogglePause,
}: {
  points: TrafficPoint[];
  paused: boolean;
  onTogglePause: () => void;
}) {
  const [range, setRange] = useState<Range>("60");
  const [hidden, setHidden] = useState<Set<SeriesKey>>(new Set());

  const data = useMemo(() => points.slice(-Number(range)), [points, range]);
  const ranges = useMemo(() => breakerRanges(data), [data]);
  const last = data.at(-1);
  const yMax = Math.max(BACKEND_CAPACITY * 1.15, ...data.map((p) => p.incoming)) * 1.05;

  const toggle = (k: SeriesKey) =>
    setHidden((h) => {
      const n = new Set(h);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  return (
    <Panel>
      <PanelHeader
        icon={<Activity />}
        title="Verkehr in Echtzeit"
        hint="Anfragen pro Sekunde, simuliert. Die Lücke zwischen beiden Linien hält das Gateway vom Legacy-System fern."
        actions={
          <>
            <Segmented
              label="Zeitraum"
              size="sm"
              value={range}
              onChange={setRange}
              options={[
                { value: "60", label: "1 Min" },
                { value: "300", label: "5 Min" },
              ]}
            />
            <Button size="sm" variant="ghost" onClick={onTogglePause} aria-pressed={paused}>
              {paused ? <Play /> : <Pause />}
              {paused ? "Weiter" : "Anhalten"}
            </Button>
          </>
        }
      />

      {/* Legende mit aktuellen Werten, zugleich Schalter für die Linien */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 px-5 pt-4">
        {SERIES.map((s) => {
          const off = hidden.has(s.key);
          return (
            <button
              key={s.key}
              type="button"
              aria-pressed={!off}
              onClick={() => toggle(s.key)}
              className={cx("group flex items-center gap-2.5 rounded-md text-left", off && "opacity-45")}
            >
              <span className="h-0.5 w-5 rounded-full" style={{ background: s.color }} aria-hidden />
              <span className="text-[13px] text-muted group-hover:text-ink">{s.label}</span>
              <span className="tabular text-[15px] font-semibold text-ink">
                {last ? fmt(last[s.key]) : "–"}
                <span className="ml-0.5 text-xs font-normal text-muted">/s</span>
              </span>
            </button>
          );
        })}
        <span className="flex items-center gap-2 text-[13px] text-muted">
          <span className="h-3 w-4 rounded-sm bg-fail-soft ring-1 ring-fail/30" aria-hidden />
          Breaker aktiv
        </span>
      </div>

      <div className="h-[300px] px-2 pt-2 pb-3 sm:h-[340px]" data-native-cursor>
        {data.length === 0 ? (
          <div className="m-3 h-[calc(100%-1.5rem)] animate-pulse rounded-lg bg-sunken" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 12, right: 16, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="fill-in" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--series-in)" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="var(--series-in)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="fill-out" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--series-out)" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="var(--series-out)" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
              {ranges.map((r) => (
                <ReferenceArea
                  key={r.from}
                  x1={r.from}
                  x2={Math.max(r.to, r.from + 1000)}
                  fill={r.phase === "open" ? "var(--fail)" : "var(--warn)"}
                  fillOpacity={0.09}
                  ifOverflow="hidden"
                />
              ))}
              <XAxis
                dataKey="t"
                type="number"
                scale="time"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(t: number) => (range === "60" ? fmtClock(t) : fmtClock(t).slice(0, 5))}
                tick={{ fill: "var(--faint)", fontSize: 11 }}
                axisLine={{ stroke: "var(--line)" }}
                tickLine={false}
                minTickGap={56}
              />
              <YAxis
                domain={[0, Math.ceil(yMax / 50) * 50]}
                tick={{ fill: "var(--faint)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <ReferenceLine
                y={BACKEND_CAPACITY}
                stroke="var(--fail)"
                strokeDasharray="4 4"
                strokeOpacity={0.6}
                label={{
                  value: `Backend-Kapazität ${BACKEND_CAPACITY}/s`,
                  position: "insideTopLeft",
                  fill: "var(--fail-ink)",
                  fontSize: 11,
                  dy: -14,
                }}
              />
              <Tooltip
                content={ChartTooltip}
                cursor={{ stroke: "var(--line-strong)", strokeWidth: 1 }}
                isAnimationActive={false}
              />
              {!hidden.has("incoming") && (
                <Area
                  dataKey="incoming"
                  type="monotone"
                  stroke="var(--series-in)"
                  strokeWidth={2}
                  fill="url(#fill-in)"
                  isAnimationActive={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
                />
              )}
              {!hidden.has("forwarded") && (
                <Area
                  dataKey="forwarded"
                  type="monotone"
                  stroke="var(--series-out)"
                  strokeWidth={2}
                  fill="url(#fill-out)"
                  isAnimationActive={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
                />
              )}
              {/* unsichtbare Linie, damit der Tooltip auch bei ausgeblendeten Reihen Werte hat */}
              <Line dataKey="cached" stroke="transparent" dot={false} activeDot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </Panel>
  );
}

const PHASE_LABEL: Record<BreakerPhase, string> = {
  closed: "geschlossen",
  open: "ausgelöst",
  "half-open": "Erholung",
};

function ChartTooltip({ active, payload }: TooltipContentProps) {
  const p = payload?.[0]?.payload as TrafficPoint | undefined;
  if (!active || !p) return null;
  const rows: [string, number, string?][] = [
    ["Eingehend", p.incoming, "var(--series-in)"],
    ["Weitergeleitet", p.forwarded, "var(--series-out)"],
    ["Aus dem Cache", p.cached],
    ["Abgewiesen (429)", p.limited],
    ["Abgefangen (503)", p.shed],
  ];
  return (
    <div className="min-w-52 rounded-lg border border-line bg-surface px-3 py-2.5 text-xs shadow-[0_8px_24px_rgb(0_0_0/0.12)]">
      <div className="mb-1.5 flex justify-between gap-4 text-muted">
        <span className="tabular">{fmtClock(p.t)}</span>
        <span>Breaker {PHASE_LABEL[p.breaker]}</span>
      </div>
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
        {rows.map(([label, v, color]) => (
          <div key={label} className="contents">
            <dt className="flex items-center gap-1.5 text-muted">
              <span className="h-0.5 w-3 rounded-full" style={{ background: color ?? "transparent" }} aria-hidden />
              {label}
            </dt>
            <dd className="tabular text-right font-medium text-ink">{fmt(v)}/s</dd>
          </div>
        ))}
        <dt className="mt-1 border-t border-line pt-1 text-muted">Backend-Latenz</dt>
        <dd className="tabular mt-1 border-t border-line pt-1 text-right font-medium text-ink">
          {p.latency ? `${fmt(p.latency)} ms` : "–"}
        </dd>
      </dl>
    </div>
  );
}
