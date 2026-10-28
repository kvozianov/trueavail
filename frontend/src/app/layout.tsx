import type { Metadata, Viewport } from "next";
import { DemoBanner, Footer } from "@/components/nav/DemoBanner";
import { Header } from "@/components/nav/Header";
import { THEME_INIT } from "@/components/nav/ThemeToggle";
import { MotionProvider } from "@/components/MotionProvider";
import { body, display, mono } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "TrueAvail", template: "%s · TrueAvail" },
  description:
    "14-day liquidity forecasting prototype on synthetic data: a quantile ML ensemble draws P5/P50/P95 balance corridors, flags cash gaps, tests what-ifs and is scored in a rolling backtest.",
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className="flex min-h-screen flex-col">
        <a
          href="#main"
          className="sr-only-table focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[60] focus:h-auto focus:w-auto focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-bg"
        >
          Skip to content
        </a>
        <MotionProvider>
          <Header />
          <DemoBanner />
          <main id="main" className="route-fade flex-1">
            {children}
          </main>
          <Footer />
        </MotionProvider>
      </body>
    </html>
  );
}
