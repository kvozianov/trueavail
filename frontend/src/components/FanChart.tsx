"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { axisNumber, dayMonth, money, shortDate } from "@/lib/format";
import type { ForecastPoint, HistoryRow, KnownEvent } from "@/lib/types";

interface Row {
  date: string;
  actual?: number;
  band?: [number, number];
  p50?: number;
  buffer?: number;
  cmpBand?: [number, number];
  cmpP50?: number;
  marker?: number;
  net?: number;
  events?: KnownEvent[];
  breach?: boolean;
  cmpBreach?: boolean;
  p05?: number;
  p95?: number;
  cmpP05?: number;
  cmpP95?: number;
}

export interface FanChartProps {
  points: ForecastPoint[];
  /** Optional actual balances before as_of (last N days are shown). */
  history?: HistoryRow[];
  historyDays?: number;
  /** Optional second forecast drawn underneath in grey (what-if "before"). */
  compare?: ForecastPoint[];
  currency: string;
  asOf?: string;
  height?: number;
  labels?: { main: string; compare?: string };
}

function buildRows({ points, history = [], historyDays = 21, compare, asOf }: FanChartProps): Row[] {
  const rows = new Map<string, Row>();
  const get = (date: string) => {
    let r = rows.get(date);
    if (!r) rows.set(date, (r = { date }));
    return r;
  };
  const hist = [...history].sort((a, b) => a.date.localeCompare(b.date)).slice(-historyDays);
  for (const h of hist) Object.assign(get(h.date), { actual: h.ending_balance, buffer: h.required_buffer });

  // Anchor the fan at the last actual balance so the band visibly opens from "now".
  const anchor = hist.length ? hist[hist.length - 1] : null;
  if (anchor && (!asOf || anchor.date === asOf)) {
    const r = get(anchor.date);
    r.band = [anchor.ending_balance, anchor.ending_balance];
    r.p50 = anchor.ending_balance;
    if (compare) {
      r.cmpBand = [anchor.ending_balance, anchor.ending_balance];
      r.cmpP50 = anchor.ending_balance;
    }
  }
  for (const p of points) {
    const r = get(p.date);
    Object.assign(r, {
      band: [p.balance_p05, p.balance_p95],
      p50: p.balance_p50,
      p05: p.balance_p05,
      p95: p.balance_p95,
      buffer: p.required_buffer,
      breach: p.breach,
      events: p.known_events,
      net: p.scheduled_net_flow,
      marker: p.known_events.length ? p.balance_p50 : undefined,
    });
  }
  for (const p of compare ?? []) {
    const r = get(p.date);
    Object.assign(r, {
      cmpBand: [p.balance_p05, p.balance_p95],
      cmpP50: p.balance_p50,
      cmpP05: p.balance_p05,
      cmpP95: p.balance_p95,
      cmpBreach: p.breach,
    });
  }
  return [...rows.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Contiguous runs of breach days → shaded areas. */
function breachRanges(rows: Row[]): [string, string][] {
  const out: [string, string][] = [];
  let start: string | null = null;
  let prev: string | null = null;
  for (const r of rows) {
    if (r.breach) {
      start ??= r.date;
      prev = r.date;
    } else if (start) {
      out.push([start, prev!]);
      start = null;
    }
  }
  if (start) out.push([start, prev!]);
  return out;
}

function Marker(props: { cx?: number; cy?: number; payload?: Row }) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload?.events?.length) return null;
  const up = (payload.net ?? 0) >= 0;
  const s = 6;
  const d = up
    ? `M${cx},${cy - s - 4} l${s},${s * 1.6} l${-2 * s},0 z`
    : `M${cx},${cy + s + 4} l${s},${-s * 1.6} l${-2 * s},0 z`;
  return <path d={d} fill="var(--ink)" stroke="var(--surface)" strokeWidth={1.5} />;
}

function TooltipBody({
  active,
  payload,
  currency,
  labels,
}: {
  active?: boolean;
  payload?: { payload: Row }[];
  currency: string;
  labels: FanChartProps["labels"];
}) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload;
  const m = (v?: number) => money(v, currency);
  return (
    <div className="max-w-72 rounded-md border border-line bg-surface p-2.5 text-xs shadow-lg">
      <div className="mb-1 font-semibold text-ink">{shortDate(r.date)}</div>
      <table className="tabular w-full">
        <tbody className="[&_td]:py-0.5 [&_td:last-child]:pl-3 [&_td:last-child]:text-right">
          {r.actual != null && (
            <tr>
              <td className="text-ink-2">Actual</td>
              <td className="text-ink">{m(r.actual)}</td>
            </tr>
          )}
          {r.p95 != null && (
            <>
              {r.cmpP50 != null && labels?.compare && (
                <tr>
                  <td colSpan={2} className="pt-1 font-medium text-ink-2">
                    {labels.main}
                  </td>
                </tr>
              )}
              <tr>
                <td className="text-ink-2">P95</td>
                <td className="text-ink">{m(r.p95)}</td>
              </tr>
              <tr>
                <td className="text-ink-2">P50</td>
                <td className="font-semibold text-ink">{m(r.p50)}</td>
              </tr>
              <tr>
                <td className="text-ink-2">P5</td>
                <td className={r.breach ? "font-semibold text-crit" : "text-ink"}>{m(r.p05)}</td>
              </tr>
            </>
          )}
          {r.cmpP05 != null && labels?.compare && (
            <>
              <tr>
                <td colSpan={2} className="pt-1 font-medium text-ink-2">
                  {labels.compare}
                </td>
              </tr>
              <tr>
                <td className="text-ink-2">P50</td>
                <td className="text-ink">{m(r.cmpP50)}</td>
              </tr>
              <tr>
                <td className="text-ink-2">P5</td>
                <td className={r.cmpBreach ? "font-semibold text-crit" : "text-ink"}>{m(r.cmpP05)}</td>
              </tr>
            </>
          )}
          <tr>
            <td className="text-ink-2">Required buffer</td>
            <td className="text-ink">{m(r.buffer)}</td>
          </tr>
        </tbody>
      </table>
      {r.breach && <div className="mt-1 font-medium text-crit">P5 below buffer: cash gap</div>}
      {r.events?.map((e) => (
        <div key={e.flow_id} className="mt-1 border-t border-line pt-1 text-ink-2">
          {e.direction === "inflow" ? "▲ +" : "▼ −"}
          {money(e.amount, currency)} {e.description}
        </div>
      ))}
    </div>
  );
}

function LegendItem({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {swatch}
      {label}
    </span>
  );
}

const lineSwatch = (color: string, dash = false) => (
  <svg width="18" height="8" aria-hidden>
    <line x1="0" y1="4" x2="18" y2="4" stroke={color} strokeWidth="2" strokeDasharray={dash ? "4 3" : undefined} />
  </svg>
);
const bandSwatch = (color: string) => (
  <span aria-hidden className="inline-block h-2.5 w-4 rounded-sm" style={{ background: color }} />
);

export function FanChart(props: FanChartProps) {
  const { currency, height = 300, compare, labels = { main: "Forecast" }, history } = props;
  const rows = buildRows(props);
  const ranges = breachRanges(rows);
  const hasHistory = !!history?.length;

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
        {hasHistory && <LegendItem swatch={lineSwatch("var(--actual)")} label="Actual balance" />}
        {compare && (
          <LegendItem swatch={bandSwatch("var(--series-base-band)")} label={`${labels.compare ?? "Before"} P5–P95`} />
        )}
        {compare && (
          <LegendItem swatch={lineSwatch("var(--series-base)", true)} label={`${labels.compare ?? "Before"} P50`} />
        )}
        <LegendItem swatch={bandSwatch("var(--series-1-band)")} label={`${compare ? labels.main + " " : ""}P5–P95`} />
        <LegendItem swatch={lineSwatch("var(--series-1)")} label={`${compare ? labels.main + " " : ""}P50`} />
        <LegendItem swatch={lineSwatch("var(--critical)", true)} label="Required buffer" />
        <LegendItem swatch={<span aria-hidden>▲▼</span>} label="Scheduled flow" />
        {ranges.length > 0 && <LegendItem swatch={bandSwatch("var(--critical-bg)")} label="Gap days (P5 < buffer)" />}
      </div>
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 16, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--grid)" vertical={false} />
            {ranges.map(([a, b]) => (
              <ReferenceArea
                key={a}
                x1={a}
                x2={b}
                fill="var(--critical-bg)"
                fillOpacity={1}
                stroke="none"
                ifOverflow="visible"
              />
            ))}
            <XAxis
              dataKey="date"
              tickFormatter={dayMonth}
              tick={{ fill: "var(--ink-muted)", fontSize: 11 }}
              stroke="var(--axis)"
              tickLine={false}
              minTickGap={18}
            />
            <YAxis
              tickFormatter={axisNumber}
              tick={{ fill: "var(--ink-muted)", fontSize: 11 }}
              stroke="var(--axis)"
              tickLine={false}
              axisLine={false}
              width={48}
              domain={["auto", "auto"]}
            />
            <Tooltip
              content={(p) => (
                <TooltipBody
                  active={p.active}
                  payload={p.payload as unknown as { payload: Row }[]}
                  currency={currency}
                  labels={labels}
                />
              )}
              cursor={{ stroke: "var(--axis)" }}
            />
            {compare && (
              <Area
                dataKey="cmpBand"
                stroke="none"
                fill="var(--series-base-band)"
                fillOpacity={1}
                isAnimationActive={false}
                connectNulls
              />
            )}
            <Area
              dataKey="band"
              stroke="none"
              fill="var(--series-1-band)"
              fillOpacity={1}
              isAnimationActive={false}
              connectNulls
            />
            {compare && (
              <Line
                dataKey="cmpP50"
                stroke="var(--series-base)"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            )}
            <Line
              dataKey="buffer"
              type="stepAfter"
              stroke="var(--critical)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
            {hasHistory && (
              <Line dataKey="actual" stroke="var(--actual)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            )}
            <Line
              dataKey="p50"
              stroke="var(--series-1)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
            <Scatter dataKey="marker" shape={<Marker />} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
