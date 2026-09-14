"use client";

import { useState } from "react";

type BarChartPoint = {
  label: string;
  value: number;
  highlight?: boolean;
};

export default function BarChart({
  data,
  currency,
}: {
  data: BarChartPoint[];
  currency?: string;
}) {
  const formatValue = (v: number) =>
    currency
      ? v.toLocaleString("en-US", { style: "currency", currency })
      : String(v);
  const [hovered, setHovered] = useState<number | null>(null);
  const width = 700;
  const height = 220;
  const padding = { top: 10, right: 0, bottom: 28, left: 0 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const max = Math.max(1, ...data.map((d) => d.value));
  const barGap = 6;
  const barWidth = data.length > 0 ? plotWidth / data.length - barGap : 0;
  const active = hovered !== null ? data[hovered] : null;
  const activeLeftPct =
    hovered !== null && data.length > 0
      ? ((hovered + 0.5) / data.length) * 100
      : 0;

  return (
    <div className="relative">
      {active && (
        <div
          className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-border bg-surface px-3 py-1.5 text-xs shadow-md"
          style={{ left: `${activeLeftPct}%` }}
        >
          <p className="font-medium text-muted">{active.label}</p>
          <p className="font-semibold tabular-nums">{formatValue(active.value)}</p>
        </div>
      )}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-56 w-full overflow-visible"
        role="img"
        aria-label="Revenue by day"
      >
        <line
          x1={0}
          y1={padding.top + plotHeight}
          x2={width}
          y2={padding.top + plotHeight}
          className="stroke-border"
          strokeWidth={1}
        />
        {data.map((d, i) => {
          const barHeight = max > 0 ? (d.value / max) * plotHeight : 0;
          const x = padding.left + i * (barWidth + barGap);
          const y = padding.top + plotHeight - barHeight;
          const isHovered = hovered === i;
          return (
            <g
              key={i}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <rect
                x={x}
                y={padding.top}
                width={Math.max(barWidth, 1)}
                height={plotHeight}
                fill="transparent"
              />
              <rect
                x={x}
                y={y}
                width={Math.max(barWidth, 1)}
                height={Math.max(barHeight, 0)}
                rx={4}
                className={
                  d.highlight
                    ? "fill-accent-hover"
                    : isHovered
                    ? "fill-accent"
                    : "fill-accent"
                }
                opacity={d.value > 0 ? (isHovered ? 1 : 0.85) : 0.12}
              />
              <text
                x={x + barWidth / 2}
                y={height - 8}
                textAnchor="middle"
                className={`text-[10px] ${
                  d.highlight ? "fill-accent font-medium" : "fill-muted"
                }`}
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
