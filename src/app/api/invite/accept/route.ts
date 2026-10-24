import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, email, password } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Token de convite ausente ou inválido." },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Informe um endereço de e-mail válido." },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "A senha deve ter no mínimo 6 caracteres." },
        { status: 400 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Calcular o hash SHA-256 do token
    const tokenHash = crypto
      .createHash("sha256")
      .update(token.trim())
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
      .maybeSingle();

    if (inviteErr || !invite) {
      return NextResponse.json(
        { error: "Este convite não foi encontrado ou é inválido." },
        { status: 404 }
      );
    }

    if (invite.used_at) {
      return NextResponse.json(
        { error: "Este convite já foi utilizado anteriormente." },
        { status: 400 }
      );
    }

    if (new Date(invite.expires_at).getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "Este convite expirou. Solicite um novo link a um administrador da congregação." },
        { status: 400 }
      );
    }

    // Verificar se o irmão já foi vinculado a outra conta
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("member_id", invite.member_id)
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json(
        { error: "Este irmão já possui uma conta ativa vinculada no Kairós." },
        { status: 400 }
      );
    }

    // Identificar o irmão
    const member = Array.isArray(invite.congregation_members)
      ? invite.congregation_members[0]
      : invite.congregation_members;

    if (!member) {
      return NextResponse.json(
        { error: "Registro do irmão não encontrado na congregação." },
        { status: 404 }
      );
    }

    // Criar o usuário no Supabase Auth já com e-mail confirmado (sem disparar e-mail do Supabase)
    const { data: newUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: member.full_name,
        },
      });

    if (createError) {
      if (
        createError.message.toLowerCase().includes("already registered") ||
        createError.message.toLowerCase().includes("already exists")
      ) {
        return NextResponse.json(
          {
            error:
              "Este e-mail já está cadastrado no sistema. Escolha outro e-mail ou faça login com suas credenciais.",
          },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    // Marcar atomicamente o convite como utilizado
    const { data: updatedInvite, error: updateError } = await supabaseAdmin
      .from("member_invites")
      .update({
        used_at: new Date().toISOString(),
        used_by: newUser.user.id,
      })
      .eq("id", invite.id)
      .is("used_at", null)
      .select("id")
      .maybeSingle();

    if (updateError || !updatedInvite) {
      // Race condition de segurança: se outro processo utilizou neste ínterim, removemos o usuário criado
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return NextResponse.json(
        { error: "Este convite já foi utilizado por outra sessão." },
        { status: 400 }
      );
    }

    const isPioneer = member.service_status === "pioneiro_regular";

    // Atualizar profile com o nome do irmão e vínculo
    await supabaseAdmin.from("profiles").upsert({
      id: newUser.user.id,
      full_name: member.full_name,
      member_id: invite.member_id,
      onboarding_completed: !isPioneer,
    });

    // Aplicar permissões e designações automáticas
    await supabaseAdmin.rpc("apply_member_default_permissions", {
      p_user_id: newUser.user.id,
      p_member_id: invite.member_id,
    });

    // Se não for pioneiro regular, garantir onboarding_completed = true para ir direto ao app
    if (!isPioneer) {
      await supabaseAdmin
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", newUser.user.id);
    }

    return NextResponse.json({
      success: true,
      memberName: member.full_name,
    });
  } catch (error: any) {
    console.error("Erro em POST /api/invite/accept:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar o aceite do convite." },
      { status: 500 }
    );
  }
}
