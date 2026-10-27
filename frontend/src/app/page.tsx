import type { Metadata } from "next";
import { DashboardView } from "./DashboardView";

export const metadata: Metadata = { title: { absolute: "Dashboard · TrueAvail" } };

export default function Page() {
  return <DashboardView />;
}
