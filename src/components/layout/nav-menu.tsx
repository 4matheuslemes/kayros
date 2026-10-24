"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, Sun, Moon, Laptop, CloudCheck, CloudAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { lightTap } from "@/lib/haptics";
import { useUserPermissions } from "@/contexts/user-permissions-context";
import { useOnlineSync } from "@/hooks/use-online-sync";
import { createClient } from "@/lib/supabase/client";

interface ButtonRect {
  width: number;
  height: number;
  top: number;
  right: number;
}

interface NavMenuProps {
  fullName?: string;
}

export function NavMenu({ fullName }: NavMenuProps = {}) {
  const {
    canUseHours,
    isElderOrAdmin,
  } = useUserPermissions();
  const pathname = usePathname();
  const isOnline = useOnlineSync();

  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "system">("system");
  const [displayName, setDisplayName] = useState<string>(fullName || "");

  useEffect(() => {
    if (fullName) {
      setDisplayName(fullName);
      return;
    }
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
  }, [fullName]);

  const activeName = displayName || fullName || "";
  const initial = (activeName.trim()?.[0] || "K").toUpperCase();

  const [btnRect, setBtnRect] = useState<ButtonRect>({
    width: 42,
    height: 42,
    top: 20,
    right: 16,
  });

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    setMounted(true);
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

  const openMenu = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const right = Math.max(14, window.innerWidth - rect.right);
    setBtnRect({
      width: rect.width,
      height: rect.height,
      top: rect.top,
      right,
    });

    setIsMounted(true);
    setIsOpen(true);
    setIsClosing(false);
    setIsExpanded(false);

    if (prefersReducedMotion) {
      setIsExpanded(true);
      return;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsExpanded(true);
      });
    });
  };

  const closeMenu = useCallback(() => {
    if (!isOpen || isClosing) return;

    if (prefersReducedMotion) {
      setIsExpanded(false);
      setIsClosing(false);
      setIsOpen(false);
      setIsMounted(false);
      buttonRef.current?.focus();
      return;
    }

    setIsClosing(true);
    setIsExpanded(false);

    const timer = setTimeout(() => {
      setIsMounted(false);
      setIsOpen(false);
      setIsClosing(false);
      buttonRef.current?.focus();
    }, 280);

    return () => clearTimeout(timer);
  }, [isOpen, isClosing, prefersReducedMotion]);

  // Lock scroll on background while open
  useEffect(() => {
    if (isMounted && !isClosing) {
      const prevBodyOverflow = document.body.style.overflow;
      const prevHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";

      return () => {
        document.body.style.overflow = prevBodyOverflow;
        document.documentElement.style.overflow = prevHtmlOverflow;
      };
    }
  }, [isMounted, isClosing]);

  // Close on route change
  useEffect(() => {
    if (isOpen) {
      closeMenu();
    }
  }, [pathname]);

  // Focus trap and Esc key
  useEffect(() => {
    if (!isMounted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeMenu();
        return;
      }

      if (e.key === "Tab" && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMounted, closeMenu]);

  // Auto-focus close button when opened
  useEffect(() => {
    if (isMounted && isExpanded && !isClosing && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [isMounted, isExpanded, isClosing]);

  const links = useMemo(() => {
    const list: Array<{ href: string; label: string }> = [
      { href: "/perfil", label: "Meu Perfil" },
    ];

    if (canUseHours) {
      list.push({ href: "/historico", label: "Histórico e Progresso" });
      list.push({ href: "/relatorio", label: "Relatório Mensal" });
    }

    if (isElderOrAdmin) {
      list.push({ href: "/convidar", label: "Permissões e Convites" });
    }

    return list;
  }, [canUseHours, isElderOrAdmin]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={openMenu}
        aria-expanded={isOpen}
        aria-controls="nav-menu-panel"
        aria-label="Abrir menu de perfil e conta"
        title={activeName ? `Perfil de ${activeName}` : "Menu de perfil"}
        className={cn(
          "w-[42px] h-[42px] min-h-[42px] rounded-full",
          "bg-[var(--surface)] border border-[var(--border)] shadow-xs",
          "flex items-center justify-center shrink-0 cursor-pointer",
          "hover:opacity-95 active:scale-95 transition-all duration-100",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
          isMounted ? "invisible pointer-events-none" : "visible"
        )}
      >
        <span className="font-display text-lg font-medium text-[var(--primary)] select-none">
          {initial}
        </span>
      </button>

      {mounted && isMounted && createPortal(
        <>
          {/* Backdrop with light dimming and 6px blur */}
          <div
            className="fixed inset-0 z-50 bg-black/25 backdrop-blur-[6px]"
            style={{
              opacity: isExpanded && !isClosing ? 1 : 0,
              transition: prefersReducedMotion
                ? "none"
                : isExpanded && !isClosing
                ? "opacity 420ms cubic-bezier(.2,.8,.2,1)"
                : "opacity 280ms cubic-bezier(.2,.8,.2,1)",
              willChange: "opacity",
            }}
            onClick={closeMenu}
            aria-hidden="true"
          />

          {/* Morphing Panel (Estilo America.gov) */}
          <div
            ref={panelRef}
            id="nav-menu-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Menu principal"
            className={cn(
              "fixed z-50 overflow-hidden",
              "border border-[var(--border)]",
              "shadow-[0_20px_50px_rgba(0,0,0,0.18)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)]",
              "p-4 sm:p-5 flex flex-col"
            )}
            style={{
              top: `${btnRect.top}px`,
              right: `${btnRect.right}px`,
              width: "min(calc(100vw - 28px), 360px)",
              maxWidth: "calc(100vw - 28px)",
              borderRadius: "28px",
              backgroundColor: "var(--surface)",
              clipPath: isExpanded && !isClosing
                ? "inset(0px 0px 0px 0px round 28px)"
                : `inset(0px 0px calc(100% - ${btnRect.height}px) calc(100% - ${btnRect.width}px) round 999px)`,
              transition: prefersReducedMotion
                ? "none"
                : isExpanded && !isClosing
                ? "clip-path 420ms cubic-bezier(.2,.8,.2,1)"
                : "clip-path 280ms cubic-bezier(.2,.8,.2,1)",
              willChange: "clip-path",
            }}
          >
            {/* Top row: 3 circular buttons (32px) for theme + sync status on top-left, circular Close on top-right */}
            <div
              className="flex items-center justify-between pb-3"
              style={{
                opacity: isExpanded && !isClosing ? 1 : 0,
                transition: prefersReducedMotion ? "none" : "opacity 160ms ease-out 60ms",
              }}
            >
              {/* Top-left: Theme toggles + Sync status */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSetTheme("light")}
                  aria-label="Tema claro"
                  title="Tema claro"
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                    themeMode === "light"
                      ? "bg-[var(--primary)] text-white shadow-xs"
                      : "bg-black/5 dark:bg-white/10 text-[var(--ink-muted)] hover:text-[var(--ink)]"
                  )}
                >
                  <Sun size={15} />
                </button>

                <button
                  type="button"
                  onClick={() => handleSetTheme("dark")}
                  aria-label="Tema escuro"
                  title="Tema escuro"
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                    themeMode === "dark"
                      ? "bg-[var(--primary)] text-white shadow-xs"
                      : "bg-black/5 dark:bg-white/10 text-[var(--ink-muted)] hover:text-[var(--ink)]"
                  )}
                >
                  <Moon size={15} />
                </button>

                <button
                  type="button"
                  onClick={() => handleSetTheme("system")}
                  aria-label="Tema do sistema"
                  title="Tema do sistema"
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                    themeMode === "system"
                      ? "bg-[var(--primary)] text-white shadow-xs"
                      : "bg-black/5 dark:bg-white/10 text-[var(--ink-muted)] hover:text-[var(--ink)]"
                  )}
                >
                  <Laptop size={15} />
                </button>

                {/* Sync status circle (32px) */}
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-colors ml-0.5",
                    isOnline
                      ? "text-[var(--success)] bg-[var(--success)]/10"
                      : "text-[var(--alert)] bg-[var(--alert)]/10"
                  )}
                  title={isOnline ? "Sincronizado e online" : "Offline (sincronizará ao reconectar)"}
                  aria-label={isOnline ? "Sincronizado" : "Offline"}
                >
                  {isOnline ? <CloudCheck size={16} /> : <CloudAlert size={16} />}
                </div>
              </div>

              {/* Top-right: Circular Close button */}
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeMenu}
                aria-label="Fechar menu"
                className={cn(
                  "w-8 h-8 rounded-full",
                  "flex items-center justify-center",
                  "text-[var(--ink)] hover:text-[var(--primary)]",
                  "bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15",
                  "transition-colors active:scale-95",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                )}
              >
                <X size={18} strokeWidth={2.25} />
              </button>
            </div>

            {/* Cabeçalho interno discreto: Nome do usuário */}
            {activeName && (
              <div
                className="pt-1 pb-2 text-center border-b border-[var(--border)]/40 mb-1"
                style={{
                  opacity: isExpanded && !isClosing ? 1 : 0,
                  transition: prefersReducedMotion ? "none" : "opacity 160ms ease-out 80ms",
                }}
              >
                <p className="text-[11px] uppercase tracking-wider font-sans font-medium text-[var(--ink-muted)]">
                  Conta
                </p>
                <p className="font-display font-medium text-base text-[var(--ink)] truncate mt-0.5">
                  {activeName}
                </p>
              </div>
            )}

            {/* Panel Body: Links in serif (font-display), centered horizontally, text-2xl */}
            <nav
              className="flex flex-col items-center justify-center py-4 space-y-1.5"
              aria-label="Destinos do menu"
            >
              {links.map((item, index) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href || pathname.startsWith(item.href + "/");

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    onClick={() => {
                      lightTap();
                      closeMenu();
                    }}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "w-full text-center py-2 px-3 rounded-2xl min-h-[44px] flex items-center justify-center",
                      "transition-all duration-150",
                      "hover:bg-black/[0.04] dark:hover:bg-white/5",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                      isActive
                        ? "text-[var(--primary)] font-semibold"
                        : "text-[var(--ink)] hover:text-[var(--primary)] font-normal"
                    )}
                    style={{
                      opacity: isExpanded && !isClosing ? 1 : 0,
                      transform: isExpanded && !isClosing ? "translateY(0)" : "translateY(8px)",
                      transition: prefersReducedMotion
                        ? "none"
                        : isExpanded && !isClosing
                        ? "opacity 240ms ease-out, transform 240ms cubic-bezier(.2,.8,.2,1)"
                        : "opacity 140ms ease, transform 140ms ease",
                      transitionDelay: prefersReducedMotion
                        ? "0ms"
                        : isExpanded && !isClosing
                        ? `${100 + index * 35}ms`
                        : "0ms",
                    }}
                  >
                    <span className="font-display text-[25px] tracking-tight leading-tight">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </>,
        document.body
      )}
    </>
  );
}
