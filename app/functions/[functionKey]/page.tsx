import { notFound } from "next/navigation";
import { FunctionDetailView } from "@/components/liquidity/FunctionDetailView";
import { functionKeys, isFunctionKey } from "@/lib/function-modules";

export function generateStaticParams() {
  return functionKeys.map((functionKey) => ({ functionKey }));
}

export default async function FunctionPage({ params }: { params: Promise<{ functionKey: string }> }) {
  const { functionKey } = await params;

  if (!isFunctionKey(functionKey)) {
    notFound();
  }

  return <FunctionDetailView functionKey={functionKey} />;
}
