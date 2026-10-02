import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-24 text-center">
      <p className="font-mono text-sm text-muted">404</p>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Diese Route kennt das Gateway nicht.</h1>
      <Link href="/" className="text-sm text-accent hover:underline">
        Zum Control Panel
      </Link>
    </div>
  );
}
