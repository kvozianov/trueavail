import type { ReactNode } from "react";
import type { Severity } from "@/lib/types";

export function Card({
  title,
  subtitle,
  actions,
  children,
  className = "",
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-line bg-surface p-4 sm:p-5 ${className}`}>
      {(title || actions) && (
        <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold text-ink">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0 max-w-3xl">
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">{title}</h1>
        <p className="mt-1 text-sm text-ink-2">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" };

export function Button({ variant = "secondary", className = "", ...props }: ButtonProps) {
  const styles = {
    primary: "bg-series-1 text-white hover:opacity-90 border-transparent",
    secondary: "bg-surface text-ink border-line hover:bg-surface-2",
    ghost: "bg-transparent text-ink-2 border-transparent hover:bg-surface-2",
  }[variant];
  return (
    <button
      type="button"
      className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md border px-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-series-1 ${styles} ${className}`}
      {...props}
    />
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-ink-muted">{label}</div>
      <div className="tabular mt-0.5 truncate text-sm font-semibold text-ink">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-ink-muted">{hint}</div>}
    </div>
  );
}

export function SeverityPill({ severity }: { severity: Severity }) {
  const red = severity === "red";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        red ? "bg-[var(--critical-bg)] text-crit" : "bg-[var(--warning-bg)] text-warn"
      }`}
    >
      <span aria-hidden>{red ? "●" : "▲"}</span>
      {red ? "Red" : "Amber"}
    </span>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-2 py-6 text-sm text-ink-muted">
      <span className="h-3 w-3 animate-spin rounded-full border-2 border-ink-muted border-t-transparent" aria-hidden />
      {label}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-4 text-sm text-ink-muted">{children}</p>;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="text-xs text-ink-muted">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "tabular min-h-9 w-full rounded-md border border-line bg-surface px-2.5 text-sm text-ink focus-visible:outline-2 focus-visible:outline-series-1";
