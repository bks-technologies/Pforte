"use client";

import { ArrowRight, Check, CircleAlert, Copy, EyeOff, RotateCcw, Shuffle } from "lucide-react";
import { useMemo, useState } from "react";
import { fmt, fmtBytes, pct } from "@/lib/format";
import { MAPPINGS, SAMPLES, SENSITIVE } from "@/lib/samples";
import { OP_LABELS, parseSource, transform, type SourceFormat } from "@/lib/transform";
import { Badge, Button, cx, Panel, PanelHeader, Segmented } from "../ui/primitives";
import { JsonView } from "./json-view";

/**
 * Zeigt, was das Gateway aus einer Legacy-Antwort macht. Die Quelle ist bearbeitbar,
 * Ergebnis und Feldprüfung rechnen bei jeder Änderung neu (lib/transform.ts).
 */
export function TransformerPreview() {
  const [format, setFormat] = useState<SourceFormat>("xml");
  const [sources, setSources] = useState(SAMPLES);
  const [copied, setCopied] = useState(false);

  const src = sources[format];
  const parsed = useMemo(() => parseSource(src, format), [src, format]);
  const result = useMemo(
    () => (parsed.ok ? transform(src, parsed.data, MAPPINGS[format]) : null),
    [parsed, src, format],
  );
  const problems = result?.fields.filter((f) => f.problem).length ?? 0;
  const hiddenPresent = SENSITIVE[format].filter((k) => src.includes(k));

  const copy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(result.output, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Zwischenablage gesperrt: kein Hinweis nötig, Text ist markierbar
    }
  };

  return (
    <Panel id="transformer">
      <PanelHeader
        icon={<Shuffle />}
        title="Payload Transformer"
        hint="Legacy-Antwort links bearbeiten, rechts steht live, was die Mobile App bekommt."
        actions={
          <>
            <Segmented
              label="Format des Legacy-Backends"
              size="sm"
              value={format}
              onChange={setFormat}
              options={[
                { value: "xml", label: "SOAP / XML" },
                { value: "json", label: "OData / JSON" },
              ]}
            />
            <Button
              size="sm"
              variant="ghost"
              disabled={src === SAMPLES[format]}
              onClick={() => setSources((s) => ({ ...s, [format]: SAMPLES[format] }))}
            >
              <RotateCcw />
              Beispiel
            </Button>
          </>
        }
      />

      {/* Kennzahlen der Umwandlung */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-line px-5 py-3 text-[13px]">
        {result ? (
          <>
            <span className="tabular flex items-center gap-2 text-muted">
              <span className="text-ink">{fmtBytes(result.bytesIn)}</span>
              <ArrowRight className="size-3.5" />
              <span className="font-semibold text-ink">{fmtBytes(result.bytesOut)}</span>
              <Badge tone="ok">−{pct(1 - result.bytesOut / result.bytesIn)}</Badge>
            </span>
            <span className="tabular text-muted">
              <span className="text-ink">{fmt(result.sourceFields)}</span> Felder rein,{" "}
              <span className="text-ink">{result.fields.length}</span> raus
            </span>
            {problems > 0 ? (
              <Badge tone="warn">
                <CircleAlert />
                {problems} {problems === 1 ? "Feld" : "Felder"} ohne Wert
              </Badge>
            ) : (
              <Badge tone="ok">
                <Check />
                Alle Felder zugeordnet
              </Badge>
            )}
          </>
        ) : (
          <span className="text-fail-ink">Quelle nicht lesbar, keine Ausgabe.</span>
        )}
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.9fr)_minmax(0,0.95fr)] lg:divide-x lg:divide-line">
        {/* Quelle */}
        <div className="flex min-w-0 flex-col">
          <ColumnHead
            title="Legacy-Antwort"
            sub={format === "xml" ? "Warenwirtschaft, SOAP" : "Warenwirtschaft, OData v2"}
          />
          <div className="relative mx-4 mb-4 flex-1">
            <textarea
              aria-label="Legacy-Antwort bearbeiten"
              spellCheck={false}
              value={src}
              onChange={(e) => setSources((s) => ({ ...s, [format]: e.target.value }))}
              className={cx(
                "h-full min-h-[420px] w-full resize-y rounded-lg bg-code p-3 font-mono text-[12px] leading-[1.55] text-code-ink focus:outline-none focus:ring-2",
                parsed.ok ? "focus:ring-accent/40" : "ring-2 ring-fail/70",
              )}
              data-native-cursor
            />
            {!parsed.ok && (
              <p role="alert" className="mt-2 rounded-md bg-fail-soft px-3 py-2 text-xs text-fail-ink">
                {parsed.line ? `Zeile ${parsed.line}: ` : ""}
                {parsed.error}
              </p>
            )}
          </div>
        </div>

        {/* Zuordnungen */}
        <div className="flex min-w-0 flex-col border-t border-line lg:border-t-0">
          <ColumnHead title="Zuordnung" sub="Nur diese Felder verlassen das Gateway" />
          <ul className="mx-4 flex flex-col gap-1.5">
            {MAPPINGS[format].map((m) => {
              const f = result?.fields.find((x) => x.mapping.target === m.target);
              const bad = !result || !!f?.problem;
              return (
                <li key={m.target} className="rounded-lg border border-line px-3 py-2">
                  <div className="flex items-center gap-2">
                    {bad ? (
                      <CircleAlert className="size-3.5 shrink-0 text-warn" aria-label="Problem" />
                    ) : (
                      <Check className="size-3.5 shrink-0 text-ok" aria-label="ok" />
                    )}
                    <span className="font-mono text-[12.5px] font-medium text-ink">{m.target}</span>
                    <span className="ml-auto text-[11px] text-muted">{OP_LABELS[m.op]}</span>
                  </div>
                  <div className="mt-0.5 truncate pl-5.5 font-mono text-[11px] text-faint" title={m.source}>
                    ← {m.source.split(".").slice(-2).join(".")}
                  </div>
                  {f?.problem && <div className="mt-0.5 pl-5.5 text-[11px] text-warn-ink">{f.problem}</div>}
                </li>
              );
            })}
          </ul>
          {hiddenPresent.length > 0 && (
            <div className="mx-4 mt-3 mb-4 rounded-lg bg-sunken px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-ink">
                <EyeOff className="size-3.5" />
                Bewusst zurückgehalten
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {hiddenPresent.map((k) => (
                  <span
                    key={k}
                    className="rounded bg-surface px-1.5 py-0.5 font-mono text-[11px] text-muted line-through"
                  >
                    {k}
                  </span>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] leading-snug text-muted">
                Einkaufspreis, interne Notizen und Sitzungsdaten landen nie in der App.
              </p>
            </div>
          )}
        </div>

        {/* Ergebnis */}
        <div className="flex min-w-0 flex-col border-t border-line lg:border-t-0">
          <ColumnHead
            title="Antwort an die Mobile App"
            sub="application/json"
            action={
              <Button size="sm" variant="ghost" onClick={copy} disabled={!result}>
                {copied ? <Check /> : <Copy />}
                {copied ? "Kopiert" : "Kopieren"}
              </Button>
            }
          />
          <pre className="mx-4 mb-4 min-h-[200px] flex-1 overflow-auto rounded-lg bg-code p-3 font-mono text-[12px] leading-[1.55] text-code-ink">
            {result ? <JsonView value={result.output} /> : <span className="text-code-muted">–</span>}
          </pre>
        </div>
      </div>
    </Panel>
  );
}

function ColumnHead({ title, sub, action }: { title: string; sub: string; action?: React.ReactNode }) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-2 px-4 py-3">
      <div>
        <h3 className="text-[13px] font-semibold text-ink">{title}</h3>
        <p className="text-[11.5px] text-muted">{sub}</p>
      </div>
      {action}
    </div>
  );
}
