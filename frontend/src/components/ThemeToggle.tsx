"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

const subscribeNever = () => () => {};

/** True only once mounted on the client — avoids rendering a theme-dependent
 * icon on the server, which would mismatch the client's actual theme. */
function useHasMounted() {
  return useSyncExternalStore(subscribeNever, () => true, () => false);
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const hasMounted = useHasMounted();

  if (!hasMounted) {
    return <div className="h-9 w-9" aria-hidden />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
