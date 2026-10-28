import { DEMO } from "@/lib/api";
import type { Account, ForecastResponse, ScheduledFlow } from "@/lib/types";
import landJson from "world-atlas/land-110m.json";
// Demo: the baked fallback already shows the real nodes and arcs (precomputed backend output).
import accountsJson from "../../../public/demo/accounts.json";
import forecastJson from "../../../public/demo/forecast.json";
import scheduledJson from "../../../public/demo/scheduled.json";
import { GlobeSvg } from "./GlobeSvg";
import { HOME, basePaths, landFeatures, projection, type LandTopology } from "./geometry";
import { buildGlobeModel } from "./model";

/** Server-rendered globe (no JS): the LCP element and the reduced-motion / no-JS fallback. */
export function GlobeStatic({ renderSize = 580 }: { renderSize?: number }) {
  const proj = projection(HOME);
  const paths = basePaths(proj, landFeatures(landJson as unknown as LandTopology));
  const model = DEMO
    ? buildGlobeModel(accountsJson as Account[], scheduledJson as ScheduledFlow[], forecastJson as unknown as ForecastResponse)
    : { nodes: [], arcs: [] };
  return <GlobeSvg proj={proj} paths={paths} nodes={model.nodes} arcs={model.arcs} renderSize={renderSize} label="Globe with the accounts at illustrative locations" />;
}
