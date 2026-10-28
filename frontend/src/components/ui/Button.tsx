import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "accent" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-[background-color,box-shadow,color,border-color,transform] duration-200 ease-[var(--ease)] active:translate-y-px disabled:pointer-events-none disabled:opacity-[.42] aria-disabled:pointer-events-none aria-disabled:opacity-[.42] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-ink text-bg hover:bg-[#2A2E34] hover:shadow-hover active:bg-black dark:hover:bg-[#D9DCE1] dark:active:bg-white",
  secondary: "border border-hairline-2 bg-bg text-ink hover:border-ink-4 hover:bg-bg-2",
  ghost: "text-ink-2 hover:bg-bg-2 hover:text-ink",
  accent: "bg-accent text-white hover:bg-accent-ink dark:text-[#0E1013]",
  danger: "bg-gap-tint text-gap hover:brightness-95",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-[34px] px-3.5 text-[13px]",
  md: "h-11 px-[22px] text-[15px]",
  lg: "h-[52px] px-7 text-base",
};

export function buttonClass(variant: ButtonVariant = "secondary", size: ButtonSize = "md", extra = "") {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`;
}

export function Spinner() {
  return (
    <span
      aria-hidden
      className="h-3.5 w-3.5 animate-spin rounded-full border-[1.75px] border-current border-t-transparent motion-reduce:animate-none"
    />
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
};

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  icon,
  className = "",
  type = "button",
  children,
  ...props
}: ButtonProps) {
  return (
    <button type={type} aria-busy={loading || undefined} className={buttonClass(variant, size, className)} {...props}>
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconRight?: ReactNode;
};

export function ButtonLink({ href, variant = "secondary", size = "md", icon, iconRight, className = "", children, ...props }: LinkProps) {
  const cls = buttonClass(variant, size, className);
  const inner = (
    <>
      {icon}
      {children}
      {iconRight}
    </>
  );
  // In-app routes use client navigation; files (with an extension or a download attribute) stay plain links.
  if (href.startsWith("/") && !href.startsWith("//") && !props.download && !/\.[a-z0-9]+$/i.test(href.split("?")[0]))
    return (
      <Link href={href} className={cls} {...props}>
        {inner}
      </Link>
    );
  return (
    <a href={href} className={cls} {...props}>
      {inner}
    </a>
  );
}

/** A button that cannot run in the static demo: secondary, disabled, with the precomputed explanation. */
export function DemoDisabledButton({ children, size = "sm" }: { children: ReactNode; size?: ButtonSize }) {
  const tip = "Precomputed demo — run locally with docker compose up";
  return (
    <span className="group relative inline-flex" tabIndex={0} aria-label={`${String(children)}: ${tip}`}>
      <span aria-hidden className={buttonClass("secondary", size, "pointer-events-none opacity-[.42]")}>
        {children}
      </span>
      <span
        role="tooltip"
        className="tip pointer-events-none absolute right-0 top-full z-30 mt-2 w-max max-w-64 px-3 py-2 text-[12.5px] leading-snug opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        {tip}
      </span>
    </span>
  );
}
