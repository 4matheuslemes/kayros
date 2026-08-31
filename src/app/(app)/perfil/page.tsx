import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { PerfilClient } from "./perfil-client";

export const metadata: Metadata = { title: "Perfil" };

export default async function PerfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <PerfilClient
      userId={user.id}
      email={user.email ?? ""}
      profile={profile ?? { id: user.id, full_name: "", monthly_goal_hours: 50, service_year_start_month: 9 }}
    />
  );
}
