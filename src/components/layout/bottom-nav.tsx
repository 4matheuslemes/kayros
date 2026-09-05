"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Home, ScrollText, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { lightTap } from "@/lib/haptics";

const NAV_ITEMS = [
  { href: "/",           icon: Home,       label: "Início"    },
  { href: "/historico",  icon: ScrollText, label: "Histórico" },
  { href: "/contatos",   icon: Users,      label: "Interessados"  },
  { href: "/perfil",     icon: User,       label: "Perfil"    },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const [optimisticPath, setOptimisticPath] = useState(pathname);

  // Sync with actual pathname when it changes
  useEffect(() => {
    setOptimisticPath(pathname);
  }, [pathname]);

  return (
    <nav
      className={cn(
        "fixed z-40",
        "bottom-[calc(env(safe-area-inset-bottom)+1rem)]",
        "left-4 right-4 mx-auto max-w-md",
        "border border-black/10 dark:border-white/15 rounded-full",
        "shadow-[0_8px_30px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]",
        "dark:shadow-[0_8px_30px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.15)]",
        "flex items-stretch overflow-hidden",
        "h-[64px]"
      )}
      style={{ backgroundColor: "color-mix(in srgb, var(--surface) 97%, transparent)" }}
      aria-label="Navegação principal"
    >
      {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
        const active =
          href === "/"
            ? optimisticPath === "/"
            : optimisticPath.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            onClick={() => {
              lightTap();
              setOptimisticPath(href);
            }}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1",
              "min-h-[44px] transition-all duration-100 active:scale-90",
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
            <span className="text-2xs font-medium font-sans leading-none">
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
