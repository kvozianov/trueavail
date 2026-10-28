export const NAV_LINKS = [
  { href: "/", label: "Overview" },
  { href: "/forecast", label: "Forecast" },
  { href: "/what-if", label: "What-if" },
  { href: "/backtest", label: "Backtest" },
  { href: "/data", label: "Data" },
  { href: "/how-it-works", label: "How it works" },
] as const;

export function isActive(pathname: string, href: string) {
  const p = pathname.replace(/\/+$/, "") || "/";
  return href === "/" ? p === "/" : p === href || p.startsWith(`${href}/`);
}
