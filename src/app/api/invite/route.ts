import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    // 1. Verify user is logged in
    const serverSupabase = await createServerClient();
    const {
      data: { user },
    } = await serverSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // 2. Verify user is admin or elder
    const { data: profile } = await serverSupabase
      .from("profiles")
      .select("is_admin, is_elder")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin && !profile?.is_elder) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    // 3. Parse request
    const body = await req.json();
    const { email, origin, memberId } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "E-mail inválido" }, { status: 400 });
    }

    // Use fallback origin if not provided
    const requestUrl = new URL(req.url);
    const baseUrl = origin || requestUrl.origin;

    // 4. Use Service Role to generate link
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "invite",
      email: email,
      options: {
        redirectTo: `${baseUrl}/definir-senha`,
      },
    });

    if (error) {
      if (
        error.message.toLowerCase().includes("user already exists") ||
        error.message.toLowerCase().includes("already registered")
      ) {
        return NextResponse.json(
          { error: "Esse e-mail já tem conta no Kairós." },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // 5. If memberId provided, link profile and apply defaults
    const invitedUserId = data.user?.id;
    if (invitedUserId && memberId) {
      const { data: memberRow } = await supabaseAdmin
        .from("congregation_members")
        .select("full_name")
        .eq("id", memberId)
        .maybeSingle();

      if (memberRow?.full_name) {
        await supabaseAdmin.from("profiles").upsert({
          id: invitedUserId,
          full_name: memberRow.full_name,
        });
      }

      await supabaseAdmin.rpc("apply_member_default_permissions", {
        p_user_id: invitedUserId,
        p_member_id: memberId,
      });
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
