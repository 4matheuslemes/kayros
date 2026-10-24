import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { DashboardClient } from "./dashboard-client";
import { fetchUserPermissions } from "@/lib/permissions";
import type { MyGroupInfo } from "@/components/dashboard/my-service-group-card";

export const metadata: Metadata = { title: "Início" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch permissions and profile server-side
  const [permissions, { data: profile }] = await Promise.all([
    fetchUserPermissions(supabase, user.id),
    supabase.from("profiles").select("*").eq("id", user.id).single(),
  ]);

  let myGroupInfo: MyGroupInfo | null = null;
  if (permissions.memberId) {
    const { data: memberRow } = await supabase
      .from("congregation_members")
      .select("id, group_id")
      .eq("id", permissions.memberId)
      .maybeSingle();

    if (memberRow?.group_id) {
      const { data: groupRow } = await supabase
        .from("service_groups")
        .select("id, name, sort_order, meeting_info, overseer_id, assistant_id")
        .eq("id", memberRow.group_id)
        .maybeSingle();

      if (groupRow) {
        let overseer_name: string | null = null;
        let assistant_name: string | null = null;
        const leaderIds = [groupRow.overseer_id, groupRow.assistant_id].filter(
          Boolean
        ) as string[];

        if (leaderIds.length > 0) {
          const { data: leaders } = await supabase
            .from("congregation_members")
            .select("id, full_name")
            .in("id", leaderIds);

          overseer_name =
            leaders?.find((l) => l.id === groupRow.overseer_id)?.full_name ||
            null;
          assistant_name =
            leaders?.find((l) => l.id === groupRow.assistant_id)?.full_name ||
            null;
        }

        myGroupInfo = {
          name: groupRow.name,
          sort_order: groupRow.sort_order,
          meeting_info: groupRow.meeting_info,
          overseer_name,
          assistant_name,
        };
      }
    }
  }

  let pastoralData: {
    dueCount: number;
    dueMembers?: Array<{ id: string; name: string }>;
    latestVisit: {
      family_or_person: string;
      visit_date: string;
      created_by_name?: string | null;
    } | null;
  } | null = null;

  if (permissions.canUseShepherding) {
    const today = new Date().toISOString().split("T")[0];

    const [latestVisitRes, activeMembersRes, visitDatesRes] = await Promise.all([
      supabase
        .from("shepherding_visits")
        .select("id, visit_date, family_or_person, created_by_name")
        .order("visit_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("congregation_members")
        .select("id, full_name, is_self")
        .eq("active", true),
      supabase
        .from("shepherding_visit_members")
        .select("member_id, visit:shepherding_visits(next_visit_date)"),
    ]);

    const latestNextMap = new Map<string, string>();
    for (const row of (visitDatesRes.data || []) as any[]) {
      if (row.member_id && row.visit?.next_visit_date) {
        const cur = latestNextMap.get(row.member_id);
        if (!cur || row.visit.next_visit_date > cur) {
          latestNextMap.set(row.member_id, row.visit.next_visit_date);
        }
      }
    }

    let dueCount = 0;
    const dueMembers: Array<{ id: string; name: string }> = [];
    for (const m of activeMembersRes.data || []) {
      const isSelf = permissions.memberId
        ? m.id === permissions.memberId
        : m.is_self;
      if (isSelf) continue;

      const nextDate = latestNextMap.get(m.id);
      if (nextDate && nextDate <= today) {
        dueCount++;
        if (dueMembers.length < 5) {
          dueMembers.push({ id: m.id, name: m.full_name });
        }
      }
    }

    pastoralData = {
      dueCount,
      dueMembers,
      latestVisit: latestVisitRes.data
        ? {
            family_or_person: latestVisitRes.data.family_or_person,
            visit_date: latestVisitRes.data.visit_date,
            created_by_name: latestVisitRes.data.created_by_name,
          }
        : null,
    };
  }

  let latestOutline: {
    id: string;
    title: string;
    category: string | null;
    updated_at: string;
    word_count: number;
  } | null = null;

  if (permissions.canUseTalks) {
    const { data: outlineRow } = await supabase
      .from("outlines")
      .select("id, title, category, updated_at, word_count")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (outlineRow) {
      latestOutline = outlineRow;
    }
  }

  return (
    <DashboardClient
      userId={user.id}
      profile={
        profile ?? {
          id: user.id,
          full_name: user.email ?? "Usuário",
          monthly_goal_hours: 50,
          service_year_start_month: 9,
          onboarding_completed: false,
        }
      }
      permissions={permissions}
      myGroupInfo={myGroupInfo}
      pastoralData={pastoralData}
      latestOutline={latestOutline}
    />
  );
}
