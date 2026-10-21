import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { DiscursosClient } from "./discursos-client";

export const metadata: Metadata = {
  title: "Discursos",
};

export default async function DiscursosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("talks_access")
    .eq("id", user.id)
    .single();

  if (!profile?.talks_access) {
    redirect("/");
  }

  return <DiscursosClient userId={user.id} />;
}
