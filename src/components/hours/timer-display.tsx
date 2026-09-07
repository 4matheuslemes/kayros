"use client";

import type { TimerState } from "@/hooks/use-timer";
import { cn } from "@/lib/utils";

interface TimerDisplayProps {
  elapsed: number; // seconds
  state: TimerState;
}

function getProgressMessage(elapsedSeconds: number): string {
  if (elapsedSeconds === 0) return "Pronto para começar";
  if (elapsedSeconds < 60) return "Iniciando...";

  const totalMinutes = Math.floor(elapsedSeconds / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (h === 0) {
    return `Você já fez ${m} minuto${m !== 1 ? 's' : ''}`;
  }

  if (m === 0) {
    return `Você já fez ${h} hora${h !== 1 ? 's' : ''} de pregação`;
  }

  return `Você já fez ${h}h${m.toString().padStart(2, '0')} de pregação`;
}

export function TimerDisplay({ elapsed, state }: TimerDisplayProps) {
  return (
    <div className="flex flex-col items-center py-6">
      <div
        className={cn(
          "text-center transition-colors duration-300 px-4",
          state === "running" ? "text-[var(--primary)]" :
          state === "paused"  ? "text-[var(--ink-muted)]" :
          state === "finished"? "text-[var(--accent)]" :
          "text-[var(--ink)] opacity-70"
        )}
      >
        <h2 className="font-display font-medium text-3xl tracking-tight leading-snug">
          {state === "idle" ? "Pronto para começar" : getProgressMessage(elapsed)}
        </h2>
      </div>
      <div className="mt-3 text-sm text-[var(--ink-muted)]">
        {state === "idle"     && "Toque em iniciar quando estiver pronto"}
        {state === "running"  && "Pregação em andamento…"}
        {state === "paused"   && "Cronômetro pausado"}
        {state === "finished" && "Tempo finalizado"}
      </div>

      {/* Pulsing indicator */}
      {state === "running" && (
        <div className="mt-4 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
          <span className="text-caption text-[var(--success)]">Ativo</span>
        </div>
      )}
    </div>
  );
}
