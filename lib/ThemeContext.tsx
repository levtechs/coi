"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "device" | "pink";

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
} | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("device");

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);

    const html = document.documentElement;
    html.classList.remove("theme-light", "theme-dark", "theme-pink");
    if (newTheme !== "device") {
      html.classList.add(`theme-${newTheme}`);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem("theme") as Theme;
    if (saved) {
      setTheme(saved);
    } else {
      // Apply device theme initially
      setTheme("device");
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}