import type { Metadata } from "next";
import { BacktestView } from "./BacktestView";

export const metadata: Metadata = { title: "Backtest" };

export default function Page() {
  return <BacktestView />;
}
