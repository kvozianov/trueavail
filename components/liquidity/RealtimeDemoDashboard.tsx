"use client";

import { useEffect, useMemo, useState } from "react";
import { DemoNav } from "@/components/liquidity/DemoNav";

type Currency = "USD" | "EUR" | "GBP" | "SGD" | "CHF";
type AccountState = "healthy" | "warning" | "critical";

type DemoAccount = {
  id: string;
  city: string;
  country: string;
  bank: string;
  currency: Currency;
  x: number;
  y: number;
  minimum: number;
  series: number[];
};

type DemoFlow = {
  from: string;
  to: string;
  amount: number;
  currency: Currency;
  rail: "SWIFT" | "Fedwire" | "TARGET2" | "SEPA";
  state: AccountState;
  eta: string;
  note: string;
};

type ActiveTool = "idle" | "optimizer" | "transfer" | "crisis" | "playback" | "executed" | "reset";

const days = [
  { label: "-7d", caption: "Past" },
  { label: "-3d", caption: "Stable" },
  { label: "Today", caption: "Now" },
  { label: "+2d", caption: "Forecast" },
  { label: "+4d", caption: "Stress" },
  { label: "+7d", caption: "Decision" },
];

const accounts: DemoAccount[] = [
  {
    id: "frankfurt",
    city: "Frankfurt",
    country: "Germany",
    bank: "Deutsche Bank",
    currency: "EUR",
    x: 49.6,
    y: 38.2,
    minimum: 500_000,
    series: [1_120_000, 1_070_000, 1_035_000, 1_008_000, 960_000, 910_000],
  },
  {
    id: "paris",
    city: "Paris",
    country: "France",
    bank: "BNP Paribas",
    currency: "EUR",
    x: 48.6,
    y: 40.8,
    minimum: 400_000,
    series: [920_000, 884_000, 840_000, 790_000, 765_000, 742_000],
  },
  {
    id: "nyc",
    city: "NYC",
    country: "United States",
    bank: "JPMorgan",
    currency: "USD",
    x: 28.7,
    y: 43.8,
    minimum: 800_000,
    series: [980_000, 822_000, 576_000, 390_000, 318_000, 264_000],
  },
  {
    id: "sf",
    city: "SF",
    country: "United States",
    bank: "Bank of America",
    currency: "USD",
    x: 18.2,
    y: 42.8,
    minimum: 400_000,
    series: [740_000, 724_000, 707_000, 690_000, 676_000, 662_000],
  },
  {
    id: "london",
    city: "London",
    country: "United Kingdom",
    bank: "Barclays",
    currency: "GBP",
    x: 47.3,
    y: 37.1,
    minimum: 300_000,
    series: [620_000, 584_000, 514_000, 492_000, 476_000, 455_000],
  },
  {
    id: "riyadh",
    city: "Riyadh",
    country: "Saudi Arabia",
    bank: "SNB Treasury",
    currency: "USD",
    x: 59.1,
    y: 51.7,
    minimum: 500_000,
    series: [910_000, 874_000, 852_000, 820_000, 774_000, 736_000],
  },
  {
    id: "singapore",
    city: "Singapore",
    country: "Singapore",
    bank: "DBS",
    currency: "SGD",
    x: 73.5,
    y: 63,
    minimum: 600_000,
    series: [1_170_000, 1_125_000, 1_089_000, 1_040_000, 1_006_000, 982_000],
  },
  {
    id: "zurich",
    city: "Zurich",
    country: "Switzerland",
    bank: "UBS",
    currency: "CHF",
    x: 49.8,
    y: 40.1,
    minimum: 200_000,
    series: [475_000, 450_000, 422_000, 404_000, 390_000, 374_000],
  },
];

const rescueFlows: DemoFlow[] = [
  { from: "frankfurt", to: "nyc", amount: 380_000, currency: "USD", rail: "SWIFT", state: "warning", eta: "T+1 bank day", note: "Frankfurt cover clears after NY cut-off." },
  { from: "sf", to: "nyc", amount: 240_000, currency: "USD", rail: "Fedwire", state: "healthy", eta: "42m", note: "Same-day domestic liquidity." },
  { from: "singapore", to: "nyc", amount: 180_000, currency: "USD", rail: "SWIFT", state: "healthy", eta: "T+2 bank days", note: "Asia cover waits for NY usable cash window." },
];

const calendarDays = [
  { label: "Today", market: "NY", state: "cutoff", note: "credit debit", detail: "16:30 ET cut-off already passed" },
  { label: "+1D", market: "EU", state: "open", note: "SWIFT cover", detail: "Frankfurt cover leaves before CET close" },
  { label: "+2D", market: "NY", state: "usable", note: "cash usable", detail: "Funds become available for debit batch" },
  { label: "+3D", market: "US", state: "closed", note: "weekend", detail: "No Fedwire settlement on Saturday" },
  { label: "+4D", market: "SA", state: "open", note: "Sunday bank day", detail: "Riyadh can move USD while US is shut" },
  { label: "+5D", market: "SG", state: "usable", note: "Asia buffer", detail: "Singapore reserve clears before payroll spike" },
];

const seasonalityBars = [
  { label: "Payroll", value: "72%", height: "72%" },
  { label: "Cards", value: "48%", height: "48%" },
  { label: "Month-end", value: "86%", height: "86%" },
  { label: "Weekend", value: "34%", height: "34%" },
];

const calendarMetrics = [
  { label: "Usable cash delay", value: "T+1", note: "NY credit crosses next bank day" },
  { label: "Closed markets", value: "1", note: "US weekend blocks Fedwire" },
  { label: "Seasonal buffer", value: "+18%", note: "payroll and month-end load" },
];

export function RealtimeDemoDashboard() {
  const [dayIndex, setDayIndex] = useState(2);
  const [playing, setPlaying] = useState(false);
  const [selectedId, setSelectedId] = useState("nyc");
  const [insightOpen, setInsightOpen] = useState(false);
  const [planExecuted, setPlanExecuted] = useState(false);
  const [activeTool, setActiveTool] = useState<ActiveTool>("idle");
  const [sessionEvent, setSessionEvent] = useState("NYC account selected. Watch the warning, then run insight or execute the rescue flow.");

  useEffect(() => {
    if (!playing) return undefined;
    const timer = window.setInterval(() => {
      setDayIndex((current) => (current >= days.length - 1 ? 0 : current + 1));
    }, 1150);
    return () => window.clearInterval(timer);
  }, [playing]);

  const accountViews = useMemo(() => {
    return accounts.map((account) => {
      const rawBalance = account.series[dayIndex] ?? account.series[0];
      const rescue = planExecuted && account.id === "nyc" ? 740_000 : 0;
      const balance = rawBalance + rescue;
      return {
        ...account,
        balance,
        state: stateFor(balance, account.minimum),
      };
    });
  }, [dayIndex, planExecuted]);

  const selected = accountViews.find((account) => account.id === selectedId) ?? accountViews[2];
  const nyc = accountViews.find((account) => account.id === "nyc") ?? accountViews[2];
  const activeFlows = nyc.state === "healthy" && !planExecuted ? [] : rescueFlows;
  const healthScore = Math.max(22, Math.round(accountViews.reduce((sum, account) => {
    const ratio = Math.min(account.balance / Math.max(account.minimum, 1), 1.2);
    return sum + ratio;
  }, 0) / accountViews.length * 82));
  const warningCount = accountViews.filter((account) => account.state !== "healthy").length;
  const selectedInbound = activeFlows
    .filter((flow) => flow.to === selected.id)
    .reduce((sum, flow) => sum + flow.amount, 0);
  const selectedOutbound = activeFlows
    .filter((flow) => flow.from === selected.id)
    .reduce((sum, flow) => sum + flow.amount, 0);
  const runway = Math.max(0, Math.round((selected.balance - selected.minimum) / Math.max(selected.minimum / 7, 1)));

  const resetDemo = () => {
    setDayIndex(2);
    setPlaying(false);
    setSelectedId("nyc");
    setPlanExecuted(false);
    setInsightOpen(false);
    setActiveTool("reset");
    setSessionEvent("Demo reset to Today: NYC is back below minimum and waiting for an action.");
  };

  const startDemo = () => {
    setDayIndex(0);
    setPlanExecuted(false);
    setInsightOpen(false);
    setSelectedId("nyc");
    setPlaying(true);
    setActiveTool("playback");
    setSessionEvent("Replay started: balances will move across the forecast clock every second.");
  };

  const selectAccount = (account: DemoAccount & { balance: number; state: AccountState }) => {
    setSelectedId(account.id);
    setSessionEvent(`${account.city} selected: ${formatMoney(account.balance, account.currency)} available against ${formatMoney(account.minimum, account.currency)} minimum.`);
  };

  const openOptimizer = () => {
    setSelectedId("nyc");
    setInsightOpen(true);
    setActiveTool("optimizer");
    setSessionEvent("Optimizer generated a rescue sequence: Fedwire first, SWIFT cover second, Singapore as Asia buffer.");
  };

  const openTransferDraft = () => {
    setDayIndex(2);
    setSelectedId("nyc");
    setPlanExecuted(false);
    setPlaying(false);
    setActiveTool("transfer");
    setSessionEvent("Transfer draft staged: active rails and ETA labels are visible on the map.");
  };

  const triggerCrisis = () => {
    setDayIndex(4);
    setSelectedId("nyc");
    setPlanExecuted(false);
    setPlaying(false);
    setInsightOpen(true);
    setActiveTool("crisis");
    setSessionEvent("Crisis mode: NYC falls into critical range after seasonal payroll pressure.");
  };

  const toggleInsight = () => {
    setInsightOpen((open) => !open);
    setActiveTool("optimizer");
    setSessionEvent(insightOpen ? "AI insight closed. The alert remains active until the plan is executed." : "AI insight opened: the model explains the rail choice and banking-day delay.");
  };

  const executePlan = () => {
    setPlanExecuted(true);
    setSelectedId("nyc");
    setPlaying(false);
    setActiveTool("executed");
    setSessionEvent("Plan executed: NYC receives rescue liquidity and the alert turns into a resolved state.");
  };

  const togglePlayback = () => {
    setPlaying((current) => {
      const next = !current;
      setActiveTool("playback");
      setSessionEvent(next ? "Timeline playback resumed: balances will continue moving through forecast days." : "Timeline playback paused on the current banking-day state.");
      return next;
    });
  };

  const jumpToDay = (index: number) => {
    const day = days[index];
    setDayIndex(index);
    setPlaying(false);
    setActiveTool("playback");
    setSessionEvent(`Clock moved to ${day.label}: ${day.caption} state is now loaded across accounts, alerts, and map flows.`);
  };

  return (
    <main className="live-demo-page" id="main-content">
      <DemoNav mode="replay" statusText="Realtime simulation" />

      <section className="sight-topbar" aria-label="Demo controls">
        <div className="sight-command-copy">
          <p className="eyebrow">Realtime Simulation Room</p>
          <h1>Watch liquidity move before the decision breaks</h1>
          <p>Scrub the forecast clock, trigger crisis mode, and execute a rescue plan while the map shows cash moving through rails in real time.</p>
        </div>
        <div className="sight-control-card">
          <div className="sight-health">
            <span style={{ "--score": `${healthScore}%` } as React.CSSProperties} />
            <strong>{healthScore}</strong>
            <small>/ 100 liquidity health</small>
          </div>
          <div className="sight-control-stats">
            <div><span>Warnings</span><strong>{warningCount}</strong></div>
            <div><span>Active flows</span><strong>{activeFlows.length}</strong></div>
            <div><span>Clock</span><strong>{days[dayIndex].label}</strong></div>
          </div>
          <div className="sight-command-row">
            <button className={activeTool === "optimizer" ? "sight-action sight-action--active" : "sight-action"} onClick={openOptimizer} type="button">Optimizer</button>
            <button className={activeTool === "transfer" ? "sight-action sight-action--active" : "sight-action"} onClick={openTransferDraft} type="button">Transfer</button>
            <button className={activeTool === "crisis" ? "sight-action sight-action--danger sight-action--active" : "sight-action sight-action--danger"} onClick={triggerCrisis} type="button">
              Crisis Mode
            </button>
            <button className={activeTool === "playback" ? "sight-action sight-action--primary sight-action--active" : "sight-action sight-action--primary"} onClick={startDemo} type="button">Start</button>
            <button className={activeTool === "reset" ? "sight-action sight-action--active" : "sight-action"} onClick={resetDemo} type="button">Reset</button>
          </div>
          <div className={`sight-session-event sight-session-event--${activeTool}`} role="status">
            <span>Session event</span>
            <strong>{sessionEvent}</strong>
          </div>
        </div>
      </section>

      <section className="sight-dashboard" id="demo-dashboard" aria-label="Realtime liquidity dashboard">
        <aside className="sight-accounts" aria-label="Accounts">
          <div className="sight-panel-heading">
            <span>Accounts · {accountViews.length}</span>
            <strong>{warningCount} warning</strong>
          </div>
          <div className="sight-account-list">
            {accountViews.map((account) => (
              <button
                className={account.id === selected.id ? `sight-account sight-account--active sight-account--${account.state}` : `sight-account sight-account--${account.state}`}
                key={account.id}
                onClick={() => selectAccount(account)}
                aria-pressed={account.id === selected.id}
                type="button"
              >
                <span>{account.currency} · {account.city}</span>
                <small>{account.bank}</small>
                <strong>{formatMoney(account.balance, account.currency)}</strong>
                <div className="sight-account__activity">
                  <b>{account.state === "healthy" ? "Healthy" : account.state === "warning" ? "Watch" : "Critical"}</b>
                  <em>Min · {formatMoney(account.minimum, account.currency)}</em>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="sight-map-panel" aria-label="Live network map">
          <div className="sight-panel-heading">
            <span>Live Network</span>
            <strong>{activeFlows.length} flows</strong>
          </div>
          <LiveNetworkMap
            accounts={accountViews}
            flows={activeFlows}
            selected={selected}
            selectedInbound={selectedInbound}
            selectedOutbound={selectedOutbound}
            selectedId={selected.id}
            onSelect={(id) => {
              const account = accountViews.find((item) => item.id === id);
              if (account) selectAccount(account);
            }}
          />
          <div className="sight-map-footer">
            <span>{accountViews.length} accounts</span>
            <span>ETA · banking days · rails</span>
          </div>
        </section>

        <aside className="sight-alerts" aria-label="Alerts">
          <div className="sight-panel-heading">
            <span>Alerts</span>
            <strong>{warningCount}</strong>
          </div>
          <article className={`sight-alert sight-alert--${nyc.state}`}>
            <span>{nyc.state === "healthy" ? "Resolved" : "Warning"}</span>
            <h2>{nyc.state === "healthy" ? "NovaPay USD · NYC restored above minimum" : "NovaPay USD · NYC projected below minimum"}</h2>
            <p>
              Balance is projected at {formatMoney(nyc.balance, "USD")} on {days[dayIndex].label}.
              Minimum is {formatMoney(nyc.minimum, "USD")}.
            </p>
            <dl>
              <div>
                <dt>Predicted</dt>
                <dd>{days[dayIndex].caption}</dd>
              </div>
              <div>
                <dt>Confidence</dt>
                <dd>88%</dd>
              </div>
            </dl>
            <button className={insightOpen ? "sight-action sight-action--active" : "sight-action"} onClick={toggleInsight} type="button">
              {insightOpen ? "Hide AI Insight" : "Get AI Insight"}
            </button>
            {insightOpen ? (
              <p className="sight-insight">
                The engine recommends a staged rescue: Fedwire from SF first, SWIFT cover from Frankfurt second, London only as buffer.
              </p>
            ) : null}
            <button className="sight-action sight-action--primary" onClick={executePlan} type="button">
              {planExecuted ? "Plan Executed" : "Execute Plan"}
            </button>
          </article>

          <article className="sight-selected">
            <span>Selected account</span>
            <h3>{selected.city} · {selected.bank}</h3>
            <strong>{formatMoney(selected.balance, selected.currency)}</strong>
            <p>{selected.country} / minimum {formatMoney(selected.minimum, selected.currency)} / runway {runway} days</p>
          </article>
        </aside>
      </section>

      <section className="sight-calendar-board" id="evidence" aria-label="Banking days and seasonality">
        <div>
          <p className="eyebrow">Calendar pressure</p>
          <h2>Banking days change when cash is usable</h2>
          <p>Demo clock combines cut-off windows, weekends, and seasonal payout pressure before it recommends rescue flow.</p>
        </div>
        <div className="sight-calendar-days">
          {calendarDays.map((day) => (
            <div className={`sight-calendar-day sight-calendar-day--${day.state}`} key={`${day.label}-${day.market}`}>
              <span>{day.label}</span>
              <strong>{day.market}</strong>
              <small>{day.note}</small>
              <em>{day.detail}</em>
            </div>
          ))}
        </div>
        <div className="sight-seasonality">
          <span>Seasonality load</span>
          <strong>month-end + payroll</strong>
          <div>
            {seasonalityBars.map((bar) => (
              <label key={bar.label}>
                <i style={{ height: bar.height }} />
                <b>{bar.value}</b>
                <small>{bar.label}</small>
              </label>
            ))}
          </div>
        </div>
        <div className="sight-calendar-metrics">
          {calendarMetrics.map((metric) => (
            <article key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <small>{metric.note}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="sight-time-machine" aria-label="Time machine">
        <div>
          <button className="sight-play" onClick={togglePlayback} type="button">
            {playing ? "Pause" : "Play"}
          </button>
          <button className="sight-play" onClick={resetDemo} type="button">Reset Today</button>
        </div>
        <div className="sight-timeline">
          {days.map((day, index) => (
            <button
              className={index === dayIndex ? "sight-time-dot sight-time-dot--active" : "sight-time-dot"}
              key={day.label}
              onClick={() => jumpToDay(index)}
              aria-label={`Set forecast clock to ${day.label}`}
              type="button"
            >
              <span>{day.label}</span>
            </button>
          ))}
        </div>
        <strong>{days[dayIndex].caption} · {warningCount} warning</strong>
      </section>

      <div className={`sight-live-toast sight-live-toast--${activeTool}`} role="status" aria-live="polite">
        <span>Last action</span>
        <strong>{sessionEvent}</strong>
      </div>
    </main>
  );
}

function LiveNetworkMap({
  accounts,
  flows,
  selected,
  selectedInbound,
  selectedOutbound,
  selectedId,
  onSelect,
}: {
  accounts: Array<DemoAccount & { balance: number; state: AccountState }>;
  flows: DemoFlow[];
  selected: DemoAccount & { balance: number; state: AccountState };
  selectedInbound: number;
  selectedOutbound: number;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="sight-map-frame">
      <svg className="sight-world" viewBox="0 0 1000 560" aria-hidden="true">
        <rect width="1000" height="560" rx="28" />
        <path className="sight-graticule" d="M 80 280 H 920 M 500 18 V 542 M 176 145 C 350 230 650 230 824 145 M 176 415 C 350 330 650 330 824 415 M 230 80 C 165 210 165 350 230 480 M 770 80 C 835 210 835 350 770 480" />
        {flows.map((flow, index) => {
          const from = accounts.find((account) => account.id === flow.from);
          const to = accounts.find((account) => account.id === flow.to);
          if (!from || !to) return null;
          const startX = from.x * 10;
          const startY = from.y * 5.6;
          const endX = to.x * 10;
          const endY = to.y * 5.6;
          const controlX = (startX + endX) / 2;
          const controlY = Math.min(startY, endY) - 72 - index * 20;
          const pathId = `sight-flow-${flow.from}-${flow.to}-${flow.rail}`;
          return (
            <g className={`sight-flow sight-flow--${flow.state}`} key={`${flow.from}-${flow.to}-${flow.rail}`}>
              <path id={pathId} d={`M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`} />
              <circle className="sight-money-pulse" r="5">
                <animateMotion dur={flow.state === "warning" ? "3.2s" : "2.4s"} repeatCount="indefinite">
                  <mpath href={`#${pathId}`} />
                </animateMotion>
              </circle>
              <text x={controlX} y={controlY - 8}>{flow.rail}</text>
              <text className="sight-flow-eta" x={controlX} y={controlY + 14}>{flow.eta}</text>
            </g>
          );
        })}
      </svg>
      {accounts.filter((account) => ["nyc", "sf", "frankfurt", "riyadh", "singapore"].includes(account.id)).map((account) => (
        <button
          className={account.id === selectedId ? `sight-map-node sight-map-node--active sight-map-node--${account.state} sight-map-node--${account.id}` : `sight-map-node sight-map-node--${account.state} sight-map-node--${account.id}`}
          key={account.id}
          onClick={() => onSelect(account.id)}
          aria-pressed={account.id === selectedId}
          style={{ left: `${account.x}%`, top: `${account.y}%` }}
          type="button"
        >
          <i />
          <span>{account.currency} {account.city}</span>
        </button>
      ))}
      <div className={`sight-map-popover sight-map-popover--${selected.state}`}>
        <div>
          <span>{selected.currency} · {selected.city}</span>
          <em>{selected.state === "healthy" ? "Healthy" : selected.state === "warning" ? "Watch" : "Critical"}</em>
        </div>
        <strong>{formatMoney(selected.balance, selected.currency)}</strong>
        <small>{selected.bank} / min {formatMoney(selected.minimum, selected.currency)}</small>
        <p>↙ {formatMoney(selectedInbound, selected.currency)} / ↗ {formatMoney(selectedOutbound, selected.currency)}</p>
      </div>
      <div className="sight-map-notices">
        <span>NY cut-off creates T+1 liquidity</span>
        <span>Seasonal buffer raised 18%</span>
      </div>
    </div>
  );
}

function stateFor(balance: number, minimum: number): AccountState {
  if (balance < minimum * 0.72) return "critical";
  if (balance < minimum) return "warning";
  return "healthy";
}

function formatMoney(value: number, currency: Currency) {
  return new Intl.NumberFormat("en-US", {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}
