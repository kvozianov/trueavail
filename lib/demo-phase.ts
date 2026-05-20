export type DemoSearchParams = Promise<Record<string, string | string[] | undefined>>;
export type DecisionPhase = "pending" | "breached" | "rejected";

export async function phaseFromSearchParams(searchParams?: DemoSearchParams): Promise<DecisionPhase> {
  const params = await searchParams;
  const value = Array.isArray(params?.phase) ? params?.phase[0] : params?.phase;
  if (value === "breached" || value === "rejected") {
    return value;
  }
  return "pending";
}
