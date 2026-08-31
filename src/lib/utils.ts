import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind classes safely, handling conditional classes and conflicts.
 * Re-exported here so components import from a single internal path.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format minutes into "Xh Ym" or "Ym" display string (PT-BR). */
export function formatDuration(totalMinutes: number): string {
  if (totalMinutes <= 0) return "0m";
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Format seconds into "HH:MM:SS" for the timer display. */
export function formatTimerSeconds(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

/** Returns the number of remaining days in the current calendar month (inclusive of today). */
export function daysRemainingInMonth(): number {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return lastDay - now.getDate() + 1;
}

/** Calculates the required pace (hours/day) to hit a goal. */
export function requiredPace(
  goalHours: number,
  completedMinutes: number,
  daysLeft: number
): number {
  if (daysLeft <= 0) return 0;
  const remainingHours = goalHours - completedMinutes / 60;
  if (remainingHours <= 0) return 0;
  return Math.round((remainingHours / daysLeft) * 100) / 100;
}

/** Returns the service year (e.g. 2024 for Sep 2024 – Aug 2025) for a given date. */
export function getServiceYear(date: Date = new Date()): number {
  // Service year starts in September (month 8 zero-indexed)
  return date.getMonth() >= 8 ? date.getFullYear() : date.getFullYear() - 1;
}
