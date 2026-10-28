import type { Metadata } from "next";
import { DEMO } from "@/lib/api";
import { DataView, DemoDataView } from "./DataView";

export const metadata: Metadata = {
  title: "Data",
  description: "The synthetic dataset behind TrueAvail, the CSV format and the sample files.",
};

export default function Page() {
  return DEMO ? <DemoDataView /> : <DataView />;
}
