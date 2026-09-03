"use client";

import { useMemo } from "react";
import { format, isSameDay, parseISO, addDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";
import { useAllVisits } from "@/lib/db/hooks";
import { ISO_DAY_TO_STRING } from "@/lib/goals/calculate-monthly-goal";
import type { Profile } from "@/lib/db/dexie";
import { formatHours } from "@/lib/format";

interface AgendaCalendarProps {
  userId: string;
  profile: Profile;
}

export function AgendaCalendar({ userId, profile }: AgendaCalendarProps) {
  const { visits } = useAllVisits(userId);
  const weeklySchedule = profile.weekly_schedule || {};
  const activeWorkingDays = profile.working_days || [];

  const today = startOfDay(new Date());
  
  // Helper to get events for a specific date
  const getEventsForDate = (date: Date) => {
    const isoDay = date.getDay() === 0 ? 7 : date.getDay();
    const dayKey = ISO_DAY_TO_STRING[isoDay];
    
    const plannedMins = activeWorkingDays.includes(isoDay)
      ? (weeklySchedule[dayKey] ?? 0)
      : 0;
      
    const dayVisits = visits.filter(v => v.next_visit_date && isSameDay(parseISO(v.next_visit_date), date));
    
    return { plannedMins, dayVisits };
  };

  const todayEvents = getEventsForDate(today);
  const hasTodayEvents = todayEvents.plannedMins > 0 || todayEvents.dayVisits.length > 0;

  // Get upcoming events for the rest of the current week
  const upcomingDaysWithEvents = useMemo(() => {
    const days = [];
    for (let i = 1; i <= 6; i++) {
      const date = addDays(today, i);
      
      // Stop if the date crosses into the next week (assuming week starts on Monday)
      // isoDay: 1=Mon, ..., 7=Sun. If we hit a Monday, we're in the next week.
      const isoDay = date.getDay() === 0 ? 7 : date.getDay();
      if (isoDay === 1) break; // Reached next Monday
      
      const events = getEventsForDate(date);
      if (events.plannedMins > 0 || events.dayVisits.length > 0) {
        days.push({ date, ...events });
      }
    }
    return days;
  }, [today, activeWorkingDays, weeklySchedule, visits]);

  const overdueVisits = useMemo(() => {
    return visits.filter(v => {
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
  }, [visits, today]);

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
                  <div className="pl-2 border-l-[3px] border-[var(--accent)] py-1 bg-[var(--accent)]/10 rounded-r-md">
                    <div className="text-[13px] font-bold text-[var(--accent)] leading-tight truncate">
                      Planejado
                    </div>
                    <div className="text-[11px] font-medium text-[var(--accent)] leading-tight mt-0.5">
                      {formatHours(todayEvents.plannedMins / 60)} de campo
                    </div>
                  </div>
                )}
                
                {todayEvents.dayVisits.map(visit => (
                  <div key={visit.id} className="pl-2 border-l-[3px] border-[var(--success)] py-1 bg-[var(--success)]/10 rounded-r-md">
                    <div className="text-[13px] font-bold text-[var(--success)] leading-tight truncate">
                      Visita: {visit.contact_name}
                    </div>
                    <div className="text-[11px] font-medium text-[var(--success)] leading-tight mt-0.5">
                      {format(parseISO(visit.next_visit_date!), "HH:mm")}
                    </div>
                  </div>
                ))}
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
            <div className="space-y-4">
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
                        <div key={visit.id} className="pl-2.5 border-l-[3px] border-red-500 py-1 bg-red-50 dark:bg-red-950/20 rounded-r-md">
                          <div className="text-[13px] font-bold text-red-600 dark:text-red-400 leading-tight truncate">
                            {visit.contact_name}
                          </div>
                          <div className="text-[10px] font-medium text-red-500 leading-tight mt-0.5">
                            Atrasada — era dia {format(date, "d/MM")}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* UPCOMING */}
              {upcomingDaysWithEvents.slice(0, 3).map(({ date, plannedMins, dayVisits }) => (
                <div key={date.toISOString()} className="flex flex-col gap-1.5">
                  <h4 className="text-[10px] sm:text-[11px] font-bold text-[var(--ink-muted)] uppercase tracking-wider">
                    {format(date, "EEEE, d 'DE' MMM.", { locale: ptBR })}
                  </h4>
                  <div className="space-y-1.5">
                    {plannedMins > 0 && (
                      <div className="pl-2.5 border-l-[3px] border-[var(--accent)] py-1 bg-[var(--accent)]/10 rounded-r-md">
                        <div className="text-[13px] font-bold text-[var(--accent)] leading-tight truncate">
                          Planejado
                        </div>
                        <div className="text-[11px] font-medium text-[var(--accent)] leading-tight mt-0.5">
                          {formatHours(plannedMins / 60)} de campo
                        </div>
                      </div>
                    )}
                    {dayVisits.map(visit => (
                      <div key={visit.id} className="pl-2.5 border-l-[3px] border-[var(--success)] py-1 bg-[var(--success)]/10 rounded-r-md">
                        <div className="text-[13px] font-bold text-[var(--success)] leading-tight truncate">
                          Visita: {visit.contact_name}
                        </div>
                        <div className="text-[11px] font-medium text-[var(--success)] leading-tight mt-0.5">
                          {format(parseISO(visit.next_visit_date!), "HH:mm")}
                        </div>
                      </div>
                    ))}
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
