import { DemoCockpit } from "@/components/liquidity/DemoCockpit";
import { phaseFromSearchParams, type DemoSearchParams } from "@/lib/demo-phase";

export default async function Home({ searchParams }: { searchParams?: DemoSearchParams }) {
  const phase = await phaseFromSearchParams(searchParams);

  return <DemoCockpit initialPhase={phase} />;
}
