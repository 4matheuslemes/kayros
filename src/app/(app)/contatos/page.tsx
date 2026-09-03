import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ContatosClient } from "./contatos-client";

export const metadata: Metadata = { title: "Contatos" };

export default async function ContatosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <ContatosClient userId={user.id} />
    </Suspense>
  );
}
