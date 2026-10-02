"use client";

import { Plus, Save, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { fmt1, pct } from "@/lib/format";
import {
  allowancePerSecond,
  cacheHitRate,
  formatTtl,
  METHODS,
  validateRule,
  WINDOWS,
  type RuleErrors,
} from "@/lib/rules";
import { TRAFFIC_PROFILE } from "@/lib/traffic";
import type { Rule, RuleDraft } from "@/lib/types";
import { Button, Field, inputClass } from "../ui/primitives";

const TTL_PRESETS = [0, 60, 300, 3600];

type FormState = { endpoint: string; method: string; maxRequests: string; window: string; cacheTtl: string };

const EMPTY: FormState = { endpoint: "", method: "GET", maxRequests: "100", window: "minute", cacheTtl: "300" };

const fromRule = (r: Rule): FormState => ({
  endpoint: r.endpoint,
  method: r.method,
  maxRequests: String(r.maxRequests),
  window: r.window,
  cacheTtl: String(r.cacheTtl),
});

/**
 * Formular zum Anlegen und Bearbeiten. Prüft beim Absenden über `validateRule` (lib),
 * zeigt nebenher, was die Regel bewirken würde. Kennt keinen Store, nur Callbacks.
 */
export function RuleForm({
  rules,
  editing,
  onSubmit,
  onCancelEdit,
}: {
  rules: Rule[];
  editing: Rule | null;
  onSubmit: (draft: RuleDraft, id?: string) => void;
  onCancelEdit: () => void;
}) {
  const [form, setForm] = useState<FormState>(editing ? fromRule(editing) : EMPTY);
  const [errors, setErrors] = useState<RuleErrors>({});

  const set = (k: keyof FormState) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k as keyof RuleErrors]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = validateRule(form, rules, editing?.id);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    onSubmit(result.draft, editing?.id);
    if (!editing) setForm(EMPTY);
    setErrors({});
  };

  // Vorschau: was würde die Regel in Zahlen bedeuten?
  const max = Number(form.maxRequests.replace(/\./g, ""));
  const ttl = Number(form.cacheTtl);
  const perSecond =
    Number.isFinite(max) && max > 0
      ? allowancePerSecond({ maxRequests: max, window: form.window as Rule["window"] })
      : null;
  const hit = form.method === "GET" || form.method === "ANY" ? cacheHitRate(Number.isFinite(ttl) ? ttl : 0) : 0;
  const isWildcard = form.endpoint.trim().endsWith("*");
  const affected = isWildcard
    ? TRAFFIC_PROFILE.filter((p) => p.path.startsWith(form.endpoint.trim().slice(0, -1))).map((p) => p.path)
    : [];

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 px-5 py-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_7.5rem]">
        <Field label="Endpunkt" htmlFor="endpoint" error={errors.endpoint} hint="Präfix mit * am Ende, z. B. /api/v1/*">
          <input
            id="endpoint"
            className={`${inputClass} w-full font-mono text-[13px]`}
            placeholder="/api/v1/products"
            list="known-endpoints"
            autoComplete="off"
            spellCheck={false}
            value={form.endpoint}
            onChange={(e) => set("endpoint")(e.target.value)}
            aria-invalid={!!errors.endpoint}
            aria-describedby={errors.endpoint ? "endpoint-error" : undefined}
          />
          <datalist id="known-endpoints">
            {TRAFFIC_PROFILE.map((p) => (
              <option key={p.path} value={p.path} />
            ))}
          </datalist>
        </Field>
        <Field label="Methode" htmlFor="method" error={errors.method}>
          <select
            id="method"
            className={`${inputClass} w-full`}
            value={form.method}
            onChange={(e) => set("method")(e.target.value)}
          >
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {m === "ANY" ? "Alle" : m}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Max. Anfragen" htmlFor="maxRequests" error={errors.maxRequests}>
        <div className="grid grid-cols-[minmax(0,1fr)_10rem] gap-2">
          <input
            id="maxRequests"
            inputMode="numeric"
            className={`${inputClass} tabular w-full`}
            value={form.maxRequests}
            onChange={(e) => set("maxRequests")(e.target.value)}
            aria-invalid={!!errors.maxRequests}
            aria-describedby={errors.maxRequests ? "maxRequests-error" : undefined}
          />
          <select
            aria-label="Zeitfenster"
            className={`${inputClass} w-full`}
            value={form.window}
            onChange={(e) => set("window")(e.target.value)}
          >
            {WINDOWS.map((w) => (
              <option key={w.value} value={w.value}>
                {w.label}
              </option>
            ))}
          </select>
        </div>
      </Field>

      <Field label="Caching TTL (Sekunden)" htmlFor="cacheTtl" error={errors.cacheTtl}>
        <div className="flex flex-wrap gap-2">
          <input
            id="cacheTtl"
            inputMode="numeric"
            className={`${inputClass} tabular w-28`}
            value={form.cacheTtl}
            onChange={(e) => set("cacheTtl")(e.target.value)}
            aria-invalid={!!errors.cacheTtl}
            aria-describedby={errors.cacheTtl ? "cacheTtl-error" : undefined}
          />
          {TTL_PRESETS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => set("cacheTtl")(String(s))}
              aria-pressed={form.cacheTtl === String(s)}
              className="h-9 rounded-lg border border-line px-2.5 text-[13px] text-muted hover:border-line-strong hover:text-ink aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:text-accent-ink"
            >
              {formatTtl(s)}
            </button>
          ))}
        </div>
      </Field>

      <div className="rounded-lg bg-sunken px-3 py-2.5 text-xs leading-relaxed text-muted">
        {perSecond !== null ? (
          <>
            Erlaubt im Mittel <strong className="tabular font-semibold text-ink">{fmt1(perSecond)} Anfragen/s</strong>,
            was darüber liegt, bekommt HTTP 429.{" "}
            {hit > 0 ? (
              <>
                Bei dieser TTL kommen geschätzt <strong className="font-semibold text-ink">{pct(hit)}</strong> der
                GET-Anfragen aus dem Cache.
              </>
            ) : (
              "Kein Cache."
            )}
          </>
        ) : (
          "Anzahl eingeben, dann steht hier, was die Regel bewirkt."
        )}
        {affected.length > 0 && (
          <span className="mt-1 block">
            Greift im Beispielverkehr für: <span className="font-mono text-ink">{affected.join(", ")}</span>
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <Button type="submit" variant="primary">
          {editing ? <Save /> : <Plus />}
          {editing ? "Änderung speichern" : "Regel anlegen"}
        </Button>
        {editing && (
          <Button variant="ghost" onClick={onCancelEdit}>
            <X />
            Abbrechen
          </Button>
        )}
      </div>
    </form>
  );
}
