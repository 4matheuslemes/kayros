"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "kairos-theme";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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

  if (!mounted) {
    return <div className="w-10 h-10 rounded-full bg-[var(--surface)] border border-[var(--border)] animate-pulse" />;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className="rounded-full w-10 h-10 text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface)]"
      aria-label={dark ? "Mudar para modo claro" : "Mudar para modo escuro"}
    >
      {dark ? <Moon size={20} /> : <Sun size={20} />}
    </Button>
  );
}
