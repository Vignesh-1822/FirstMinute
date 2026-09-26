import { useCallback, useEffect, useState } from "react";
import type { Theme } from "@/types";

function readStoredTheme(storageKey: string): Theme | null {
  try {
    const value = window.localStorage.getItem(storageKey);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

/**
 * Per-surface theme: the landing defaults to light, the console to dark.
 * A manual choice is remembered per surface.
 */
export function useTheme(defaultTheme: Theme, storageKey: string) {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme(storageKey) ?? defaultTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
  }, [theme]);

  const setTheme = useCallback(
    (next: Theme) => {
      setThemeState(next);
      try {
        window.localStorage.setItem(storageKey, next);
      } catch {
        /* storage unavailable — keep in-memory choice */
      }
    },
    [storageKey],
  );

  const toggleTheme = useCallback(() => setTheme(theme === "dark" ? "light" : "dark"), [setTheme, theme]);

  return { theme, setTheme, toggleTheme };
}
