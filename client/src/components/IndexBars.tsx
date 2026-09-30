import { useEffect, useRef, useState } from "react";
import type { IndexValue } from "../types";

interface Props {
  values: IndexValue[];
  /** Title shown above the bars. */
  title?: string;
}

/**
 * Animated horizontal bars comparing each index value against the regional
 * average. Bars animate their width on mount and when the values change.
 */
export default function IndexBars({ values, title }: Props) {
  return (
    <div>
      {title && (
        <h4 className="mb-3 text-sm font-semibold text-slate-700">{title}</h4>
      )}
      <div className="flex flex-col gap-3">
        {values.map((v, i) => (
          <BarRow key={v.key} value={v} delay={i * 70} />
        ))}
      </div>
    </div>
  );
}

function BarRow({ value, delay }: { value: IndexValue; delay: number }) {
  const [progress, setProgress] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setProgress(0);
    const t = setTimeout(() => setProgress(1), delay);
    return () => clearTimeout(t);
  }, [delay, value.key]);

  // Difference vs average (positive = persona higher than average)
  const diff = value.value - value.average;
  const pctValue = (value.value / value.max) * 100;
  const pctAvg = (value.average / value.max) * 100;

  // For inverted indices, a higher value is "worse" → colour accordingly.
  const isWorse = value.inverted ? diff > 0.05 : diff < -0.05;
  const isBetter = value.inverted ? diff < -0.05 : diff > 0.05;
  const barColor = isWorse
    ? "bg-amber-500"
    : isBetter
      ? "bg-brand-500"
      : "bg-brand-400";

  // Qualitative 5-level scale instead of misleading decimal numbers.
  // The bars + average marker already show the position visually; the
  // label communicates the magnitude of the deviation in plain words.
  const absDiff = Math.abs(diff);
  let level: { arrow: string; text: string; cls: string };
  if (absDiff < 0.4) {
    level = { arrow: "≈", text: "am Durchschnitt", cls: "text-slate-500" };
  } else if (absDiff < 0.9) {
    level = {
      arrow: diff > 0 ? "↑" : "↓",
      text: diff > 0 ? "etwas darüber" : "etwas darunter",
      cls: isBetter ? "text-brand-600" : "text-amber-600",
    };
  } else if (absDiff < 1.5) {
    level = {
      arrow: diff > 0 ? "↑" : "↓",
      text: diff > 0 ? "deutlich darüber" : "deutlich darunter",
      cls: isBetter ? "text-brand-600" : "text-amber-600",
    };
  } else {
    level = {
      arrow: diff > 0 ? "↑↑" : "↓↓",
      text: diff > 0 ? "weit darüber" : "weit darunter",
      cls: isBetter ? "text-brand-700" : "text-amber-700",
    };
  }

  return (
    <div ref={ref} className="group">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-slate-600" title={value.hint}>
          {value.label}
        </span>
        <span className={`flex items-center gap-1 text-xs font-medium ${level.cls}`}>
          <span className="font-semibold">{level.arrow}</span>
          <span>{level.text}</span>
        </span>
      </div>
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        {/* Average marker */}
        <div
          className="absolute top-0 z-10 h-full w-0.5 bg-slate-400"
          style={{ left: `${pctAvg}%` }}
          title={`Durchschnitt: ${value.average.toFixed(2)}`}
        />
        {/* Value bar */}
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
          style={{ width: `${pctValue * progress}%` }}
        />
      </div>
    </div>
  );
}
