"use client";

import type { TimerState } from "@/hooks/use-timer";
import { cn, formatTimerSeconds } from "@/lib/utils";
import { Clock, Bookmark } from "lucide-react";
import { format } from "date-fns";

interface TimerDisplayProps {
  elapsed: number; // seconds
  state: TimerState;
  startedAt?: number | null;
}

export function TimerDisplay({ elapsed, state, startedAt }: TimerDisplayProps) {
  const isStarted = state !== "idle" && state !== "finished";

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

  const displayTime =
    state === "idle"
      ? "00:00"
      : hours > 0
      ? `${hours}h ${minutes.toString().padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`
      : `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  return (
    <div className="w-full flex flex-col items-center">
      <div className="py-6 flex flex-col items-center text-center">
        {/* State Badge */}
        <div className="mb-2">
          {state === "running" ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--success)]/15 text-[var(--success)] text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
              Tempo em andamento
            </span>
          ) : state === "paused" ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
              Cronômetro pausado
            </span>
          ) : (
            <span className="text-xs font-medium text-[var(--ink-muted)]">
              Pronto para começar
            </span>
          )}
        </div>

        {/* Big Serif Digits */}
        <h2
          className={cn(
            "font-display font-medium tracking-tight leading-none mt-2 transition-colors duration-200",
            state === "running"
              ? "text-[var(--primary)]"
              : state === "paused"
              ? "text-[var(--ink-muted)]"
              : "text-[var(--ink)]"
          )}
          style={{ fontSize: "clamp(2.75rem, 8vw, 4.25rem)" }}
        >
          {displayTime}
        </h2>

        <p className="text-sm text-[var(--ink-muted)] mt-2 font-sans">
          {state === "idle"
            ? "Toque para iniciar o registro da sua pregação"
            : state === "running"
            ? "Ministério de campo ativo hoje"
            : "Sessão pausada — retome ou finalize"}
        </p>
      </div>

      {isStarted && (
        <div className="w-full max-w-sm pt-2 pb-4">
          <div className="border-t border-[var(--border)]/70 pt-3 flex items-center justify-center gap-3 flex-wrap">
            {startedAt && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--panel)] rounded-full text-xs font-medium text-[var(--ink-muted)]">
                <Clock size={12} className="text-[var(--primary)]" />
                Início {format(new Date(startedAt), "HH:mm")}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--panel)] rounded-full text-xs font-medium text-[var(--ink-muted)]">
              <Bookmark size={12} className="text-[var(--accent)]" />
              Ministério de campo
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
