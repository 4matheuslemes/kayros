import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import crypto from "crypto";

// Helper to verify caller is admin or elder
async function verifyAdminOrElder() {
  const serverSupabase = await createServerClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();

  if (!user) {
    return { error: "Não autorizado", status: 401 };
  }

  const { data: profile } = await serverSupabase
    .from("profiles")
    .select("is_admin, is_elder")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin && !profile?.is_elder) {
    return { error: "Acesso negado", status: 403 };
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  return { user, supabaseAdmin };
}

// 1. POST /api/invite — Gerar convite para um memberId
export async function POST(req: Request) {
  try {
    const auth = await verifyAdminOrElder();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { user, supabaseAdmin } = auth;

    const body = await req.json();
    const { memberId, origin } = body;

    if (!memberId || typeof memberId !== "string") {
      return NextResponse.json(
        { error: "Selecione um irmão da congregação para gerar o convite." },
        { status: 400 }
      );
    }

    // Verificar se o irmão existe em congregation_members
    const { data: member, error: memberErr } = await supabaseAdmin
      .from("congregation_members")
      .select("id, full_name")
      .eq("id", memberId)
      .maybeSingle();

    if (memberErr || !member) {
      return NextResponse.json(
        { error: "Irmão não encontrado na congregação." },
        { status: 404 }
      );
    }

    // Verificar se já existe algum profile com member_id = memberId
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("member_id", memberId)
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json(
        { error: "Este irmão já possui uma conta ativa vinculada." },
        { status: 400 }
      );
    }

    // Invalidar convites pendentes anteriores daquele mesmo irmão
    await supabaseAdmin
      .from("member_invites")
      .delete()
      .eq("member_id", memberId)
      .is("used_at", null);

    // Gerar token criptográfico aleatório
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    // Validade de 7 dias
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Inserir convite (apenas token_hash no banco)
    const { error: insertErr } = await supabaseAdmin
      .from("member_invites")
      .insert({
        member_id: memberId,
        token_hash: tokenHash,
        expires_at: expiresAt,
        created_by: user.id,
      });

    if (insertErr) {
      console.error("Erro ao inserir convite:", insertErr);
      return NextResponse.json(
        { error: "Falha ao gravar convite no banco de dados." },
        { status: 500 }
      );
    }

    // Determinar a URL base da aplicação
    const requestUrl = new URL(req.url);
    const baseUrl = origin || requestUrl.origin;
    const inviteUrl = `${baseUrl}/convite/${rawToken}`;

    return NextResponse.json({
      inviteUrl,
      expiresAt,
      memberName: member.full_name,
    });
  } catch (error: any) {
    console.error("Erro em POST /api/invite:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar convite." },
      { status: 500 }
    );
  }
}

// 2. GET /api/invite — Listar convites pendentes
export async function GET() {
  try {
    const auth = await verifyAdminOrElder();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { supabaseAdmin } = auth;

    // Buscar convites não utilizados e dentro da validade
    const { data: invites, error } = await supabaseAdmin
      .from("member_invites")
      .select(`
        id,
        member_id,
        expires_at,
        created_at,
        congregation_members!inner(id, full_name, appointment, service_status)
      `)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao listar convites:", error);
      return NextResponse.json(
        { error: "Erro ao buscar convites pendentes." },
        { status: 500 }
      );
    }

    return NextResponse.json({ invites: invites || [] });
  } catch (error: any) {
    console.error("Erro em GET /api/invite:", error);
    return NextResponse.json(
      { error: "Erro interno ao carregar convites." },
      { status: 500 }
    );
  }
}

// 3. DELETE /api/invite — Revogar convite pendente
export async function DELETE(req: Request) {
  try {
    const auth = await verifyAdminOrElder();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { supabaseAdmin } = auth;

    const body = await req.json();
    const { inviteId } = body;

    if (!inviteId || typeof inviteId !== "string") {
      return NextResponse.json(
        { error: "Identificador de convite inválido." },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("member_invites")
      .delete()
      .eq("id", inviteId)
      .is("used_at", null);

    if (error) {
      console.error("Erro ao revogar convite:", error);
      return NextResponse.json(
        { error: "Erro ao revogar convite." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erro em DELETE /api/invite:", error);
    return NextResponse.json(
      { error: "Erro interno ao revogar convite." },
      { status: 500 }
    );
  }
}
