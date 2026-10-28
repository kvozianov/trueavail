import type { Metadata } from "next";
import { BacktestView } from "./BacktestView";

export const metadata: Metadata = {
  title: "Backtest",
  description: "Rolling-origin backtest of the quantile ML ensemble against a seasonal-naive baseline: pinball loss and 90 % interval coverage by horizon, with the weak spots.",
};

export default function Page() {
  return <BacktestView />;
}
