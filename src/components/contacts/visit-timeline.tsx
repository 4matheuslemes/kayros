"use client";

import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MessageSquare, Calendar, CheckCircle2, Pencil } from "lucide-react";
import type { VisitHistory } from "@/lib/db/dexie";
import { Button } from "@/components/ui/button";

interface VisitTimelineProps {
  visits: VisitHistory[];
  onMarkAsDone?: () => void;
  onEditVisit?: (visit: VisitHistory) => void;
}

export function VisitTimeline({ visits, onMarkAsDone, onEditVisit }: VisitTimelineProps) {
  if (visits.length === 0) {
    return (
      <p className="p-8 text-center text-[var(--ink-muted)] border border-dashed rounded-lg mt-4">
        Nenhuma visita registrada ainda.
      </p>
    );
  }

  const latestVisit = visits[0];
  const isPending = !!latestVisit.next_visit_date;

  // Group by day (same as historico-client)
  const groupedByDay = visits.reduce((acc, visit) => {
    const d = format(parseISO(visit.visit_date), "dd/MM · EEEE", { locale: ptBR });
    if (!acc[d]) acc[d] = [];
    acc[d].push(visit);
    return acc;
  }, {} as Record<string, typeof visits>);

  return (
    <div className="flex flex-col gap-6 mt-2">
      {/* Pending Banner */}
      {isPending && (
        <div className="bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-lg p-3 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div>
            <p className="text-caption font-bold text-[var(--accent)] uppercase tracking-wide flex items-center gap-1.5 mb-0.5">
              <Calendar size={12} />
              Próxima visita agendada
            </p>
            <p className="text-body-sm font-medium text-[var(--ink)]">
              {format(parseISO(latestVisit.next_visit_date!), "d 'de' MMMM", { locale: ptBR })}
              {latestVisit.next_visit_time && ` às ${latestVisit.next_visit_time}`}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={onMarkAsDone} className="bg-white dark:bg-black whitespace-nowrap">
            <CheckCircle2 size={16} className="mr-1.5 text-[var(--success)]" />
            Marcar como feita
          </Button>
        </div>
      )}

      {/* Grouped History List */}
      <div className="flex flex-col gap-6">
        {Object.entries(groupedByDay).map(([dayLabel, dayVisits]) => (
          <div key={dayLabel} className="flex flex-col">
            <h3 className="text-label font-bold text-[var(--primary)] uppercase tracking-wide mb-2 px-1 capitalize">
              {dayLabel}
            </h3>
            <div className="flex flex-col">
              {dayVisits.map((visit) => {
                const hasNotes = !!visit.notes;
                const isThePendingOne = visit.id === latestVisit.id && isPending;
                
                return (
                  <div
                    key={visit.id}
                    className="w-full flex flex-col py-3 px-1 border-t border-[var(--border)] first:border-t-0 text-left"
                  >
                    <div className="flex items-start justify-between gap-4">
                      
                      {/* Left: Notes Preview */}
                      <div className="flex items-start gap-2 flex-1 min-w-0 mt-0.5">
                        <span className="w-2 h-2 rounded-full bg-[var(--primary)] flex-shrink-0 mt-1.5" />
                        {hasNotes ? (
                          <span className="text-body-sm text-[var(--ink)] font-medium line-clamp-3">
                            {visit.notes}
                          </span>
                        ) : (
                          <span className="text-body-sm text-[var(--ink-muted)] opacity-70 italic font-medium">
                            Sem notas
                          </span>
                        )}
                      </div>
                      
                      {/* Right: Next visit badge */}
                      {!isThePendingOne && visit.next_visit_date && (
                        <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                          <div className="flex items-center gap-1 text-[var(--accent)] text-[10px] font-bold bg-[var(--accent)]/10 px-1.5 py-0.5 rounded uppercase tracking-wide">
                            <Calendar size={10} />
                            {format(parseISO(visit.next_visit_date), "d/MM")}
                          </div>
                        </div>
                      )}
                      
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
