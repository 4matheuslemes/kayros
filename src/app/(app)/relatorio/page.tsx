import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { RelatorioClient } from "./relatorio-client";

export const metadata: Metadata = { title: "Relatório do Mês" };

export default async function RelatorioPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <RelatorioClient
      userId={user.id}
      profile={profile ?? { id: user.id, full_name: "", monthly_goal_hours: 50, service_year_start_month: 9, onboarding_completed: false }}
    />
  );
}
