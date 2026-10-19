import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function NovaVisitaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_elder")
    .eq("id", user.id)
    .single();

  if (!profile?.is_elder) {
    redirect("/");
  }

  redirect("/pastoreio?nova=true");
}
