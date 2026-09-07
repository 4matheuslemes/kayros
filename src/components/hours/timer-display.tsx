"use client";

import type { TimerState } from "@/hooks/use-timer";
import { cn } from "@/lib/utils";
import { Clock, Bookmark } from "lucide-react";
import { format } from "date-fns";

interface TimerDisplayProps {
  elapsed: number; // seconds
  state: TimerState;
  startedAt?: number | null;
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

export function TimerDisplay({ elapsed, state, startedAt }: TimerDisplayProps) {
  const isStarted = state !== "idle" && state !== "finished";

  return (
    <div className="w-full">
      <div className="flex flex-col items-center pt-8 pb-6">
        <div
          className={cn(
            "text-center transition-colors duration-300 px-4",
            state === "running" ? "text-[var(--primary)]" :
            state === "paused"  ? "text-[var(--ink-muted)]" :
            state === "finished"? "text-[var(--accent)]" :
            "text-[var(--ink)] opacity-70"
          )}
        >
          <h2 className="font-display font-medium text-[44px] tracking-tight leading-none mb-2">
            {state === "idle" ? "Pronto" : (
              elapsed < 3600 
                ? `${Math.floor(elapsed / 60)}m` 
                : `${Math.floor(elapsed / 3600)}h${Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0')}`
            )}
          </h2>
          <div className="text-[15px] italic text-[var(--ink-muted)]">
            {state === "idle" ? "para começar" : "de pregação hoje"}
          </div>
        </div>

        {/* Pulsing indicator */}
        {state === "running" && (
          <div className="mt-4 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
            <span className="text-xs font-medium text-[var(--success)] uppercase tracking-wider">Ativo</span>
          </div>
        )}
      </div>

      {isStarted && (
        <>
          {/* Ticket Divider */}
          <div className="relative w-full h-8 flex items-center justify-center my-2">
            <div className="absolute inset-x-0 h-px border-t-2 border-dashed border-[var(--border)]" />
            <div className="absolute left-[-28px] top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[var(--app-bg)] shadow-[inset_-2px_0_4px_-2px_rgba(0,0,0,0.1)]" />
            <div className="absolute right-[-28px] top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[var(--app-bg)] shadow-[inset_2px_0_4px_-2px_rgba(0,0,0,0.1)]" />
          </div>

          {/* Metadata Chips */}
          <div className="flex items-center justify-center gap-2 pb-2">
            {startedAt && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-[var(--surface-hover)] rounded-full text-xs font-medium text-[var(--ink-muted)]">
                <Clock size={12} />
                Início {format(new Date(startedAt), "HH:mm")}
              </div>
            )}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-[var(--surface-hover)] rounded-full text-xs font-medium text-[var(--ink-muted)]">
              <Bookmark size={12} className="text-[var(--accent)]" />
              Convencional
            </div>
          </div>
        </>
      )}
    </div>
  );
}
