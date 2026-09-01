"use client";

import { useRef, useState } from "react";
import { Edit2, Trash2, ChevronRight, BookOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Contact } from "@/lib/db/dexie";

interface SwipeableContactRowProps {
  contact: Contact;
  onEdit: (contact: Contact) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
}

export function SwipeableContactRow({ contact, onEdit, onDelete }: SwipeableContactRowProps) {
  const router = useRouter();
  const [offset, setOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startX = useRef<number | null>(null);
  const currentX = useRef<number | null>(null);
  const isDragging = useRef(false);

  const maxOffset = -120; // width of the two buttons

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    isDragging.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startX.current === null) return;
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;

    if (Math.abs(diff) > 5) {
      isDragging.current = true;
    }

    if (diff < 0) {
      setIsSwiping(true);
      const newOffset = Math.max(diff, maxOffset - 20); // allow slightly pulling past the max
      setOffset(newOffset);
    } else {
      setOffset(0);
    }
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    startX.current = null;
    currentX.current = null;

    if (offset < -100) setOffset(-110);
    else setOffset(0);
  };

  const handleClick = (e: React.MouseEvent) => {
    // Prevent navigation if the user was just dragging to reveal buttons
    if (offset !== 0 || isDragging.current) {
      e.preventDefault();
      setOffset(0);
      return;
    }
    router.push(`/contatos/${contact.id}`);
  };

  const initials = contact.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="relative">
      {/* Background Actions Layer */}
      <div className="absolute inset-y-0 right-0 flex items-center justify-end gap-2 pr-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOffset(0);
            onEdit(contact);
          }}
          className="w-12 h-12 rounded-full flex items-center justify-center bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)] transition-colors shadow-sm"
          aria-label="Editar"
        >
          <Edit2 size={18} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOffset(0);
            onDelete(e, contact.id);
          }}
          className="w-12 h-12 rounded-full flex items-center justify-center bg-red-500 text-white hover:bg-red-600 transition-colors shadow-sm"
          aria-label="Excluir"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Foreground Content Layer */}
      <div
        ref={(node) => {
          if (node) {
            // Prevent default touch action (like scrolling) only when swiping horizontally
            node.style.touchAction = "pan-y";
          }
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
        className={cn(
          "relative flex flex-col w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-sm transition-transform cursor-pointer",
          "hover:bg-[var(--background)] duration-150"
        )}
        style={{
          transform: `translateX(${offset}px)`,
          transitionDuration: isSwiping ? "0ms" : "300ms",
        }}
      >
        <div className="flex items-center gap-4 px-5 py-4">
          {/* Avatar */}
          <div
            className={cn(
              "flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center",
              "font-display font-semibold text-base",
              contact.status === "estudo_ativo"
                ? "bg-[var(--success)]/15 text-[var(--success)]"
                : "bg-[var(--primary)]/10 text-[var(--primary)]"
            )}
          >
            {initials}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-sans font-medium text-sm text-[var(--ink)] truncate">
                {contact.name}
              </span>
              {contact.status === "estudo_ativo" && (
                <Badge variant="success" className="flex-shrink-0">
                  <BookOpen size={10} />
                  Estudo
                </Badge>
              )}
            </div>
            {contact.address && (
              <p className="text-caption text-[var(--ink-muted)] truncate mt-0.5">
                {contact.address}
              </p>
            )}
          </div>

          <ChevronRight size={16} className="flex-shrink-0 text-[var(--ink-muted)]" />
        </div>
      </div>
    </div>
  );
}
