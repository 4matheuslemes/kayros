"use client";

import { formatTimerSeconds } from "@/lib/utils";
import type { TimerState } from "@/hooks/use-timer";
import { cn } from "@/lib/utils";

interface TimerDisplayProps {
  elapsed: number; // seconds
  state: TimerState;
}

export function TimerDisplay({ elapsed, state }: TimerDisplayProps) {
  return (
    <div className="flex flex-col items-center py-2">
      <div
        className={cn(
          "font-display font-semibold text-5xl leading-none tabular-nums tracking-tight",
          "transition-colors duration-300",
          state === "running" ? "text-[var(--primary)]" :
          state === "paused"  ? "text-[var(--ink-muted)]" :
          state === "finished"? "text-[var(--accent)]" :
          "text-[var(--ink)] opacity-70"
        )}
      >
        {formatTimerSeconds(elapsed)}
      </div>
      <div className="mt-1 text-caption text-[var(--ink-muted)]">
        {state === "idle"     && "Pronto para começar"}
        {state === "running"  && "Pregação em andamento…"}
        {state === "paused"   && "Pausado"}
        {state === "finished" && "Tempo registrado"}
      </div>

      {/* Pulsing indicator */}
      {state === "running" && (
        <div className="mt-2 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
          <span className="text-caption text-[var(--success)]">Ativo</span>
        </div>
      )}
    </div>
  );
}
