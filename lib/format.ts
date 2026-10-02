const nf0 = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1, minimumFractionDigits: 1 });

export const fmt = (n: number) => nf0.format(n);
export const fmt1 = (n: number) => nf1.format(n);
export const pct = (ratio: number) => `${nf0.format(ratio * 100)} %`;

export function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  return `${nf1.format(b / 1024)} KB`;
}

export function fmtClock(t: number): string {
  return new Date(t).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function fmtDuration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}
