"use client";

import { type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  className?: string;
  hideMenu?: boolean;
  hideBack?: boolean;
  backHref?: string;
}

export function AppHeader({
  title,
  subtitle,
  right,
  className,
  hideBack = false,
  backHref,
}: AppHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (backHref) {
      router.push(backHref);
    } else if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <header
      className={cn(
        "flex items-center justify-between gap-4",
        "px-0 pt-2 pb-5 sm:pb-6 border-b border-[var(--border)]/40 mb-6",
        className
      )}
    >
      {/* ── LADO ESQUERDO: VOLTAR + TÍTULO/SUBTÍTULO EDITORIAL ── */}
      <div className="flex items-center gap-3 min-w-0">
        {!hideBack && (
          <button
            type="button"
            onClick={handleBack}
            aria-label="Voltar"
            title="Voltar"
            className="w-9 h-9 rounded-full bg-[var(--panel)] hover:bg-[var(--border)] flex items-center justify-center transition-colors text-[var(--ink)] shrink-0 active:scale-95 cursor-pointer shadow-xs"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="font-display text-2xl sm:text-[26px] lg:text-[30px] font-normal tracking-[-0.025em] leading-[1.15] text-[var(--ink)] truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-[var(--ink-muted)] mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* ── LADO DIREITO: EXCLUSIVAMENTE AÇÕES ESPECÍFICAS DA PÁGINA ── */}
      {right && (
        <div className="flex items-center gap-2.5 shrink-0">
          {right}
        </div>
      )}
    </header>
  );
}
