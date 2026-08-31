import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";
import { DashboardClient } from "./dashboard-client";

export const metadata: Metadata = { title: "Início" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch profile server-side for first render
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <DashboardClient
      userId={user.id}
      profile={profile ?? {
        id: user.id,
        full_name: user.email ?? "Usuário",
        monthly_goal_hours: 50,
        service_year_start_month: 9,
      }}
    />
  );
}
