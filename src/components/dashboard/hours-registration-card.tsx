"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TimerDisplay } from "@/components/hours/timer-display";
import { TimerControls } from "@/components/hours/timer-controls";
import { SaveRecordSheet } from "@/components/hours/save-record-sheet";
import { ManualEntryForm } from "@/components/hours/manual-entry-form";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { useTimer } from "@/hooks/use-timer";

interface HoursRegistrationCardProps {
  userId: string;
  onRecordSaved: () => void;
}

export function HoursRegistrationCard({ userId, onRecordSaved }: HoursRegistrationCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [tab, setTab] = useState<"timer" | "manual">("timer");
  const { timerState, elapsed, elapsedMinutes, start, pause, resume, finish, reset } = useTimer();
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

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="mb-3">
          <CardTitle className="flex items-center gap-2">
            <Clock size={18} className="text-[var(--primary)]" />
            Registrar Horas
          </CardTitle>
        </CardHeader>

        <div className="w-full">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="timer" className="flex-1">Cronômetro</TabsTrigger>
              <TabsTrigger value="manual" className="flex-1">Manual</TabsTrigger>
            </TabsList>

            <TabsContent value="timer" className="flex flex-col items-center gap-2 mt-0">
              <TimerDisplay elapsed={elapsed} state={timerState} />
              
              <TimerControls
                state={timerState}
                onStart={start}
                onPause={pause}
                onResume={resume}
                onFinish={handleFinish}
                onReset={reset}
              />
            </TabsContent>

            <TabsContent value="manual" className="mt-0 pt-2">
              <ManualEntryForm 
                userId={userId} 
                onSaved={() => {
                  onRecordSaved();
                  setTab("timer");
                }} 
              />
            </TabsContent>
          </Tabs>
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
