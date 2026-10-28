"use client";

import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";

/** Underlined tabs with arrow-key navigation. Render panels with `tabPanelProps`. */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  idBase,
}: {
  tabs: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  idBase?: string;
}) {
  const auto = useId();
  const base = idBase ?? auto;
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const j = (i + d + tabs.length) % tabs.length;
    onChange(tabs[j].value);
    refs.current[j]?.focus();
  };
  return (
    <div role="tablist" aria-label={label} className="flex gap-6 overflow-x-auto border-b border-hairline no-scrollbar">
      {tabs.map((t, i) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            id={`${base}-tab-${t.value}`}
            role="tab"
            type="button"
            aria-selected={active}
            aria-controls={`${base}-panel-${t.value}`}
            tabIndex={active ? 0 : -1}
            onKeyDown={(e) => onKey(e, i)}
            onClick={() => onChange(t.value)}
            className={`-mb-px shrink-0 border-b-2 pb-2.5 pt-1 text-[14px] font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
              active ? "border-ink text-ink" : "border-transparent text-ink-3 hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export function tabPanelProps(idBase: string, value: string) {
  return { id: `${idBase}-panel-${value}`, role: "tabpanel" as const, "aria-labelledby": `${idBase}-tab-${value}`, tabIndex: 0 };
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-ink-2">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-[22px] w-[38px] rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${checked ? "bg-ink" : "bg-hairline-2"}`}
      >
        <span
          aria-hidden
          className={`absolute top-[3px] h-4 w-4 rounded-full bg-bg shadow transition-transform duration-150 ${checked ? "translate-x-[19px]" : "translate-x-[3px]"}`}
        />
      </button>
      {label}
    </label>
  );
}
