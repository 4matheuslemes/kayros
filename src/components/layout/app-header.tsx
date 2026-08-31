import { type ReactNode } from "react";
import { ThemeToggle } from "./theme-toggle";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  className?: string;
}

export function AppHeader({ title, subtitle, right, className }: AppHeaderProps) {
  return (
    <header
      className={cn(
        "flex items-center justify-between gap-3",
        "px-0 pt-5 pb-4",
        className
      )}
    >
      <div>
        <h1 className="font-display font-semibold text-xl text-[var(--ink)] leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-caption text-[var(--ink-muted)] mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-1">
        {right}
        <ThemeToggle />
      </div>
    </header>
  );
}
