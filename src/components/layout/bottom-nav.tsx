"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import {
  Home,
  Users,
  BookOpenText,
  UsersRound,
  HeartHandshake,
  ChevronUp,
  User,
  ScrollText,
  FileText,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { lightTap } from "@/lib/haptics";
import { useUserPermissions } from "@/contexts/user-permissions-context";
import { type UserPermissions } from "@/lib/permissions";

interface BottomNavProps {
  permissions?: UserPermissions;
  talksAccess?: boolean;
}

export function BottomNav({ permissions: propPermissions }: BottomNavProps) {
  const contextPermissions = useUserPermissions();
  const permissions = propPermissions ?? contextPermissions;

  const pathname = usePathname();
  const [optimisticPath, setOptimisticPath] = useState(pathname);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [timerText, setTimerText] = useState<string | null>(null);

  // Sync with actual pathname when it changes and expand
  useEffect(() => {
    setOptimisticPath(pathname);
    setIsCollapsed(false);
  }, [pathname]);

  // Monitor scroll direction (Apple Music behavior)
  useEffect(() => {
    let lastY = window.scrollY || document.documentElement.scrollTop;

    const handleScroll = () => {
      const currentY = window.scrollY || document.documentElement.scrollTop;
      const deltaY = currentY - lastY;

      if (currentY < 50 || deltaY < -8) {
        setIsCollapsed(false);
      } else if (currentY > 60 && deltaY > 10) {
        setIsCollapsed(true);
      }

      lastY = currentY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Monitor active timer in localStorage
  useEffect(() => {
    const checkTimer = () => {
      try {
        const raw = localStorage.getItem("kairos_timer");
        if (!raw) {
          setTimerText(null);
          return;
        }
        const data = JSON.parse(raw);
        if (data.state === "running" && data.startedAt) {
          const totalSec =
            (data.elapsed || 0) +
            Math.floor((Date.now() - data.startedAt) / 1000);
          const h = Math.floor(totalSec / 3600);
          const m = Math.floor((totalSec % 3600) / 60);
          const s = totalSec % 60;
          if (h > 0) {
            setTimerText(
              `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
            );
          } else {
            setTimerText(
              `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
            );
          }
        } else {
          setTimerText(null);
        }
      } catch {
        setTimerText(null);
      }
    };

    checkTimer();
    const interval = setInterval(checkTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  // Allowed operational items:
  // 1. Início (/) - always
  // 2. Interessados (/contatos) - canUseContacts
  // 3. Discursos (/discursos) - canUseTalks
  // 4. Irmãos (/irmaos) - canViewMembers
  // 5. Pastoreio (/pastoreio) - canUseShepherding
  const navItems = useMemo(() => {
    const items = [
      {
        href: "/",
        icon: Home,
        label: "Início",
        allowed: true,
      },
      {
        href: "/contatos",
        icon: Users,
        label: "Interessados",
        allowed: permissions.canUseContacts,
      },
      {
        href: "/discursos",
        icon: BookOpenText,
        label: "Discursos",
        allowed: permissions.canUseTalks,
      },
      {
        href: "/irmaos",
        icon: UsersRound,
        label: "Irmãos",
        allowed: permissions.canViewMembers,
      },
      {
        href: "/pastoreio",
        icon: HeartHandshake,
        label: "Pastoreio",
        allowed: permissions.canUseShepherding,
      },
    ];

    return items.filter((item) => item.allowed);
  }, [permissions]);

  // Section info for mini-pill state
  const currentSection = useMemo(() => {
    const path = optimisticPath || "/";
    if (path === "/") return { icon: Home, label: "Início" };
    if (path.startsWith("/contatos")) return { icon: Users, label: "Interessados" };
    if (path.startsWith("/discursos")) return { icon: BookOpenText, label: "Discursos" };
    if (path.startsWith("/irmaos")) return { icon: UsersRound, label: "Irmãos" };
    if (path.startsWith("/pastoreio")) return { icon: HeartHandshake, label: "Pastoreio" };
    if (path.startsWith("/perfil")) return { icon: User, label: "Perfil" };
    if (path.startsWith("/historico")) return { icon: ScrollText, label: "Histórico" };
    if (path.startsWith("/relatorio")) return { icon: FileText, label: "Relatório" };
    if (path.startsWith("/convidar")) return { icon: UserPlus, label: "Convites" };
    return { icon: Home, label: "Início" };
  }, [optimisticPath]);

  if (navItems.length === 0) {
    return null;
  }

  const CurrentIcon = currentSection.icon;

  return (
    <nav
      aria-label="Navegação principal"
      className={cn(
        "lg:hidden",
        "fixed z-40 bottom-[calc(env(safe-area-inset-bottom)+1rem)] left-1/2 -translate-x-1/2",
        "transition-all duration-350 ease-[cubic-bezier(0.22,1,0.36,1)] select-none",
        "border border-[var(--border)]/70 shadow-[var(--shadow-card)] rounded-full",
        "bg-[var(--surface)]/88 backdrop-blur-xl",
        isCollapsed
          ? "h-11 px-4 flex items-center gap-2 cursor-pointer shadow-md hover:scale-[1.02] active:scale-95"
          : "px-2 py-1.5 flex items-center gap-1 sm:gap-1.5 max-w-[calc(100vw-1.5rem)] overflow-x-auto no-scrollbar"
      )}
      onClick={isCollapsed ? () => { lightTap(); setIsCollapsed(false); } : undefined}
      role={isCollapsed ? "button" : undefined}
      tabIndex={isCollapsed ? 0 : undefined}
      onKeyDown={
        isCollapsed
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setIsCollapsed(false);
              }
            }
          : undefined
      }
    >
      {isCollapsed ? (
        // Estado 2 — Mini-pílula compacta
        <div className="flex items-center gap-2 text-xs font-medium text-[var(--ink)] whitespace-nowrap">
          <CurrentIcon
            size={18}
            className="text-[var(--primary)] shrink-0"
            strokeWidth={2.2}
          />
          <span className="font-sans font-medium">{currentSection.label}</span>
          {timerText && (
            <span className="text-xs font-mono font-semibold text-[var(--accent)] shrink-0 flex items-center gap-1">
              • ⏱ {timerText}
            </span>
          )}
          <ChevronUp
            size={14}
            className="text-[var(--ink-muted)] shrink-0 ml-0.5"
            strokeWidth={2.2}
          />
        </div>
      ) : (
        // Estado 1 — Expandida com itens operacionais
        navItems.map(({ href, icon: Icon, label }) => {
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
                "flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-full transition-all duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                active
                  ? "bg-[var(--primary)] text-white shadow-xs"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon
                size={18}
                strokeWidth={active ? 2.25 : 1.75}
                className="shrink-0"
              />
              <span className="text-[11px] font-medium font-sans whitespace-nowrap">
                {label}
              </span>
            </Link>
          );
        })
      )}
    </nav>
  );
}
