import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Verify caller session
    const serverSupabase = await createServerClient();
    const {
      data: { user },
    } = await serverSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // 2. Verify caller is admin or elder
    const { data: callerProfile } = await serverSupabase
      .from("profiles")
      .select("is_admin, is_elder")
      .eq("id", user.id)
      .single();

    if (!callerProfile?.is_admin && !callerProfile?.is_elder) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    // 3. Admin service role client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 4. Fetch auth users (with pagination)
    const allUsers: Array<{ id: string; email?: string }> = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage,
      });

      if (error) {
        return NextResponse.json(
          { error: "Erro ao listar usuários" },
          { status: 500 }
        );
      }

      allUsers.push(...data.users);
      if (!data.users || data.users.length < perPage) break;
      page++;
    }

    // 5. Fetch profiles with all permission columns
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, full_name, is_admin, is_elder, talks_access, hours_access, contacts_access, view_members, manage_members, shepherding_access, member_id"
      );

    if (profilesError) {
      return NextResponse.json(
        { error: "Erro ao consultar perfis" },
        { status: 500 }
      );
    }

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

    // 6. Join users and profiles
    const result = allUsers.map((u) => {
      const p = profileMap.get(u.id);
      return {
        id: u.id,
        email: u.email ?? "",
        full_name: p?.full_name ?? "",
        is_admin: !!p?.is_admin,
        is_elder: !!p?.is_elder,
        talks_access: !!p?.talks_access,
        hours_access: !!p?.hours_access,
        contacts_access: p?.contacts_access !== false,
        view_members: !!p?.view_members,
        manage_members: !!p?.manage_members,
        shepherding_access: !!p?.shepherding_access,
        member_id: p?.member_id ?? null,
      };
    });

    result.sort((a, b) =>
      (a.full_name || a.email).localeCompare(b.full_name || b.email, "pt-BR")
    );

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
