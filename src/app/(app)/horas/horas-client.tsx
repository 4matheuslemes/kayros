"use client";

import { useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TimerDisplay } from "@/components/hours/timer-display";
import { TimerControls } from "@/components/hours/timer-controls";
import { SaveRecordSheet } from "@/components/hours/save-record-sheet";
import { ManualEntryForm } from "@/components/hours/manual-entry-form";
import { Card } from "@/components/ui/card";
import { useTimer } from "@/hooks/use-timer";

interface HorasClientProps {
  userId: string;
}

export function HorasClient({ userId }: HorasClientProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const { timerState, elapsed, elapsedMinutes, start, pause, resume, finish, reset } = useTimer();

  const handleFinish = () => {
    finish();
    setSheetOpen(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <AppHeader title="Registrar horas" />

      <Tabs defaultValue="timer">
        <TabsList>
          <TabsTrigger value="timer" id="tab-timer">Cronômetro</TabsTrigger>
          <TabsTrigger value="manual" id="tab-manual">Inserção manual</TabsTrigger>
        </TabsList>

        <TabsContent value="timer">
          <Card className="flex flex-col items-center gap-2">
            <TimerDisplay elapsed={elapsed} state={timerState} />
            <TimerControls
              state={timerState}
              onStart={start}
              onPause={pause}
              onResume={resume}
              onFinish={handleFinish}
              onReset={reset}
            />
            <p className="text-caption text-[var(--ink-muted)] mt-4 text-center max-w-[220px]">
              O cronômetro continua rodando mesmo se você trocar de aba
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="manual">
          <Card>
            <ManualEntryForm userId={userId} />
          </Card>
        </TabsContent>
      </Tabs>

      <SaveRecordSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        durationMinutes={elapsedMinutes}
        userId={userId}
        source="timer"
        onSaved={reset}
      />
    </div>
  );
}
