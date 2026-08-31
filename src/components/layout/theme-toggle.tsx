"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "kairos-theme";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = stored === "dark" || (!stored && prefersDark);
    setDark(isDark);
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
  };

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-full hover:bg-[var(--background)] transition-colors duration-150 text-[var(--ink-muted)] hover:text-[var(--ink)]"
      aria-label={dark ? "Mudar para modo claro" : "Mudar para modo escuro"}
    >
      {dark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
