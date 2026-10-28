import type { ReactNode } from "react";

export function Field({ label, hint, error, children }: { label: string; hint?: ReactNode; error?: string | null; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[13px] font-medium text-ink">{label}</span>
      {children}
      {error ? <span className="text-[12.5px] text-gap">{error}</span> : hint ? <span className="text-[12.5px] text-ink-3">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "h-10 w-full min-w-0 rounded-2 border border-border-input bg-bg px-3 font-mono text-[14px] tnum text-ink transition-[border-color,box-shadow] duration-150 placeholder:text-ink-4 focus:border-accent focus:shadow-[var(--focus-ring-input)] focus:outline-none disabled:bg-bg-2 disabled:text-ink-4 aria-[invalid=true]:border-gap-fill aria-[invalid=true]:shadow-[0_0_0_3px_rgba(220,59,62,.14)]";

export const selectClass = `${inputClass} cursor-pointer appearance-none pr-9 font-sans text-[15px]`;
