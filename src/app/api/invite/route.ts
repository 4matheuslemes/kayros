import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    // 1. Verify user is logged in
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // 2. Verify user is admin
    const { data: profile } = await serverSupabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    // 3. Parse request
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "E-mail inválido" }, { status: 400 });
    }

    // 4. Use Service Role to generate link
    // This MUST use the service role key to bypass RLS and use Admin API
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // generateLink will fail if the email is already registered, so we handle that error below.

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "invite",
      email: email,
    });

    if (error) {
      if (error.message.toLowerCase().includes("user already exists") || error.message.toLowerCase().includes("already registered")) {
        return NextResponse.json({ error: "Esse e-mail já tem conta no Kairós." }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ inviteUrl: data.properties?.action_link });

  } catch (error: any) {
    console.error("Invite generation error:", error);
    return NextResponse.json(
      { error: "Erro interno ao gerar convite." },
      { status: 500 }
    );
  }
}
