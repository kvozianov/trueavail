import type { Metadata } from "next";
import { DEMO } from "@/lib/api";
import { DemoScenariosView } from "./DemoScenariosView";
import { WhatIfView } from "./WhatIfView";

export const metadata: Metadata = { title: "What-if" };

export default function Page() {
  return DEMO ? <DemoScenariosView /> : <WhatIfView />;
}
