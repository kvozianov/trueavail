"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/liquidity/LanguageProvider";
import type { Language } from "@/lib/i18n";
import type { DemoMode } from "@/lib/golden-incident";

type DemoNavProps = {
  mode?: DemoMode;
  statusText?: string;
};

export function DemoNav({ mode = "replay", statusText }: DemoNavProps) {
  const pathname = usePathname();
  const { language, setLanguage, t, translate } = useLanguage();
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
    { href: "/", label: t("Home"), active: pathname === "/" || pathname === "/landing" },
    { href: "/liquidity-control-tower", label: t("Map"), active: pathname === "/liquidity-control-tower" },
    { href: "/demo#demo-dashboard", label: t("Demo"), active: pathname === "/demo" },
    { href: "/judge", label: t("Judge"), active: pathname === "/judge" },
    { href: "/technical", label: t("Technical"), active: pathname === "/technical" },
  ];
  const languages: Language[] = ["en", "ru"];

  return (
    <header className={`demo-nav ${menuOpen ? "demo-nav--open" : ""}`}>
      <a className="skip-link" href="#main-content">{t("Skip to content")}</a>
      <Link className="demo-nav__brand" href="/" aria-label={t("TrueAvail home")} onClick={closeMenu}>
        <span>TA</span>
        <strong>TrueAvail</strong>
      </Link>
      <button
        aria-controls="demo-navigation"
        aria-expanded={menuOpen}
        aria-label={menuOpen ? t("Close navigation menu") : t("Open navigation menu")}
        className="demo-nav__menu"
        onClick={() => setMenuOpen((open) => !open)}
        type="button"
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </button>
      <nav aria-label={t("Demo navigation")} id="demo-navigation">
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
        {t("Open Demo")}
      </Link>
      <div className="language-switch" aria-label={t("Language", "Язык")}>
        {languages.map((item) => (
          <button
            aria-pressed={item === language}
            className={item === language ? "language-switch__button language-switch__button--active" : "language-switch__button"}
            key={item}
            onClick={() => setLanguage(item)}
            type="button"
          >
            {item.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="demo-nav__status" aria-label={t("Data source status")}>
        <span className={`mode-dot mode-dot--${mode}`} aria-hidden="true" />
        <span>{mode === "live" ? t("Live API") : t("Replay Snapshot")}</span>
        {statusText ? <small>{translate(statusText)}</small> : null}
      </div>
    </header>
  );
}
