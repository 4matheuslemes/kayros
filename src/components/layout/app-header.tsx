"use client";

import { type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { SyncStatusIndicator } from "./sync-status-indicator";
import { DesktopNavLinks } from "./desktop-nav-links";
import { NavMenu } from "./nav-menu";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  className?: string;
  hideMenu?: boolean;
  hideBack?: boolean;
}

export function AppHeader({
  title,
  subtitle,
  right,
  className,
  hideBack = false,
}: AppHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <header
      className={cn(
        "flex flex-col sm:flex-row sm:items-end justify-between gap-4",
        "px-0 pt-4 pb-6 sm:pb-8 border-b border-[var(--border)]/40 mb-6 sm:mb-8",
        className
      )}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        {!hideBack && (
          <button
            type="button"
            onClick={handleBack}
            aria-label="Voltar"
            title="Voltar"
            className="w-10 h-10 rounded-full bg-[var(--panel)] hover:bg-[var(--border)] flex items-center justify-center transition-colors text-[var(--ink)] shrink-0 active:scale-95 cursor-pointer shadow-xs"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <div className="min-w-0">
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
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <DesktopNavLinks />
        <SyncStatusIndicator />
        {right}
        <div className="hidden lg:block">
          <NavMenu />
        </div>
      </div>
    </header>
  );
}
