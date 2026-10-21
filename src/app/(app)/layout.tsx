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
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("talks_access")
      .eq("id", user.id)
      .single();

    talksAccess = !!profile?.talks_access;
  }

  return (
    <AppShellClient talksAccess={talksAccess}>
      {children}
    </AppShellClient>
  );
}
