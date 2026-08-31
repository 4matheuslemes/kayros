"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Clock, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/",         icon: Home,  label: "Início"    },
  { href: "/horas",    icon: Clock, label: "Horas"     },
  { href: "/contatos", icon: Users, label: "Contatos"  },
  { href: "/perfil",   icon: User,  label: "Perfil"    },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "fixed bottom-0 inset-x-0 z-40",
        "bg-[var(--surface)] border-t border-[var(--border)]",
        "flex items-stretch",
        "h-[var(--bottom-nav-h)] safe-area-inset-bottom"
      )}
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
