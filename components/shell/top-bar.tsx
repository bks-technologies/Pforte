import { Network } from "lucide-react";
import Link from "next/link";

export function TopBar() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-ink text-canvas">
            <Network className="size-4" />
          </span>
          <span className="leading-tight">
            <span className="block text-[15px] font-semibold tracking-tight text-ink">Pforte</span>
            <span className="hidden text-[11px] text-muted sm:block">API Gateway &amp; Rate-Limiting</span>
          </span>
        </Link>
        <span className="ml-auto flex items-center gap-2 rounded-full border border-line px-2.5 py-1 text-xs text-muted">
          <span className="relative flex size-2">
            <span className="absolute inset-0 animate-pulse-ring rounded-full bg-ok" aria-hidden />
            <span className="relative size-2 rounded-full bg-ok" />
          </span>
          Demo · simulierter Verkehr
        </span>
      </div>
    </header>
  );
}
