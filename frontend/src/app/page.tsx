import type { Metadata } from "next";
import { GlobeStatic } from "@/components/globe/GlobeStatic";
import { LandingView } from "./LandingView";

export const metadata: Metadata = {
  title: { absolute: "TrueAvail · See the cash gap before it happens" },
  description:
    "A quantile ML ensemble (LightGBM, gradient boosting, EWMA baseline) forecasts 14-day P5/P50/P95 balance corridors per account and flags cash gaps. Synthetic data, results precomputed by the backend.",
};

export default function Page() {
  return <LandingView globeFallback={<GlobeStatic />} />;
}
