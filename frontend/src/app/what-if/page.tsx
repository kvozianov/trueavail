import type { Metadata } from "next";
import { DEMO } from "@/lib/api";
import { DemoScenariosView } from "./DemoScenariosView";
import { WhatIfView } from "./WhatIfView";

export const metadata: Metadata = {
  title: "What-if",
  description: "Shift, resize, remove or add a scheduled payment and see which cash gaps disappear or appear. Nothing is executed.",
};

export default function Page() {
  return DEMO ? <DemoScenariosView /> : <WhatIfView />;
}
