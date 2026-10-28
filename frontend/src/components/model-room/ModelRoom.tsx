"use client";

import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useWidth } from "@/components/charts/scales";
import { Button, Segmented, SectionEyebrow } from "@/components/ui";
import { COMPONENT_SHORT } from "@/lib/derive";
import { dayMonth, money, num, pctValue, shortAccount, shortDate } from "@/lib/format";
import type { Account, Alert, ExplainResponse, HistoryRow, ScheduledFlow } from "@/lib/types";
import { useMedia } from "@/lib/useMedia";
import { ML_COMPONENTS, roomFacts, type RoomFacts } from "./facts";
import { ChartFrame, FeaturesFrame, ImportanceFrame, ObservationsFrame } from "./frames";

interface Step {
  id: string;
  counter: string;
  title: string;
  body: ReactNode;
}

const B = ({ children }: { children: ReactNode }) => <strong className="font-semibold text-ink">{children}</strong>;

function buildSteps(f: RoomFacts, explain: ExplainResponse): Step[] {
  const ccy = f.series.currency;
  const w = f.weights;
  const fi = explain.feature_importance.features;
  const groupShare = (g: string) => fi.filter((x) => x.group === g).reduce((s, x) => s + x.share, 0);
  const zero = fi.filter((x) => x.gain === 0);
  const top = fi[0];
  const t = (k: string) => f.trees[k];
  return [
    {
      id: "observations",
      counter: "Step 01",
      title: `${num(f.rows)} daily observations`,
      body: (
        <>
          {f.days} days × {f.accounts} accounts. Each row is a balance and a net flow. <B>{f.anomalies}</B> rows are flagged as anomalies, <B>{num(f.trainable)}</B>{" "}
          remain trainable after the lags and the anomaly filter.
        </>
      ),
    },
    {
      id: "features",
      counter: "Step 02",
      title: "Engineered features",
      body: (
        <>
          <B>{f.features}</B> features per account-day: the calendar, net-flow lags of 1, 2 and 7 days, a 7-day mean and volatility, an EWMA and an anomaly score. Scheduled
          payments are placed on their settlement date per payment rail.
        </>
      ),
    },
    {
      id: "models",
      counter: "Step 03",
      title: "Three models, three corridors",
      body: (
        <>
          LightGBM{t("lightgbm_quantile") ? ` (${t("lightgbm_quantile")} trees)` : ""}, gradient boosting{t("sklearn_gbdt_quantile") ? ` (${t("sklearn_gbdt_quantile")} trees)` : ""} and
          an EWMA volatility baseline each draw their own P5–P95. On day 1 their P5 values agree within <B>{money(f.day1Spread, ccy)}</B>
          {f.firstGap ? ": the gap is not one model's artefact." : "."} {COMPONENT_SHORT[f.widest]} has the widest corridor by day {f.series.dates.length}.
        </>
      ),
    },
    {
      id: "blend",
      counter: "Step 04",
      title: "Weighted quantile blend",
      body: (
        <>
          The three corridors collapse into one:{" "}
          {ML_COMPONENTS.filter((c) => w[c] != null).map((c, i, a) => (
            <span key={c}>
              <B>{num(w[c], 2)}</B> × {COMPONENT_SHORT[c]}
              {i < a.length - 1 ? " + " : ""}
            </span>
          ))}
          , quantile by quantile. The start balance and the scheduled flows are added day by day.
        </>
      ),
    },
    f.firstGap
      ? {
          id: "buffer",
          counter: "Step 05",
          title: "Crosses the buffer",
          body: (
            <>
              P5 falls under the {money(f.series.required_buffer, ccy)} buffer on <B>{shortDate(f.firstGap.date)}</B>: gap <B>{money(f.firstGap.gap, ccy)}</B>.
              {f.laterGaps ? ` ${f.laterGaps.count} more gap ${f.laterGaps.count === 1 ? "day follows" : "days follow"} from ${dayMonth(f.laterGaps.from)}.` : ""}
            </>
          ),
        }
      : {
          id: "buffer",
          counter: "Step 05",
          title: "Stays above the buffer",
          body: (
            <>
              P5 stays above the {money(f.series.required_buffer, ccy)} buffer for all {f.series.dates.length} days — no gap.
            </>
          ),
        },
    f.firstGap
      ? {
          id: "gap",
          counter: "Step 06",
          title: "Gap day lights up",
          body: (
            <>
              {f.driverOut ? (
                <>
                  Driver: the <B>{money(f.driverOut.amount, ccy)}</B> {f.driverOut.description} ({f.driverOut.rail}) leaves on {dayMonth(f.driverOut.effective_date)}
                </>
              ) : (
                <>The corridor itself drifts under the buffer</>
              )}
              {f.lateIn ? (
                <>
                  ; the {money(f.lateIn.amount, ccy)} {f.lateIn.description.split(" from ")[0]} expected on {dayMonth(f.lateIn.expected_date)} lands only on{" "}
                  {dayMonth(f.lateIn.effective_date)}
                </>
              ) : null}
              . The same alert appears on the dashboard.{" "}
              <Link href={`/forecast?account=${encodeURIComponent(f.account.account_id)}`} className="link font-medium">
                Open the forecast →
              </Link>
            </>
          ),
        }
      : {
          id: "gap",
          counter: "Step 06",
          title: "The lowest point",
          body: (
            <>
              The lowest P5 is <B>{money(f.minP05.value, ccy)}</B> on {dayMonth(f.minP05.date)}, {money(f.minP05.value - f.series.required_buffer, ccy)} above the buffer.{" "}
              <Link href={`/forecast?account=${encodeURIComponent(f.account.account_id)}`} className="link font-medium">
                Open the forecast →
              </Link>
            </>
          ),
        },
    {
      id: "importance",
      counter: "Aside",
      title: "What the model looks at",
      body: (
        <>
          {top ? (
            <>
              {top.label} explains <B>{pctValue(top.share * 100)}</B> of the LightGBM P50 split gain; the recent-history features together{" "}
              <B>{pctValue(groupShare("history") * 100, 0)}</B>.{" "}
            </>
          ) : null}
          {zero.length > 0 && (
            <>
              {zero.length} features carry no gain in this run
              {(() => {
                const sched = zero.filter((z) => z.group === "scheduled");
                const other = zero.filter((z) => z.group !== "scheduled").map((z) => z.label.toLowerCase());
                const parts = [...(other.length ? [other.join(", ")] : []), ...(sched.length ? [`${sched.length} scheduled-payment flags`] : [])];
                return parts.length ? ` (${parts.join(" and ")})` : "";
              })()}
              . The scheduled flags are zero in the training history: scheduled payments are added to the corridor directly rather than learned by the trees.
            </>
          )}
        </>
      ),
    },
  ];
}

export function ModelRoom({
  explain,
  history,
  accounts,
  scheduled,
  alerts,
  defaultAccount,
}: {
  explain: ExplainResponse;
  history: HistoryRow[];
  accounts: Account[];
  scheduled: ScheduledFlow[];
  alerts: Alert[];
  defaultAccount: string | null;
}) {
  const reduce = useReducedMotion();
  const desktop = useMedia("(min-width: 1024px)");
  const [accountId, setAccountId] = useState(defaultAccount ?? explain.series[0]?.account_id ?? "");
  const [active, setActive] = useState(0);
  const [nonce, setNonce] = useState(0);
  const [playing, setPlaying] = useState(false);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const playingRef = useRef(false);
  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  const facts = roomFacts(explain, accountId, accounts, scheduled, alerts);
  const steps = facts ? buildSteps(facts, explain) : [];

  // Scroll-driven activation on desktop: the step crossing 45 % of the viewport becomes active.
  useEffect(() => {
    if (!desktop) return;
    const els = stepRefs.current.filter(Boolean) as HTMLDivElement[];
    const io = new IntersectionObserver(
      (entries) => {
        if (playingRef.current) return;
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.step));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [desktop, steps.length]);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setActive((a) => {
        if (a >= steps.length - 1) {
          setPlaying(false);
          return a;
        }
        return a + 1;
      });
    }, 2200);
    return () => window.clearInterval(id);
  }, [playing, steps.length]);

  if (!facts) return null;
  const picker = (
    <Segmented
      label="Account in the model room"
      value={accountId}
      onChange={(v) => {
        setAccountId(v);
        setNonce((n) => n + 1);
      }}
      options={accounts.filter((a) => explain.series.some((s) => s.account_id === a.account_id)).map((a) => ({ value: a.account_id, label: shortAccount(a) }))}
    />
  );
  const goto = (i: number) => {
    setPlaying(false);
    setActive(i);
    setNonce((n) => n + 1);
    if (desktop) stepRefs.current[i]?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  };
  const controls = (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="secondary" icon={<RotateCcw size={16} strokeWidth={1.75} aria-hidden />} onClick={() => setNonce((n) => n + 1)}>
        Replay
      </Button>
      {!reduce && (
        <Button
          size="sm"
          variant="secondary"
          aria-pressed={playing}
          icon={playing ? <Pause size={16} strokeWidth={1.75} aria-hidden /> : <Play size={16} strokeWidth={1.75} aria-hidden />}
          onClick={() => {
            if (playing) return setPlaying(false);
            setActive(0);
            setNonce((n) => n + 1);
            setPlaying(true);
          }}
        >
          {playing ? "Pause" : "Play all"}
        </Button>
      )}
    </div>
  );

  return (
    <section id="model-room" aria-labelledby="mr-title" className="scroll-mt-28 py-16 sm:py-20">
      <div className="container-page">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <SectionEyebrow>
              Model room · {facts.account.bank_name.replace(/\s+Bank$/i, "")} {facts.account.label}
            </SectionEyebrow>
            <h2 id="mr-title" className="t-h2 mt-3">
              Six steps from {num(facts.rows)} observations to {facts.firstGap ? "one cash gap." : "a corridor that clears the buffer."}
            </h2>
            <p className="t-small mt-3 max-w-lg">
              A quantile ML ensemble, not a black box: every frame below is drawn from the backend&apos;s own output for this account (
              <code className="mono text-[12px]">/api/forecast/explain</code>).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {picker}
            {controls}
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <div className="lg:sticky lg:top-28">
              <Stage facts={facts} explain={explain} history={history} accounts={accounts} active={active} nonce={nonce} desktop={desktop} />
              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5" role="tablist" aria-label="Model room steps">
                  {steps.map((s, i) => (
                    <button
                      key={s.id}
                      type="button"
                      role="tab"
                      aria-selected={i === active}
                      aria-label={`${s.counter}: ${s.title}`}
                      onClick={() => goto(i)}
                      className="flex h-11 w-6 items-center justify-center rounded-full focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] lg:h-6"
                    >
                      <span className={`h-2 rounded-full transition-all duration-200 ${i === active ? "w-5 bg-accent" : i < active ? "w-2 bg-ink-4" : "w-2 bg-hairline-2"}`} />
                    </button>
                  ))}
                </div>
                {!desktop && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" aria-label="Previous step" disabled={active === 0} onClick={() => goto(active - 1)} icon={<ChevronLeft size={16} aria-hidden />} />
                    <Button size="sm" variant="secondary" aria-label="Next step" disabled={active === steps.length - 1} onClick={() => goto(active + 1)} icon={<ChevronRight size={16} aria-hidden />} />
                  </div>
                )}
              </div>
              {!desktop && (
                <div className="mt-4" aria-live="polite">
                  <StepText step={steps[active]} active />
                </div>
              )}
            </div>
          </div>
          {desktop && (
            <div className="lg:col-span-5">
              {steps.map((s, i) => (
                <div
                  key={s.id}
                  ref={(el) => {
                    stepRefs.current[i] = el;
                  }}
                  data-step={i}
                  className="flex min-h-[60vh] items-center first:min-h-[46vh] first:items-start last:min-h-[70vh]"
                >
                  <StepText step={s} active={i === active} onClick={() => goto(i)} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function StepText({ step, active, onClick }: { step: Step; active: boolean; onClick?: () => void }) {
  return (
    <div className={`transition-opacity duration-300 ${active ? "opacity-100" : "opacity-40"}`}>
      <button type="button" onClick={onClick} disabled={!onClick} className="group flex items-center gap-3 text-left disabled:cursor-default">
        <span className="eyebrow !text-accent">{step.counter}</span>
        <span aria-hidden className="h-px w-8 bg-hairline-2" />
        <span className="text-[15px] font-semibold text-ink group-enabled:group-hover:underline">{step.title}</span>
      </button>
      <p className="mt-3 max-w-[46ch] text-[13.5px] leading-relaxed text-ink-2">{step.body}</p>
    </div>
  );
}

function Stage({
  facts,
  explain,
  history,
  accounts,
  active,
  nonce,
  desktop,
}: {
  facts: RoomFacts;
  explain: ExplainResponse;
  history: HistoryRow[];
  accounts: Account[];
  active: number;
  nonce: number;
  desktop: boolean;
}) {
  const reduce = useReducedMotion();
  const [ref, width] = useWidth<HTMLDivElement>(680);
  const height = desktop ? 420 : 300;
  const kind = active === 0 ? "obs" : active === 1 ? "features" : active === 6 ? "importance" : "chart";
  const key = `${kind}-${facts.account.account_id}`;
  const inner = `${active}-${nonce}-${facts.account.account_id}`;
  return (
    <div ref={ref} className="card relative overflow-hidden !rounded-4" style={{ height }} aria-label={`Model room stage, ${["observations", "features", "three corridors", "weighted blend", "buffer", "gap day", "feature importance"][active]}`} role="img">
      <AnimatePresence initial={false}>
        <m.div
          key={key}
          className="absolute inset-0"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? undefined : { opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.3 }}
        >
          <div key={inner} className="h-full">
            {kind === "obs" && <ObservationsFrame width={width} height={height} history={history} accounts={accounts} explain={explain} />}
            {kind === "features" && <FeaturesFrame explain={explain} facts={facts} />}
            {kind === "chart" && <ChartFrame width={width} height={height} phase={active as 2 | 3 | 4 | 5} facts={facts} />}
            {kind === "importance" && <ImportanceFrame explain={explain} />}
          </div>
        </m.div>
      </AnimatePresence>
    </div>
  );
}
