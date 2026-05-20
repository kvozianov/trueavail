import type { Metadata } from "next";
import { NetworkBackground } from "@/components/liquidity/NetworkBackground";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrueAvail — Book cash isn’t usable cash.",
  description: "Book cash isn’t usable cash. Treasury liquidity forecasting, stress testing, governance, and AI Council review.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <NetworkBackground />
        {children}
      </body>
    </html>
  );
}
