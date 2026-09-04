"use client";

import { useMemo } from "react";
import { format, isSameDay, parseISO, addDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, BookOpen, User } from "lucide-react";
import { useAllVisits, useContacts } from "@/lib/db/hooks";
import { ISO_DAY_TO_STRING } from "@/lib/goals/calculate-monthly-goal";
import type { Profile } from "@/lib/db/dexie";
import { formatHours } from "@/lib/format";
import Link from "next/link";

interface AgendaCalendarProps {
  userId: string;
  profile: Profile;
}

type AgendaEvent = {
  id: string;
  contactId: string;
  title: string;
  time?: string;
  type: "visit" | "study";
};

export function AgendaCalendar({ userId, profile }: AgendaCalendarProps) {
  const { visits } = useAllVisits(userId);
  const { contacts } = useContacts(userId);
  const weeklySchedule = profile.weekly_schedule || {};
  const activeWorkingDays = profile.working_days || [];

  const today = startOfDay(new Date());

  const latestVisits = useMemo(() => {
    const map = new Map();
    const sortedVisits = [...visits].sort((a, b) => 
      parseISO(b.visit_date).getTime() - parseISO(a.visit_date).getTime()
    );
    for (const v of sortedVisits) {
      if (!map.has(v.contact_id)) {
        map.set(v.contact_id, v);
      }
    }
    return Array.from(map.values());
  }, [visits]);
  
  // Helper to get events for a specific date
  const getEventsForDate = (date: Date) => {
    const isoDay = date.getDay() === 0 ? 7 : date.getDay();
    const dayKey = ISO_DAY_TO_STRING[isoDay];
    
    const plannedMins = activeWorkingDays.includes(isoDay)
      ? (weeklySchedule[dayKey] ?? 0)
      : 0;
      
    // 1. One-off visits
    const dayVisits = latestVisits.filter(v => v.next_visit_date && isSameDay(parseISO(v.next_visit_date), date));
    
    // 2. Recurring studies
    // A recurring study appears if:
    // - status is "estudo_ativo"
    // - study_days includes isoDay
    const dayStudies = contacts.filter(c => 
      c.status === "estudo_ativo" && 
      c.study_days?.includes(isoDay)
    );

    const mergedEvents: AgendaEvent[] = [];

    // Add visits
    for (const v of dayVisits) {
      mergedEvents.push({
        id: `v-${v.id}`,
        contactId: v.contact_id,
        title: v.contact_name,
        time: v.next_visit_time, // HH:MM
        type: "visit"
      });
    }

    // Add studies
    for (const c of dayStudies) {
      mergedEvents.push({
        id: `s-${c.id}-${isoDay}`,
        contactId: c.id,
        title: c.name,
        time: c.study_time,
        type: "study"
      });
    }

    // Sort by time (events without time go to the end)
    mergedEvents.sort((a, b) => {
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time) return -1;
      if (b.time) return 1;
      return 0;
    });
    
    return { plannedMins, events: mergedEvents };
  };

  const todayEvents = getEventsForDate(today);
  const hasTodayEvents = todayEvents.plannedMins > 0 || todayEvents.events.length > 0;

  // Get upcoming events for the rest of the current week
  const upcomingDaysWithEvents = useMemo(() => {
    const days = [];
    for (let i = 1; i <= 6; i++) {
      const date = addDays(today, i);
      
      // Stop if the date crosses into the next week (assuming week starts on Monday)
      // isoDay: 1=Mon, ..., 7=Sun. If we hit a Monday, we're in the next week.
      const isoDay = date.getDay() === 0 ? 7 : date.getDay();
      if (isoDay === 1) break; // Reached next Monday
      
      const dayData = getEventsForDate(date);
      if (dayData.plannedMins > 0 || dayData.events.length > 0) {
        days.push({ date, ...dayData });
      }
    }
    return days;
  }, [today, activeWorkingDays, weeklySchedule, latestVisits, contacts]); // added latestVisits, contacts as dep

  const overdueVisits = useMemo(() => {
    return latestVisits.filter(v => {
      if (!v.next_visit_date) return false;
      const date = parseISO(v.next_visit_date);
      // is past and NOT today
      if (date.getTime() < today.getTime() && !isSameDay(date, today)) {
        // limit to 60 days overdue
        const diffTime = Math.abs(today.getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 60;
      }
      return false;
    }).sort((a, b) => parseISO(a.next_visit_date!).getTime() - parseISO(b.next_visit_date!).getTime());
  }, [latestVisits, today]);

  const renderEvent = (event: AgendaEvent) => {
    const isStudy = event.type === "study";
    const Icon = isStudy ? BookOpen : User;
    const colorClass = isStudy ? "text-[var(--success)] border-[var(--success)] bg-[var(--success)]/10" : "text-[var(--primary)] border-[var(--primary)] bg-[var(--primary)]/10";
    const textClass = isStudy ? "text-[var(--success)]" : "text-[var(--primary)]";

    return (
      <Link key={event.id} href={`/contatos/${event.contactId}`}>
        <div className={`pl-2 border-l-[3px] py-1.5 rounded-r-md hover:brightness-95 transition-all ${colorClass}`}>
          <div className={`text-[13px] font-bold leading-tight truncate flex items-center gap-1.5 ${textClass}`}>
            <Icon size={12} className="flex-shrink-0" />
            {event.title}
          </div>
          <div className={`text-[11px] font-medium leading-tight mt-0.5 ${textClass}`}>
            {event.time ? event.time : "Sem horário"}
          </div>
        </div>
      </Link>
    );
  };

  return (
    <Card className="overflow-hidden shadow-sm border-[var(--border)] bg-[var(--surface)] dark:bg-[var(--surface-dark)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays size={18} className="text-[var(--primary)]" />
          Agenda da Semana
        </CardTitle>
      </CardHeader>
      <div className="grid grid-cols-2 gap-4 h-full">
        
        {/* Left Side: Today */}
        <div className="flex flex-col h-full pt-1">
          <div className="mb-4">
            <h3 className="text-[11px] sm:text-xs font-display font-semibold text-red-500 uppercase tracking-widest mb-1">
              {format(today, "EEEE", { locale: ptBR })}
            </h3>
            <span className="text-[54px] sm:text-[64px] leading-none font-display font-semibold text-[var(--ink)] tracking-tight ml-[-2px]">
              {format(today, "d")}
            </span>
          </div>

          <div className="flex-1 flex flex-col justify-end pb-2">
            {!hasTodayEvents ? (
              <p className="text-[15px] sm:text-[17px] text-[var(--ink-muted)] leading-tight">Nenhum Evento Hoje</p>
            ) : (
              <div className="space-y-2">
                {todayEvents.plannedMins > 0 && (
                  <div className="pl-2 border-l-[3px] border-[var(--accent)] py-1.5 bg-[var(--accent)]/10 rounded-r-md">
                    <div className="text-[13px] font-bold text-[var(--accent)] leading-tight truncate">
                      Planejado
                    </div>
                    <div className="text-[11px] font-medium text-[var(--accent)] leading-tight mt-0.5">
                      {formatHours(todayEvents.plannedMins / 60)} de campo
                    </div>
                  </div>
                )}
                
                {todayEvents.events.map(renderEvent)}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Upcoming & Overdue */}
        <div className="flex flex-col space-y-4">
          {upcomingDaysWithEvents.length === 0 && overdueVisits.length === 0 ? (
            <div className="flex-1 flex items-end pb-2">
              <p className="text-[15px] text-[var(--ink-muted)]">Sem eventos futuros</p>
            </div>
          ) : (
            <div className="space-y-4 pb-2">
              {/* OVERDUE */}
              {overdueVisits.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <h4 className="text-[10px] sm:text-[11px] font-bold text-red-500 uppercase tracking-wider flex items-center gap-1">
                    Pendências
                  </h4>
                  <div className="space-y-1.5">
                    {overdueVisits.map(visit => {
                      const date = parseISO(visit.next_visit_date!);
                      return (
                        <Link key={visit.id} href={`/contatos/${visit.contact_id}`}>
                          <div className="pl-2 border-l-[3px] border-red-500 py-1.5 bg-red-50 dark:bg-red-950/20 rounded-r-md hover:brightness-95 transition-all">
                            <div className="text-[13px] font-bold text-red-600 dark:text-red-400 leading-tight truncate">
                              {visit.contact_name}
                            </div>
                            <div className="text-[10px] font-medium text-red-500 leading-tight mt-0.5">
                              Atrasada — era dia {format(date, "d/MM")}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* UPCOMING */}
              {upcomingDaysWithEvents.slice(0, 3).map(({ date, plannedMins, events }) => (
                <div key={date.toISOString()} className="flex flex-col gap-1.5">
                  <h4 className="text-[10px] sm:text-[11px] font-bold text-[var(--ink-muted)] uppercase tracking-wider">
                    {format(date, "EEEE, d 'DE' MMM.", { locale: ptBR })}
                  </h4>
                  <div className="space-y-1.5">
                    {plannedMins > 0 && (
                      <div className="pl-2 border-l-[3px] border-[var(--accent)] py-1.5 bg-[var(--accent)]/10 rounded-r-md">
                        <div className="text-[13px] font-bold text-[var(--accent)] leading-tight truncate">
                          Planejado
                        </div>
                        <div className="text-[11px] font-medium text-[var(--accent)] leading-tight mt-0.5">
                          {formatHours(plannedMins / 60)} de campo
                        </div>
                      </div>
                    )}
                    {events.map(renderEvent)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </Card>
  );
}
