"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface UseDiscourseTimerReturn {
  elapsed: number;
  running: boolean;
  start: () => void;
  pause: () => void;
  reset: () => void;
  toggle: () => void;
}

/**
 * Cronômetro simples, crescente (conta para cima).
 * Baseado estritamente em timestamps reais (Date.now()) + pausas acumuladas.
 * Imune ao bloqueio de tela / suspensão do dispositivo.
 * Recalcula imediatamente no evento visibilitychange.
 */
export function useDiscourseTimer(): UseDiscourseTimerReturn {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);

  const startTimeRef = useRef<number | null>(null);
  const baseElapsedRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const recalculateElapsed = useCallback(() => {
    if (startTimeRef.current === null) return Math.floor(baseElapsedRef.current);
    const now = Date.now();
    const delta = (now - startTimeRef.current) / 1000;
    return Math.floor(baseElapsedRef.current + delta);
  }, []);

  const tick = useCallback(() => {
    if (startTimeRef.current === null) return;
    setElapsed(recalculateElapsed());
    rafRef.current = requestAnimationFrame(tick);
  }, [recalculateElapsed]);

  const start = useCallback(() => {
    if (running) return;
    startTimeRef.current = Date.now();
    setRunning(true);
    rafRef.current = requestAnimationFrame(tick);
  }, [running, tick]);

  const pause = useCallback(() => {
    if (!running) return;
    if (startTimeRef.current !== null) {
      baseElapsedRef.current += (Date.now() - startTimeRef.current) / 1000;
      startTimeRef.current = null;
    }
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setRunning(false);
  }, [running]);

  const reset = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    startTimeRef.current = null;
    baseElapsedRef.current = 0;
    setElapsed(0);
    setRunning(false);
  }, []);

  const toggle = useCallback(() => {
    if (running) pause();
    else start();
  }, [running, pause, start]);

  // Recalcula imediatamente ao voltar a ficar visível (evita defasagem se tela apagou ou trocou de aba)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && running && startTimeRef.current !== null) {
        setElapsed(recalculateElapsed());
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [running, recalculateElapsed]);

  // Limpa RAF ao desmontar
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return { elapsed, running, start, pause, reset, toggle };
}

/**
 * Formata segundos para MM:SS ou HH:MM:SS.
 */
export function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");

  if (h > 0) {
    const hh = String(h).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

/**
 * Determina o estado do timer em relação ao tempo-alvo.
 * - "ok"      : antes do alerta (mais de 2 min sobrando)
 * - "warning" : faltam <= 2 min para o alvo (cor discreta --accent)
 * - "over"    : passou do tempo (alerta terracota --alert)
 * - "none"    : sem alvo definido
 */
export type DiscourseTimerState = "ok" | "warning" | "over" | "none";

export function getDiscourseTimerState(
  elapsed: number,
  targetSeconds: number | null | undefined
): DiscourseTimerState {
  if (!targetSeconds) return "none";
  if (elapsed >= targetSeconds) return "over";
  if (elapsed >= targetSeconds - 120) return "warning"; // últimos 2 min
  return "ok";
}
