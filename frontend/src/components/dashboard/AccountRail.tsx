"use client";

import { useRef, type KeyboardEvent } from "react";
import { Sparkline } from "@/components/charts/Sparkline";
import { Chip, Skeleton } from "@/components/ui";
import type { AccountState } from "@/lib/derive";
import { money } from "@/lib/format";
import type { HistoryRow } from "@/lib/types";

export function AccountItem({
  state,
  horizon,
  selected,
  spark,
  onSelect,
  onKeyDown,
  buttonRef,
  layout = "rail",
}: {
  state: AccountState;
  horizon: number;
  selected: boolean;
  spark: number[];
  onSelect: () => void;
  onKeyDown?: (e: KeyboardEvent<HTMLButtonElement>) => void;
  buttonRef?: (el: HTMLButtonElement | null) => void;
  layout?: "rail" | "strip";
}) {
  const a = state.account;
  const gap = state.daysToGap != null;
  const tone = selected ? (gap ? "border-[rgba(220,59,62,.25)] bg-gap-tint" : "border-hairline bg-bg-2") : "border-transparent hover:bg-bg-2";
  return (
    <button
      ref={buttonRef}
      type="button"
      role="radio"
      aria-checked={selected}
      tabIndex={selected ? 0 : -1}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      className={`grid w-full grid-cols-[minmax(0,1fr)_auto] gap-x-3 rounded-3 border px-4 py-3.5 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${tone} ${layout === "strip" ? "w-[240px] shrink-0 snap-start" : ""}`}
    >
      <div className="min-w-0">
        <p className="eyebrow truncate !text-[10.5px]">
          {a.bank_name} · {a.currency}
        </p>
        <p className="mt-1 truncate text-[15px] font-semibold text-ink">{a.label}</p>
        <p className="mt-1.5 whitespace-nowrap text-[15px] font-medium text-ink tnum">
          {money(a.settled_balance, a.currency)} <span className="text-[12.5px] font-normal text-ink-3">buffer {money(a.required_buffer, a.currency)}</span>
        </p>
      </div>
      <div className="pt-4">
        <Sparkline values={spark} label={`${a.label}: last ${spark.length} days of balances`} />
      </div>
      <div className="col-span-2 mt-3 flex items-center justify-between gap-2">
        <p className="flex items-baseline gap-1.5">
          <span className={`font-display text-[22px] font-semibold leading-none tnum ${gap ? "text-gap" : "text-ink"}`}>{gap ? state.daysToGap : horizon}</span>
          <span className="eyebrow !text-[10.5px]">{gap ? (state.daysToGap === 1 ? "day to gap" : "days to gap") : "days clear"}</span>
        </p>
        {gap ? (
          <Chip tone="gap">Gap {money(state.firstGapAmount, a.currency)}</Chip>
        ) : state.minP05 ? (
          <Chip tone="good">min P5 {money(state.minP05.balance_p05, a.currency)}</Chip>
        ) : null}
      </div>
    </button>
  );
}

export function AccountRail({
  states,
  history,
  horizon,
  selected,
  onSelect,
  note,
}: {
  states: AccountState[];
  history: HistoryRow[] | null;
  horizon: number;
  selected: string | null;
  onSelect: (id: string) => void;
  note?: React.ReactNode;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const currencies = new Set(states.map((s) => s.account.currency));
  const spark = (id: string) =>
    (history ?? [])
      .filter((h) => h.account_id === id)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30)
      .map((h) => h.ending_balance);
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const d = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const j = (i + d + states.length) % states.length;
    onSelect(states[j].account.account_id);
    refs.current[j]?.focus();
  };
  return (
    <div>
      <p className="eyebrow mb-3 px-4 max-lg:px-0">
        Accounts · {states.length} · {currencies.size} {currencies.size === 1 ? "currency" : "currencies"}
      </p>
      <div
        role="radiogroup"
        aria-label="Account shown in the chart"
        className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 no-scrollbar lg:mx-0 lg:flex-col lg:gap-1.5 lg:overflow-visible lg:px-0 lg:pb-0"
      >
        {states.map((s, i) => (
          <AccountItem
            key={s.account.account_id}
            state={s}
            horizon={horizon}
            selected={s.account.account_id === selected}
            spark={spark(s.account.account_id)}
            onSelect={() => onSelect(s.account.account_id)}
            onKeyDown={(e) => onKey(e, i)}
            buttonRef={(el) => {
              refs.current[i] = el;
            }}
            layout="strip"
          />
        ))}
      </div>
      {note && <p className="t-micro mt-4 px-4 max-lg:px-0">{note}</p>}
    </div>
  );
}

export function RailSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="mb-3 h-3 w-40" />
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-[118px] w-full rounded-3" />
      ))}
    </div>
  );
}
