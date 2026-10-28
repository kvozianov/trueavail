import { linear } from "./scales";

/** 72×24 sparkline of the last `days` actual balances: ink-2 line over a bg-3 area. */
export function Sparkline({ values, width = 72, height = 24, label }: { values: number[]; width?: number; height?: number; label: string }) {
  if (values.length < 2) return <svg width={width} height={height} aria-hidden />;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const x = linear(0, values.length - 1, 1, width - 1);
  const y = linear(lo, hi === lo ? lo + 1 : hi, height - 2, 2);
  const pts = values.map((v, i) => `${x(i).toFixed(1)} ${y(v).toFixed(1)}`);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className="shrink-0">
      <path d={`M${pts.join(" L")} L${x(values.length - 1).toFixed(1)} ${height} L${x(0).toFixed(1)} ${height}Z`} fill="var(--bg-3)" />
      <path d={`M${pts.join(" L")}`} fill="none" stroke="var(--ink-2)" strokeWidth={1.25} strokeLinejoin="round" />
    </svg>
  );
}
