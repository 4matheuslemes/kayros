"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * BottomSheet / Drawer — slides up from the bottom on mobile.
 * Controlled component: manage open state from parent.
 */
interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Drawer({ open, onClose, title, description, children, className }: DrawerProps) {
  // Close on Escape
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Lock body scroll when open
  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-[fade-in_0.15s_ease-out]"
        onClick={onClose}
        aria-hidden
      />

      {/* Sheet */}
      <div
        className={cn(
          "relative z-10 bg-[var(--surface)] border-t border-[var(--border)]",
          "rounded-t-lg px-5 pt-4 pb-8 max-h-[90dvh] overflow-y-auto",
          "animate-[slide-up_0.25s_cubic-bezier(0.32,0.72,0,1)]",
          className
        )}
      >
        {/* Drag handle */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--border)]" aria-hidden />

        {/* Header */}
        {(title || description) && (
          <div className="mb-5">
            {title && (
              <h2 className="font-display font-semibold text-lg text-[var(--ink)]">{title}</h2>
            )}
            {description && (
              <p className="text-body-sm text-[var(--ink-muted)] mt-1">{description}</p>
            )}
          </div>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-[var(--background)] transition-colors"
          aria-label="Fechar"
        >
          <X className="h-4 w-4 text-[var(--ink-muted)]" />
        </button>

        {children}
      </div>
    </div>
  );
}
