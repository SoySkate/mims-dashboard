"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light";

/**
 * Header theme switch. Reads the current theme from the <html data-theme> set by the
 * inline boot script, flips it, and persists to localStorage. Styles only — no app logic.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const current = document.documentElement.dataset.theme === "light" ? "light" : "dark";
    setTheme(current);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
    setTheme(next);
  }

  return (
    <button
      onClick={toggle}
      aria-label={theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      title={theme === "dark" ? "Tema claro" : "Tema oscuro"}
      className="rounded-lg border border-border px-2 py-1 text-sm text-muted transition-colors hover:border-accent hover:text-text"
    >
      {theme === "dark" ? "☀" : "☾"}
    </button>
  );
}
