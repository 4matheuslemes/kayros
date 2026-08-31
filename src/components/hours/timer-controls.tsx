"use client";

import { Play, Pause, RotateCcw, CheckCircle } from "lucide-react";
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
    <div className="flex flex-col items-center gap-4">
      {state === "idle" && (
        <Button
          variant="primary"
          size="lg"
          onClick={onStart}
          className="w-full max-w-xs"
          id="timer-start"
        >
          <Play size={18} />
          Iniciar pregação
        </Button>
      )}

      {state === "running" && (
        <div className="flex gap-3 w-full max-w-xs">
          <Button
            variant="secondary"
            size="lg"
            onClick={onPause}
            className="flex-1"
            id="timer-pause"
          >
            <Pause size={18} />
            Pausar
          </Button>
          <Button
            variant="accent"
            size="lg"
            onClick={onFinish}
            className="flex-1"
            id="timer-finish"
          >
            <CheckCircle size={18} />
            Finalizar
          </Button>
        </div>
      )}

      {state === "paused" && (
        <div className="flex gap-3 w-full max-w-xs">
          <Button
            variant="ghost"
            size="lg"
            onClick={onReset}
            className="flex-1 text-[var(--ink-muted)]"
            id="timer-reset"
          >
            <RotateCcw size={18} />
            Zerar
          </Button>
          <Button
            variant="primary"
            size="lg"
            onClick={onResume}
            className="flex-1"
            id="timer-resume"
          >
            <Play size={18} />
            Retomar
          </Button>
          <Button
            variant="accent"
            size="lg"
            onClick={onFinish}
            className="flex-1"
            id="timer-finish-paused"
          >
            <CheckCircle size={18} />
            Finalizar
          </Button>
        </div>
      )}

      {state === "finished" && (
        <Button
          variant="ghost"
          size="md"
          onClick={onReset}
          id="timer-new"
        >
          <RotateCcw size={16} />
          Nova sessão
        </Button>
      )}
    </div>
  );
}
