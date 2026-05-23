import { DemoCockpit } from "@/components/liquidity/DemoCockpit";
import { phaseFromSearchParams, type DemoSearchParams } from "@/lib/demo-phase";

export default async function DemoPage({ searchParams }: { searchParams?: DemoSearchParams }) {
  const phase = await phaseFromSearchParams(searchParams);

  return <DemoCockpit initialPhase={phase} />;
}
