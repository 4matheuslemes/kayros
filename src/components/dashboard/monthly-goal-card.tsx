"use client";

import { Target, Clock, CalendarDays, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { calculateMonthlyGoal } from "@/lib/goals/calculate-monthly-goal";
import { cn } from "@/lib/utils";
import { formatHours } from "@/lib/format";
import { useAnimatedNumber } from "@/hooks/use-animated-number";

interface MonthlyGoalCardProps {
  completedMinutes: number;
  goalHours: number;
  workingDays: number[];
  weeklySchedule?: Record<string, number>;
}

export function MonthlyGoalCard({ completedMinutes, goalHours, workingDays, weeklySchedule }: MonthlyGoalCardProps) {
  const goalMinutes = goalHours * 60;
  const rawHoursDone = completedMinutes / 60;
  const goalMet = completedMinutes >= goalMinutes;

  const calc = calculateMonthlyGoal({
    today: new Date(),
    hoursGoal: goalHours,
    hoursDone: rawHoursDone,
    workingDays,
    weeklySchedule,
  });

  const animatedHoursDone = useAnimatedNumber(rawHoursDone);
  const animatedPct = Math.min(100, (animatedHoursDone / goalHours) * 100);
  const hoursRemaining = Math.max(0, goalHours - animatedHoursDone);

  const daysLeft = calc.scheduledDaysRemaining;
  
  // format pace
  const paceH = Math.floor(calc.idealHoursPerScheduledDay);
  const paceM = Math.round((calc.idealHoursPerScheduledDay - paceH) * 60);

  const statusColorText = goalMet ? 'text-[var(--success)]' :
    calc.status === 'impossible' ? 'text-red-500' :
    calc.status === 'tight' ? 'text-[var(--accent)]' :
    'text-[var(--success)]';

  const statusColorBorder = goalMet ? 'border-l-[var(--success)]' :
    calc.status === 'impossible' ? 'border-l-red-500' :
    calc.status === 'tight' ? 'border-l-[var(--accent)]' :
    'border-l-[var(--success)]';

  const statusColorBg = goalMet ? 'bg-[var(--success)]/5' :
    calc.status === 'impossible' ? 'bg-red-500/5' :
    calc.status === 'tight' ? 'bg-[var(--accent)]/5' :
    'bg-[var(--success)]/5';

  const PaceIcon = calc.paceStatus === "ahead" ? TrendingUp :
                   calc.paceStatus === "behind" ? TrendingDown : Minus;
  
  const paceBadgeVariant = calc.paceStatus === "ahead" ? "success" :
                           calc.paceStatus === "behind" ? "accent" : "default";

  const paceLabel = calc.paceStatus === "ahead" ? "Adiantado" :
                    calc.paceStatus === "behind" ? "Atrasado" : "No ritmo";

  return (
    <Card className={cn("overflow-hidden border-l-4 transition-colors duration-500", statusColorBorder, statusColorBg)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target size={18} className="text-[var(--primary)]" />
          Meta do mês
        </CardTitle>
        {goalMet && (
          <span className="text-xs font-medium text-[var(--success)] font-sans">
            Meta atingida ✦
          </span>
        )}
      </CardHeader>

      <div className="mb-4">
        <div className="flex items-baseline gap-1.5 mb-1">
          <span className={cn("font-display font-semibold text-2xl transition-all duration-300", statusColorText)}>
            {formatHours(animatedHoursDone)}
          </span>
          <span className="text-body-sm text-[var(--ink-muted)]">
            de {formatHours(goalHours)}
          </span>
        </div>
        {!goalMet && (
          <div className="text-sm font-medium text-[var(--ink)]">
            Faltam {formatHours(hoursRemaining)}
          </div>
        )}
      </div>

      <div className="flex justify-between items-end mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-caption text-[var(--ink-muted)]">Progresso</span>
          {calc.totalScheduledDaysInMonth > 0 && !goalMet && (
            <Badge variant={paceBadgeVariant} className="px-1.5 py-0">
              <PaceIcon size={12} className="mr-0.5" />
              {paceLabel}
            </Badge>
          )}
        </div>
        <span className={cn("text-sm font-semibold font-sans", goalMet ? "text-[var(--success)]" : "text-[var(--ink)]")}>
          {animatedPct.toFixed(0)}%
        </span>
      </div>
      
      <ProgressBar value={animatedPct} size="md" goalMet={goalMet} status={calc.status} showLabel={false} />

      {!goalMet && (
        <>
          <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-[var(--border)]">
            <div>
              <div className="flex items-center gap-1.5 text-[var(--ink-muted)] mb-1">
                <Clock size={16} />
                <span className={cn("font-display font-semibold text-lg", statusColorText)}>
                  {calc.idealHoursPerScheduledDay === Infinity ? "—" : `${paceH}h${paceM}m`}
                </span>
              </div>
              <span className="text-xs text-[var(--ink-muted)] leading-tight block">
                por dia programado<br/>para bater a meta
              </span>
            </div>
            <div>
               <div className="flex items-center gap-1.5 text-[var(--ink-muted)] mb-1">
                <CalendarDays size={16} />
                <span className={cn("font-display font-semibold text-lg", statusColorText)}>
                  {daysLeft}
                </span>
              </div>
              <span className="text-xs text-[var(--ink-muted)] leading-tight block">
                dias programados restantes
              </span>
            </div>
          </div>
          
          {calc.status === 'tight' && (
            <p className="text-xs text-[var(--ink-muted)] mt-4">Você precisará exceder bastante sua programação normal para bater a meta.</p>
          )}
          {calc.status === 'impossible' && (
            <p className="text-xs text-red-500 mt-4">Meta não é mais alcançável com a programação deste mês.</p>
          )}
        </>
      )}
    </Card>
  );
}
