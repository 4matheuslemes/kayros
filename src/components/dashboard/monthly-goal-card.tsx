"use client";

import { Target, TrendingUp, Flame } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";
import { calculateMonthlyGoal } from "@/lib/goals/calculate-monthly-goal";

interface MonthlyGoalCardProps {
  completedMinutes: number;
  goalHours: number;
  workingDays: number[];
}

export function MonthlyGoalCard({ completedMinutes, goalHours, workingDays }: MonthlyGoalCardProps) {
  const goalMinutes = goalHours * 60;
  const pct         = Math.min(100, (completedMinutes / goalMinutes) * 100);
  const goalMet     = completedMinutes >= goalMinutes;

  const calc = calculateMonthlyGoal({
    today: new Date(),
    hoursGoal: goalHours,
    hoursDone: completedMinutes / 60,
    workingDays,
  });

  const completedHrs = (completedMinutes / 60).toFixed(1);
  const daysLeft     = calc.scheduledDaysRemaining;
  
  // format pace
  const paceH = Math.floor(calc.idealHoursPerScheduledDay);
  const paceM = Math.round((calc.idealHoursPerScheduledDay - paceH) * 60);
  const paceText = calc.idealHoursPerScheduledDay === Infinity 
    ? "—" 
    : paceH > 0 && paceM > 0 
      ? `${paceH}h${paceM}m/dia prog.`
      : paceH > 0
        ? `${paceH}h/dia prog.`
        : `${paceM}m/dia prog.`;

  return (
    <Card className="overflow-hidden">
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
        <div className="flex items-baseline gap-1.5">
          <span className="font-display font-semibold text-2xl text-[var(--ink)]">
            {completedHrs}h
          </span>
          <span className="text-body-sm text-[var(--ink-muted)]">
            de {goalHours}h
          </span>
        </div>
      </div>

      <ProgressBar value={pct} size="md" goalMet={goalMet} showLabel />

      <div className="mt-2 flex items-center gap-4 pt-2">
        <div className={`flex items-center gap-1.5 ${
          calc.status === 'impossible' ? 'text-red-500' :
          calc.status === 'tight' ? 'text-amber-500' :
          'text-[var(--ink-muted)]'
        }`}>
          <Flame size={14} />
          <span className="text-xs font-sans">
            {goalMet
              ? "Meta atingida — continue!"
              : calc.status === 'impossible'
                ? "Inviável nos dias prog."
                : calc.status === 'tight'
                  ? `Puxado, ≈ ${paceText}`
                  : `≈ ${paceText}`
            }
          </span>
        </div>
        {!goalMet && (
          <div className="ml-auto flex items-center gap-1.5 text-[var(--ink-muted)]">
            <TrendingUp size={14} />
            <span className="text-xs font-sans">{daysLeft} dias prog.</span>
          </div>
        )}
      </div>
    </Card>
  );
}
