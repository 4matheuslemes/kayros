"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart2 } from "lucide-react";
import { getServiceYear } from "@/lib/utils";
import type { DailyRecord } from "@/lib/db/dexie";

const MONTHS_PT = ["Setembro", "Outubro", "Novembro", "Dezembro", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto"];

interface ServiceYearSummaryProps {
  records: DailyRecord[];
  goalHours: number;
}

export function ServiceYearSummary({ records, goalHours }: ServiceYearSummaryProps) {
  const serviceYear = getServiceYear();
  const now = new Date();
  
  // Create an array for the 12 months of the service year
  const monthsData = Array.from({ length: 12 }, (_, i) => {
    const monthIdx = (i + 8) % 12; // 0=Jan.. 8=Sep
    const year = monthIdx >= 8 ? serviceYear : serviceYear + 1;
    const monthStr = `${year}-${String(monthIdx + 1).padStart(2, "0")}`;
    
    const minutes = records
      .filter((r) => r.date.startsWith(monthStr))
      .reduce((sum, r) => sum + r.duration_minutes, 0);
      
    // Determine if this month is in the past, current, or future
    const isFuture = year > now.getFullYear() || (year === now.getFullYear() && monthIdx > now.getMonth());
    const isCurrent = year === now.getFullYear() && monthIdx === now.getMonth();
    
    return { 
      label: MONTHS_PT[i], 
      minutes, 
      isFuture,
      isCurrent
    };
  }).filter(m => !m.isFuture);

  const totalMinutesYear = monthsData.reduce((acc, m) => acc + m.minutes, 0);
  const totalHoursYear = +(totalMinutesYear / 60).toFixed(1);
  const goalMinutes = goalHours * 60;
  const monthsGoalMet = monthsData.filter(m => m.minutes >= goalMinutes).length;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart2 size={18} className="text-[var(--primary)]" />
          Ano de serviço {serviceYear}/{serviceYear + 1}
        </CardTitle>
      </CardHeader>
      
      <div className="flex flex-col mb-6 mt-2">
        <span className="font-display font-semibold text-3xl text-[var(--ink)]">
          {totalHoursYear}h
        </span>
        <span className="text-body-sm text-[var(--ink-muted)]">
          {monthsGoalMet} de 12 meses com meta atingida
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {monthsData.map((month) => {
          const percentage = goalMinutes > 0 ? Math.min(100, Math.round((month.minutes / goalMinutes) * 100)) : 0;
          const hours = +(month.minutes / 60).toFixed(1);
          const goalMet = month.minutes >= goalMinutes;
          
          let barColor = "bg-[var(--primary)]"; 
          if (goalMet) barColor = "bg-[var(--success)]";
          else if (!month.isCurrent) barColor = "bg-[var(--accent)]"; 
          
          return (
            <div key={month.label} className="flex flex-col gap-1.5">
              <div className="flex justify-between items-end">
                <span className="text-body-sm text-[var(--ink)] font-medium capitalize">
                  {month.label}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-caption text-[var(--ink-muted)]">
                    {percentage}%
                  </span>
                  <span className="text-body-sm font-sans font-semibold text-[var(--ink)] tabular-nums">
                    {hours}h
                  </span>
                </div>
              </div>
              <div className="h-1.5 w-full bg-[var(--background)] rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`} 
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
