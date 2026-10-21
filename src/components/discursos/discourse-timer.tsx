"use client";

import { useState } from "react";
import { Play, Pause, RotateCcw, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useDiscourseTimer,
  formatElapsed,
  getDiscourseTimerState,
  type DiscourseTimerState,
} from "@/hooks/use-discourse-timer";
import { cn } from "@/lib/utils";

interface DiscourseTimerProps {
  /** Estimativa de duração em minutos — pré-preenche o campo de alvo */
  estimatedMinutes?: number;
}

const STATE_COLORS: Record<DiscourseTimerState, string> = {
  none: "text-[var(--ink-muted)]",
  ok: "text-[var(--ink-muted)]",
  warning: "text-[var(--accent)]",
  over: "text-[var(--alert)]",
};

export function DiscourseTimer({ estimatedMinutes }: DiscourseTimerProps) {
  const { elapsed, running, toggle, reset } = useDiscourseTimer();

  // Alvo em minutos (string do input), convertido para segundos
  const [targetInput, setTargetInput] = useState(
    estimatedMinutes ? String(estimatedMinutes) : ""
  );
  const [showTargetInput, setShowTargetInput] = useState(false);

  const targetSeconds = targetInput
    ? Math.max(1, parseInt(targetInput, 10)) * 60
    : null;

  const state = getDiscourseTimerState(elapsed, targetSeconds);
  const displayColor = STATE_COLORS[state];

  const remaining =
    targetSeconds !== null ? targetSeconds - elapsed : null;

  return (
    <div className="discourse-timer flex items-center gap-1">
      {/* ── DISPLAY PRINCIPAL ─────────────────────── */}
      <button
        type="button"
        onClick={() => setShowTargetInput((v) => !v)}
        className={cn(
          "discourse-timer-display flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[var(--border)] bg-[var(--surface)] cursor-pointer transition-colors",
          displayColor,
          running && "discourse-timer-display--running border-[var(--accent)]/50"
        )}
        title="Definir tempo-alvo em minutos"
        aria-label="Mostrar configuração de tempo-alvo"
      >
        <Timer size={14} className="shrink-0" />
        <span className="discourse-timer-elapsed font-mono tabular-nums text-xs font-semibold">
          {formatElapsed(elapsed)}
        </span>

        {/* Tempo restante discreto */}
        {remaining !== null && (
          <span className="discourse-timer-remaining text-[10px] font-medium opacity-75">
            {remaining >= 0
              ? `−${formatElapsed(remaining)}`
              : `+${formatElapsed(Math.abs(remaining))}`}
          </span>
        )}
      </button>

      {/* ── CONTROLES ─────────────────────────────── */}
      <div className="discourse-timer-controls flex items-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggle}
          aria-label={running ? "Pausar" : "Iniciar"}
          className="h-7 w-7 text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--background)] rounded-full"
        >
          {running ? <Pause size={14} /> : <Play size={14} />}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={reset}
          aria-label="Reiniciar cronômetro"
          className="h-7 w-7 text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--background)] rounded-full"
        >
          <RotateCcw size={13} />
        </Button>
      </div>

      {/* ── INPUT DE TEMPO-ALVO (toggle) ─────────── */}
      {showTargetInput && (
        <div className="discourse-timer-target flex items-center gap-1 px-1.5 py-0.5 border border-[var(--border)] rounded-lg bg-[var(--background)]">
          <input
            id="discourse-timer-target-input"
            type="number"
            min={1}
            max={180}
            value={targetInput}
            onChange={(e) => setTargetInput(e.target.value)}
            placeholder="min"
            className="discourse-timer-target-input w-10 text-xs font-medium text-[var(--ink)] bg-transparent border-none outline-none text-right"
            aria-label="Duração alvo em minutos"
          />
          <span className="discourse-timer-target-label text-[10px] text-[var(--ink-muted)]">
            min
          </span>
        </div>
      )}
    </div>
  );
}
