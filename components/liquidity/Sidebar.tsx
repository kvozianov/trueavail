"use client";

import { useEffect, useState } from "react";

const navItems = [
  { id: "overview", label: "Liquidity", marker: "▣" },
  { id: "optimizer", label: "Payments", marker: "▤" },
  { id: "stress", label: "FX Risk", marker: "↻" },
  { id: "roi", label: "Reporting", marker: "▥" },
  { id: "forecast", label: "Cash Flow", marker: "⌁" },
  { id: "ai-council", label: "Market Data", marker: "⌘" },
  { id: "governance", label: "User Access", marker: "♙" },
  { id: "explainability", label: "Compliance", marker: "◇" },
  { id: "contingency", label: "Settings", marker: "◴" },
];

type SidebarProps = {
  activeSection: string;
  onSectionChange: (section: string) => void;
};

export function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  const [signOutOpen, setSignOutOpen] = useState(false);

  useEffect(() => {
    if (!signOutOpen) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSignOutOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [signOutOpen]);

  return (
    <aside className="sidebar" aria-label="TrueAvail navigation">
      <div className="sidebar__brand">
        <div className="brand-mark" aria-hidden="true">F</div>
        <div>
          <h1>Finance Corp</h1>
          <p>Global Treasury</p>
        </div>
      </div>

      <button className="quick-transfer" type="button" onClick={() => onSectionChange("optimizer")}>
        <span aria-hidden="true">＋</span>
        Quick Transfer
      </button>

      <nav className="sidebar__nav">
        {navItems.map((item) => (
          <button
            className={`sidebar__item ${activeSection === item.id ? "sidebar__item--active" : ""}`}
            key={item.id}
            type="button"
            onClick={() => onSectionChange(item.id)}
          >
            <span aria-hidden="true">{item.marker}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar__footer">
        <button className="sidebar__utility" type="button" onClick={() => onSectionChange("ai-council")}>
          <span aria-hidden="true">◎</span>
          Support
        </button>
        <button className="sidebar__utility" type="button" onClick={() => setSignOutOpen(true)}>
          <span aria-hidden="true">↱</span>
          Sign Out
        </button>
      </div>

      {signOutOpen ? (
        <div className="demo-modal-backdrop" role="presentation" onMouseDown={() => setSignOutOpen(false)}>
          <div
            aria-labelledby="sign-out-title"
            aria-modal="true"
            className="demo-modal demo-modal--narrow"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="demo-modal__header">
              <h2 id="sign-out-title">End demo session?</h2>
              <button className="button button--secondary" type="button" onClick={() => setSignOutOpen(false)}>Close</button>
            </div>
            <p className="executive-copy">This is a safe mock sign-out. The dashboard will stay open and return to the overview.</p>
            <div className="demo-form__actions">
              <button className="button button--secondary" type="button" onClick={() => setSignOutOpen(false)}>Cancel</button>
              <button
                className="button button--primary"
                type="button"
                onClick={() => {
                  setSignOutOpen(false);
                  onSectionChange("overview");
                }}
              >
                Sign out mock user
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
