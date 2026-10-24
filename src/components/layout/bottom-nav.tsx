"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import {
  Home,
  ScrollText,
  Users,
  BookOpenText,
  ArrowUp,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { lightTap } from "@/lib/haptics";
import { FLOATING_NAV_ITEMS } from "@/lib/constants";
import { useUserPermissions } from "@/contexts/user-permissions-context";
import {
  type UserPermissions,
  type FloatingNavId,
  isFloatingItemAllowed,
} from "@/lib/permissions";

interface BottomNavProps {
  permissions?: UserPermissions;
  talksAccess?: boolean;
}

const FLOATING_ITEM_CONFIG: Record<
  FloatingNavId,
  { href: string; icon: typeof Home; label: string }
> = {
  inicio: { href: "/", icon: Home, label: "Início" },
  interessados: { href: "/contatos", icon: Users, label: "Interessados" },
  historico: { href: "/historico", icon: ScrollText, label: "Histórico" },
  discursos: { href: "/discursos", icon: BookOpenText, label: "Discursos" },
};

export function BottomNav({ permissions: propPermissions }: BottomNavProps) {
  const contextPermissions = useUserPermissions();
  const permissions = propPermissions ?? contextPermissions;

  const pathname = usePathname();
  const [optimisticPath, setOptimisticPath] = useState(pathname);
  const [hasScrolledPastHero, setHasScrolledPastHero] = useState(false);

  // Sync with actual pathname when it changes
  useEffect(() => {
    setOptimisticPath(pathname);
  }, [pathname]);

  // Listen to window scroll on desktop
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      setHasScrolledPastHero(scrollY > 280);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = useMemo(() => {
    return (FLOATING_NAV_ITEMS as readonly FloatingNavId[])
      .filter((id) => isFloatingItemAllowed(id, permissions))
      .map((id) => FLOATING_ITEM_CONFIG[id])
      .filter(Boolean);
  }, [permissions]);

  const scrollToTop = () => {
    lightTap();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (navItems.length === 0) {
    return null;
  }

  const isCompact = navItems.length <= 2;

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
          1. Mobile Floating Bottom Bar (< 1024px)
      ───────────────────────────────────────────────────────────── */}
      <nav
        className={cn(
          "fixed z-40 lg:hidden",
          "bottom-[calc(env(safe-area-inset-bottom)+1rem)]",
          isCompact
            ? "left-0 right-0 mx-auto w-fit max-w-[calc(100vw-2rem)] px-2"
            : "left-4 right-4 mx-auto max-w-md",
          "border border-black/10 dark:border-white/15 rounded-full",
          "shadow-[0_8px_30px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]",
          "dark:shadow-[0_8px_30px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.15)]",
          "flex items-stretch overflow-hidden",
          "h-[60px]"
        )}
        style={{
          backgroundColor: "color-mix(in srgb, var(--surface) 97%, transparent)",
        }}
        aria-label="Navegação mobile"
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
                "flex-1 flex flex-col items-center justify-center gap-0.5",
                isCompact ? "px-5 sm:px-6 min-w-[96px]" : "px-0.5 min-w-[64px]",
                "min-h-[44px] transition-all duration-100 active:scale-90",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]",
                active
                  ? "text-[var(--primary)] font-semibold"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon
                className={cn(
                  "transition-transform duration-150",
                  active ? "scale-110" : ""
                )}
                size={20}
                strokeWidth={active ? 2.25 : 1.75}
              />
              <span className="text-[11px] font-medium font-sans leading-none tracking-normal whitespace-nowrap text-center">
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* ─────────────────────────────────────────────────────────────
          2. Desktop Floating Pill (>= 1024px)
          Estilo America.gov: só aparece ao rolar a página para baixo
          quando o Hero sai da tela.
      ───────────────────────────────────────────────────────────── */}
      <nav
        className={cn(
          "hidden lg:flex fixed z-40 bottom-6 left-1/2 -translate-x-1/2",
          "h-[60px] rounded-full",
          "border border-[var(--border)]",
          "bg-[var(--surface)]/95 backdrop-blur-md",
          "shadow-[0_12px_36px_rgba(0,0,0,0.12)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.45)]",
          "items-center justify-between px-3 pl-5 gap-6",
          "transition-all duration-300 ease-out",
          hasScrolledPastHero
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-6 pointer-events-none"
        )}
        style={{
          width: "min(calc(100vw - 48px), 520px)",
        }}
        aria-label="Barra flutuante de atalhos e busca"
      >
        {/* Navigation shortcuts */}
        <div className="flex items-center gap-5">
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
                  "flex items-center gap-2 py-1.5 px-2.5 rounded-full text-xs font-medium transition-all duration-150",
                  active
                    ? "bg-[var(--primary)] text-white shadow-xs"
                    : "text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-black/5 dark:hover:bg-white/5"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={16} strokeWidth={active ? 2.25 : 1.75} />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>

        {/* Right circular navy button (#1E3A5F) for scroll to top / hero search */}
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Voltar ao topo da página"
          title="Voltar ao topo"
          className={cn(
            "w-11 h-11 rounded-full shrink-0",
            "bg-[var(--primary)] text-white",
            "flex items-center justify-center",
            "shadow-sm hover:opacity-95 active:scale-95 transition-all duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          )}
        >
          <ArrowUp size={18} strokeWidth={2.25} />
        </button>
      </nav>
    </>
  );
}
