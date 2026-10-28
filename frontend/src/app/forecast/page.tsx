import type { Metadata } from "next";
import { Suspense } from "react";
import { ForecastView } from "./ForecastView";

export const metadata: Metadata = {
  title: "Forecast",
  description: "Per-account 14-day P5/P50/P95 balance corridors, cash-gap alerts and the model behind them. Synthetic data, precomputed in the demo.",
};

export default function Page() {
  return (
    <Suspense>
      <ForecastView />
    </Suspense>
  );
}
