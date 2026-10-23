import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ContactDetailClient } from "./contact-detail-client";
import { fetchUserPermissions } from "@/lib/permissions";

export const metadata: Metadata = { title: "Ficha do Contato" };

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const permissions = await fetchUserPermissions(supabase, user.id);
  if (!permissions.canUseContacts) {
    redirect("/");
  }

  const { id } = await params;
  return <ContactDetailClient contactId={id} />;
}
