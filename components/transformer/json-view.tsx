import { Fragment } from "react";

/** Schlichte Syntaxfarben für formatiertes JSON. Kein Parser, nur ein Tokenizer über den Text. */
const TOKEN = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)/gi;

export function JsonView({ value }: { value: unknown }) {
  const text = JSON.stringify(value, null, 2);
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    const i = m.index ?? 0;
    if (i > last) parts.push(text.slice(last, i));
    if (m[1] && m[2]) {
      parts.push(
        <Fragment key={i}>
          <span className="text-code-key">{m[1]}</span>
          {m[2]}
        </Fragment>,
      );
    } else if (m[1])
      parts.push(
        <span key={i} className="text-code-str">
          {m[1]}
        </span>,
      );
    else if (m[3])
      parts.push(
        <span key={i} className="text-code-num">
          {m[3]}
        </span>,
      );
    else
      parts.push(
        <span key={i} className="text-code-num">
          {m[4]}
        </span>,
      );
    last = i + m[0].length;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
}
