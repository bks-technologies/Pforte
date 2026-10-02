"use client";

import { RotateCcw, SlidersHorizontal, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { actions } from "@/lib/store";
import { average } from "@/lib/traffic";
import type { Rule, RuleDraft } from "@/lib/types";
import { useGateway } from "@/lib/use-gateway";
import { KillSwitch } from "../breaker/kill-switch";
import { RuleForm } from "../rules/rule-form";
import { RuleList } from "../rules/rule-list";
import { TransformerPreview } from "../transformer/transformer-preview";
import { Button, Panel, PanelHeader } from "../ui/primitives";
import { EventLog } from "./event-log";
import { KpiStrip } from "./kpi-strip";
import { TrafficChart } from "./traffic-chart";

/**
 * Einziger Ort, der den Store kennt. Liest den Zustand und reicht Werte und Aktionen
 * als Props weiter; alle Komponenten darunter sind reine Darstellung.
 */
export function ControlPanel() {
  const g = useGateway();
  const [editing, setEditing] = useState<Rule | null>(null);

  const stats = useMemo(() => (g.ready ? average(g.points) : null), [g.ready, g.points]);
  const now = g.points.at(-1)?.t ?? 0;
  const spiking = now < g.spikeUntil;

  const submitRule = (draft: RuleDraft, id?: string) => {
    if (id) actions.updateRule(id, draft);
    else actions.addRule(draft);
    setEditing(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Gateway-Übersicht</h1>
          <p className="mt-0.5 text-sm text-muted">
            Mobile App → Gateway → Legacy-Warenwirtschaft. Verkehr simuliert, Regeln wirken sofort.
          </p>
        </div>
        <Button onClick={actions.triggerSpike} disabled={!g.ready || spiking}>
          <Zap />
          {spiking ? "Lastspitze läuft …" : "Lastspitze simulieren"}
        </Button>
      </div>

      <KpiStrip stats={stats} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <TrafficChart points={g.points} paused={g.paused} onTogglePause={actions.togglePause} />
        <div className="order-first flex xl:order-none [&>section]:flex-1">
          <KillSwitch
            breaker={g.breaker}
            now={now}
            load={stats?.load ?? 0}
            shed={stats?.shed ?? 0}
            onEngage={actions.engageBreaker}
            onRelease={actions.releaseBreaker}
            onMode={actions.setBreakerMode}
            onThrottle={actions.setThrottle}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_380px]">
        <Panel id="regeln">
          <PanelHeader
            icon={<SlidersHorizontal />}
            title={editing ? "Regel bearbeiten" : "Neue Regel"}
            hint="Ratenbegrenzung und Cache je Endpunkt"
          />
          <RuleForm
            key={editing?.id ?? "neu"}
            rules={g.rules}
            editing={editing}
            onSubmit={submitRule}
            onCancelEdit={() => setEditing(null)}
          />
        </Panel>
        <Panel className="flex flex-col">
          <PanelHeader
            title={`Aktive Regeln (${g.rules.filter((r) => r.enabled).length}/${g.rules.length})`}
            hint="Exakter Pfad vor Präfix, längstes Präfix gewinnt"
            actions={
              <Button size="sm" variant="ghost" onClick={actions.resetRules}>
                <RotateCcw />
                Beispiel
              </Button>
            }
          />
          <RuleList
            rules={g.rules}
            editingId={editing?.id ?? null}
            onEdit={setEditing}
            onToggle={actions.toggleRule}
            onRemove={(id) => {
              if (editing?.id === id) setEditing(null);
              actions.removeRule(id);
            }}
          />
        </Panel>
        <div className="lg:col-span-2 xl:col-span-1">
          <EventLog events={g.events} />
        </div>
      </div>

      <TransformerPreview />
    </div>
  );
}
