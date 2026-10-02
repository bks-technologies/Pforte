"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/primitives";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const resetAll = () => {
    try {
      localStorage.removeItem("pforte:v1");
    } catch {
      // Speicher gesperrt: dann eben nur neu laden
    }
    reset();
  };
  return (
    <div className="mx-auto flex max-w-md flex-col items-start gap-3 py-20">
      <span className="rounded bg-fail-soft px-2 py-1 font-mono text-sm font-semibold text-fail-ink">500</span>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Hier ist etwas schiefgelaufen.</h1>
      <p className="text-sm text-muted">
        Laden Sie die Ansicht neu. Hilft das nicht, setzen Sie die Demo auf die Beispielregeln zurück.
      </p>
      <div className="mt-2 flex gap-2">
        <Button variant="primary" onClick={reset}>
          Neu laden
        </Button>
        <Button onClick={resetAll}>
          <RotateCcw />
          Demo zurücksetzen
        </Button>
      </div>
    </div>
  );
}
