"use client";

import { Play, Pause, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TimerState } from "@/hooks/use-timer";

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
    <div className="flex justify-center items-center gap-10 w-full pt-6 pb-2">
      {state === "idle" && (
        <Button
          variant="primary"
          size="lg"
          onClick={onStart}
          className="w-full max-w-xs h-14 rounded-full text-base font-medium shadow-sm"
          id="timer-start"
        >
          <Play size={20} className="mr-2" />
          Iniciar pregação
        </Button>
      )}

      {state === "running" && (
        <>
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onPause}
              className="flex items-center justify-center w-[72px] h-[72px] rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--ink)] active:scale-95 transition-transform"
              id="timer-pause"
            >
              <Pause size={28} fill="currentColor" />
            </button>
            <span className="text-xs text-[var(--ink-muted)] font-medium">Pausar</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onFinish}
              className="flex items-center justify-center w-[72px] h-[72px] rounded-full bg-[var(--accent)] text-[var(--ink)] shadow-md active:scale-95 transition-transform"
              id="timer-finish"
            >
              <Check size={34} />
            </button>
            <span className="text-xs text-[var(--ink-muted)] font-medium">Finalizar</span>
          </div>
        </>
      )}

      {state === "paused" && (
        <>
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onReset}
              className="flex items-center justify-center w-[72px] h-[72px] rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--ink)] active:scale-95 transition-transform"
              id="timer-reset"
            >
              <X size={34} />
            </button>
            <span className="text-xs text-[var(--ink-muted)] font-medium">Zerar</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onResume}
              className="flex items-center justify-center w-[72px] h-[72px] rounded-full bg-[var(--accent)] text-[var(--ink)] shadow-md active:scale-95 transition-transform"
              id="timer-resume"
            >
              <Play size={32} fill="currentColor" className="ml-1" />
            </button>
            <span className="text-xs text-[var(--ink-muted)] font-medium">Retomar</span>
          </div>
        </>
      )}

      {state === "finished" && (
        <Button
          variant="ghost"
          size="lg"
          onClick={onReset}
          className="text-[var(--ink-muted)]"
          id="timer-new"
        >
          Nova sessão
        </Button>
      )}
    </div>
  );
}
