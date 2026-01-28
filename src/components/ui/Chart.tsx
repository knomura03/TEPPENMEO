import { cn } from "@/lib/cn";

export type ChartPoint = {
  label: string;
  value: number;
};

type ChartVariant = "line" | "bar";

type ChartProps = {
  series: ChartPoint[];
  compareSeries?: ChartPoint[] | null;
  variant?: ChartVariant;
  className?: string;
  ariaLabel?: string;
};

function buildLinePath(points: Array<{ x: number; y: number }>) {
  if (!points.length) return "";
  return `M ${points.map((point) => `${point.x},${point.y}`).join(" L ")}`;
}

export function Chart({
  series,
  compareSeries,
  variant = "line",
  className,
  ariaLabel = "グラフ",
}: ChartProps) {
  const width = 640;
  const height = 220;
  const padding = 24;
  const maxValue = Math.max(
    1,
    ...series.map((item) => item.value),
    ...(compareSeries ?? []).map((item) => item.value)
  );

  if (!series.length) {
    return <div className={cn("h-56", className)} />;
  }

  if (variant === "bar") {
    const barAreaWidth = width - padding * 2;
    const slot = barAreaWidth / series.length;
    const barWidth = Math.max(6, slot * 0.56);
    const startX = padding + (slot - barWidth) / 2;

    return (
      <svg
        role="img"
        aria-label={ariaLabel}
        viewBox={`0 0 ${width} ${height}`}
        className={cn("h-56 w-full", className)}
      >
        <rect x={0} y={0} width={width} height={height} fill="transparent" />
        {series.map((item, index) => {
          const x = startX + index * slot;
          const barHeight = (item.value / maxValue) * (height - padding * 2);
          const y = height - padding - barHeight;
          const compareValue = compareSeries?.[index]?.value ?? null;
          const compareHeight = compareValue
            ? (compareValue / maxValue) * (height - padding * 2)
            : 0;
          const compareY = height - padding - compareHeight;

          return (
            <g key={`${item.label}-${index}`}>
              {compareValue !== null && (
                <rect
                  x={x}
                  y={compareY}
                  width={barWidth}
                  height={compareHeight}
                  fill="var(--primary)"
                  opacity="0.2"
                  rx={6}
                />
              )}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill="var(--primary)"
                opacity="0.9"
                rx={6}
              />
            </g>
          );
        })}
      </svg>
    );
  }

  const step = (width - padding * 2) / Math.max(1, series.length - 1);
  const points = series.map((item, index) => {
    const x = padding + index * step;
    const y = height - padding - (item.value / maxValue) * (height - padding * 2);
    return { x, y };
  });
  const comparePoints = compareSeries?.map((item, index) => {
    const x = padding + index * step;
    const y = height - padding - (item.value / maxValue) * (height - padding * 2);
    return { x, y };
  });
  const path = buildLinePath(points);
  const comparePath = comparePoints ? buildLinePath(comparePoints) : "";

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("h-56 w-full", className)}
    >
      <defs>
        <linearGradient id="lineFillPrimary" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {comparePath && (
        <path
          d={comparePath}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2"
          strokeDasharray="6 6"
          opacity="0.35"
        />
      )}
      <path
        d={`${path} L ${padding + (series.length - 1) * step},${height - padding} L ${padding},${
          height - padding
        } Z`}
        fill="url(#lineFillPrimary)"
      />
      <path d={path} fill="none" stroke="var(--primary)" strokeWidth="2.5" />
    </svg>
  );
}
