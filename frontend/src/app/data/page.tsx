import type { Metadata } from "next";
import { DEMO } from "@/lib/api";
import { DataView, DemoDataView } from "./DataView";

export const metadata: Metadata = { title: "Data" };

export default function Page() {
  return DEMO ? <DemoDataView /> : <DataView />;
}
