"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { lightTap } from "@/lib/haptics";
import { useUserPermissions } from "@/contexts/user-permissions-context";
import { ThemeToggle } from "@/components/layout/theme-toggle";

interface ButtonRect {
  width: number;
  height: number;
  top: number;
  right: number;
}

export function NavMenu() {
  const { talksAccess, isElder, isAdmin } = useUserPermissions();
  const pathname = usePathname();

  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [btnRect, setBtnRect] = useState<ButtonRect>({
    width: 76,
    height: 40,
    top: 20,
    right: 16,
  });

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

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

    // Trigger expansion in next frame
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
    const list = [
      { href: "/", label: "Início" },
      { href: "/contatos", label: "Interessados" },
      { href: "/historico", label: "Histórico" },
    ];

    if (talksAccess) {
      list.push({ href: "/discursos", label: "Discursos" });
    }

    if (isElder) {
      list.push({ href: "/irmaos", label: "Irmãos" });
      list.push({ href: "/pastoreio", label: "Registro de Pastoreio" });
    }

    list.push({ href: "/perfil", label: "Perfil" });

    if (isAdmin) {
      list.push({ href: "/convidar", label: "Convidar" });
    }

    return list;
  }, [talksAccess, isElder, isAdmin]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={openMenu}
        aria-expanded={isOpen}
        aria-controls="nav-menu-panel"
        aria-label="Abrir menu"
        className={cn(
          "h-10 px-4 rounded-full font-sans font-semibold text-sm",
          "bg-[var(--primary)] text-white shadow-sm",
          "flex items-center justify-center shrink-0 min-h-[44px]",
          "hover:opacity-95 active:scale-95 transition-transform duration-100",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
          isMounted ? "invisible pointer-events-none" : "visible"
        )}
      >
        Menu
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

          {/* Morphing Panel */}
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
              "p-3 flex flex-col"
            )}
            style={{
              top: `${btnRect.top}px`,
              right: `${btnRect.right}px`,
              width: "min(calc(100vw - 28px), 340px)",
              maxWidth: "calc(100vw - 28px)",
              borderRadius: "28px",
              backgroundColor: isExpanded && !isClosing ? "var(--surface)" : "var(--primary)",
              clipPath: isExpanded && !isClosing
                ? "inset(0px 0px 0px 0px round 28px)"
                : `inset(0px 0px calc(100% - ${btnRect.height}px) calc(100% - ${btnRect.width}px) round 999px)`,
              transition: prefersReducedMotion
                ? "none"
                : isExpanded && !isClosing
                ? "clip-path 420ms cubic-bezier(.2,.8,.2,1), background-color 160ms cubic-bezier(.2,.8,.2,1)"
                : "clip-path 280ms cubic-bezier(.2,.8,.2,1), background-color 200ms ease",
              willChange: "clip-path, background-color",
            }}
          >
            {/* Header row with Close button in the exact same spot */}
            <div
              className="flex items-center justify-end px-1"
              style={{ height: `${btnRect.height}px` }}
            >
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeMenu}
                aria-label="Fechar menu"
                className={cn(
                  "w-10 h-10 min-w-[44px] min-h-[44px] rounded-full",
                  "flex items-center justify-center",
                  "text-[var(--ink)] hover:text-[var(--primary)]",
                  "bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15",
                  "transition-colors active:scale-95",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                )}
                style={{
                  opacity: isExpanded && !isClosing ? 1 : 0,
                  transition: prefersReducedMotion ? "none" : "opacity 160ms ease-out 80ms",
                }}
              >
                <X size={20} strokeWidth={2.25} />
              </button>
            </div>

            {/* Links list */}
            <nav className="flex flex-col gap-0.5 px-2 pt-1 pb-1" aria-label="Destinos do menu">
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
                      "group flex items-center justify-between px-3 py-2 rounded-2xl min-h-[44px]",
                      "transition-colors duration-150",
                      "hover:bg-black/[0.04] dark:hover:bg-white/5",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                      isActive
                        ? "text-[var(--ink)] font-semibold"
                        : "text-[var(--ink-muted)] hover:text-[var(--ink)] font-normal"
                    )}
                    style={{
                      opacity: isExpanded && !isClosing ? 1 : 0,
                      transform: isExpanded && !isClosing ? "translateY(0)" : "translateY(6px)",
                      transition: prefersReducedMotion
                        ? "none"
                        : isExpanded && !isClosing
                        ? "opacity 220ms ease-out, transform 220ms cubic-bezier(.2,.8,.2,1)"
                        : "opacity 140ms ease, transform 140ms ease",
                      transitionDelay: prefersReducedMotion
                        ? "0ms"
                        : isExpanded && !isClosing
                        ? `${140 + index * 40}ms`
                        : "0ms",
                    }}
                  >
                    <span className="font-display text-2xl tracking-tight leading-tight">
                      {item.label}
                    </span>
                    {isActive && (
                      <span
                        className="w-2 h-2 rounded-full bg-[var(--accent)] shrink-0"
                        aria-hidden="true"
                      />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Divider */}
            <div
              className="my-2 mx-3 border-t border-[var(--border)]"
              style={{
                opacity: isExpanded && !isClosing ? 1 : 0,
                transform: isExpanded && !isClosing ? "translateY(0)" : "translateY(6px)",
                transition: prefersReducedMotion
                  ? "none"
                  : isExpanded && !isClosing
                  ? "opacity 220ms ease-out, transform 220ms cubic-bezier(.2,.8,.2,1)"
                  : "opacity 140ms ease, transform 140ms ease",
                transitionDelay: prefersReducedMotion
                  ? "0ms"
                  : isExpanded && !isClosing
                  ? `${140 + links.length * 40}ms`
                  : "0ms",
              }}
            />

            {/* In-Panel Theme Toggle */}
            <div
              className="px-2 pb-1"
              style={{
                opacity: isExpanded && !isClosing ? 1 : 0,
                transform: isExpanded && !isClosing ? "translateY(0)" : "translateY(6px)",
                transition: prefersReducedMotion
                  ? "none"
                  : isExpanded && !isClosing
                  ? "opacity 220ms ease-out, transform 220ms cubic-bezier(.2,.8,.2,1)"
                  : "opacity 140ms ease, transform 140ms ease",
                transitionDelay: prefersReducedMotion
                  ? "0ms"
                  : isExpanded && !isClosing
                  ? `${140 + (links.length + 1) * 40}ms`
                  : "0ms",
              }}
            >
              <ThemeToggle variant="menu" onToggle={() => lightTap()} />
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}
