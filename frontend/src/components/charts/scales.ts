"use client";

import { useEffect, useRef, useState } from "react";

/** Width of an element, tracked with ResizeObserver. `fallback` is used for the server render. */
export function useWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      if (w > 0) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

const f = (v: number) => (Math.round(v * 10) / 10).toString();

/** "M x y L x y …" — linear segments, same command count for equal-length inputs (morphable). */
export function linePath(xs: number[], ys: number[]): string {
  if (!xs.length) return "";
  return "M" + xs.map((x, i) => `${f(x)} ${f(ys[i])}`).join(" L");
}

/** Closed band between `hi` (left → right) and `lo` (right → left). */
export function bandPath(xs: number[], hi: number[], lo: number[]): string {
  if (!xs.length) return "";
  const top = xs.map((x, i) => `${f(x)} ${f(hi[i])}`).join(" L");
  const bottom = xs
    .map((x, i) => [x, lo[i]] as const)
    .reverse()
    .map(([x, y]) => `${f(x)} ${f(y)}`)
    .join(" L");
  return `M${top} L${bottom}Z`;
}

/** Nice ticks for a numeric domain (no d3 needed for 4–6 ticks). */
export function niceTicks(min: number, max: number, count = 5): number[] {
  if (!(max > min)) return [min];
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm >= 5 ? 10 : norm >= 2.5 ? 5 : norm >= 2 ? 2.5 : norm >= 1 ? 2 : 1) * mag;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
  return out;
}

/** Linear scale as a plain function. */
export function linear(d0: number, d1: number, r0: number, r1: number) {
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
  return (v: number) => r0 + (v - d0) * k;
}

/** Spread labels vertically so no two are closer than `gap` px; keeps the input order. */
export function spreadLabels(ys: number[], gap: number, min: number, max: number): number[] {
  const idx = ys.map((y, i) => [y, i] as const).sort((a, b) => a[0] - b[0]);
  const out = idx.map(([y]) => y);
  for (let i = 1; i < out.length; i++) out[i] = Math.max(out[i], out[i - 1] + gap);
  const overflow = out.length ? out[out.length - 1] - max : 0;
  if (overflow > 0) for (let i = 0; i < out.length; i++) out[i] -= overflow;
  for (let i = 0; i < out.length; i++) out[i] = Math.max(out[i], min + i * gap);
  const res = new Array<number>(ys.length);
  idx.forEach(([, i], k) => (res[i] = out[k]));
  return res;
}
