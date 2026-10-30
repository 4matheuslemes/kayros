"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Home,
  Users,
  BookOpenText,
  Building2,
  ScrollText,
  FileText,
  UserPlus,
  Sun,
  Moon,
  Laptop,
  ChevronRight,
  Shield,
  LogOut,
} from "lucide-react";
import { secureSignOut } from "@/lib/auth/sign-out";
import { cn } from "@/lib/utils";
import { lightTap } from "@/lib/haptics";
import { useUserPermissions } from "@/contexts/user-permissions-context";
import { type UserPermissions } from "@/lib/permissions";
import { SyncStatusIndicator } from "./sync-status-indicator";
import { createClient } from "@/lib/supabase/client";

interface DesktopSidebarProps {
  permissions?: UserPermissions;
}

export function DesktopSidebar({ permissions: propPermissions }: DesktopSidebarProps) {
  const contextPermissions = useUserPermissions();
  const perms = propPermissions ?? contextPermissions;

  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [themeMode, setThemeMode] = useState<"light" | "dark" | "system">("system");
  const [displayName, setDisplayName] = useState<string>("");

  // Carrega informações do perfil do usuário
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const metaName = user.user_metadata?.full_name || user.user_metadata?.name;
        if (metaName) {
          setDisplayName(metaName);
        } else {
          supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .single()
            .then(({ data }) => {
              if (data?.full_name) setDisplayName(data.full_name);
            });
        }
      }
    });
  }, []);

  // Monitora tema
  useEffect(() => {
    const stored = localStorage.getItem("kairos-theme");
    if (stored === "light" || stored === "dark") {
      setThemeMode(stored);
    } else {
      setThemeMode("system");
    }
  }, []);

  const handleSetTheme = (mode: "light" | "dark" | "system") => {
    lightTap();
    setThemeMode(mode);
    if (mode === "system") {
      localStorage.removeItem("kairos-theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
    } else {
      localStorage.setItem("kairos-theme", mode);
      document.documentElement.setAttribute("data-theme", mode);
    }
  };

  const [signingOut, setSigningOut] = useState(false);
  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    await secureSignOut();
  };

  const initial = (displayName.trim()?.[0] || "K").toUpperCase();

  // Verifica se está dentro do módulo Congregação
  const isCongregacaoSection =
    pathname?.startsWith("/congregacao") ||
    pathname?.startsWith("/irmaos") ||
    pathname?.startsWith("/pastoreio");

  const currentView = searchParams?.get("view") || searchParams?.get("tab");

  return (
    <aside
      className={cn(
        "hidden lg:flex lg:flex-col lg:w-[248px] lg:shrink-0 lg:fixed lg:inset-y-0 lg:left-0 lg:z-30",
        "bg-[var(--surface)] border-r border-[var(--border)] px-4 py-6 justify-between select-none"
      )}
      aria-label="Navegação lateral desktop"
    >
      {/* ── 1. TOPO DA SIDEBAR: MARCA KAIRÓS ── */}
      <div className="flex flex-col gap-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 px-2 py-1 group rounded-xl transition-opacity hover:opacity-90"
        >
          <Image
            src="/kairos-mark-transparent.svg"
            alt="Kairós"
            width={26}
            height={26}
            className="w-[26px] h-[26px] object-contain shrink-0"
            priority
          />
          <span className="font-display text-xl font-medium tracking-[-0.02em] text-[var(--ink)]">
            Kairós
          </span>
        </Link>

        {/* ── 2. MEIO DA SIDEBAR: NAVEGAÇÃO PRINCIPAL ── */}
        <nav className="flex flex-col gap-4 text-xs font-sans">
          {/* Módulos Operacionais Principais */}
          <div className="flex flex-col space-y-1">
            {/* Início */}
            <Link
              href="/"
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer",
                pathname === "/"
                  ? "bg-[var(--panel)] text-[var(--primary)] dark:text-white font-semibold shadow-2xs"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--panel)]/60"
              )}
            >
              <Home size={18} strokeWidth={pathname === "/" ? 2.25 : 1.75} className="shrink-0" />
              <span>Início</span>
            </Link>

            {/* Interessados */}
            {perms.canUseContacts && (
              <Link
                href="/contatos"
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer",
                  pathname?.startsWith("/contatos")
                    ? "bg-[var(--panel)] text-[var(--primary)] dark:text-white font-semibold shadow-2xs"
                    : "text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--panel)]/60"
                )}
              >
                <Users
                  size={18}
                  strokeWidth={pathname?.startsWith("/contatos") ? 2.25 : 1.75}
                  className="shrink-0"
                />
                <span>Interessados</span>
              </Link>
            )}

            {/* Discursos */}
            {perms.canUseTalks && (
              <Link
                href="/discursos"
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer",
                  pathname?.startsWith("/discursos")
                    ? "bg-[var(--panel)] text-[var(--primary)] dark:text-white font-semibold shadow-2xs"
                    : "text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--panel)]/60"
                )}
              >
                <BookOpenText
                  size={18}
                  strokeWidth={pathname?.startsWith("/discursos") ? 2.25 : 1.75}
                  className="shrink-0"
                />
                <span>Discursos</span>
              </Link>
            )}

            {/* Congregação (com sub-menu dinâmico) */}
            {(perms.canViewMembers || perms.canUseShepherding) && (
              <div className="flex flex-col">
                <Link
                  href="/congregacao"
                  className={cn(
                    "flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer",
                    isCongregacaoSection
                      ? "bg-[var(--panel)] text-[var(--primary)] dark:text-white font-semibold shadow-2xs"
                      : "text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--panel)]/60"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Building2
                      size={18}
                      strokeWidth={isCongregacaoSection ? 2.25 : 1.75}
                      className="shrink-0"
                    />
                    <span>Congregação</span>
                  </div>
                  <ChevronRight
                    size={14}
                    className={cn(
                      "transition-transform text-[var(--ink-muted)]",
                      isCongregacaoSection ? "rotate-90 text-[var(--primary)] dark:text-white" : ""
                    )}
                  />
                </Link>

                {/* Sub-menu de 1 clique quando dentro de Congregação */}
                {isCongregacaoSection && (
                  <div className="pl-4 pr-1 py-1 space-y-0.5 border-l border-[var(--border)] ml-5 mt-1 animate-in fade-in-50 duration-200">
                    {perms.canViewMembers && (
                      <Link
                        href="/irmaos?view=grupos"
                        className={cn(
                          "block px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                          pathname?.startsWith("/irmaos") && currentView === "grupos"
                            ? "bg-[var(--surface)] font-semibold text-[var(--primary)] dark:text-white shadow-2xs"
                            : "text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--panel)]/40"
                        )}
                      >
                        Grupos de Serviço
                      </Link>
                    )}

                    {perms.canViewMembers && (
                      <Link
                        href="/irmaos?view=publicadores"
                        className={cn(
                          "block px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                          pathname?.startsWith("/irmaos") && currentView !== "grupos"
                            ? "bg-[var(--surface)] font-semibold text-[var(--primary)] dark:text-white shadow-2xs"
                            : "text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--panel)]/40"
                        )}
                      >
                        Todos os publicadores
                      </Link>
                    )}

                    {perms.canUseShepherding && (
                      <Link
                        href="/pastoreio"
                        className={cn(
                          "block px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                          pathname?.startsWith("/pastoreio")
                            ? "bg-[var(--surface)] font-semibold text-[var(--primary)] dark:text-white shadow-2xs"
                            : "text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--panel)]/40"
                        )}
                      >
                        Pastoreio
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Divisor Discreto para Seção Ministério / Conta */}
          <div className="pt-3 border-t border-[var(--border)]/70">
            <span className="text-[10px] uppercase font-semibold text-[var(--ink-muted)]/80 tracking-wider px-3 mb-1.5 block">
              Ministério & Conta
            </span>
            <div className="flex flex-col space-y-1">
              {perms.canUseHours && (
                <Link
                  href="/historico"
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer",
                    pathname?.startsWith("/historico")
                      ? "bg-[var(--panel)] text-[var(--primary)] dark:text-white font-semibold shadow-2xs"
                      : "text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--panel)]/60"
                  )}
                >
                  <ScrollText
                    size={18}
                    strokeWidth={pathname?.startsWith("/historico") ? 2.25 : 1.75}
                    className="shrink-0"
                  />
                  <span>Histórico e Progresso</span>
                </Link>
              )}

              {perms.canUseHours && (
                <Link
                  href="/relatorio"
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer",
                    pathname?.startsWith("/relatorio")
                      ? "bg-[var(--panel)] text-[var(--primary)] dark:text-white font-semibold shadow-2xs"
                      : "text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--panel)]/60"
                  )}
                >
                  <FileText
                    size={18}
                    strokeWidth={pathname?.startsWith("/relatorio") ? 2.25 : 1.75}
                    className="shrink-0"
                  />
                  <span>Relatório Mensal</span>
                </Link>
              )}

              {perms.isElderOrAdmin && (
                <Link
                  href="/convidar"
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer",
                    pathname?.startsWith("/convidar")
                      ? "bg-[var(--panel)] text-[var(--primary)] dark:text-white font-semibold shadow-2xs"
                      : "text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--panel)]/60"
                  )}
                >
                  <UserPlus
                    size={18}
                    strokeWidth={pathname?.startsWith("/convidar") ? 2.25 : 1.75}
                    className="shrink-0"
                  />
                  <span>Permissões e Convites</span>
                </Link>
              )}
            </div>
          </div>
        </nav>
      </div>

      {/* ── 3. RODAPÉ DA SIDEBAR: SYNC, TEMA E PERFIL ── */}
      <div className="pt-4 border-t border-[var(--border)] flex flex-col gap-3">
        {/* Linha 1: Status de Sync + Alternância Compacta de Tema */}
        <div className="flex items-center justify-between px-1">
          <SyncStatusIndicator />

          <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-[var(--panel)] border border-[var(--border)]/60">
            <button
              type="button"
              onClick={() => handleSetTheme("light")}
              className={cn(
                "p-1.5 rounded-md transition-colors cursor-pointer",
                themeMode === "light"
                  ? "bg-[var(--surface)] text-[var(--ink)] shadow-2xs"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
              )}
              title="Tema Claro"
              aria-label="Tema Claro"
            >
              <Sun size={13} />
            </button>
            <button
              type="button"
              onClick={() => handleSetTheme("dark")}
              className={cn(
                "p-1.5 rounded-md transition-colors cursor-pointer",
                themeMode === "dark"
                  ? "bg-[var(--surface)] text-[var(--ink)] shadow-2xs"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
              )}
              title="Tema Escuro"
              aria-label="Tema Escuro"
            >
              <Moon size={13} />
            </button>
            <button
              type="button"
              onClick={() => handleSetTheme("system")}
              className={cn(
                "p-1.5 rounded-md transition-colors cursor-pointer",
                themeMode === "system"
                  ? "bg-[var(--surface)] text-[var(--ink)] shadow-2xs"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
              )}
              title="Tema do Sistema"
              aria-label="Tema do Sistema"
            >
              <Laptop size={13} />
            </button>
          </div>
        </div>

        {/* Linha 2: Cartão Compacto do Usuário Logado + Sair */}
        <div className="flex items-center gap-1">
        <Link
          href="/perfil"
          className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-[var(--panel)]/70 transition-colors group min-w-0 flex-1"
        >
          <div className="w-[34px] h-[34px] rounded-full bg-[var(--panel)] border border-[var(--border)] text-[var(--ink)] font-display font-semibold text-sm flex items-center justify-center shrink-0 group-hover:border-[var(--primary)] transition-colors">
            {initial}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-semibold text-[var(--ink)] truncate group-hover:text-[var(--primary)] transition-colors">
              {displayName || "Minha Conta"}
            </span>
            <span className="text-[10px] text-[var(--ink-muted)] truncate">
              Ver perfil e ajustes
            </span>
          </div>
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          title="Sair da conta"
          aria-label="Sair da conta"
          className="p-2 rounded-xl shrink-0 text-[var(--ink-muted)] hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer disabled:opacity-60"
        >
          <LogOut size={16} />
        </button>
        </div>
      </div>
    </aside>
  );
}
