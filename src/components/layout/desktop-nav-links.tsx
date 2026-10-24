"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUserPermissions } from "@/contexts/user-permissions-context";
import { cn } from "@/lib/utils";

export function DesktopNavLinks({ className }: { className?: string }) {
  const pathname = usePathname();
  const perms = useUserPermissions();

  const links = [
    { href: "/", label: "Início", allowed: true },
    { href: "/contatos", label: "Interessados", allowed: perms.canUseContacts },
    { href: "/discursos", label: "Discursos", allowed: perms.canUseTalks },
    { href: "/irmaos", label: "Irmãos", allowed: perms.canViewMembers },
  ].filter((link) => link.allowed);

  return (
    <nav
      className={cn("hidden lg:flex items-center gap-6", className)}
      aria-label="Navegação rápida"
    >
      {links.map((link) => {
        const active =
          link.href === "/"
            ? pathname === "/"
            : pathname?.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "text-sm font-medium transition-colors",
              active
                ? "text-[var(--ink)] font-semibold"
                : "text-[var(--ink-muted)] hover:text-[var(--primary)]"
            )}
            aria-current={active ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
