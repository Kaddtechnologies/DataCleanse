"use client";

import React from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = React.createContext<ThemeContextValue>({
  theme: "light",
  toggleTheme: () => {},
  setTheme: () => {},
});

const STORAGE_KEY = "dc-theme";

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
  return stored ?? getSystemTheme();
}

/**
 * ThemeProvider synchronises the `dark` class on <html>,
 * provides a hook, and persists the user's preference.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Always start with "light" to avoid hydration mismatch
  const [theme, setThemeState] = React.useState<Theme>("light");

  // Read the actual theme preference after hydration
  React.useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    const actualTheme = stored ?? systemTheme;
    setThemeState(actualTheme);
  }, []);

  // Apply/remove class and persist whenever theme changes
  React.useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = React.useCallback((t: Theme) => setThemeState(t), []);
  const toggleTheme = React.useCallback(
    () => setThemeState((prev) => (prev === "dark" ? "light" : "dark")),
    []
  );

  const value = React.useMemo(
    () => ({ theme, toggleTheme, setTheme }),
    [theme, toggleTheme, setTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/**
 * Access the current theme and helpers.
 */
export function useTheme() {
  return React.useContext(ThemeContext);
}