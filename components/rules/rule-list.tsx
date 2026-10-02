import { Pencil, Trash2 } from "lucide-react";
import { formatTtl, WINDOWS } from "@/lib/rules";
import type { Rule } from "@/lib/types";
import { Badge, cx } from "../ui/primitives";

export function RuleList({
  rules,
  editingId,
  onEdit,
  onToggle,
  onRemove,
}: {
  rules: Rule[];
  editingId: string | null;
  onEdit: (r: Rule) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  if (rules.length === 0)
    return (
      <p className="px-5 py-8 text-center text-sm text-muted">
        Keine Regeln. Ohne Regel geht jede Anfrage ungebremst ans Legacy-System.
      </p>
    );

  return (
    <ul className="divide-y divide-line">
      {rules.map((r) => {
        const w = WINDOWS.find((x) => x.value === r.window)!;
        return (
          <li key={r.id} className={cx("flex items-center gap-3 px-5 py-3", editingId === r.id && "bg-accent-soft/60")}>
            <button
              type="button"
              role="switch"
              aria-checked={r.enabled}
              aria-label={`${r.method} ${r.endpoint} ${r.enabled ? "pausieren" : "aktivieren"}`}
              onClick={() => onToggle(r.id)}
              className={cx(
                "relative h-5 w-9 shrink-0 rounded-full transition-colors duration-150",
                r.enabled ? "bg-ok" : "bg-line-strong",
              )}
            >
              <span
                className={cx(
                  "absolute top-0.5 left-0 size-4 rounded-full bg-white shadow transition-transform duration-150",
                  r.enabled ? "translate-x-[18px]" : "translate-x-0.5",
                )}
              />
            </button>
            <div className={cx("min-w-0 flex-1", !r.enabled && "opacity-55")}>
              <div className="flex items-center gap-2">
                <Badge tone={r.method === "GET" ? "accent" : "neutral"} className="font-mono">
                  {r.method === "ANY" ? "ALLE" : r.method}
                </Badge>
                <span className="truncate font-mono text-[13px] text-ink">{r.endpoint}</span>
              </div>
              <div className="tabular mt-1 text-xs text-muted">
                {r.maxRequests.toLocaleString("de-DE")}/{w.short}
                <span className="mx-1.5 text-faint">·</span>
                Cache {formatTtl(r.cacheTtl)}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onEdit(r)}
              aria-label={`${r.endpoint} bearbeiten`}
              className="rounded-md p-1.5 text-muted hover:bg-sunken hover:text-ink [&_svg]:size-4"
            >
              <Pencil />
            </button>
            <button
              type="button"
              onClick={() => onRemove(r.id)}
              aria-label={`${r.endpoint} löschen`}
              className="rounded-md p-1.5 text-muted hover:bg-fail-soft hover:text-fail-ink [&_svg]:size-4"
            >
              <Trash2 />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
