import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { BibleSearchClient } from "./bible-search-client";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Buscar na Bíblia",
};

export default async function BiblePage() {
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

  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
        </div>
      }
    >
      <BibleSearchClient />
    </Suspense>
  );
}
