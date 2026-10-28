"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

const KEY = "ta-theme";

/** Runs before paint (inlined in <head>): re-applies a stored theme stamp. */
export const THEME_INIT = `try{var t=localStorage.getItem("${KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

function effective(): "light" | "dark" {
  const stamp = document.documentElement.dataset.theme;
  // Light is the product theme; dark only when the visitor picks it.
  return stamp === "dark" ? "dark" : "light";
}

const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useTheme() {
  return useSyncExternalStore(subscribe, effective, () => "light" as const);
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => {
        document.documentElement.dataset.theme = next;
        try {
          localStorage.setItem(KEY, next);
        } catch {
          /* private mode: the stamp still applies for this page view */
        }
        listeners.forEach((l) => l());
      }}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className={`inline-flex h-[34px] w-[34px] items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-bg-2 hover:text-ink focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${className}`}
    >
      {theme === "dark" ? <Sun size={16} strokeWidth={1.75} aria-hidden /> : <Moon size={16} strokeWidth={1.75} aria-hidden />}
    </button>
  );
}
