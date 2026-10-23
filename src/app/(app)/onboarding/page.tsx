import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { OnboardingClient } from "./onboarding-client";

export const metadata: Metadata = { title: "Bem-vindo" };

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profile?.onboarding_completed) {
    redirect("/");
  }

  // Se já está vinculado a um irmão da congregação com nome preenchido e não relata horas, conclui direto
  if (profile?.member_id && profile?.full_name && !profile?.hours_access) {
    await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", user.id);
    redirect("/");
  }

  return (
    <OnboardingClient
      userId={user.id}
      initialName={
        profile?.full_name ||
        user.user_metadata?.full_name ||
        user.email ||
        ""
      }
      canUseHours={!!profile?.hours_access}
    />
  );
}
