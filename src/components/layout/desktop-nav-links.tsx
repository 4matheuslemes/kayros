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
    { href: "/pastoreio", label: "Pastoreio", allowed: perms.canUseShepherding },
  ].filter((link) => link.allowed);

  return (
    <nav
      className={cn("hidden lg:flex items-center gap-1", className)}
      aria-label="Módulos operacionais"
    >
      {links.map((link) => {
        const active =
          link.href === "/"
            ? pathname === "/"
            : pathname === link.href || pathname?.startsWith(link.href + "/");

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150 select-none",
              active
                ? "bg-[var(--primary)] text-white shadow-xs font-semibold"
                : "text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-black/5 dark:hover:bg-white/5"
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
