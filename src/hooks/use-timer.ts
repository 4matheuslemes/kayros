"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export type TimerState = "idle" | "running" | "paused" | "finished";

const STORAGE_KEY = "kairos_timer";

interface PersistedTimer {
  state: TimerState;
  elapsed: number; // seconds accumulated before the last start
  startedAt: number | null; // Date.now() when last started
}

function loadFromStorage(): PersistedTimer {
  if (typeof window === "undefined") return { state: "idle", elapsed: 0, startedAt: null };
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { state: "idle", elapsed: 0, startedAt: null };
    return JSON.parse(raw) as PersistedTimer;
  } catch {
    return { state: "idle", elapsed: 0, startedAt: null };
  }
}

function saveToStorage(data: PersistedTimer) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function clearStorage() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}

/**
 * useTimer — persists across tab navigation via sessionStorage.
 * Returns elapsed seconds (accurate even after resume).
 */
export function useTimer() {
  const [timerState, setTimerState] = useState<TimerState>("idle");
  const [elapsed, setElapsed] = useState(0); // seconds
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const baseElapsedRef = useRef<number>(0);

  // Hydrate from sessionStorage on mount
  useEffect(() => {
    const persisted = loadFromStorage();
    baseElapsedRef.current = persisted.elapsed;

    if (persisted.state === "running" && persisted.startedAt) {
      // Timer was running — calculate what we missed
      const missedSeconds = Math.floor((Date.now() - persisted.startedAt) / 1000);
      baseElapsedRef.current = persisted.elapsed + missedSeconds;
      startedAtRef.current = Date.now();
      setTimerState("running");
      setElapsed(baseElapsedRef.current);
    } else {
      setTimerState(persisted.state);
      setElapsed(persisted.elapsed);
    }
  }, []);

  // Tick when running
  useEffect(() => {
    if (timerState === "running") {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const extra = startedAtRef.current
          ? Math.floor((now - startedAtRef.current) / 1000)
          : 0;
        const total = baseElapsedRef.current + extra;
        setElapsed(total);
        saveToStorage({
          state: "running",
          elapsed: baseElapsedRef.current,
          startedAt: startedAtRef.current,
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerState]);

  const start = useCallback(() => {
    startedAtRef.current = Date.now();
    setTimerState("running");
    saveToStorage({ state: "running", elapsed: baseElapsedRef.current, startedAt: Date.now() });
  }, []);

  const pause = useCallback(() => {
    const extra = startedAtRef.current
      ? Math.floor((Date.now() - startedAtRef.current) / 1000)
      : 0;
    baseElapsedRef.current += extra;
    startedAtRef.current = null;
    setElapsed(baseElapsedRef.current);
    setTimerState("paused");
    saveToStorage({ state: "paused", elapsed: baseElapsedRef.current, startedAt: null });
  }, []);

  const resume = useCallback(() => {
    startedAtRef.current = Date.now();
    setTimerState("running");
    saveToStorage({ state: "running", elapsed: baseElapsedRef.current, startedAt: Date.now() });
  }, []);

  const finish = useCallback(() => {
    const extra = startedAtRef.current
      ? Math.floor((Date.now() - startedAtRef.current) / 1000)
      : 0;
    baseElapsedRef.current += extra;
    startedAtRef.current = null;
    setElapsed(baseElapsedRef.current);
    setTimerState("finished");
    saveToStorage({ state: "finished", elapsed: baseElapsedRef.current, startedAt: null });
  }, []);

  const reset = useCallback(() => {
    baseElapsedRef.current = 0;
    startedAtRef.current = null;
    setElapsed(0);
    setTimerState("idle");
    clearStorage();
  }, []);

  return {
    timerState,
    elapsed, // seconds
    elapsedMinutes: Math.floor(elapsed / 60),
    start,
    pause,
    resume,
    finish,
    reset,
  };
}
