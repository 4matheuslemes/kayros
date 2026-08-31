"use client";

import Link from "next/link";
import { ChevronRight, BookOpen, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Contact } from "@/lib/db/dexie";

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
    </Link>
  );
}
