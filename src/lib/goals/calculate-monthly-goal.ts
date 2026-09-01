import { endOfMonth, isAfter, startOfDay, getDay } from "date-fns";

export interface MonthlyGoalCalculation {
  hoursGoal: number;
  hoursDone: number;
  hoursRemaining: number;
  scheduledDaysRemaining: number;
  idealHoursPerScheduledDay: number;
  status: "on_track" | "tight" | "impossible";
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
  const end = endOfMonth(current);

  let scheduledDaysRemaining = 0;
  
  // Count how many days from 'current' to 'end' fall into 'workingDays'
  const iter = new Date(current);
  while (!isAfter(iter, end)) {
    const isoDay = jsDayToIso(getDay(iter));
    if (workingDays.includes(isoDay)) {
      scheduledDaysRemaining++;
    }
    iter.setDate(iter.getDate() + 1);
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

  return {
    hoursGoal,
    hoursDone,
    hoursRemaining,
    scheduledDaysRemaining,
    idealHoursPerScheduledDay,
    status,
  };
}
