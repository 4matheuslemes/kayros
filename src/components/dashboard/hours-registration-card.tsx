"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Clock,
  Play,
  Pause,
  Check,
  RotateCcw,
  Plus,
  CalendarDays,
  Bookmark,
} from "lucide-react";
import { SaveRecordSheet } from "@/components/hours/save-record-sheet";
import { ManualEntryForm } from "@/components/hours/manual-entry-form";
import { useTimer } from "@/hooks/use-timer";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface HoursRegistrationCardProps {
  userId: string;
  onRecordSaved: () => void;
  className?: string;
}

export function HoursRegistrationCard({
  userId,
  onRecordSaved,
  className,
}: HoursRegistrationCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mode, setMode] = useState<"timer" | "manual">("timer");
  const {
    timerState,
    elapsed,
    elapsedMinutes,
    startedAt,
    start,
    pause,
    resume,
    finish,
    reset,
  } = useTimer();
  const startedRef = useRef(false);

  useEffect(() => {
    if (
      searchParams?.get("quickstart") === "1" &&
      timerState === "idle" &&
      !startedRef.current
    ) {
      startedRef.current = true;
      start();
      router.replace("/");
    }
  }, [searchParams, timerState, start, router]);

  const handleFinish = () => {
    finish();
    setSheetOpen(true);
  };

  const handleSaved = () => {
    reset();
    onRecordSaved();
  };

  const todayDate = new Date();
  const todayFormatted = format(todayDate, "d 'de' MMMM", { locale: ptBR });
  const weekdayFormatted = format(todayDate, "EEEE", { locale: ptBR });
  const capitalizedWeekday =
    weekdayFormatted.charAt(0).toUpperCase() + weekdayFormatted.slice(1);

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

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
        {/* Header: Padronizado com Meta do Mês e Agenda (Ícone em círculo + Título em serifa + Alternador) */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
              <Clock size={16} />
            </div>
            <h3 className="font-display font-medium text-lg sm:text-xl text-[var(--ink)]">
              Registro de tempo
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {mode === "timer" ? (
              timerState === "running" ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--success)]/15 text-[var(--success)] text-xs font-semibold font-sans">
                  <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
                  Em andamento
                </span>
              ) : timerState === "paused" ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] text-xs font-semibold font-sans">
                  <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                  Pausado
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setMode("manual")}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full",
                    "bg-[var(--surface)] text-[var(--ink)] text-xs font-semibold",
                    "hover:bg-black/5 dark:hover:bg-white/10 border border-[var(--border)]",
                    "shadow-xs transition-colors cursor-pointer"
                  )}
                  aria-label="Lançar horas manuais"
                >
                  <Plus size={13} className="text-[var(--primary)]" />
                  <span>Lançar manual</span>
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={() => setMode("timer")}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full",
                  "bg-[var(--surface)] text-[var(--ink)] text-xs font-semibold",
                  "hover:bg-black/5 dark:hover:bg-white/10 border border-[var(--border)]",
                  "shadow-xs transition-colors cursor-pointer"
                )}
                aria-label="Voltar para cronômetro"
              >
                <Clock size={13} className="text-[var(--primary)]" />
                <span>Usar cronômetro</span>
              </button>
            )}
          </div>
        </div>

        {mode === "timer" ? (
          <>
            {/* Números Gigantes em Serifa (Alinhados à Esquerda, idêntico a Meta e Agenda) */}
            <div className="mb-6">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span
                  className={cn(
                    "font-display font-medium text-3xl sm:text-4xl text-[var(--ink)] tracking-tight",
                    timerState === "running" && "text-[var(--primary)]"
                  )}
                >
                  {timerState === "idle"
                    ? "0h 00min"
                    : hours > 0
                    ? `${hours}h ${minutes.toString().padStart(2, "0")}min`
                    : `${minutes}min`}
                </span>

                {timerState !== "idle" && (
                  <span
                    className={cn(
                      "font-display font-medium text-xl sm:text-2xl",
                      timerState === "running"
                        ? "text-[var(--primary)]/70"
                        : "text-[var(--ink-muted)]"
                    )}
                  >
                    {seconds.toString().padStart(2, "0")}s
                  </span>
                )}

                <span className="text-sm sm:text-base text-[var(--ink-muted)] font-medium">
                  {timerState === "idle"
                    ? "de pregação hoje"
                    : timerState === "running"
                    ? "em andamento"
                    : "sessão em pausa"}
                </span>
              </div>

              <p className="text-sm font-medium text-[var(--ink-muted)] mt-1">
                {timerState === "idle"
                  ? "Toque abaixo para iniciar o registro da sua pregação"
                  : timerState === "running"
                  ? startedAt
                    ? `Sessão iniciada hoje às ${format(new Date(startedAt), "HH:mm")}`
                    : "Ministério de campo ativo hoje"
                  : "Sessão pausada — retome ou finalize quando concluir"}
              </p>
            </div>

            {/* Faixa Intermediária de Ação / Barra de Progresso */}
            {timerState === "idle" ? (
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={start}
                  id="timer-start"
                  className={cn(
                    "w-full h-12 sm:h-13 rounded-full font-semibold text-sm sm:text-base",
                    "bg-[var(--primary)] text-white shadow-xs",
                    "flex items-center justify-center gap-2",
                    "hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  )}
                >
                  <Play size={17} fill="currentColor" />
                  <span>Iniciar pregação</span>
                </button>
              </div>
            ) : timerState === "running" ? (
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-medium text-[var(--ink-muted)]">
                    Status da sessão
                  </span>
                  <span className="text-sm font-semibold font-sans text-[var(--success)] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
                    Contabilizando
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-black/5 dark:bg-white/10 overflow-hidden relative">
                  <div className="h-full bg-[var(--success)] rounded-full animate-pulse w-full transition-all duration-300" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-medium text-[var(--ink-muted)]">
                    Status da sessão
                  </span>
                  <span className="text-sm font-semibold font-sans text-[var(--accent)] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                    Pausa temporária
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-black/5 dark:bg-white/10 overflow-hidden relative">
                  <div className="h-full bg-[var(--accent)] rounded-full w-full opacity-80" />
                </div>
              </div>
            )}

            {/* Grid Inferior de 2 Colunas (Exatamente igual ao Meta do Mês e Agenda) */}
            {timerState === "idle" ? (
              <div className="grid grid-cols-2 gap-4 sm:gap-6 mt-6 pt-5 border-t border-[var(--border)]/70">
                {/* Coluna 1: Data de hoje */}
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5 text-[var(--ink)] mb-0.5">
                    <CalendarDays size={16} className="text-[var(--primary)] shrink-0" />
                    <span className="font-display font-semibold text-lg sm:text-xl truncate">
                      Hoje
                    </span>
                  </div>
                  <span className="text-xs text-[var(--ink-muted)] leading-normal truncate">
                    {capitalizedWeekday}, {todayFormatted}
                  </span>
                </div>

                {/* Coluna 2: Modalidade */}
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5 text-[var(--ink)] mb-0.5">
                    <Bookmark size={16} className="text-[var(--primary)] shrink-0" />
                    <span className="font-display font-semibold text-lg sm:text-xl truncate">
                      Ministério
                    </span>
                  </div>
                  <span className="text-xs text-[var(--ink-muted)] leading-normal truncate">
                    Pregação de campo
                  </span>
                </div>
              </div>
            ) : timerState === "running" ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-6 pt-5 border-t border-[var(--border)]/70">
                {/* Botão Pausar */}
                <button
                  type="button"
                  onClick={pause}
                  id="timer-pause"
                  className={cn(
                    "w-full h-11 sm:h-12 rounded-full font-semibold text-xs sm:text-sm",
                    "bg-[var(--surface)] border border-[var(--border)] text-[var(--ink)]",
                    "shadow-xs hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all",
                    "flex items-center justify-center gap-2 cursor-pointer"
                  )}
                >
                  <Pause size={15} fill="currentColor" />
                  <span>Pausar</span>
                </button>

                {/* Botão Finalizar */}
                <button
                  type="button"
                  onClick={handleFinish}
                  id="timer-finish"
                  className={cn(
                    "w-full h-11 sm:h-12 rounded-full font-semibold text-xs sm:text-sm",
                    "bg-[var(--primary)] text-white shadow-xs",
                    "hover:opacity-95 active:scale-95 transition-all",
                    "flex items-center justify-center gap-2 cursor-pointer"
                  )}
                >
                  <Check size={16} strokeWidth={2.5} />
                  <span>Finalizar</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-6 pt-5 border-t border-[var(--border)]/70">
                {/* Botão Zerar */}
                <button
                  type="button"
                  onClick={reset}
                  id="timer-reset"
                  className={cn(
                    "w-full h-11 sm:h-12 rounded-full font-semibold text-xs sm:text-sm",
                    "bg-[var(--surface)] border border-[var(--border)] text-[var(--ink-muted)] hover:text-[var(--alert)]",
                    "shadow-xs hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all",
                    "flex items-center justify-center gap-2 cursor-pointer"
                  )}
                >
                  <RotateCcw size={15} />
                  <span>Zerar</span>
                </button>

                {/* Botão Retomar */}
                <button
                  type="button"
                  onClick={resume}
                  id="timer-resume"
                  className={cn(
                    "w-full h-11 sm:h-12 rounded-full font-semibold text-xs sm:text-sm",
                    "bg-[var(--primary)] text-white shadow-xs",
                    "hover:opacity-95 active:scale-95 transition-all",
                    "flex items-center justify-center gap-2 cursor-pointer"
                  )}
                >
                  <Play size={15} fill="currentColor" />
                  <span>Retomar</span>
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="pt-2">
            <ManualEntryForm
              userId={userId}
              onSaved={() => {
                onRecordSaved();
                setMode("timer");
              }}
            />
          </div>
        )}
      </div>

      <SaveRecordSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        durationMinutes={elapsedMinutes}
        userId={userId}
        source="timer"
        onSaved={handleSaved}
      />
    </>
  );
}
