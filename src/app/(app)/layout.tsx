import { createClient } from "@/lib/supabase/server";
import { AppShellClient } from "./app-shell-client";
import { fetchUserPermissions, EMPTY_PERMISSIONS } from "@/lib/permissions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const permissions = user
    ? await fetchUserPermissions(supabase, user.id)
    : EMPTY_PERMISSIONS;

  return (
    <AppShellClient permissions={permissions}>
      {children}
    </AppShellClient>
  );
}
