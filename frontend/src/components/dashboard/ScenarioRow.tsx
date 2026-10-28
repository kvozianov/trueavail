"use client";

import { money } from "@/lib/format";
import type { DemoScenarioSummary, WorstGap } from "@/lib/types";

function worst(w: WorstGap | null | undefined) {
  return w ? money(w.gap_amount, w.currency) : "none";
}

export function scenarioDelta(s: Pick<DemoScenarioSummary, "delta">) {
  const { gaps_removed: r, gaps_added: a } = s.delta;
  const net = a - r;
  return { net, text: net === 0 ? "0" : net > 0 ? `+${net}` : `−${-net}`, tone: net < 0 ? "text-good" : net > 0 ? "text-gap" : "text-ink" };
}

export function worstCaption(s: DemoScenarioSummary) {
  const same = s.worst_before && s.worst_after && Math.abs(s.worst_before.gap_amount - s.worst_after.gap_amount) < 0.5;
  return same ? "worst unchanged" : `worst ${worst(s.worst_before)} → ${worst(s.worst_after)}`;
}

/** Scenario row: title, one-line description, net change in gap days. Selected = ink border. */
export function ScenarioRow({
  s,
  selected,
  onSelect,
  compact = false,
}: {
  s: DemoScenarioSummary;
  selected: boolean;
  onSelect: () => void;
  compact?: boolean;
}) {
  const d = scenarioDelta(s);
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 rounded-2 border px-4 py-3.5 text-left transition-[border-color,background-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
        selected ? "border-ink bg-bg" : "border-hairline bg-bg hover:border-hairline-2 hover:bg-bg-2"
      }`}
    >
      <span className="min-w-0">
        <span className="block text-[14px] font-semibold text-ink">{s.title}</span>
        {!compact && <span className="mt-0.5 line-clamp-2 block text-[13px] leading-snug text-ink-3">{s.description}</span>}
        {!compact && <span className="mt-1.5 block font-mono text-[10.5px] uppercase tracking-[0.06em] text-ink-3">{worstCaption(s)}</span>}
      </span>
      <span className="text-right">
        <span className={`block font-display text-[22px] font-semibold leading-none tnum ${d.tone}`}>{d.text}</span>
        <span className="mt-1.5 block whitespace-nowrap font-mono text-[10.5px] uppercase tracking-[0.06em] text-ink-3">gap days</span>
      </span>
    </button>
  );
}
