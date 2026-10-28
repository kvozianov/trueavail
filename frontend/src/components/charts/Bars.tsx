"use client";

import { m, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";

export interface BarRow {
  key: string;
  label: string;
  value: number;
  /** 0..1 width of the fill. */
  share: number;
  color: string;
  display: string;
  mono?: boolean;
}

/** 8 px tracks, fill in the series hue, label left, value right. No axis. Fills when scrolled into view. */
export function Bars({
  rows,
  labelWidth = "minmax(0,1fr)",
  trackWidth = "minmax(80px,1.2fr)",
  stagger = 0.04,
  play: playProp,
  className = "",
}: {
  rows: BarRow[];
  labelWidth?: string;
  trackWidth?: string;
  stagger?: number;
  /** Controlled play state; defaults to "in view". */
  play?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLUListElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const reduce = useReducedMotion();
  const play = playProp ?? inView;
  return (
    <ul ref={ref} className={`space-y-2.5 ${className}`}>
      {rows.map((r, i) => (
        <li key={r.key} className="grid items-center gap-3" style={{ gridTemplateColumns: `${labelWidth} ${trackWidth} 3.4rem` }}>
          <span className={`min-w-0 truncate ${r.mono ? "font-mono text-[12px]" : "text-[13.5px]"} text-ink-2`} title={r.label}>
            {r.label}
          </span>
          <span className="relative h-2 overflow-hidden rounded-[4px] bg-bg-3" aria-hidden>
            <m.span
              className="absolute inset-y-0 left-0 rounded-[4px]"
              style={{ background: r.color }}
              initial={reduce ? false : { width: "0%" }}
              animate={{ width: reduce || play ? `${Math.max(1.5, r.share * 100)}%` : "0%" }}
              transition={reduce ? { duration: 0 } : { duration: 0.6, delay: i * stagger, ease: [0.2, 0, 0, 1] }}
            />
          </span>
          <span className="text-right font-mono text-[12.5px] tnum text-ink">{r.display}</span>
        </li>
      ))}
    </ul>
  );
}
