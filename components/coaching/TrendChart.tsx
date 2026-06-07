import { mono } from "@/components/coaching/ui";

// Pure-SVG line chart of per-test score % over time. Server-renderable (no
// interactivity), reused by the student result banner and the admin student
// detail page. Each point is labelled with its %; the x-axis shows short labels
// (e.g. "Test 1", or a truncated title). Renders nothing for < 2 points — a
// single data point isn't a trend, and callers gate on that too.

export type TrendChartPoint = { label: string; pct: number };

export default function TrendChart({
  points,
  height = 132,
}: {
  points: TrendChartPoint[];
  height?: number;
}) {
  if (points.length < 2) return null;

  const W = 320;
  const H = height;
  const padX = 14;
  const padTop = 22; // room for the % labels above each node
  const padBottom = 26; // room for x-axis labels
  const innerW = W - padX * 2;
  const innerH = H - padTop - padBottom;

  const max = Math.max(...points.map((p) => p.pct), 100);
  const step = points.length > 1 ? innerW / (points.length - 1) : innerW;

  const xy = points.map((p, i) => {
    const x = padX + i * step;
    const y = padTop + innerH - (p.pct / max) * innerH;
    return [x, y] as const;
  });

  const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${xy[xy.length - 1][0].toFixed(1)} ${(padTop + innerH).toFixed(1)} L${xy[0][0].toFixed(1)} ${(padTop + innerH).toFixed(1)} Z`;

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" fill="none">
      <defs>
        <linearGradient id="trendArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff8f00" stopOpacity="0.28" />
          <stop offset="1" stopColor="#ff8f00" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* baseline */}
      <line
        x1={padX}
        x2={W - padX}
        y1={padTop + innerH}
        y2={padTop + innerH}
        stroke="rgba(255,255,255,0.08)"
      />

      <path d={area} fill="url(#trendArea)" />
      <path d={line} stroke="#ffab33" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />

      {xy.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="3.5" fill="#06060c" stroke="#ffab33" strokeWidth="2" />
          {/* % label above the node */}
          <text
            x={x}
            y={y - 9}
            textAnchor="middle"
            fontSize="11"
            fontFamily={mono}
            fill="#fbbf24"
            fontWeight="600"
          >
            {points[i].pct}%
          </text>
          {/* x-axis label */}
          <text
            x={x}
            y={H - 8}
            textAnchor="middle"
            fontSize="10"
            fontFamily={mono}
            fill="#64748b"
          >
            {points[i].label}
          </text>
        </g>
      ))}
    </svg>
  );
}
