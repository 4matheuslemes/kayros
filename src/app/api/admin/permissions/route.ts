import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const schema = z.object({
  userId: z.string().uuid("ID de usuário inválido"),
  is_admin: z.boolean().optional(),
  hours_access: z.boolean().optional(),
  contacts_access: z.boolean().optional(),
  talks_access: z.boolean().optional(),
  view_members: z.boolean().optional(),
  manage_members: z.boolean().optional(),
  shepherding_access: z.boolean().optional(),
  member_id: z.string().uuid().nullable().optional(),
  applyDefaults: z.boolean().optional(),
});

export async function POST(req: Request) {
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

    // 3. Parse & validate body
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      userId,
      is_admin,
      hours_access,
      contacts_access,
      talks_access,
      view_members,
      manage_members,
      shepherding_access,
      member_id,
      applyDefaults,
    } = parsed.data;

    // M1: Apenas administradores podem alterar is_admin
    if (is_admin !== undefined && !callerProfile.is_admin) {
      return NextResponse.json(
        { error: "Apenas administradores podem conceder ou revogar acesso de administrador." },
        { status: 403 }
      );
    }

    // 4. Admin service role client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // M1: Prevenir que o último administrador ativo remova seu próprio acesso de admin
    if (userId === user.id && is_admin === false) {
      const { count } = await supabaseAdmin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("is_admin", true);

      if ((count ?? 0) <= 1) {
        return NextResponse.json(
          { error: "Você é o único administrador ativo do sistema e não pode remover seu próprio acesso." },
          { status: 400 }
        );
      }
    }

    // If applyDefaults is requested with a member_id
    if (applyDefaults && member_id !== undefined) {
      if (member_id) {
        // Fetch member name to update profile
        const { data: mRow } = await supabaseAdmin
          .from("congregation_members")
          .select("full_name")
          .eq("id", member_id)
          .single();

        if (mRow?.full_name) {
          await supabaseAdmin
            .from("profiles")
            .update({ full_name: mRow.full_name })
            .eq("id", userId);
        }
      }

      const { error: rpcError } = await supabaseAdmin.rpc(
        "apply_member_default_permissions",
        {
          p_user_id: userId,
          p_member_id: member_id,
        }
      );

      if (rpcError) {
        console.error("Erro em apply_member_default_permissions:", rpcError.message);
        return NextResponse.json(
          { error: "Erro ao aplicar permissões padrão do membro." },
          { status: 500 }
        );
      }
    } else {
      // Normal update
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (is_admin !== undefined) updateData.is_admin = is_admin;
      if (hours_access !== undefined) updateData.hours_access = hours_access;
      if (contacts_access !== undefined) updateData.contacts_access = contacts_access;
      if (talks_access !== undefined) updateData.talks_access = talks_access;
      if (view_members !== undefined) updateData.view_members = view_members;
      if (manage_members !== undefined) updateData.manage_members = manage_members;
      if (shepherding_access !== undefined)
        updateData.shepherding_access = shepherding_access;
      if (member_id !== undefined) updateData.member_id = member_id;

      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update(updateData)
        .eq("id", userId);

      if (updateError) {
        console.error("Erro ao atualizar permissões:", updateError.message);
        return NextResponse.json(
          { error: "Erro ao atualizar permissões." },
          { status: 500 }
        );
      }
    }

    // Fetch updated profile
    const { data: updatedProfile } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, full_name, is_admin, is_elder, talks_access, hours_access, contacts_access, view_members, manage_members, shepherding_access, member_id"
      )
      .eq("id", userId)
      .single();

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
    });
  } catch (err: unknown) {
    console.error("Erro interno em /api/admin/permissions:", err);
    return NextResponse.json(
      { error: "Erro interno do servidor ao processar permissões." },
      { status: 500 }
    );
  }
}
