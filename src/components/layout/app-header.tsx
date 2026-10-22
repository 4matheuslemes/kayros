"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { NavMenu } from "./nav-menu";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  className?: string;
  hideMenu?: boolean;
}

export function AppHeader({
  title,
  subtitle,
  right,
  className,
  hideMenu = false,
}: AppHeaderProps) {
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
      <div className="flex items-center gap-2 shrink-0">
        {right}
        {!hideMenu && <NavMenu />}
      </div>
    </header>
  );
}
