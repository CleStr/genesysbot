import { useEffect, useState } from "react";
import type { IndexValue } from "../types";

interface Props {
  values: IndexValue[];
  /** Title shown above the radar. */
  title?: string;
  /** Size in px (width = height). */
  size?: number;
  /** Label for the value series (e.g. the persona's name). */
  valueLabel?: string;
  /** Label for the average series. */
  averageLabel?: string;
}

/**
 * Animated SVG radar chart that compares a persona's energy indices
 * against the regional average. Pure SVG, no external chart library.
 */
export default function RadarChart({
  values,
  title,
  size = 260,
  valueLabel = "Werte",
  averageLabel = "Regionsdurchschnitt",
}: Props) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(0);
    const start = performance.now();
    const duration = 900;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic
      setProgress(1 - Math.pow(1 - t, 3));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [values]);

  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 38;
  const n = values.length;

  // For inverted indices, a higher raw value is "worse" — we still plot the
  // raw value, but the polygon is the same shape. The colour coding is done
  // in the legend / bars, not in the radar.
  const pointFor = (v: number, i: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const r = (v / values[i].max) * radius * progress;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as const;
  };

  const avgPoints = values.map((v, i) => pointFor(v.average, i));
  const valPoints = values.map((v, i) => pointFor(v.value, i));

  const toPath = (pts: readonly (readonly [number, number])[]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ") + " Z";

  // Grid rings (25/50/75/100 %)
  const rings = [0.25, 0.5, 0.75, 1];

  return (
    <div className="flex flex-col items-center">
      {title && (
        <h4 className="mb-2 text-sm font-semibold text-slate-700">{title}</h4>
      )}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        {/* Grid rings */}
        {rings.map((r) => {
          const pts = values.map((_, i) => {
            const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
            return [cx + radius * r * Math.cos(angle), cy + radius * r * Math.sin(angle)] as const;
          });
          return (
            <polygon
              key={r}
              points={pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ")}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth={1}
            />
          );
        })}

        {/* Spokes + labels */}
        {values.map((v, i) => {
          const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
          const lx = cx + (radius + 18) * Math.cos(angle);
          const ly = cy + (radius + 18) * Math.sin(angle);
          return (
            <g key={v.key}>
              <line
                x1={cx}
                y1={cy}
                x2={cx + radius * Math.cos(angle)}
                y2={cy + radius * Math.sin(angle)}
                stroke="#e2e8f0"
                strokeWidth={1}
              />
              <text
                x={lx}
                y={ly}
                textAnchor={Math.abs(lx - cx) < 5 ? "middle" : lx > cx ? "start" : "end"}
                dominantBaseline="middle"
                className="fill-slate-500 text-[9px] font-medium"
              >
                {v.label}
              </text>
            </g>
          );
        })}

        {/* Average polygon */}
        <path d={toPath(avgPoints)} fill="rgba(148,163,184,0.18)" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="3 3" />

        {/* Value polygon */}
        <path
          d={toPath(valPoints)}
          fill="rgba(51,102,255,0.22)"
          stroke="#3366ff"
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* Value dots */}
        {valPoints.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={3} fill="#3366ff" />
        ))}
      </svg>

      {/* Legend — Farben entsprechen exakt den Polygonen oben */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#3366ff]" aria-hidden="true" />
          {valueLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#94a3b8]" aria-hidden="true" />
          {averageLabel}
        </span>
      </div>
    </div>
  );
}
