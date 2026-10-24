"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { NavMenu } from "./nav-menu";
import { DesktopNavLinks } from "./desktop-nav-links";

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
        "flex flex-col sm:flex-row sm:items-end justify-between gap-4",
        "px-0 pt-4 pb-6 sm:pb-8 border-b border-[var(--border)]/40 mb-6 sm:mb-8",
        className
      )}
    >
      <div>
        <h1
          className="font-display font-medium text-[var(--ink)] leading-none tracking-[-0.03em]"
          style={{ fontSize: "clamp(2rem, 4.5vw, 3.25rem)" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm sm:text-base text-[var(--ink-muted)] mt-2">
            {subtitle}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <DesktopNavLinks className="mr-2" />
        {right}
        {!hideMenu && <NavMenu />}
      </div>
    </header>
  );
}
