"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "kairos-theme";

export function ThemeSwitch() {
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
    return <div className="h-14 bg-[var(--surface)] border border-[var(--border)] rounded-lg animate-pulse" />;
  }

  return (
    <button
      onClick={toggle}
      className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--background)] transition-colors"
      aria-label={dark ? "Mudar para modo claro" : "Mudar para modo escuro"}
    >
      <div className="flex items-center gap-3">
        {dark ? <Moon size={16} className="text-[var(--ink-muted)]" /> : <Sun size={16} className="text-[var(--ink-muted)]" />}
        <div className="text-left">
          <span className="text-body-sm text-[var(--ink)] block leading-tight">Modo escuro</span>
          <span className="text-caption text-[var(--ink-muted)] mt-0.5 block">Tema visual do aplicativo</span>
        </div>
      </div>
      
      {/* Switch Track */}
      <div className={cn(
        "w-11 h-6 rounded-full transition-colors relative flex items-center shadow-inner",
        dark ? "bg-[var(--primary)]" : "bg-[var(--border)]"
      )}>
        {/* Switch Thumb */}
        <div className={cn(
          "w-5 h-5 bg-white rounded-full absolute shadow-sm transition-transform duration-200 ease-out",
          dark ? "translate-x-5" : "translate-x-0.5"
        )} />
      </div>
    </button>
  );
}
