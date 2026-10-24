"use client";

import { Play, Pause, X, Check, RotateCcw } from "lucide-react";
import type { TimerState } from "@/hooks/use-timer";
import { cn } from "@/lib/utils";

interface TimerControlsProps {
  state: TimerState;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  onReset: () => void;
}

export function TimerControls({
  state,
  onStart,
  onPause,
  onResume,
  onFinish,
  onReset,
}: TimerControlsProps) {
  return (
    <div className="flex justify-center items-center w-full pt-2 pb-2">
      {state === "idle" && (
        <button
          type="button"
          onClick={onStart}
          id="timer-start"
          className={cn(
            "w-full max-w-xs h-13 sm:h-14 rounded-full font-semibold text-sm sm:text-base",
            "bg-[var(--primary)] text-white shadow-sm",
            "flex items-center justify-center gap-2",
            "hover:opacity-95 active:scale-95 transition-all duration-150 cursor-pointer",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          )}
        >
          <Play size={18} fill="currentColor" />
          <span>Iniciar pregação</span>
        </button>
      )}

      {state === "running" && (
        <div className="flex items-center gap-8 sm:gap-10">
          {/* Botão Pausar */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={onPause}
              id="timer-pause"
              aria-label="Pausar cronômetro"
              className={cn(
                "w-14 h-14 sm:w-16 sm:h-16 rounded-full",
                "bg-[var(--surface)] border border-[var(--border)] text-[var(--ink)]",
                "shadow-xs hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-all",
                "flex items-center justify-center cursor-pointer",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              )}
            >
              <Pause size={22} fill="currentColor" />
            </button>
            <span className="text-xs text-[var(--ink-muted)] font-medium">Pausar</span>
          </div>

          {/* Botão Finalizar */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={onFinish}
              id="timer-finish"
              aria-label="Finalizar e salvar"
              className={cn(
                "w-14 h-14 sm:w-16 sm:h-16 rounded-full",
                "bg-[var(--primary)] text-white",
                "shadow-sm hover:opacity-95 active:scale-90 transition-all",
                "flex items-center justify-center cursor-pointer",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              )}
            >
              <Check size={26} strokeWidth={2.5} />
            </button>
            <span className="text-xs text-[var(--ink-muted)] font-medium">Finalizar</span>
          </div>
        </div>
      )}

      {state === "paused" && (
        <div className="flex items-center gap-8 sm:gap-10">
          {/* Botão Zerar */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={onReset}
              id="timer-reset"
              aria-label="Zerar sessão"
              className={cn(
                "w-14 h-14 sm:w-16 sm:h-16 rounded-full",
                "bg-[var(--surface)] border border-[var(--border)] text-[var(--ink-muted)] hover:text-[var(--alert)]",
                "shadow-xs hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-all",
                "flex items-center justify-center cursor-pointer",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              )}
            >
              <RotateCcw size={22} />
            </button>
            <span className="text-xs text-[var(--ink-muted)] font-medium">Zerar</span>
          </div>

          {/* Botão Retomar */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={onResume}
              id="timer-resume"
              aria-label="Retomar pregação"
              className={cn(
                "w-14 h-14 sm:w-16 sm:h-16 rounded-full",
                "bg-[var(--primary)] text-white",
                "shadow-sm hover:opacity-95 active:scale-90 transition-all",
                "flex items-center justify-center cursor-pointer",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              )}
            >
              <Play size={22} fill="currentColor" className="ml-0.5" />
            </button>
            <span className="text-xs text-[var(--ink-muted)] font-medium">Retomar</span>
          </div>
        </div>
      )}

      {state === "finished" && (
        <button
          type="button"
          onClick={onReset}
          id="timer-new"
          className="px-5 py-2.5 rounded-full text-xs font-semibold bg-[var(--surface)] border border-[var(--border)] text-[var(--ink)] shadow-xs hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          Iniciar nova sessão
        </button>
      )}
    </div>
  );
}
