"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ScrollText, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/",           icon: Home,       label: "Início"    },
  { href: "/historico",  icon: ScrollText, label: "Histórico" },
  { href: "/contatos",   icon: Users,      label: "Contatos"  },
  { href: "/perfil",     icon: User,       label: "Perfil"    },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "fixed z-40",
        "bottom-[calc(env(safe-area-inset-bottom)+1rem)]",
        "left-4 right-4 mx-auto max-w-md",
        "backdrop-blur-xl",
        "border border-[var(--border)] rounded-full shadow-lg shadow-black/5",
        "flex items-stretch overflow-hidden",
        "h-[64px]"
      )}
      style={{ backgroundColor: "color-mix(in srgb, var(--surface) 85%, transparent)" }}
      aria-label="Navegação principal"
    >
      {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
        const active =
          href === "/"
            ? pathname === "/"
            : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1",
              "min-h-[44px] transition-colors duration-150",
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
