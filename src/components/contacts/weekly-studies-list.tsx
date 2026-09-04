"use client";

import { useState, useEffect } from "react";
import { format, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { getDb, type Contact, type VisitHistory } from "@/lib/db/dexie";
import { STUDY_BOOKS } from "@/lib/study-books";
import { EmptyState } from "@/components/ui/empty-state";
import { BookOpen } from "lucide-react";

interface WeeklyStudiesListProps {
  contacts: Contact[];
}

const DAYS_OF_WEEK = [
  { id: 1, label: "Segunda-feira" },
  { id: 2, label: "Terça-feira" },
  { id: 3, label: "Quarta-feira" },
  { id: 4, label: "Quinta-feira" },
  { id: 5, label: "Sexta-feira" },
  { id: 6, label: "Sábado" },
  { id: 7, label: "Domingo" },
];

export function WeeklyStudiesList({ contacts }: WeeklyStudiesListProps) {
  const [visitsThisWeek, setVisitsThisWeek] = useState<VisitHistory[]>([]);

  useEffect(() => {
    async function fetchVisits() {
      const db = getDb();
      const now = new Date();
      // Use weekStartsOn: 1 (Monday)
      const start = startOfWeek(now, { weekStartsOn: 1 });
      const end = endOfWeek(now, { weekStartsOn: 1 });
      
      const allVisits = await db.visit_history.toArray();
      const thisWeekVisits = allVisits.filter(v => {
        const d = new Date(v.visit_date + "T00:00:00");
        return isWithinInterval(d, { start, end });
      });
      
      setVisitsThisWeek(thisWeekVisits);
    }
    fetchVisits();
  }, []);

  // Filter contacts that have active study and specific days
  const studyContacts = contacts.filter(c => 
    c.status === "estudo_ativo" && c.study_days && c.study_days.length > 0
  );

  if (studyContacts.length === 0) {
    return (
      <EmptyState
        icon={<BookOpen size={28} />}
        title="Nenhum estudo agendado"
        description="Configure os dias da semana na ficha de um estudo ativo para vê-lo aqui."
      />
    );
  }

  // Group by day
  const grouped = DAYS_OF_WEEK.map(day => ({
    ...day,
    studies: studyContacts.filter(c => c.study_days!.includes(day.id))
  })).filter(g => g.studies.length > 0);

  return (
    <div className="flex flex-col gap-6">
      {grouped.map(group => (
        <div key={group.id} className="flex flex-col gap-3">
          <h3 className="text-caption uppercase text-[var(--ink-muted)] tracking-wider px-2">
            {group.label}
          </h3>
          <div className="flex flex-col gap-3">
            {group.studies.map(contact => {
              // Calculate if studied this week
              // If study_frequency is 2, they might need 2 visits, but let's just mark it if ANY visit happened this week
              // Or better, if they have at least one visit this week, mark it done. 
              const hasStudied = visitsThisWeek.some(v => v.contact_id === contact.id);

              const currentUnitLabel = contact.study_book_id && contact.study_current_unit_id
                ? STUDY_BOOKS.find(b => b.id === contact.study_book_id)?.units.find(u => u.id === contact.study_current_unit_id)?.label
                : null;

              return (
                <Link key={contact.id} href={`/contatos/${contact.id}`}>
                  <Card className="flex items-center gap-3 p-4 hover:bg-[var(--background)] transition-colors duration-150">
                    <div className="flex-1 min-w-0">
                      <p className="font-sans font-medium text-sm text-[var(--ink)] truncate">
                        {contact.name}
                      </p>
                      {currentUnitLabel && (
                        <p className="text-caption text-[var(--ink-muted)] truncate mt-0.5">
                          {currentUnitLabel}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex-shrink-0 text-[var(--ink-muted)]">
                      {hasStudied ? (
                        <CheckCircle2 size={24} className="text-[var(--success)]" />
                      ) : (
                        <Circle size={24} className="opacity-30" />
                      )}
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
