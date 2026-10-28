"use client";

import { ArrowRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ButtonLink, Chip, GithubIcon, Mark } from "@/components/ui";
import { API_URL, DEMO, USE_FIXTURES } from "@/lib/api";
import { REPO_URL } from "@/lib/links";
import { NAV_LINKS, isActive } from "./links";
import { ThemeToggle } from "./ThemeToggle";

function ModeChip({ short = false }: { short?: boolean }) {
  if (DEMO) return <Chip tone="warn">{short ? "Demo" : "Synthetic data · demo"}</Chip>;
  if (USE_FIXTURES)
    return (
      <Chip tone="neutral" title="NEXT_PUBLIC_USE_FIXTURES=1: bundled sample responses, the backend is not called">
        Fixtures
      </Chip>
    );
  return (
    <Chip tone="good" title="Live API base URL">
      {short ? "Live" : `Live · ${API_URL.replace(/^https?:\/\//, "")}`}
    </Chip>
  );
}

export function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-[9px] rounded-1 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
      <Mark size={22} />
      <span className="font-display text-[19px] font-semibold tracking-[-0.02em] text-ink">TrueAvail</span>
    </Link>
  );
}

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const landing = isActive(pathname, "/");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-bg/90 backdrop-blur-md supports-[backdrop-filter]:bg-bg/80">
      <div className="container-page flex h-14 items-center gap-6 sm:h-16">
        <Wordmark />
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((l) => {
            const active = isActive(pathname, l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-3 py-1.5 text-[14px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
                  active ? "bg-bg-2 text-ink" : "text-ink-2 hover:bg-bg-2 hover:text-ink"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden md:inline-flex">
            <ModeChip />
          </span>
          <span className="md:hidden">
            <ModeChip short />
          </span>
          <span className="hidden lg:contents">
            <ThemeToggle />
            <ButtonLink href={REPO_URL} variant="secondary" size="sm" icon={<GithubIcon />}>
              GitHub
            </ButtonLink>
          </span>
          {landing && (
            <span className="hidden xl:contents">
              <ButtonLink href="/forecast" variant="primary" size="sm">
                See the forecast
              </ButtonLink>
            </span>
          )}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            aria-expanded={open}
            aria-controls="mobile-menu"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-bg-2 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] lg:hidden"
          >
            <Menu size={20} strokeWidth={1.75} aria-hidden />
          </button>
        </div>
      </div>
      {open && (
        <div id="mobile-menu" role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-50 bg-bg lg:hidden">
          <div className="sheet-in flex h-full flex-col">
            <div className="container-page flex h-14 items-center justify-between border-b border-hairline sm:h-16">
              <Wordmark />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                autoFocus
                className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-bg-2 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                <X size={20} strokeWidth={1.75} aria-hidden />
              </button>
            </div>
            <nav aria-label="Main" className="container-page flex flex-col py-4">
              {NAV_LINKS.map((l) => {
                const active = isActive(pathname, l.href);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-12 items-center justify-between border-b border-hairline text-[18px] font-medium focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${active ? "text-ink" : "text-ink-2"}`}
                  >
                    {l.label}
                    <ArrowRight size={16} strokeWidth={1.75} aria-hidden className={active ? "text-accent" : "text-ink-4"} />
                  </Link>
                );
              })}
            </nav>
            <div className="container-page mt-2 flex items-center gap-3">
              <ButtonLink href={REPO_URL} variant="secondary" icon={<GithubIcon />}>
                Source on GitHub
              </ButtonLink>
              <ThemeToggle />
            </div>
            <p className="container-page t-small mt-6">
              {DEMO
                ? "Demo on synthetic data. Every number was precomputed by the backend; the full pipeline runs with docker compose up."
                : "Synthetic data unless you uploaded a CSV. Nothing moves money."}
            </p>
          </div>
        </div>
      )}
    </header>
  );
}
