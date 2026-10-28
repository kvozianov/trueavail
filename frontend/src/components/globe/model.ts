import { counterpartyFor, cityFor, type City } from "@/lib/geo";
import { MINUS, money, shortDate } from "@/lib/format";
import type { Account, ForecastResponse, ScheduledFlow } from "@/lib/types";

export interface GlobeNode {
  id: string;
  city: City;
  account: string;
  currency: string;
  gap: string | null;
  stat: string;
}

export interface GlobeFlow {
  id: string;
  from: City;
  to: City;
  title: string;
}

/** Nodes (one per account, illustrative city) and arcs (one per scheduled flow in the window). */
export function buildGlobeModel(accounts: Account[], flows: ScheduledFlow[], forecast: ForecastResponse | null) {
  const cities = cityFor(accounts);
  const nodes: GlobeNode[] = accounts.map((a) => {
    const pts = (forecast?.points ?? []).filter((p) => p.account_id === a.account_id);
    const first = pts.find((p) => p.breach) ?? null;
    const min = pts.reduce<(typeof pts)[number] | null>((m, p) => (!m || p.balance_p05 < m.balance_p05 ? p : m), null);
    return {
      id: a.account_id,
      city: cities.get(a.account_id)!,
      account: `${a.bank_name.replace(/\s+Bank$/i, "")} ${a.label}`,
      currency: a.currency,
      gap: first ? `Gap ${MINUS}${money(first.required_buffer - first.balance_p05, a.currency)} · ${shortDate(first.date)}` : null,
      stat: first
        ? `${money(a.settled_balance, a.currency)} · P5 ${money(first.balance_p05, a.currency)}`
        : `${money(a.settled_balance, a.currency)} · min P5 ${min ? money(min.balance_p05, a.currency) : "—"} · ${pts.length} days clear`,
    };
  });
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const perRail = new Map<string, number>();
  const window = forecast ? flows.filter((f) => f.effective_date > forecast.as_of) : flows;
  const arcs: GlobeFlow[] = window.flatMap((f) => {
    const node = byId.get(f.account_id);
    if (!node) return [];
    const i = perRail.get(f.rail) ?? 0;
    perRail.set(f.rail, i + 1);
    const other = counterpartyFor(f.rail, i, node.city);
    const inflow = f.direction === "inflow";
    return [
      {
        id: f.flow_id,
        from: inflow ? other : node.city,
        to: inflow ? node.city : other,
        title: `${inflow ? "▲" : "▼"} ${money(f.amount, f.currency)} ${f.description} · ${f.rail} · ${shortDate(f.effective_date)}`,
      },
    ];
  });
  return { nodes, arcs, gapId: nodes.find((n) => n.gap)?.id ?? null };
}
