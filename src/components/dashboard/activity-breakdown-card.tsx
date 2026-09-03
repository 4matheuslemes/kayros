"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart } from "lucide-react";
import { ACTIVITY_CATEGORIES, ACTIVITY_COLORS } from "@/lib/constants";
import type { DailyRecord } from "@/lib/db/dexie";
import { formatDuration, cn } from "@/lib/utils";

interface ActivityBreakdownCardProps {
  records: DailyRecord[];
}

export function ActivityBreakdownCard({ records }: ActivityBreakdownCardProps) {
  // Calculate total minutes per category
  const totals = ACTIVITY_CATEGORIES.map((cat) => {
    const minutes = records
      .filter((r) => r.category === cat.value)
      .reduce((sum, r) => sum + r.duration_minutes, 0);
    return { ...cat, minutes };
  }).filter((cat) => cat.minutes > 0); // Only show categories with logged time

  // Sort by highest duration
  totals.sort((a, b) => b.minutes - a.minutes);

  const totalMonthMinutes = records.reduce((sum, r) => sum + r.duration_minutes, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart size={18} className="text-[var(--primary)]" />
          Atividades do Mês
        </CardTitle>
      </CardHeader>
      
      {totals.length === 0 ? (
        <p className="text-body-sm text-[var(--ink-muted)] pt-2 pb-4 text-center">
          Nenhuma atividade registrada ainda.
        </p>
      ) : (
        <div className="flex flex-col gap-4 mt-2">
          {totals.map((cat) => {
            const percentage = totalMonthMinutes > 0 
              ? Math.round((cat.minutes / totalMonthMinutes) * 100) 
              : 0;

            return (
              <div key={cat.value} className="flex flex-col gap-1.5">
                <div className="flex justify-between items-end">
                  <span className="text-body-sm text-[var(--ink)] font-medium">
                    {cat.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-caption text-[var(--ink-muted)]">
                      {percentage}%
                    </span>
                    <span className="text-body-sm font-sans font-semibold text-[var(--ink)] tabular-nums">
                      {formatDuration(cat.minutes)}
                    </span>
                  </div>
                </div>
                {/* Mini progress bar */}
                <div className="h-1.5 w-full bg-[var(--background)] rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full rounded-full transition-all duration-500 ease-out", ACTIVITY_COLORS[cat.value] || "bg-[var(--accent)]")} 
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
