import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { fetchUserPermissions } from "@/lib/permissions";
import { CongregacaoClient } from "./congregacao-client";

export const metadata: Metadata = {
  title: "Congregação",
};

export default async function CongregacaoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const permissions = await fetchUserPermissions(supabase, user.id);
  if (!permissions.canViewMembers && !permissions.canUseShepherding) {
    redirect("/");
  }

  // Carrega contagens resumidas em paralelo
  const [membersCountRes, groupsCountRes, visitsCountRes] = await Promise.all([
    supabase
      .from("congregation_members")
      .select("id", { count: "exact", head: true })
      .eq("active", true),
    supabase
      .from("service_groups")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("shepherding_visits")
      .select("id", { count: "exact", head: true }),
  ]);

  const counts = {
    publicadores: membersCountRes.count ?? 0,
    grupos: groupsCountRes.count ?? 0,
    pastoreio: visitsCountRes.count ?? 0,
  };

  return <CongregacaoClient counts={counts} />;
}
