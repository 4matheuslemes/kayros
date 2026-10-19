import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Suspense } from "react";
import { PastoreioClient } from "./pastoreio-client";

export const metadata: Metadata = {
  title: "Registro de Pastoreio",
};

export default async function PastoreioPage() {
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

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <PastoreioClient userId={user.id} />
    </Suspense>
  );
}
