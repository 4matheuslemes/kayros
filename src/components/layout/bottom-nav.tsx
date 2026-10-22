"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { Home, ScrollText, Users, BookOpenText } from "lucide-react";
import { cn } from "@/lib/utils";
import { lightTap } from "@/lib/haptics";
import { FLOATING_NAV_ITEMS } from "@/lib/constants";

interface BottomNavProps {
  talksAccess?: boolean;
}

const FLOATING_ITEM_CONFIG = {
  inicio: { href: "/", icon: Home, label: "Início" },
  interessados: { href: "/contatos", icon: Users, label: "Interessados" },
  historico: { href: "/historico", icon: ScrollText, label: "Histórico" },
  discursos: {
    href: "/discursos",
    icon: BookOpenText,
    label: "Discursos",
    requiresTalksAccess: true,
  },
} as const;

export function BottomNav({ talksAccess = false }: BottomNavProps) {
  const pathname = usePathname();
  const [optimisticPath, setOptimisticPath] = useState(pathname);

  // Sync with actual pathname when it changes
  useEffect(() => {
    setOptimisticPath(pathname);
  }, [pathname]);

  const navItems = useMemo(() => {
    return FLOATING_NAV_ITEMS.map((id) => FLOATING_ITEM_CONFIG[id])
      .filter(Boolean)
      .filter((item) => !("requiresTalksAccess" in item && item.requiresTalksAccess && !talksAccess));
  }, [talksAccess]);

  if (navItems.length === 0) {
    return null;
  }

  const isCompact = navItems.length <= 2;

  return (
    <nav
      className={cn(
        "fixed z-40",
        "bottom-[calc(env(safe-area-inset-bottom)+1rem)]",
        isCompact ? "left-0 right-0 mx-auto w-fit min-w-[180px] max-w-xs px-2" : "left-4 right-4 mx-auto max-w-md",
        "border border-black/10 dark:border-white/15 rounded-full",
        "shadow-[0_8px_30px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]",
        "dark:shadow-[0_8px_30px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.15)]",
        "flex items-stretch overflow-hidden",
        "h-[64px]"
      )}
      style={{ backgroundColor: "color-mix(in srgb, var(--surface) 97%, transparent)" }}
      aria-label="Navegação principal"
    >
      {navItems.map(({ href, icon: Icon, label }) => {
        const active =
          href === "/"
            ? optimisticPath === "/"
            : optimisticPath.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            prefetch={true}
            onClick={() => {
              lightTap();
              setOptimisticPath(href);
            }}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1",
              isCompact ? "px-5" : "px-0.5",
              "min-h-[44px] min-w-[64px] transition-all duration-100 active:scale-90",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]",
              active
                ? "text-[var(--primary)]"
                : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon
              className={cn(
                "transition-transform duration-150",
                active ? "scale-110" : ""
              )}
              size={22}
              strokeWidth={active ? 2.25 : 1.75}
            />
            <span className="text-2xs font-medium font-sans leading-none tracking-tight truncate max-w-full text-center">
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
