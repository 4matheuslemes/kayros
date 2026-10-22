"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "kairos-theme";

interface ThemeToggleProps {
  variant?: "icon" | "menu";
  className?: string;
  onToggle?: () => void;
}

export function ThemeToggle({
  variant = "icon",
  className,
  onToggle,
}: ThemeToggleProps) {
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
    onToggle?.();
  };

  if (!mounted) {
    if (variant === "menu") {
      return (
        <div
          className={cn(
            "w-full h-11 rounded-2xl bg-[var(--surface-raised,rgba(0,0,0,0.04))] animate-pulse",
            className
          )}
        />
      );
    }
    return (
      <div
        className={cn(
          "w-10 h-10 rounded-full bg-[var(--surface)] border border-[var(--border)] animate-pulse",
          className
        )}
      />
    );
  }

  if (variant === "menu") {
    return (
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2.5 rounded-2xl min-h-[44px]",
          "text-left transition-colors duration-150",
          "hover:bg-[var(--surface-raised,rgba(0,0,0,0.04))] dark:hover:bg-white/5",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
          className
        )}
        aria-label={dark ? "Mudar para modo claro" : "Mudar para modo escuro"}
      >
        <span className="text-body-sm font-medium text-[var(--ink)]">
          {dark ? "Modo escuro" : "Modo claro"}
        </span>
        <div className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-[var(--ink-muted)]">
          {dark ? <Moon size={18} /> : <Sun size={18} />}
        </div>
      </button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className={cn(
        "rounded-full w-10 h-10 text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface)]",
        className
      )}
      aria-label={dark ? "Mudar para modo claro" : "Mudar para modo escuro"}
    >
      {dark ? <Moon size={20} /> : <Sun size={20} />}
    </Button>
  );
}
