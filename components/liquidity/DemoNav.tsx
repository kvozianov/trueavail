"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { DemoMode } from "@/lib/golden-incident";

type DemoNavProps = {
  mode?: DemoMode;
  statusText?: string;
};

export function DemoNav({ mode = "replay", statusText }: DemoNavProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);
  const navItems = [
    { href: "/", label: "Home", active: pathname === "/" || pathname === "/landing" },
    { href: "/liquidity-control-tower", label: "Map", active: pathname === "/liquidity-control-tower" },
    { href: "/demo#demo-dashboard", label: "Demo", active: pathname === "/demo" },
    { href: "/judge", label: "Judge", active: pathname === "/judge" },
    { href: "/technical", label: "Technical", active: pathname === "/technical" },
  ];

  return (
    <header className={`demo-nav ${menuOpen ? "demo-nav--open" : ""}`}>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Link className="demo-nav__brand" href="/" aria-label="TrueAvail home" onClick={closeMenu}>
        <span>TA</span>
        <strong>TrueAvail</strong>
      </Link>
      <button
        aria-controls="demo-navigation"
        aria-expanded={menuOpen}
        aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
        className="demo-nav__menu"
        onClick={() => setMenuOpen((open) => !open)}
        type="button"
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </button>
      <nav aria-label="Demo navigation" id="demo-navigation">
        {navItems.map((item) => (
          <Link
            aria-current={item.active ? "page" : undefined}
            href={item.href}
            key={item.href}
            onClick={closeMenu}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <Link className="demo-nav__cta" href="/demo#demo-dashboard" onClick={closeMenu}>
        Open Demo
      </Link>
      <div className="demo-nav__status" aria-label="Data source status">
        <span className={`mode-dot mode-dot--${mode}`} aria-hidden="true" />
        <span>{mode === "live" ? "Live API" : "Replay Snapshot"}</span>
        {statusText ? <small>{statusText}</small> : null}
      </div>
    </header>
  );
}
