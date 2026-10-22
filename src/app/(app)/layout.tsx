import { createClient } from "@/lib/supabase/server";
import { AppShellClient } from "./app-shell-client";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let talksAccess = false;
  let isElder = false;
  let isAdmin = false;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("talks_access, is_elder, is_admin")
      .eq("id", user.id)
      .single();

    talksAccess = !!profile?.talks_access;
    isElder = !!profile?.is_elder;
    isAdmin = !!profile?.is_admin;
  }

  return (
    <AppShellClient
      talksAccess={talksAccess}
      isElder={isElder}
      isAdmin={isAdmin}
    >
      {children}
    </AppShellClient>
  );
}
