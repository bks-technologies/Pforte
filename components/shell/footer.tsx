import Link from "next/link";
import { company } from "@/lib/legal";

export function Footer() {
  return (
    <footer className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-muted sm:px-6">
      <span>
        Eine Demo von{" "}
        <a href={company.url} className="text-ink hover:underline">
          {company.name}
        </a>
        . Alle Daten sind Beispieldaten.
      </span>
      <nav className="flex gap-4">
        <Link href="/impressum" className="hover:text-ink">
          Impressum
        </Link>
        <Link href="/datenschutz" className="hover:text-ink">
          Datenschutz
        </Link>
      </nav>
    </footer>
  );
}
