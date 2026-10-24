import { NextResponse, type NextRequest } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const inviteParam = requestUrl.searchParams.get("invite");
  const cookieInvite = request.cookies.get("kairos_invite_token")?.value;
  const rawToken = inviteParam || cookieInvite;

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=auth_failed", request.url));
  }

  // 1. Trocar o authorization code por uma sessão ativa
  const serverSupabase = await createServerClient();
  const { data: sessionData, error: sessionError } =
    await serverSupabase.auth.exchangeCodeForSession(code);

  if (sessionError || !sessionData?.user) {
    console.error("Erro no exchangeCodeForSession:", sessionError);
    return NextResponse.redirect(new URL("/login?error=auth_failed", request.url));
  }

  const user = sessionData.user;

  // 2. Client com Service Role para checagens e operações administrativas
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 3. Consultar perfil do usuário no banco
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, member_id, onboarding_completed, full_name")
    .eq("id", user.id)
    .maybeSingle();

  // ─────────────────────────────────────────────────────────────
  // CASO A — Usuário já cadastrado e autorizado
  // (já possui vínculo com member_id ou onboarding completado)
  // ─────────────────────────────────────────────────────────────
  if (profile?.member_id || profile?.onboarding_completed) {
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.delete("kairos_invite_token");
    return response;
  }

  // ─────────────────────────────────────────────────────────────
  // CASO B — Usuário novo vindo de um convite válido
  // ─────────────────────────────────────────────────────────────
  if (rawToken && typeof rawToken === "string") {
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken.trim())
      .digest("hex");

    // Buscar convite válido no banco
    const { data: invite, error: inviteErr } = await supabaseAdmin
      .from("member_invites")
      .select(`
        id,
        member_id,
        expires_at,
        used_at,
        congregation_members (id, full_name, appointment, service_status)
      `)
      .eq("token_hash", tokenHash)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (!inviteErr && invite) {
      // Marcar atomicamente o convite como utilizado
      const { data: updatedInvite } = await supabaseAdmin
        .from("member_invites")
        .update({
          used_at: new Date().toISOString(),
          used_by: user.id,
        })
        .eq("id", invite.id)
        .is("used_at", null)
        .select("id")
        .maybeSingle();

      if (updatedInvite) {
        const member = Array.isArray(invite.congregation_members)
          ? invite.congregation_members[0]
          : invite.congregation_members;

        const isPioneer = member?.service_status === "pioneiro_regular";

        // Atualizar perfil com o nome do irmão e vincular ao member_id
        await supabaseAdmin.from("profiles").upsert({
          id: user.id,
          full_name: member?.full_name || profile?.full_name || user.email?.split("@")[0],
          member_id: invite.member_id,
          onboarding_completed: !isPioneer,
        });

        // Aplicar permissões e designações do irmão
        await supabaseAdmin.rpc("apply_member_default_permissions", {
          p_user_id: user.id,
          p_member_id: invite.member_id,
        });

        // Se não for pioneiro regular, garante onboarding_completed = true
        if (!isPioneer) {
          await supabaseAdmin
            .from("profiles")
            .update({ onboarding_completed: true })
            .eq("id", user.id);
        }

        const response = NextResponse.redirect(new URL("/", request.url));
        response.cookies.delete("kairos_invite_token");
        return response;
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // CASO C — Bloqueio de Segurança
  // (Tentou logar com Google na tela /login sem convite válido)
  // ─────────────────────────────────────────────────────────────
  console.warn(`Tentativa de acesso não autorizado sem convite: ${user.email} (${user.id})`);

  // Excluir imediatamente a conta recém-criada no Supabase Auth
  await supabaseAdmin.auth.admin.deleteUser(user.id);

  // Encerrar a sessão do cliente
  await serverSupabase.auth.signOut();

  const response = NextResponse.redirect(new URL("/login?error=invite_required", request.url));
  response.cookies.delete("kairos_invite_token");
  return response;
}
