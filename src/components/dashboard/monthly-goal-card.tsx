"use client";

import { useState } from "react";
import { Target, Clock, CalendarDays, Plus } from "lucide-react";
import { ProgressBar } from "@/components/ui/progress";
import { Drawer } from "@/components/ui/drawer";
import { ManualEntryForm } from "@/components/hours/manual-entry-form";
import { calculateMonthlyGoal } from "@/lib/goals/calculate-monthly-goal";
import { cn } from "@/lib/utils";
import { formatHours } from "@/lib/format";
import { useAnimatedNumber } from "@/hooks/use-animated-number";

interface MonthlyGoalCardProps {
  completedMinutes: number;
  goalHours: number;
  workingDays: number[];
  weeklySchedule?: Record<string, number>;
  userId?: string;
  onRecordSaved?: () => void;
  className?: string;
}

export function MonthlyGoalCard({
  completedMinutes,
  goalHours,
  workingDays,
  weeklySchedule,
  userId,
  onRecordSaved,
  className,
}: MonthlyGoalCardProps) {
  const [manualDrawerOpen, setManualDrawerOpen] = useState(false);

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

  // Format pace per day
  const paceH = Math.floor(calc.idealHoursPerScheduledDay);
  const paceM = Math.round((calc.idealHoursPerScheduledDay - paceH) * 60);

  return (
    <>
      <div
        className={cn(
          "rounded-[36px] lg:rounded-[40px]",
          "bg-[var(--panel)]",
          "p-6 sm:p-8 lg:p-9",
          "shadow-xs border-0",
          "flex flex-col justify-between",
          className
        )}
      >
        {/* Header: Title + Option to add manual hours */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
              <Target size={16} />
            </div>
            <h3 className="font-display font-medium text-lg sm:text-xl text-[var(--ink)]">
              Meta do mês
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {goalMet ? (
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[var(--success)]/15 text-[var(--success)] font-sans">
                Meta atingida ✦
              </span>
            ) : userId ? (
              <button
                type="button"
                onClick={() => setManualDrawerOpen(true)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full",
                  "bg-[var(--surface)] text-[var(--ink)] text-xs font-semibold",
                  "hover:bg-black/5 dark:hover:bg-white/10 border border-[var(--border)]",
                  "shadow-xs transition-colors cursor-pointer"
                )}
                aria-label="Lançar horas manuais"
              >
                <Plus size={13} className="text-[var(--primary)]" />
                <span>Lançar horas</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Big Numbers Display */}
        <div className="mb-6">
          <div className="flex items-baseline gap-2">
            <span className="font-display font-medium text-3xl sm:text-4xl text-[var(--ink)] tracking-tight">
              {formatHours(animatedHoursDone)}
            </span>
            <span className="text-sm sm:text-base text-[var(--ink-muted)] font-medium">
              de {formatHours(goalHours)}
            </span>
          </div>

          {!goalMet && (
            <p className="text-sm font-medium text-[var(--ink-muted)] mt-1">
              Faltam {formatHours(hoursRemaining)}
            </p>
          )}
        </div>

        {/* Progress Bar */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-baseline">
            <span className="text-xs font-medium text-[var(--ink-muted)]">Progresso</span>
            <span
              className={cn(
                "text-sm font-semibold font-sans",
                goalMet ? "text-[var(--success)]" : "text-[var(--ink)]"
              )}
            >
              {animatedPct.toFixed(0)}%
            </span>
          </div>

          <ProgressBar
            value={animatedPct}
            size="md"
            goalMet={goalMet}
            status={calc.status}
            showLabel={false}
          />
        </div>

        {/* Bottom Metrics: Ritmo por dia + Dias restantes */}
        {!goalMet && (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 mt-6 pt-5 border-t border-[var(--border)]/70">
            {/* Coluna 1: Ritmo ideal */}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 text-[var(--ink)] mb-0.5">
                <Clock size={16} className="text-[var(--primary)] shrink-0" />
                <span className="font-display font-semibold text-lg sm:text-xl truncate">
                  {calc.idealHoursPerScheduledDay === Infinity
                    ? "—"
                    : `${paceH}h ${paceM.toString().padStart(2, "0")}min`}
                </span>
              </div>
              <span className="text-xs text-[var(--ink-muted)] leading-normal">
                por dia programado
              </span>
            </div>

            {/* Coluna 2: Dias restantes */}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 text-[var(--ink)] mb-0.5">
                <CalendarDays size={16} className="text-[var(--primary)] shrink-0" />
                <span className="font-display font-semibold text-lg sm:text-xl truncate">
                  {daysLeft} {daysLeft === 1 ? "dia" : "dias"}
                </span>
              </div>
              <span className="text-xs text-[var(--ink-muted)] leading-normal">
                programados restantes
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Manual Entry Drawer */}
      {userId && (
        <Drawer
          open={manualDrawerOpen}
          onClose={() => setManualDrawerOpen(false)}
          title="Lançar horas manuais"
          description="Registre horas de pregação realizadas"
        >
          <ManualEntryForm
            userId={userId}
            onSaved={() => {
              setManualDrawerOpen(false);
              onRecordSaved?.();
            }}
          />
        </Drawer>
      )}
    </>
  );
}
