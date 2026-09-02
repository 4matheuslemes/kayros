"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Value between 0 and 100 */
  value: number;
  /** Show the percentage label */
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  /** Uses accent color when goal is met */
  goalMet?: boolean;
  /** Custom status color */
  status?: "on_track" | "tight" | "impossible";
}

const sizeMap = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-4",
};

/**
 * Progress bar with a one-shot fill animation.
 * Respects prefers-reduced-motion via CSS (see globals.css).
 */
export function ProgressBar({
  value,
  showLabel = false,
  size = "md",
  goalMet = false,
  status,
  className,
  ...props
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  
  const fillColor = status === "impossible" 
    ? "bg-red-500" 
    : status === "tight" 
      ? "bg-[var(--accent)]" 
      : status === "on_track"
        ? "bg-[var(--success)]"
        : goalMet ? "bg-[var(--success)]" : "bg-[var(--primary)]";

  return (
    <div className={cn("w-full", className)} {...props}>
      {showLabel && (
        <div className="flex justify-between items-baseline mb-1.5">
          <span className="text-caption text-[var(--ink-muted)]">Progresso</span>
          <span
            className={cn(
              "text-sm font-semibold font-sans",
              goalMet ? "text-[var(--success)]" : "text-[var(--ink)]"
            )}
          >
            {clamped.toFixed(0)}%
          </span>
        </div>
      )}
      <div
        className={cn(
          "w-full rounded-full overflow-hidden bg-[var(--border)]",
          sizeMap[size]
        )}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn(
            "h-full rounded-full transition-none",
            fillColor,
            // Animation driven by CSS custom property
            "animate-[progress-fill_0.8s_ease-out_forwards]"
          )}
          style={
            {
              "--progress-width": `${clamped}%`,
              width: `${clamped}%`,
            } as React.CSSProperties
          }
        />
      </div>
    </div>
  );
}
