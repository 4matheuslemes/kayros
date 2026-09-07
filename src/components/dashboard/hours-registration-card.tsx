"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { TimerDisplay } from "@/components/hours/timer-display";
import { TimerControls } from "@/components/hours/timer-controls";
import { SaveRecordSheet } from "@/components/hours/save-record-sheet";
import { ManualEntryForm } from "@/components/hours/manual-entry-form";
import { Card } from "@/components/ui/card";
import { useTimer } from "@/hooks/use-timer";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface HoursRegistrationCardProps {
  userId: string;
  onRecordSaved: () => void;
}

export function HoursRegistrationCard({ userId, onRecordSaved }: HoursRegistrationCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mode, setMode] = useState<"timer" | "manual">("timer");
  const { timerState, elapsed, elapsedMinutes, startedAt, start, pause, resume, finish, reset } = useTimer();
  const startedRef = useRef(false);

  useEffect(() => {
    if (searchParams?.get("quickstart") === "1" && timerState === "idle" && !startedRef.current) {
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

  const todayStr = format(new Date(), "EEEE '·' dd MMM", { locale: ptBR }).toUpperCase();

  return (
    <>
      <Card className="overflow-hidden relative shadow-sm border-[var(--border)]">
        <div className="p-5 flex flex-col gap-2">
          {/* Top row: Date + Mode Toggle */}
          <div className="flex items-center justify-between pb-2">
            <div className="text-xs font-semibold tracking-widest text-[var(--ink-muted)]">
              {todayStr}
            </div>
            
            <button
              onClick={() => setMode(mode === "timer" ? "manual" : "timer")}
              className="text-xs font-medium bg-transparent border border-[var(--border)] text-[var(--ink-muted)] px-3.5 py-1.5 rounded-full transition-colors hover:border-[var(--ink-muted)]"
            >
              {mode === "timer" ? "Manual" : "Cronômetro"}
            </button>
          </div>

          {mode === "timer" ? (
            <div className="flex flex-col items-center">
              <TimerDisplay elapsed={elapsed} state={timerState} startedAt={startedAt} />
              
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
      </Card>

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
