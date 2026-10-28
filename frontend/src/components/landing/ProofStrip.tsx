import { pctValue, ratio, num } from "@/lib/format";
import type { BacktestResponse } from "@/lib/types";

/** Slow marquee of the evidence + stack line. Static under reduced motion, pauses on hover. */
export function ProofStrip({ bt }: { bt: BacktestResponse | null }) {
  const items = bt
    ? [
        `Backtest ${pctValue(bt.summary.improvement_pct)} lower pinball loss`,
        `${bt.folds} folds`,
        `${num(bt.rows_evaluated)} scored points`,
        `coverage ${ratio(bt.summary.mean_coverage_90)} / ${ratio(bt.summary.target_coverage, 2)}`,
        "LightGBM + GBDT + EWMA",
        "FastAPI",
        "PostgreSQL",
        "Next.js",
      ]
    : ["LightGBM + GBDT + EWMA", "FastAPI", "PostgreSQL", "Next.js"];
  const line = items.join("  ·  ");
  return (
    <div className="marquee overflow-hidden border-y border-hairline bg-bg-2" aria-label={line}>
      <div className="marquee-track flex w-max py-[26px]">
        {[0, 1].map((k) => (
          <p key={k} aria-hidden className="eyebrow whitespace-pre px-6 !text-ink-2">
            {line}
            {"  ·  "}
          </p>
        ))}
      </div>
    </div>
  );
}
