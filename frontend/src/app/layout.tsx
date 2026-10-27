import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "TrueAvail", template: "%s · TrueAvail" },
  description:
    "14-day liquidity forecasting prototype on synthetic data: P5/P50/P95 balance corridors, cash-gap alerts, what-if and backtest.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">
        <Nav />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
        <footer className="border-t border-line">
          <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-ink-muted">
            Engineering prototype. Data is synthetic (or a CSV you upload); the model is not calibrated on real bank
            data. No bank connections, no payments, nothing moves money.
          </div>
        </footer>
      </body>
    </html>
  );
}
