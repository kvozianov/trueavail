import { ConditionDetailsView } from "@/components/liquidity/ConditionDetailsView";
import { conditionAccountIds } from "@/lib/account-condition-details";

export function generateStaticParams() {
  return conditionAccountIds.map((accountId) => ({ accountId }));
}

export default async function AccountConditionDetailsPage({ params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await params;

  return <ConditionDetailsView accountId={accountId} />;
}
