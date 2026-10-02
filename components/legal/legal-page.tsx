import Link from "next/link";
import type { ReactNode } from "react";
import { Panel } from "../ui/primitives";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Link href="/" className="text-sm text-muted hover:text-ink">
        ← Zum Control Panel
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
      <Panel className="px-6 py-6 sm:px-8">
        <div className="flex flex-col gap-3 text-[15px] leading-relaxed text-muted [&_a]:text-accent [&_a]:underline-offset-2 hover:[&_a]:underline [&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-ink first:[&_h2]:mt-0">
          {children}
        </div>
      </Panel>
    </div>
  );
}
