"use client";

import Link from "next/link";
import { ChevronRight, BookOpen, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Contact } from "@/lib/db/dexie";
import { STUDY_BOOKS } from "@/lib/study-books";

interface ContactCardProps {
  contact: Contact;
}

export function ContactCard({ contact }: ContactCardProps) {
  const initials = contact.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const currentUnitLabel = contact.study_book_id && contact.study_current_unit_id
    ? STUDY_BOOKS.find(b => b.id === contact.study_book_id)?.units.find(u => u.id === contact.study_current_unit_id)?.label
    : null;

  return (
    <Link
      href={`/contatos/${contact.id}`}
      className={cn(
        "flex items-center gap-4 px-5 py-4",
        "hover:bg-[var(--background)] transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]"
      )}
    >
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
            <div className="flex gap-1 items-center flex-shrink-0">
              <Badge variant="success">
                <BookOpen size={10} />
                Estudo
              </Badge>
              {currentUnitLabel && (
                <Badge variant="default" className="bg-[var(--surface)] border border-[var(--border)] text-[var(--ink-muted)]">
                  {currentUnitLabel}
                </Badge>
              )}
            </div>
          )}
        </div>
        {contact.address && (
          <p className="text-caption text-[var(--ink-muted)] truncate mt-0.5">
            {contact.address}
          </p>
        )}
      </div>

      <ChevronRight size={16} className="flex-shrink-0 text-[var(--ink-muted)]" />
    </Link>
  );
}
