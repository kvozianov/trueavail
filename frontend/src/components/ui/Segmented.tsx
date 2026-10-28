"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";

/** Pill radiogroup for ≤ 4–5 mutually exclusive views. Arrow keys move the selection. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className = "",
  size = "md",
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const j = (i + d + options.length) % options.length;
    onChange(options[j].value);
    refs.current[j]?.focus();
  };
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`inline-flex max-w-full items-center overflow-x-auto rounded-full bg-bg-3 p-[3px] no-scrollbar ${className}`}
    >
      {options.map((o, i) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onKeyDown={(e) => onKey(e, i)}
            onClick={() => onChange(o.value)}
            className={`shrink-0 rounded-full font-medium transition-[background-color,color,box-shadow] duration-200 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
              size === "sm" ? "h-7 px-3 text-[12.5px]" : "h-[30px] px-3.5 text-[13.5px]"
            } ${active ? "bg-bg text-ink shadow-[0_1px_2px_rgba(16,18,20,.08),0_0_0_1px_var(--card-border)]" : "text-ink-2 hover:text-ink"}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
