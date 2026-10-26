"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Clock,
  Play,
  Pause,
  Check,
  RotateCcw,
  Plus,
} from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { SaveRecordSheet } from "@/components/hours/save-record-sheet";
import { ManualEntryForm } from "@/components/hours/manual-entry-form";
import { useTimer } from "@/hooks/use-timer";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { getDb } from "@/lib/db/dexie";

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
  const [manualDrawerOpen, setManualDrawerOpen] = useState(false);
  const [todayMinutes, setTodayMinutes] = useState(0);

  const {
    timerState,
    elapsed,
    elapsedMinutes,
    start,
    pause,
    resume,
    finish,
    reset,
  } = useTimer();
  const startedRef = useRef(false);

  const isRunning = timerState === "running";
  const isPaused = timerState === "paused";
  const isActive = isRunning || isPaused;

  const todayStr = format(new Date(), "yyyy-MM-dd");

  // Carregar minutos registrados hoje no Dexie
  const loadTodayMinutes = useCallback(async () => {
    if (!userId) return;
    try {
      const db = getDb();
      const records = await db.daily_records
        .where("user_id")
        .equals(userId)
        .filter((r) => r.date === todayStr)
        .toArray();
      const mins = records.reduce((acc, r) => acc + (r.duration_minutes || 0), 0);
      setTodayMinutes(mins);
    } catch {
      // fallback silencioso
    }
  }, [userId, todayStr]);

  useEffect(() => {
    void loadTodayMinutes();
  }, [loadTodayMinutes]);

  // Quickstart (?quickstart=1)
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
    void loadTodayMinutes();
  };

  const handleCancel = () => {
    if (elapsed > 60) {
      if (!window.confirm("Deseja realmente zerar o cronômetro em andamento?")) {
        return;
      }
    }
    reset();
  };

  // Horas de hoje formatadas
  const todayHours = Math.floor(todayMinutes / 60);
  const todayRemainingMinutes = todayMinutes % 60;

  // Cronômetro: HH:MM:SS
  const timerHours = Math.floor(elapsed / 3600);
  const timerMins = Math.floor((elapsed % 3600) / 60);
  const timerSecs = elapsed % 60;
  const timeFormatted = `${timerHours.toString().padStart(2, "0")}:${timerMins.toString().padStart(2, "0")}:${timerSecs.toString().padStart(2, "0")}`;

  return (
    <>
      <div
        className={cn(
          "rounded-[32px] bg-[var(--panel)] p-6 sm:p-7 relative overflow-hidden",
          "border border-[var(--border)]/70 shadow-xs flex flex-col justify-between",
          className
        )}
      >
        {/* ── 1. Topo: Apenas o título com ícone ── */}
        <div className="flex items-center gap-2.5 mb-5 relative z-10">
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[var(--primary)]/10 text-[var(--primary)]">
            <Clock size={16} />
          </div>
          <h3 className="font-display font-medium text-lg sm:text-xl text-[var(--ink)] whitespace-nowrap">
            Ministério de campo
          </h3>
        </div>

        {/* ── 2. Meio: Cronômetro Centralizado Abaixo do Título ── */}
        <div className="flex flex-col items-center justify-center py-3 text-center relative z-10 select-none">
          <div className="font-display font-normal tracking-[-0.03em] leading-none text-5xl sm:text-6xl text-[var(--ink)] tabular-nums">
            {timeFormatted}
          </div>
          <p className="text-xs font-medium text-[var(--ink-muted)] mt-2.5">
            {todayMinutes > 0
              ? `${todayHours}h ${todayRemainingMinutes.toString().padStart(2, "0")}min já registrados hoje`
              : "Nenhum tempo registrado hoje"}
          </p>
        </div>

        {/* ── 3. Em Baixo: Botões Lado a Lado (Play só com ícone + Lançar manual) ── */}
        <div className="relative z-10 pt-3">
          {!isActive ? (
            /* Estado Parado: Play (só ícone) + Lançar manual LADO A LADO */
            <div className="flex items-center justify-center gap-3">
              {/* Botão Play: só o ícone, sem texto! */}
              <button
                type="button"
                onClick={start}
                id="timer-start"
                className="w-12 h-12 rounded-full bg-[var(--primary)] text-white flex items-center justify-center shadow-xs hover:bg-[var(--primary-dark)] active:scale-95 transition-all cursor-pointer shrink-0"
                title="Iniciar cronômetro"
                aria-label="Iniciar cronômetro"
              >
                <Play size={20} fill="currentColor" className="translate-x-0.5" />
              </button>

              {/* Botão Lançar manual: ao lado do play na mesma linha! */}
              <button
                type="button"
                onClick={() => setManualDrawerOpen(true)}
                id="timer-manual"
                className="h-12 px-6 rounded-full bg-[var(--surface)] hover:bg-[var(--background)] border border-[var(--border)] text-[var(--ink)] text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-2xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
              >
                <Plus size={16} className="text-[var(--primary)]" />
                <span>Lançar manual</span>
              </button>
            </div>
          ) : (
            /* Estado Rodando ou Pausado: Zerar + Pausar/Retomar + Salvar LADO A LADO */
            <div className="flex items-center justify-center gap-3">
              {/* Zerar */}
              <button
                type="button"
                onClick={handleCancel}
                id="timer-reset"
                className="w-12 h-12 rounded-full bg-[var(--surface)] text-[var(--ink-muted)] hover:text-red-600 hover:bg-red-500/10 border border-[var(--border)] flex items-center justify-center transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95"
                title="Zerar cronômetro"
                aria-label="Zerar cronômetro"
              >
                <RotateCcw size={17} />
              </button>

              {/* Pausar ou Retomar */}
              {isRunning ? (
                <button
                  type="button"
                  onClick={pause}
                  id="timer-pause"
                  className="w-12 h-12 rounded-full bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--background)] border border-[var(--border)] flex items-center justify-center shadow-2xs active:scale-95 transition-all cursor-pointer shrink-0"
                  title="Pausar cronômetro"
                  aria-label="Pausar cronômetro"
                >
                  <Pause size={19} fill="currentColor" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={resume}
                  id="timer-resume"
                  className="w-12 h-12 rounded-full bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)] flex items-center justify-center shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
                  title="Retomar cronômetro"
                  aria-label="Retomar cronômetro"
                >
                  <Play size={19} fill="currentColor" className="translate-x-0.5" />
                </button>
              )}

              {/* Salvar */}
              <button
                type="button"
                onClick={handleFinish}
                id="timer-finish"
                className="h-12 px-6 rounded-full bg-[var(--primary)] text-white text-sm font-semibold inline-flex items-center gap-2 shadow-xs hover:bg-[var(--primary-dark)] active:scale-95 cursor-pointer transition-all shrink-0 whitespace-nowrap"
                title="Salvar horas"
                aria-label="Salvar horas"
              >
                <Check size={17} strokeWidth={2.5} />
                <span>Salvar</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Drawer Limpo para Lançamento Manual */}
      {userId && (
        <Drawer
          open={manualDrawerOpen}
          onClose={() => setManualDrawerOpen(false)}
          title="Lançar horas manuais"
          description="Registre horas de pregação realizadas no ministério"
        >
          <ManualEntryForm
            userId={userId}
            onSaved={() => {
              setManualDrawerOpen(false);
              onRecordSaved();
              void loadTodayMinutes();
            }}
          />
        </Drawer>
      )}

      {/* Sheet para revisão e notas adicionais ao finalizar o cronômetro */}
      <SaveRecordSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        durationMinutes={Math.max(1, elapsedMinutes || 1)}
        userId={userId}
        source="timer"
        onSaved={handleSaved}
      />
    </>
  );
}
