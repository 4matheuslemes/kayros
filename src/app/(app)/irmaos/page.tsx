import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Suspense } from "react";
import { IrmaosClient } from "./irmaos-client";
import { fetchUserPermissions } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Irmãos e Grupos",
};

export default async function IrmaosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const permissions = await fetchUserPermissions(supabase, user.id);
  if (!permissions.canViewMembers) {
    redirect("/");
  }

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <IrmaosClient userId={user.id} />
    </Suspense>
  );
}
