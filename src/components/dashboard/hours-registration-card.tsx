"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Clock, SlidersHorizontal, Edit3 } from "lucide-react";
import { TimerDisplay } from "@/components/hours/timer-display";
import { TimerControls } from "@/components/hours/timer-controls";
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

  const todayFormatted = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });
  const capitalizedDate =
    todayFormatted.charAt(0).toUpperCase() + todayFormatted.slice(1);

  return (
    <>
      <div
        className={cn(
          "rounded-[32px] lg:rounded-[40px]",
          "bg-[var(--surface)] dark:bg-[#121A29]",
          "p-5 sm:p-7 lg:p-8",
          "shadow-xs border border-black/5 dark:border-white/10",
          "flex flex-col justify-between",
          className
        )}
      >
        {/* Header: Padronizado com os outros widgets (Ícone em círculo + Título em serifa + Alternador) */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-[var(--border)]/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
              <Clock size={16} />
            </div>
            <div>
              <h3 className="font-display font-medium text-lg sm:text-xl text-[var(--ink)] leading-tight">
                Registro de tempo
              </h3>
              <p className="text-xs text-[var(--ink-muted)] mt-0.5 font-sans">
                {capitalizedDate}
              </p>
            </div>
          </div>

          {/* Botão em pílula para alternar entre Cronômetro e Manual */}
          <button
            type="button"
            onClick={() => setMode(mode === "timer" ? "manual" : "timer")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full",
              "bg-[var(--surface)] text-[var(--ink)] text-xs font-semibold",
              "hover:bg-black/5 dark:hover:bg-white/10 border border-[var(--border)]",
              "shadow-xs transition-colors cursor-pointer"
            )}
            aria-label={
              mode === "timer"
                ? "Mudar para lançamento manual"
                : "Mudar para cronômetro"
            }
          >
            {mode === "timer" ? (
              <>
                <Edit3 size={13} className="text-[var(--primary)]" />
                <span>Lançamento manual</span>
              </>
            ) : (
              <>
                <Clock size={13} className="text-[var(--primary)]" />
                <span>Usar cronômetro</span>
              </>
            )}
          </button>
        </div>

        {/* Corpo do widget */}
        {mode === "timer" ? (
          <div className="flex flex-col items-center">
            <TimerDisplay
              elapsed={elapsed}
              state={timerState}
              startedAt={startedAt}
            />

            <TimerControls
              state={timerState}
              onStart={start}
              onPause={pause}
              onResume={resume}
              onFinish={handleFinish}
              onReset={reset}
            />
          </div>
        ) : (
          <div className="pt-4">
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
