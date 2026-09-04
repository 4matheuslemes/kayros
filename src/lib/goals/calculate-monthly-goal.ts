import { endOfMonth, isAfter, startOfDay, getDay, startOfMonth, getDaysInMonth, startOfWeek, addDays } from "date-fns";

export interface MonthlyGoalCalculation {
  hoursGoal: number;
  hoursDone: number;
  hoursRemaining: number;
  scheduledDaysRemaining: number;
  idealHoursPerScheduledDay: number;
  status: "on_track" | "tight" | "impossible";
  totalScheduledDaysInMonth: number;
  scheduledDaysElapsed: number;
  expectedHoursByToday: number;
  paceStatus: "ahead" | "on_pace" | "behind";
}

/**
 * JS getDay() returns 0 for Sunday, 1 for Monday...
 * Supabase working_days convention is ISO: 1=Monday, ..., 7=Sunday.
 */
function jsDayToIso(jsDay: number): number {
  return jsDay === 0 ? 7 : jsDay;
}

export function calculateMonthlyGoal({
  today,
  hoursGoal,
  hoursDone,
  workingDays,
  weeklySchedule,
}: {
  today: Date;
  hoursGoal: number;
  hoursDone: number;
  workingDays: number[];
  weeklySchedule?: Record<string, number>;
}): MonthlyGoalCalculation {
  const current = startOfDay(today);
  const start = startOfMonth(current);
  const end = endOfMonth(current);

  let scheduledDaysRemaining = 0;
  let totalScheduledDaysInMonth = 0;
  let scheduledDaysElapsed = 0;
  
  let expectedMinutesByToday = 0;
  let totalScheduledMinutesInMonth = 0;
  
  const iterAll = new Date(start);
  while (!isAfter(iterAll, end)) {
    const isoDay = jsDayToIso(getDay(iterAll));
    if (workingDays.includes(isoDay)) {
      totalScheduledDaysInMonth++;
      
      const dayKey = ISO_DAY_TO_STRING[isoDay];
      const mins = weeklySchedule?.[dayKey] ?? ((hoursGoal * 60) / (workingDays.length * 4.333)); // fallback se a migration não rodou
      
      totalScheduledMinutesInMonth += mins;

      if (iterAll.getTime() < current.getTime()) {
        scheduledDaysElapsed++;
        expectedMinutesByToday += mins;
      } else {
        scheduledDaysRemaining++;
      }
    }
    iterAll.setDate(iterAll.getDate() + 1);
  }

  const expectedHoursByToday = expectedMinutesByToday / 60;
  
  // Pace status is based on expected vs actual
  let paceStatus: "ahead" | "on_pace" | "behind" = "on_pace";
  if (totalScheduledDaysInMonth > 0) {
    if (hoursDone >= expectedHoursByToday + 1) {
      paceStatus = "ahead";
    } else if (hoursDone <= expectedHoursByToday - 1) {
      paceStatus = "behind";
    }
  }

  // Status is based on ability to reach the goal with remaining scheduled hours
  const hoursRemaining = Math.max(0, hoursGoal - hoursDone);
  const idealHoursPerScheduledDay = scheduledDaysRemaining > 0 ? hoursRemaining / scheduledDaysRemaining : Infinity;

  let status: "on_track" | "tight" | "impossible";

  const remainingScheduledMinutes = totalScheduledMinutesInMonth - expectedMinutesByToday;
  const remainingScheduledHours = remainingScheduledMinutes / 60;

  if (hoursRemaining === 0) {
    status = "on_track";
  } else if (scheduledDaysRemaining === 0) {
    status = "impossible";
  } else if (hoursRemaining > remainingScheduledHours * 1.5) {
    // Se o que falta é 50% maior do que a pessoa projetou para o resto do mês, está puxado
    status = "tight";
  } else {
    status = "on_track";
  }

  return {
    hoursGoal,
    hoursDone,
    hoursRemaining,
    scheduledDaysRemaining,
    idealHoursPerScheduledDay,
    status,
    totalScheduledDaysInMonth,
    scheduledDaysElapsed,
    expectedHoursByToday,
    paceStatus,
  };
}

export const ISO_DAY_TO_STRING: Record<number, string> = {
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
  7: "sunday",
};

export function calculateProjectedHours(
  weeklySchedule: Record<string, number> | undefined,
  workingDays: number[],
  targetDate: Date = new Date()
): number {
  if (!weeklySchedule || Object.keys(weeklySchedule).length === 0) {
    // If no specific schedule, assume 2 hours (120 mins) per working day as a fallback
    // Or just 0 if we want to be strict. Let's just fallback to working days * 2h for now
    // Wait, the new logic requires users to set it. If not set, it's 0.
  }

  const start = startOfMonth(targetDate);
  const end = endOfMonth(targetDate);
  
  let totalMinutes = 0;
  
  const iter = new Date(start);
  while (!isAfter(iter, end)) {
    const isoDay = jsDayToIso(getDay(iter));
    if (workingDays.includes(isoDay)) {
      const dayKey = ISO_DAY_TO_STRING[isoDay];
      const minutes = weeklySchedule?.[dayKey] ?? 120; // fallback to 2h if missing
      totalMinutes += minutes;
    }
    iter.setDate(iter.getDate() + 1);
  }
  
  return totalMinutes / 60;
}
