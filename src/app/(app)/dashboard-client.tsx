"use client";

import Link from "next/link";

import { AppHeader } from "@/components/layout/app-header";
import { MonthlyGoalCard } from "@/components/dashboard/monthly-goal-card";
import { HoursRegistrationCard } from "@/components/dashboard/hours-registration-card";
import { LetterMeetingShortcut } from "@/components/dashboard/letter-meeting-shortcut";
import { AgendaCalendar } from "@/components/dashboard/agenda-calendar";
import { ReleaseNotesModal } from "@/components/dashboard/release-notes-modal";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { DailyEncouragement } from "@/components/dashboard/daily-encouragement";
import { useDashboardData } from "@/lib/db/hooks";
import type { Profile } from "@/lib/db/dexie";

interface DashboardClientProps {
  userId: string;
  profile: Profile;
}

export function DashboardClient({ userId, profile }: DashboardClientProps) {
  const { totalMinutes, contacts, refresh } = useDashboardData(userId);

  const revisitas     = contacts.filter((c) => c.status === "revisita").length;
  const estudosAtivos = contacts.filter((c) => c.status === "estudo_ativo").length;

  const firstName = profile.full_name.split(" ")[0];
  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="flex flex-col gap-4">
      <AppHeader
        title={`${greeting}, ${firstName}`}
        right={<ThemeToggle />}
        className="pb-1"
      />

      <DailyEncouragement />

      <div className="flex gap-2 mt-1">
        <Link 
          href="/contatos?status=revisita" 
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-semibold hover:bg-[var(--primary)]/20 transition-colors"
        >
          <span className="w-2 h-2 rounded-full bg-[var(--primary)]"></span>
          {revisitas} {revisitas === 1 ? 'revisita' : 'revisitas'}
        </Link>
        <Link 
          href="/contatos?status=estudo_ativo" 
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--success)]/10 text-[var(--success)] text-xs font-semibold hover:bg-[var(--success)]/20 transition-colors"
        >
          <span className="w-2 h-2 rounded-full bg-[var(--success)]"></span>
          {estudosAtivos} {estudosAtivos === 1 ? 'estudo' : 'estudos'}
        </Link>
      </div>

      <ReleaseNotesModal />

      <HoursRegistrationCard 
        userId={userId} 
        onRecordSaved={refresh}
      />

      <MonthlyGoalCard
        completedMinutes={totalMinutes}
        goalHours={profile.monthly_goal_hours}
        workingDays={profile.working_days ?? [1, 2, 3, 4, 5, 6, 7]}
        weeklySchedule={profile.weekly_schedule}
      />

      <AgendaCalendar userId={userId} profile={profile} />

      <LetterMeetingShortcut meetingLink={profile.meeting_link} />
    </div>
  );
}
