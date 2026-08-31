"use client";

import Link from "next/link";
import { CalendarDays, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { format, isPast, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { VisitHistory } from "@/lib/db/dexie";

type UpcomingVisit = VisitHistory & { contact_name: string };

interface UpcomingVisitsCardProps {
  visits: UpcomingVisit[];
}

export function UpcomingVisitsCard({ visits }: UpcomingVisitsCardProps) {
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="p-5 pb-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays size={18} className="text-[var(--primary)]" />
            Próximas visitas
          </CardTitle>
        </CardHeader>
      </div>

      {visits.length === 0 ? (
        <EmptyState
          title="Nenhuma visita agendada"
          description="Ao registrar uma visita, defina a próxima data — ela aparece aqui."
          className="py-8"
        />
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {visits.map((v) => {
            const date = parseISO(v.next_visit_date!);
            const overdue = isPast(date);

            return (
              <li key={v.id}>
                <Link
                  href={`/contatos/${v.contact_id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-[var(--background)] transition-colors duration-150"
                >
                  <div
                    className={cn(
                      "flex-shrink-0 w-10 text-center",
                      overdue
                        ? "text-red-500"
                        : "text-[var(--primary)]"
                    )}
                  >
                    {overdue ? (
                      <AlertCircle size={20} className="mx-auto" />
                    ) : (
                      <>
                        <div className="text-xs font-sans font-semibold leading-none uppercase">
                          {format(date, "MMM", { locale: ptBR })}
                        </div>
                        <div className="font-display font-semibold text-lg leading-tight">
                          {format(date, "d")}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-sans font-medium text-sm text-[var(--ink)] truncate">
                      {v.contact_name}
                    </p>
                    <p className={cn(
                      "text-caption truncate",
                      overdue ? "text-red-500" : "text-[var(--ink-muted)]"
                    )}>
                      {overdue
                        ? `Atrasada — era ${format(date, "d/MM", { locale: ptBR })}`
                        : format(date, "EEEE", { locale: ptBR })}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <div className="px-5 py-3 border-t border-[var(--border)]">
        <Link
          href="/contatos"
          className="text-xs font-medium font-sans text-[var(--primary)] hover:underline"
        >
          Ver todos os contatos
        </Link>
      </div>
    </Card>
  );
}
