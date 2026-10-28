import Link from "next/link";
import { Bars } from "@/components/charts/Bars";
import { COMPONENT_COLOR, COMPONENT_LABEL } from "@/lib/derive";
import { num } from "@/lib/format";
import type { ForecastResponse } from "@/lib/types";

export function ModelCard({ forecast }: { forecast: ForecastResponse }) {
  const { model, feature_quality: fq } = forecast;
  const weights = Object.entries(model.weights).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...weights.map(([, w]) => w), 1e-9);
  return (
    <section className="card min-w-0 p-5 sm:p-6" aria-labelledby="model-title">
      <h2 id="model-title" className="t-h4">
        Model
      </h2>
      <p className="t-small mt-0.5">
        {model.type} · {forecast.quantiles.map((q) => `P${Math.round(q * 100)}`).join(" / ")} ·{" "}
        {model.available ? <span className="text-good">trained model in use</span> : <span className="text-warn">EWMA fallback in use</span>}
      </p>
      {model.fallback_reason && <p className="mt-3 rounded-2 bg-warn-tint px-3 py-2 text-[13px] text-warn">Trained model unavailable — {model.fallback_reason}</p>}
      <Bars
        className="mt-5"
        labelWidth="7.5rem"
        trackWidth="minmax(60px,1fr)"
        rows={weights.map(([k, w]) => ({
          key: k,
          label: COMPONENT_LABEL[k] ?? k,
          value: w,
          share: w / max,
          color: COMPONENT_COLOR[k] ?? "var(--ink-3)",
          display: num(w, 2),
          mono: true,
        }))}
      />
      <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-hairline pt-4">
        {(
          [
            [fq.rows_trainable, "trainable rows"],
            [fq.anomaly_rows, "anomaly rows"],
            [fq.known_event_rows, "known-event rows"],
          ] as const
        ).map(([v, k]) => (
          <div key={k}>
            <dd className="font-display text-[22px] font-semibold leading-none text-ink tnum">{num(v)}</dd>
            <dt className="t-small mt-1.5">{k}</dt>
          </div>
        ))}
      </dl>
      <Link href="/#model-room" className="link mt-5 inline-block text-[13.5px] font-medium">
        Open the model room →
      </Link>
    </section>
  );
}
