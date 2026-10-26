import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// In-memory rate limiting (max 10 attempts per 15 minutes per IP/token)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_ATTEMPTS) {
    return false;
  }
  entry.count++;
  return true;
}

const acceptSchema = z.object({
  token: z.string().min(10, "Token de convite inválido."),
  email: z.string().email("Informe um endereço de e-mail válido."),
  password: z.string().min(8, "A senha deve ter no mínimo 8 caracteres."),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown-ip";

    const body = await req.json().catch(() => null);
    const parsed = acceptSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dados de cadastro inválidos." },
        { status: 400 }
      );
    }

    const { token, email, password } = parsed.data;

    if (!checkRateLimit(`ip:${ip}`) || !checkRateLimit(`token:${token.slice(0, 16)}`)) {
      return NextResponse.json(
        { error: "Muitas tentativas. Aguarde 15 minutos e tente novamente." },
        { status: 429 }
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

    // Criar o usuário no Supabase Auth
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
      console.error("Erro ao criar usuário via invite accept");
      return NextResponse.json(
        { error: "Não foi possível cadastrar a conta. Verifique os dados informados." },
        { status: 400 }
      );
    }

    // Marcar atomicamente o convite como utilizado garantindo não expiração
    const { data: updatedInvite, error: updateError } = await supabaseAdmin
      .from("member_invites")
      .update({
        used_at: new Date().toISOString(),
        used_by: newUser.user.id,
      })
      .eq("id", invite.id)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .select("id")
      .maybeSingle();

    if (updateError || !updatedInvite) {
      // Reverter usuário criado em caso de corrida
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return NextResponse.json(
        { error: "Este convite já foi utilizado ou expirou." },
        { status: 400 }
      );
    }

    const isPioneer = member.service_status === "pioneiro_regular";

    // Atualizar profile com o nome do irmão e vínculo
    const { error: upsertError } = await supabaseAdmin.from("profiles").upsert({
      id: newUser.user.id,
      full_name: member.full_name,
      member_id: invite.member_id,
      onboarding_completed: !isPioneer,
    });

    if (upsertError) {
      console.error("Erro ao gravar perfil vinculado:", upsertError.message);
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return NextResponse.json(
        { error: "Falha ao vincular seu perfil à congregação." },
        { status: 500 }
      );
    }

    // Aplicar permissões e designações automáticas
    const { error: rpcError } = await supabaseAdmin.rpc("apply_member_default_permissions", {
      p_user_id: newUser.user.id,
      p_member_id: invite.member_id,
    });

    if (rpcError) {
      console.error("Erro ao configurar permissões do membro:", rpcError.message);
    }

    // Se não for pioneiro regular, garantir onboarding_completed = true
    if (!isPioneer) {
      await supabaseAdmin
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", newUser.user.id);
    }

    const res = NextResponse.json({
      success: true,
      memberName: member.full_name,
    });
    res.headers.set("Cache-Control", "no-store");
    res.headers.set("Referrer-Policy", "no-referrer");
    return res;
  } catch (error: unknown) {
    console.error("Erro em POST /api/invite/accept:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar o aceite do convite." },
      { status: 500 }
    );
  }
}
