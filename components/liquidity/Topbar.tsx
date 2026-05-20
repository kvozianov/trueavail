"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";

type TopbarModal = "transaction" | "status" | "settings" | "help" | "profile" | null;

type TopbarProps = {
  refreshing?: boolean;
  onRefresh?: () => void;
  onNavigate?: (section: string) => void;
};

const searchIndex = [
  { label: "Liquidity overview", meta: "Current global position", section: "overview" },
  { label: "Forecast workbench", meta: "p05 / p50 / p95 rows", section: "forecast" },
  { label: "Stress lab", meta: "Bank run and TARGET2 outage", section: "stress" },
  { label: "Optimizer recommendation", meta: "Transfer routes and approval", section: "optimizer" },
  { label: "Audit logs", meta: "Governance gate and endpoint registry", section: "governance" },
  { label: "AI Council", meta: "Advisor review and verdict", section: "ai-council" },
  { label: "Settings", meta: "Contingency plan and runtime knobs", section: "contingency" },
];

export function Topbar({ refreshing, onRefresh, onNavigate }: TopbarProps) {
  const [modal, setModal] = useState<TopbarModal>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [notice, setNotice] = useState("Ready");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [transactionForm, setTransactionForm] = useState({
    amount: "425000",
    from: "JPM New York",
    to: "DBS Singapore",
    reason: "Demo liquidity rebalance",
  });

  const results = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return searchIndex.slice(0, 4);
    return searchIndex.filter((item) => `${item.label} ${item.meta}`.toLowerCase().includes(query)).slice(0, 5);
  }, [searchQuery]);

  const navigate = (section: string, message: string) => {
    onNavigate?.(section);
    setSearchOpen(false);
    setNotice(message);
  };

  const exportData = () => {
    const rows = [
      ["metric", "value"],
      ["exported_at", new Date().toISOString()],
      ["source", "mock demo snapshot"],
      ["status", refreshing ? "refreshing" : "ready"],
    ];
    const csv = rows.map((row) => row.join(",")).join("\n");
    const url = window.URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "liquidity-control-tower-demo-export.csv";
    anchor.click();
    window.URL.revokeObjectURL(url);
    setNotice("Demo export prepared as CSV.");
  };

  const submitTransaction = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number.parseFloat(transactionForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError("Enter a positive transaction amount.");
      return;
    }
    if (!transactionForm.from.trim() || !transactionForm.to.trim()) {
      setFormError("Source and destination are required.");
      return;
    }
    if (transactionForm.from.trim().toLowerCase() === transactionForm.to.trim().toLowerCase()) {
      setFormError("Source and destination must be different.");
      return;
    }

    setFormError("");
    setSubmitting(true);
    window.setTimeout(() => {
      setSubmitting(false);
      setModal(null);
      setNotice(`Mock transaction staged: ${transactionForm.from} to ${transactionForm.to}.`);
      onNavigate?.("optimizer");
    }, 650);
  };

  return (
    <header className="topbar">
      <div className="topbar__context">
        <button className="topbar__brand" type="button" onClick={() => navigate("overview", "Opened global treasury overview.")}>TrueAvail</button>
        <button className="topbar__section" type="button" onClick={() => navigate("overview", "Global view selected.")}>Global View</button>
        <button className="topbar__navlink" type="button" onClick={() => navigate("governance", "Entity setup opens the governance workspace.")}>Entity Setup</button>
        <button className="topbar__navlink" type="button" onClick={() => navigate("explainability", "Audit logs open the explainability trace.")}>Audit Logs</button>
      </div>
      <div className="topbar__actions">
        <label className="topbar__search">
          <span aria-hidden="true">⌕</span>
          <input
            aria-label="Search treasury records"
            onBlur={() => window.setTimeout(() => setSearchOpen(false), 120)}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            placeholder="Search..."
            value={searchQuery}
          />
          {searchOpen ? (
            <div className="topbar__search-results" role="region" aria-label="Search results">
              {results.length ? results.map((item) => (
                <button
                  key={item.label}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => navigate(item.section, `${item.label} opened from search.`)}
                  type="button"
                >
                  <strong>{item.label}</strong>
                  <span>{item.meta}</span>
                </button>
              )) : (
                <button
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setSearchQuery("");
                    setSearchOpen(false);
                    setNotice("No matching record in the demo index.");
                  }}
                  type="button"
                >
                  <strong>No results</strong>
                  <span>Clear search</span>
                </button>
              )}
            </div>
          ) : null}
        </label>
        <button className="button button--secondary topbar__export" type="button" onClick={exportData}>
          Export Data
        </button>
        <button className="button button--primary topbar__create" type="button" onClick={() => setModal("transaction")}>
          Create Transaction
        </button>
        <button className="topbar__icon-button" type="button" onClick={onRefresh} disabled={refreshing} aria-label={refreshing ? "Refreshing dashboard" : "Refresh dashboard"}>
          ↻
        </button>
        <button className="topbar__icon-button" type="button" onClick={() => setModal("status")} aria-label="Open runtime status">◷</button>
        <button className="topbar__icon-button" type="button" onClick={() => setModal("settings")} aria-label="Open settings">⚙</button>
        <button className="topbar__icon-button" type="button" onClick={() => setModal("help")} aria-label="Open help">?</button>
        <button className="topbar__avatar" type="button" onClick={() => setModal("profile")} aria-label="Open profile">US</button>
      </div>
      <div className="topbar__notice" role="status">{notice}</div>

      <TopbarDialog open={modal === "transaction"} title="Create mock transaction" onClose={() => setModal(null)}>
        <form className="demo-form" onSubmit={submitTransaction}>
          <label>
            Source account
            <input
              autoFocus
              value={transactionForm.from}
              onChange={(event) => setTransactionForm((current) => ({ ...current, from: event.target.value }))}
            />
          </label>
          <label>
            Destination account
            <input
              value={transactionForm.to}
              onChange={(event) => setTransactionForm((current) => ({ ...current, to: event.target.value }))}
            />
          </label>
          <label>
            Amount
            <input
              inputMode="decimal"
              type="number"
              value={transactionForm.amount}
              onChange={(event) => setTransactionForm((current) => ({ ...current, amount: event.target.value }))}
            />
          </label>
          <label>
            Reason
            <input
              value={transactionForm.reason}
              onChange={(event) => setTransactionForm((current) => ({ ...current, reason: event.target.value }))}
            />
          </label>
          {formError ? <p className="demo-form__error" role="alert">{formError}</p> : null}
          <div className="demo-form__actions">
            <button className="button button--secondary" type="button" onClick={() => setModal(null)}>Cancel</button>
            <button className="button button--primary" type="submit" disabled={submitting}>{submitting ? "Staging" : "Stage transaction"}</button>
          </div>
        </form>
      </TopbarDialog>

      <TopbarDialog open={modal === "status"} title="Runtime status" onClose={() => setModal(null)}>
        <dl className="demo-dialog-list">
          <div><dt>Data source</dt><dd>Replay snapshot with live API refresh attempt</dd></div>
          <div><dt>Refresh state</dt><dd>{refreshing ? "Refreshing" : "Idle"}</dd></div>
          <div><dt>Last action</dt><dd>{notice}</dd></div>
        </dl>
        <button className="button button--primary" type="button" onClick={() => { onRefresh?.(); setNotice("Refresh requested from runtime status."); }}>
          Refresh now
        </button>
      </TopbarDialog>

      <TopbarDialog open={modal === "settings"} title="Demo settings" onClose={() => setModal(null)}>
        <div className="demo-settings-grid">
          {["Replay mode", "Strict approval gate", "Show audit receipts"].map((item) => (
            <label className="toggle-field" key={item}>
              <input type="checkbox" defaultChecked />
              {item}
            </label>
          ))}
        </div>
        <button className="button button--primary" type="button" onClick={() => { setModal(null); setNotice("Demo settings saved locally for this session."); }}>
          Save settings
        </button>
      </TopbarDialog>

      <TopbarDialog open={modal === "help"} title="Help center" onClose={() => setModal(null)}>
        <p className="executive-copy">Use the sidebar to switch workspaces, run stress and AI Council reviews, then open explanations from any action item.</p>
        <div className="demo-form__actions">
          <button className="button button--secondary" type="button" onClick={() => navigate("explainability", "Help opened the explainability workspace.")}>Open explanation</button>
          <button className="button button--primary" type="button" onClick={() => navigate("ai-council", "Help opened AI Council support.")}>Contact support</button>
        </div>
      </TopbarDialog>

      <TopbarDialog open={modal === "profile"} title="Profile" onClose={() => setModal(null)}>
        <dl className="demo-dialog-list">
          <div><dt>User</dt><dd>US Treasury Operator</dd></div>
          <div><dt>Role</dt><dd>Demo administrator</dd></div>
          <div><dt>Workspace</dt><dd>Global liquidity control tower</dd></div>
        </dl>
        <button className="button button--primary" type="button" onClick={() => { setModal(null); setNotice("Profile preferences saved for the mock session."); }}>
          Save profile
        </button>
      </TopbarDialog>
    </header>
  );
}

function TopbarDialog({
  children,
  open,
  onClose,
  title,
}: {
  children: ReactNode;
  open: boolean;
  onClose: () => void;
  title: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.setTimeout(() => panelRef.current?.focus(), 0);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="demo-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        aria-labelledby="topbar-dialog-title"
        aria-modal="true"
        className="demo-modal"
        onMouseDown={(event) => event.stopPropagation()}
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="demo-modal__header">
          <h2 id="topbar-dialog-title">{title}</h2>
          <button className="button button--secondary" type="button" onClick={onClose}>Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}
