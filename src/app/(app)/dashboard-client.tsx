"use client";

import { AppHeader } from "@/components/layout/app-header";
import { MonthlyGoalCard } from "@/components/dashboard/monthly-goal-card";
import { MonthSummaryCard } from "@/components/dashboard/month-summary-card";
import { UpcomingVisitsCard } from "@/components/dashboard/upcoming-visits-card";
import { ActivityBreakdownCard } from "@/components/dashboard/activity-breakdown-card";
import { AnnualChart } from "@/components/dashboard/annual-chart";
import { HoursRegistrationCard } from "@/components/dashboard/hours-registration-card";
import { LetterMeetingShortcut } from "@/components/dashboard/letter-meeting-shortcut";
import { useMonthRecords, useDailyRecords, useContacts, useUpcomingVisits } from "@/lib/db/hooks";
import type { Profile } from "@/lib/db/dexie";

interface DashboardClientProps {
  userId: string;
  profile: Profile;
}

export function DashboardClient({ userId, profile }: DashboardClientProps) {
  const { totalMinutes, refresh: refreshMonth } = useMonthRecords(userId);
  const { records, refresh: refreshDaily }      = useDailyRecords(userId);
  const { contacts }                            = useContacts(userId);
  const upcoming         = useUpcomingVisits(userId, 3);

  const revisitas     = contacts.filter((c) => c.status === "revisita").length;
  const estudosAtivos = contacts.filter((c) => c.status === "estudo_ativo").length;

  const firstName = profile.full_name.split(" ")[0];
  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="flex flex-col gap-4">
      <AppHeader
        title={`${greeting}, ${firstName}`}
        subtitle={profile.congregation_name ?? undefined}
      />

      <HoursRegistrationCard 
        userId={userId} 
        onRecordSaved={() => {
          refreshMonth();
          refreshDaily();
        }}
      />

      <MonthlyGoalCard
        completedMinutes={totalMinutes}
        goalHours={profile.monthly_goal_hours}
        workingDays={profile.working_days ?? [1, 2, 3, 4, 5, 6, 7]}
      />

      <LetterMeetingShortcut meetingLink={profile.meeting_link} />

      <MonthSummaryCard
        totalMinutes={totalMinutes}
        revisitas={revisitas}
        estudosAtivos={estudosAtivos}
      />

      <UpcomingVisitsCard visits={upcoming} />

      <ActivityBreakdownCard records={records.filter(r => r.date.startsWith(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`))} />

      <AnnualChart
        records={records}
        goalHours={profile.monthly_goal_hours}
      />
    </div>
  );
}
