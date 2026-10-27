"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { API_URL, USE_FIXTURES } from "@/lib/api";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/backtest", label: "Backtest" },
  { href: "/what-if", label: "What-if" },
  { href: "/data", label: "Data" },
];

export function SyntheticBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--warning)] bg-[var(--warning-bg)] px-2.5 py-0.5 text-xs font-medium text-warn">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--warning)]" />
      Synthetic data — demo prototype
    </span>
  );
}

export function ModeBadge() {
  return USE_FIXTURES ? (
    <span
      title="NEXT_PUBLIC_USE_FIXTURES=1: responses come from bundled fixtures, the backend is not called"
      className="inline-flex items-center rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-ink-2"
    >
      Fixtures mode
    </span>
  ) : (
    <span
      title="Live API base URL"
      className="inline-flex max-w-full items-center truncate rounded-full border border-line px-2.5 py-0.5 font-mono text-xs text-ink-muted"
    >
      API {API_URL.replace(/^https?:\/\//, "")}
    </span>
  );
}

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-base font-semibold tracking-tight text-ink">TrueAvail</span>
          <span className="hidden text-xs text-ink-muted sm:inline">14-day liquidity forecast</span>
        </Link>
        <nav aria-label="Main" className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto">
          {links.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm ${
                  active ? "bg-surface-2 font-medium text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
          <SyntheticBadge />
          <ModeBadge />
        </div>
      </div>
    </header>
  );
}
