import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { InviteClient } from "./invite-client";
import { fetchUserPermissions } from "@/lib/permissions";

export default async function ConvidarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const permissions = await fetchUserPermissions(supabase, user.id);
  if (!permissions.isElderOrAdmin) {
    redirect("/");
  }

  return <InviteClient currentUserId={user.id} />;
}
