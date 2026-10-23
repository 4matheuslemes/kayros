import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { HistoricoClient } from "./historico-client";
import type { Metadata } from "next";
import { fetchUserPermissions } from "@/lib/permissions";

export const metadata: Metadata = { title: "Histórico" };

export default async function HistoricoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const permissions = await fetchUserPermissions(supabase, user.id);
  if (!permissions.canUseHours) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return <HistoricoClient userId={user.id} profile={profile} />;
}
