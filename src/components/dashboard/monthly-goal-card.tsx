"use client";

import { Target, TrendingUp, Flame } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";
import { formatDuration, daysRemainingInMonth, requiredPace } from "@/lib/utils";

interface MonthlyGoalCardProps {
  completedMinutes: number;
  goalHours: number;
}

export function MonthlyGoalCard({ completedMinutes, goalHours }: MonthlyGoalCardProps) {
  const goalMinutes  = goalHours * 60;
  const pct          = Math.min(100, (completedMinutes / goalMinutes) * 100);
  const goalMet      = completedMinutes >= goalMinutes;
  const daysLeft     = daysRemainingInMonth();
  const pace         = requiredPace(goalHours, completedMinutes, daysLeft);
  const completedHrs = (completedMinutes / 60).toFixed(1);

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target size={18} className="text-[var(--primary)]" />
          Meta do mês
        </CardTitle>
        {goalMet && (
          <span className="text-xs font-medium text-[var(--accent)] font-sans">
            Meta atingida ✦
          </span>
        )}
      </CardHeader>

      {/* Big number */}
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

      {/* Pace row */}
      <div className="mt-4 flex items-center gap-4 pt-4 border-t border-[var(--border)]">
        <div className="flex items-center gap-1.5 text-[var(--ink-muted)]">
          <Flame size={14} />
          <span className="text-xs font-sans">
            {goalMet
              ? "Meta atingida — continue!"
              : `${pace}h/dia para fechar`}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-[var(--ink-muted)]">
          <TrendingUp size={14} />
          <span className="text-xs font-sans">{daysLeft} dias restantes</span>
        </div>
      </div>
    </Card>
  );
}
