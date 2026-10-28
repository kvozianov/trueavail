import { dayMonth, money } from "@/lib/format";
import type { ScheduledFlow } from "@/lib/types";

/** Backend driver string: "payout-2026-05-19: outflow 4,100,000 EUR on 2026-05-19 (merchant payout) [account]". */
const RE = /^(\S+): (inflow|outflow) ([\d,.]+) ([A-Z]{3}) on (\d{4}-\d{2}-\d{2}) \((.*)\)/;

export interface Driver {
  key: string;
  direction: "inflow" | "outflow" | null;
  text: string;
}

export function parseDriver(raw: string, flows: Map<string, ScheduledFlow>, withDate = true): Driver {
  const m = RE.exec(raw);
  if (!m) return { key: raw, direction: null, text: raw };
  const [, id, dir, amount, ccy, date, desc] = m;
  const flow = flows.get(id);
  const parts = [`${money(Number(amount.replace(/,/g, "")), ccy)} ${desc}`];
  if (flow?.rail) parts.push(flow.rail);
  if (withDate) parts.push(dayMonth(date));
  return { key: id, direction: dir as "inflow" | "outflow", text: parts.join(" · ") };
}
