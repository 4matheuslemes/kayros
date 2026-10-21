import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { EditorClient } from "./editor-loader";

export const metadata: Metadata = {
  title: "Editor de Esboço",
};

export default async function OutlineEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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

  const { id } = await params;

  return <EditorClient id={id} />;
}
