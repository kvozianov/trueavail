"use client";

import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

/** Counts to `value` (700 ms, ease-out) when in view; from the previous value on updates; instant with reduced motion. */
export function Ticker({ value, format, className = "" }: { value: number; format: (v: number) => string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -5% 0px" });
  const reduce = useReducedMotion();
  const from = useRef<number | null>(null);
  const fmt = useRef(format);
  useEffect(() => {
    fmt.current = format;
  });
  useEffect(() => {
    const el = ref.current;
    if (!el || !inView) return;
    const start = from.current ?? 0;
    from.current = value;
    if (reduce || start === value) {
      el.textContent = fmt.current(value);
      return;
    }
    const c = animate(start, value, { duration: 0.7, ease: [0, 0, 0.2, 1], onUpdate: (v) => (el.textContent = fmt.current(v)) });
    return () => c.stop();
  }, [value, inView, reduce]);
  return (
    <span ref={ref} className={className}>
      {format(value)}
    </span>
  );
}
