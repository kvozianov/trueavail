import type { Metadata } from "next";
import { WhatIfView } from "./WhatIfView";

export const metadata: Metadata = { title: "What-if" };

export default function Page() {
  return <WhatIfView />;
}
