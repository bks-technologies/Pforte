import { Info, ListTree, OctagonX, Settings2, TrendingUp, TriangleAlert } from "lucide-react";
import { fmtClock } from "@/lib/format";
import type { GatewayEvent, GatewayEventKind } from "@/lib/types";
import { cx, Panel, PanelHeader } from "../ui/primitives";

const ICONS: Record<GatewayEventKind, { icon: React.ReactNode; cls: string }> = {
  rule: { icon: <Settings2 />, cls: "text-accent" },
  breaker: { icon: <OctagonX />, cls: "text-fail" },
  spike: { icon: <TrendingUp />, cls: "text-warn" },
  overload: { icon: <TriangleAlert />, cls: "text-fail" },
  info: { icon: <Info />, cls: "text-muted" },
};

export function EventLog({ events }: { events: GatewayEvent[] }) {
  return (
    <Panel className="flex min-h-0 flex-col">
      <PanelHeader icon={<ListTree />} title="Protokoll" hint="Letzte Änderungen und Vorfälle" />
      <ol className="max-h-[388px] min-h-40 flex-1 overflow-y-auto px-5 py-2" aria-live="polite">
        {events.map((e) => (
          <li key={e.id} className="flex gap-3 border-b border-line py-2.5 last:border-0">
            <span className={cx("mt-0.5 [&_svg]:size-3.5", ICONS[e.kind].cls)}>{ICONS[e.kind].icon}</span>
            <div className="min-w-0">
              <p className="text-[13px] leading-snug text-ink">{e.text}</p>
              <time className="tabular text-[11px] text-faint">{fmtClock(e.t)}</time>
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  );
}
