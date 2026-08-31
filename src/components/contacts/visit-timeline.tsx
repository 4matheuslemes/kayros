"use client";

import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MessageSquare, Calendar } from "lucide-react";
import type { VisitHistory } from "@/lib/db/dexie";
import { cn } from "@/lib/utils";

interface VisitTimelineProps {
  visits: VisitHistory[];
}

export function VisitTimeline({ visits }: VisitTimelineProps) {
  if (visits.length === 0) {
    return (
      <p className="text-body-sm text-[var(--ink-muted)] text-center py-6">
        Nenhuma visita registrada ainda.
      </p>
    );
  }

  return (
    <ol className="relative pl-6">
      {/* Timeline line */}
      <div className="absolute left-2 top-0 bottom-0 w-px bg-[var(--border)]" aria-hidden />

      {visits.map((visit, i) => (
        <li key={visit.id} className={cn("relative pb-5", i === visits.length - 1 && "pb-0")}>
          {/* Dot */}
          <div
            className={cn(
              "absolute -left-4 top-1 w-2.5 h-2.5 rounded-full border-2 border-[var(--surface)]",
              i === 0 ? "bg-[var(--primary)]" : "bg-[var(--border)]"
            )}
          />

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 ml-2">
            {/* Date */}
            <div className="flex items-center gap-1.5 text-caption text-[var(--ink-muted)] mb-2">
              <Calendar size={12} />
              {format(parseISO(visit.visit_date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </div>

            {/* Notes */}
            {visit.notes && (
              <div className="flex gap-2">
                <MessageSquare size={14} className="flex-shrink-0 mt-0.5 text-[var(--ink-muted)]" />
                <p className="text-body-sm text-[var(--ink)] leading-relaxed">
                  {visit.notes}
                </p>
              </div>
            )}

            {/* Next visit */}
            {visit.next_visit_date && (
              <div className="mt-2 pt-2 border-t border-[var(--border)] flex items-center gap-1.5 text-caption text-[var(--accent)]">
                <Calendar size={12} />
                Próxima visita: {format(parseISO(visit.next_visit_date), "d/MM/yyyy")}
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
