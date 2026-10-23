import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { fetchUserPermissions } from "@/lib/permissions";

export default async function NovaVisitaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const permissions = await fetchUserPermissions(supabase, user.id);
  if (!permissions.canUseShepherding) {
    redirect("/");
  }

  redirect("/pastoreio?nova=true");
}
