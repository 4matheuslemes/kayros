import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const schema = z.object({
  userId: z.string().uuid("ID de usuário inválido"),
  enabled: z.boolean(),
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

    // 2. Verify caller is admin
    const { data: callerProfile } = await serverSupabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!callerProfile?.is_admin) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    // 3. Parse & validate request body
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { userId, enabled } = parsed.data;

    // 4. Admin service role client to update talks_access
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        talks_access: enabled,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (updateError) {
      return NextResponse.json(
        { error: "Erro ao atualizar permissão de Discursos" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      userId,
      talks_access: enabled,
    });
  } catch {
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
