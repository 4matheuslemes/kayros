import { endOfMonth, isAfter, startOfDay, getDay, startOfMonth } from "date-fns";

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
}: {
  today: Date;
  hoursGoal: number;
  hoursDone: number;
  workingDays: number[];
}): MonthlyGoalCalculation {
  const current = startOfDay(today);
  const start = startOfMonth(current);
  const end = endOfMonth(current);

  let scheduledDaysRemaining = 0;
  let totalScheduledDaysInMonth = 0;
  let scheduledDaysElapsed = 0;
  
  const iterAll = new Date(start);
  while (!isAfter(iterAll, end)) {
    const isoDay = jsDayToIso(getDay(iterAll));
    if (workingDays.includes(isoDay)) {
      totalScheduledDaysInMonth++;
      if (iterAll.getTime() < current.getTime()) {
        scheduledDaysElapsed++;
      } else {
        scheduledDaysRemaining++;
      }
    }
    iterAll.setDate(iterAll.getDate() + 1);
  }

  const hoursRemaining = Math.max(0, hoursGoal - hoursDone);
  const idealHoursPerScheduledDay =
    scheduledDaysRemaining > 0 ? hoursRemaining / scheduledDaysRemaining : Infinity;

  let status: "on_track" | "tight" | "impossible";

  if (hoursRemaining === 0) {
    status = "on_track";
  } else if (scheduledDaysRemaining === 0) {
    status = "impossible";
  } else if (idealHoursPerScheduledDay > 4) {
    status = "tight";
  } else {
    status = "on_track";
  }

  const expectedHoursByToday = totalScheduledDaysInMonth > 0 
    ? hoursGoal * (scheduledDaysElapsed / totalScheduledDaysInMonth)
    : 0;

  let paceStatus: "ahead" | "on_pace" | "behind" = "on_pace";
  if (totalScheduledDaysInMonth > 0) {
    if (hoursDone >= expectedHoursByToday + 1) {
      paceStatus = "ahead";
    } else if (hoursDone <= expectedHoursByToday - 1) {
      paceStatus = "behind";
    }
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
