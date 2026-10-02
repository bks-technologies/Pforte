import { ArrowDownToLine, ArrowUpFromLine, Ban, Database, Gauge, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { fmt, pct } from "@/lib/format";
import type { average } from "@/lib/traffic";
import { cx } from "../ui/primitives";

type Stats = ReturnType<typeof average>;

export function KpiStrip({ stats }: { stats: Stats | null }) {
  const load = stats?.load ?? 0;
  const loadTone = load > 1 ? "fail" : load > 0.8 ? "warn" : "ok";
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3 xl:grid-cols-6">
      <Kpi
        icon={<ArrowDownToLine />}
        label="Eingehend"
        value={stats && fmt(stats.incoming)}
        unit="/s"
        swatch="var(--series-in)"
      />
      <Kpi
        icon={<ArrowUpFromLine />}
        label="An Legacy"
        value={stats && fmt(stats.forwarded)}
        unit="/s"
        swatch="var(--series-out)"
      />
      <Kpi icon={<Database />} label="Aus dem Cache" value={stats && fmt(stats.cached)} unit="/s" />
      <Kpi
        icon={<Ban />}
        label="Abgewiesen"
        value={stats && fmt(stats.limited + stats.shed)}
        unit="/s"
        sub="429 + 503"
      />
      <Kpi
        icon={<ShieldCheck />}
        label="Abgeschirmt"
        value={stats && pct(stats.shielded)}
        sub="erreicht das Backend nie"
      />
      <Kpi
        icon={<Gauge />}
        label="Backend-Last"
        value={stats && pct(load)}
        sub={stats ? (stats.latency ? `${fmt(stats.latency)} ms Latenz` : "kein Verkehr") : undefined}
        tone={stats ? loadTone : undefined}
      />
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  unit,
  sub,
  swatch,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string | null;
  unit?: string;
  sub?: string;
  swatch?: string;
  tone?: "ok" | "warn" | "fail";
}) {
  return (
    <div className="bg-surface px-4 py-3.5">
      <div className="flex items-center gap-1.5 text-[12px] font-medium text-muted [&_svg]:size-3.5">
        {icon}
        {label}
        {swatch && <span className="ml-auto h-0.5 w-4 rounded-full" style={{ background: swatch }} aria-hidden />}
      </div>
      <div
        className={cx(
          "tabular mt-1.5 text-2xl font-semibold tracking-tight",
          tone === "fail" ? "text-fail-ink" : tone === "warn" ? "text-warn-ink" : "text-ink",
        )}
      >
        {value ?? <span className="text-faint">–</span>}
        {value && unit && <span className="ml-0.5 text-sm font-normal text-muted">{unit}</span>}
      </div>
      {sub && <div className="mt-0.5 truncate text-xs text-muted">{sub}</div>}
    </div>
  );
}
