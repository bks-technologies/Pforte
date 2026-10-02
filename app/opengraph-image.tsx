import { ImageResponse } from "next/og";

export const alt = "Pforte – API Gateway & Rate-Limiting Control Panel. Eine Demo von BKS Technologies.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Feste Beispielkurven für das Vorschaubild: eingehend steigt an, weitergeleitet wird gekappt.
const IN = [120, 128, 118, 135, 130, 142, 138, 210, 300, 360, 352, 370, 340, 330];
const OUT = [92, 98, 90, 104, 100, 108, 104, 150, 210, 42, 42, 42, 42, 42];

function path(values: number[], w: number, h: number, max: number) {
  const step = w / (values.length - 1);
  return values
    .map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(h - (v / max) * h).toFixed(1)}`)
    .join(" ");
}

/** Vorschaubild für Links: Marke links, Miniatur des Live-Diagramms mit Not-Aus rechts. */
export default function OpengraphImage() {
  const W = 500;
  const H = 300;
  return new ImageResponse(
    <div
      style={{ width: "100%", height: "100%", display: "flex", background: "#0a101c", padding: 72, color: "#e8ecf3" }}
    >
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 520 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: "#e8ecf3",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="42"
              height="42"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0a101c"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="16" y="16" width="6" height="6" rx="1" />
              <rect x="2" y="16" width="6" height="6" rx="1" />
              <rect x="9" y="2" width="6" height="6" rx="1" stroke="#2a78d6" />
              <path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" />
              <path d="M12 12V8" stroke="#2a78d6" />
            </svg>
          </div>
          <div style={{ fontSize: 44, fontWeight: 700 }}>Pforte</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 58, fontWeight: 700, lineHeight: 1.05, letterSpacing: -1.5 }}>
            API Gateway & Rate-Limiting
          </div>
          <div style={{ fontSize: 26, color: "#9aa5b8", lineHeight: 1.35 }}>
            Schützt ein altes System vor der Last einer Mobile App: Regeln, Cache, Umwandlung, Not-Aus.
          </div>
        </div>
        <div style={{ fontSize: 22, color: "#9aa5b8" }}>Eine Demo von BKS Technologies</div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 22,
          marginLeft: "auto",
          width: 500,
        }}
      >
        <div
          style={{
            display: "flex",
            padding: 24,
            borderRadius: 18,
            background: "#111a2a",
            border: "1px solid #1f2a3e",
          }}
        >
          <svg width={W - 48} height={H - 48} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
            <rect x={W * 0.64} y="0" width={W * 0.36} height={H} fill="#f0525f" fillOpacity="0.12" />
            <line
              x1="0"
              x2={W}
              y1={H - (140 / 400) * H}
              y2={H - (140 / 400) * H}
              stroke="#f0525f"
              strokeOpacity="0.6"
              strokeWidth="2"
              strokeDasharray="8 8"
            />
            <path d={path(IN, W, H, 400)} fill="none" stroke="#3987e5" strokeWidth="5" strokeLinejoin="round" />
            <path d={path(OUT, W, H, 400)} fill="none" stroke="#199e70" strokeWidth="5" strokeLinejoin="round" />
          </svg>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            padding: "20px 26px",
            borderRadius: 18,
            background: "#d92d3a",
            fontSize: 28,
            fontWeight: 700,
          }}
        >
          <div style={{ width: 18, height: 18, borderRadius: 9, background: "#ffffff" }} />
          Circuit Breaker ausgelöst
          <div style={{ marginLeft: "auto", fontSize: 22, fontWeight: 500, opacity: 0.85, whiteSpace: "nowrap" }}>
            30 %
          </div>
        </div>
      </div>
    </div>,
    size,
  );
}
