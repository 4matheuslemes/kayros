import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { HorasClient } from "./horas-client";

export const metadata: Metadata = { title: "Registrar Horas" };

export default async function HorasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <HorasClient userId={user.id} />;
}
